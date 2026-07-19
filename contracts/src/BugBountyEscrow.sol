// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title BugBountyEscrow
 * @notice Trustless USDC escrow for the BugBounty AI platform.
 *
 * Flow:
 *   1. User sends USDC to this contract address via their Circle user-controlled wallet.
 *   2. Server (OPERATOR) calls notifyDeposit() to register the deposit on-chain.
 *   3. After audit, OPERATOR calls releaseReward() for each finding payout.
 *   4. OPERATOR calls refund() to return any remaining balance to the user,
 *      OR settle() to mark the audit done with no further refund.
 *
 * Security:
 *   - OPERATOR_ROLE is granted to the server relayer wallet (holds private key in env).
 *   - DEFAULT_ADMIN_ROLE is the deployer / multisig owner.
 *   - ReentrancyGuard on all state-mutating external functions.
 *   - SafeERC20 for all USDC transfers.
 */

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract BugBountyEscrow is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // -------------------------------------------------------------------------
    // Roles
    // -------------------------------------------------------------------------

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    /// @notice The USDC token contract (6 decimals).
    IERC20 public immutable usdc;

    /// @notice Protocol fee in basis points (300 = 3%).
    uint256 public protocolFeeBps;

    /// @notice Accumulated protocol fees not yet withdrawn.
    uint256 public accumulatedProtocolFees;

    /// @notice Address that receives protocol fee withdrawals.
    address public protocolFeeRecipient;

    struct EscrowEntry {
        address depositor;    // original user wallet that paid the fee
        uint256 totalAmount;  // gross amount deposited (USDC atomic units, 6 dec)
        uint256 remaining;    // net amount left to pay out / refund
        bool settled;         // true once finalized (all payouts + refund done)
    }

    /// @notice auditId → escrow data. auditId is keccak256 of the DB UUID.
    mapping(bytes32 => EscrowEntry) public escrows;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event FeeDeposited(
        bytes32 indexed auditId,
        address indexed depositor,
        uint256 grossAmount,
        uint256 protocolFee,
        uint256 netAmount
    );

    event RewardReleased(
        bytes32 indexed auditId,
        address indexed recipient,
        uint256 amount
    );

    event FeeRefunded(
        bytes32 indexed auditId,
        address indexed recipient,
        uint256 amount
    );

    event AuditSettled(bytes32 indexed auditId);

    event ProtocolFeesWithdrawn(address indexed recipient, uint256 amount);

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /**
     * @param _usdc              USDC token address on this chain.
     * @param _protocolFeeBps    Initial fee in basis points (e.g. 300 = 3%).
     * @param _protocolFeeRecipient  Address that receives protocol fees.
     * @param _operator          Server relayer wallet granted OPERATOR_ROLE.
     */
    constructor(
        address _usdc,
        uint256 _protocolFeeBps,
        address _protocolFeeRecipient,
        address _operator
    ) {
        require(_usdc != address(0), "BugBountyEscrow: zero USDC address");
        require(_protocolFeeRecipient != address(0), "BugBountyEscrow: zero fee recipient");
        require(_operator != address(0), "BugBountyEscrow: zero operator address");
        require(_protocolFeeBps <= 1000, "BugBountyEscrow: fee > 10%");

        usdc = IERC20(_usdc);
        protocolFeeBps = _protocolFeeBps;
        protocolFeeRecipient = _protocolFeeRecipient;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, _operator);
    }

    // -------------------------------------------------------------------------
    // Operator functions (called by the server relayer)
    // -------------------------------------------------------------------------

    /**
     * @notice Register a USDC deposit that the user has already transferred to
     *         this contract. Must be called by the operator after verifying the
     *         on-chain transfer (e.g. via Circle transaction state).
     *
     * @param auditId   bytes32 key derived from the DB audit UUID.
     * @param depositor User's wallet address (for refunds).
     * @param amount    Gross USDC amount transferred (atomic units, 6 decimals).
     */
    function notifyDeposit(
        bytes32 auditId,
        address depositor,
        uint256 amount
    ) external nonReentrant onlyRole(OPERATOR_ROLE) {
        require(escrows[auditId].totalAmount == 0, "BugBountyEscrow: already registered");
        require(amount > 0, "BugBountyEscrow: zero amount");
        require(depositor != address(0), "BugBountyEscrow: zero depositor");

        uint256 fee = (amount * protocolFeeBps) / 10_000;
        uint256 net = amount - fee;

        accumulatedProtocolFees += fee;

        escrows[auditId] = EscrowEntry({
            depositor: depositor,
            totalAmount: amount,
            remaining: net,
            settled: false
        });

        emit FeeDeposited(auditId, depositor, amount, fee, net);
    }

    /**
     * @notice Release a reward from escrow to an agent wallet.
     *         Can be called multiple times per audit (one per finding).
     *
     * @param auditId    The audit whose escrow is being drawn from.
     * @param recipient  Agent wallet to send USDC to.
     * @param amount     USDC amount in atomic units (6 decimals).
     */
    function releaseReward(
        bytes32 auditId,
        address recipient,
        uint256 amount
    ) external nonReentrant onlyRole(OPERATOR_ROLE) {
        EscrowEntry storage entry = escrows[auditId];
        require(!entry.settled, "BugBountyEscrow: already settled");
        require(entry.remaining >= amount, "BugBountyEscrow: insufficient escrow");
        require(recipient != address(0), "BugBountyEscrow: zero recipient");
        require(amount > 0, "BugBountyEscrow: zero amount");

        entry.remaining -= amount;
        usdc.safeTransfer(recipient, amount);

        emit RewardReleased(auditId, recipient, amount);
    }

    /**
     * @notice Refund the remaining escrowed net amount back to the depositor.
     *         Marks the audit as settled.
     *
     * @param auditId  The audit to refund.
     */
    function refund(bytes32 auditId) external nonReentrant onlyRole(OPERATOR_ROLE) {
        EscrowEntry storage entry = escrows[auditId];
        require(!entry.settled, "BugBountyEscrow: already settled");
        require(entry.remaining > 0, "BugBountyEscrow: nothing to refund");

        uint256 refundAmount = entry.remaining;
        entry.remaining = 0;
        entry.settled = true;

        usdc.safeTransfer(entry.depositor, refundAmount);

        emit FeeRefunded(auditId, entry.depositor, refundAmount);
    }

    /**
     * @notice Mark an audit as settled without a refund (all net funds consumed
     *         by rewards or intentionally forfeited).
     *
     * @param auditId  The audit to settle.
     */
    function settle(bytes32 auditId) external nonReentrant onlyRole(OPERATOR_ROLE) {
        EscrowEntry storage entry = escrows[auditId];
        require(!entry.settled, "BugBountyEscrow: already settled");

        entry.remaining = 0;
        entry.settled = true;

        emit AuditSettled(auditId);
    }

    // -------------------------------------------------------------------------
    // Admin functions
    // -------------------------------------------------------------------------

    /**
     * @notice Withdraw accumulated protocol fees to the fee recipient.
     */
    function withdrawProtocolFees() external nonReentrant onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 amount = accumulatedProtocolFees;
        require(amount > 0, "BugBountyEscrow: no fees to withdraw");
        accumulatedProtocolFees = 0;
        usdc.safeTransfer(protocolFeeRecipient, amount);
        emit ProtocolFeesWithdrawn(protocolFeeRecipient, amount);
    }

    /**
     * @notice Update the protocol fee rate. Max 10%.
     */
    function setProtocolFeeBps(uint256 _bps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_bps <= 1000, "BugBountyEscrow: fee > 10%");
        protocolFeeBps = _bps;
    }

    /**
     * @notice Update the protocol fee recipient address.
     */
    function setProtocolFeeRecipient(address _recipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_recipient != address(0), "BugBountyEscrow: zero address");
        protocolFeeRecipient = _recipient;
    }

    // -------------------------------------------------------------------------
    // View helpers
    // -------------------------------------------------------------------------

    /**
     * @notice Read the full escrow entry for an audit.
     */
    function getEscrow(bytes32 auditId) external view returns (EscrowEntry memory) {
        return escrows[auditId];
    }

    /**
     * @notice Derive the bytes32 auditId from a DB UUID string.
     *         Convenience for off-chain callers to get the same key as on-chain.
     */
    function auditIdFromUuid(string calldata uuid) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(uuid));
    }
}
