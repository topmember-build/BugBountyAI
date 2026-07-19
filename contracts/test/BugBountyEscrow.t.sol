// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {BugBountyEscrow} from "../src/BugBountyEscrow.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// ---------------------------------------------------------------------------
// Minimal mock USDC (6 decimals)
// ---------------------------------------------------------------------------
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
contract BugBountyEscrowTest is Test {
    BugBountyEscrow public escrow;
    MockUSDC public usdc;

    address public owner = address(0xABCD);
    address public operator = address(0x1111);
    address public feeRecipient = address(0x2222);
    address public user = address(0x3333);
    address public agent = address(0x4444);

    uint256 public constant PROTOCOL_FEE_BPS = 300; // 3%
    uint256 public constant DEPOSIT_AMOUNT = 1_000_000; // 1 USDC (6 decimals)
    bytes32 public constant AUDIT_ID = keccak256(abi.encodePacked("audit-uuid-1234"));

    function setUp() public {
        vm.startPrank(owner);

        usdc = new MockUSDC();
        escrow = new BugBountyEscrow(
            address(usdc),
            PROTOCOL_FEE_BPS,
            feeRecipient,
            operator
        );

        // Fund user with USDC, simulate them transferring to the contract
        usdc.mint(user, 10_000_000); // 10 USDC

        vm.stopPrank();
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    /// Simulate user USDC transfer + operator notifyDeposit
    function _depositToEscrow(bytes32 auditId, uint256 amount) internal {
        // User transfers USDC to contract (simulating Circle user-wallet transfer)
        vm.prank(user);
        usdc.transfer(address(escrow), amount);

        // Operator registers the deposit on-chain
        vm.prank(operator);
        escrow.notifyDeposit(auditId, user, amount);
    }

    // -----------------------------------------------------------------------
    // Constructor / role tests
    // -----------------------------------------------------------------------

    function test_constructor_rolesGranted() public view {
        assertTrue(escrow.hasRole(escrow.DEFAULT_ADMIN_ROLE(), owner));
        assertTrue(escrow.hasRole(escrow.OPERATOR_ROLE(), operator));
    }

    function test_constructor_params() public view {
        assertEq(address(escrow.usdc()), address(usdc));
        assertEq(escrow.protocolFeeBps(), PROTOCOL_FEE_BPS);
        assertEq(escrow.protocolFeeRecipient(), feeRecipient);
    }

    // -----------------------------------------------------------------------
    // notifyDeposit tests
    // -----------------------------------------------------------------------

    function test_notifyDeposit_registersEscrow() public {
        _depositToEscrow(AUDIT_ID, DEPOSIT_AMOUNT);

        BugBountyEscrow.EscrowEntry memory entry = escrow.getEscrow(AUDIT_ID);

        uint256 expectedFee = (DEPOSIT_AMOUNT * PROTOCOL_FEE_BPS) / 10_000;
        uint256 expectedNet = DEPOSIT_AMOUNT - expectedFee;

        assertEq(entry.depositor, user);
        assertEq(entry.totalAmount, DEPOSIT_AMOUNT);
        assertEq(entry.remaining, expectedNet);
        assertFalse(entry.settled);
        assertEq(escrow.accumulatedProtocolFees(), expectedFee);
    }

    function test_notifyDeposit_emitsEvent() public {
        vm.prank(user);
        usdc.transfer(address(escrow), DEPOSIT_AMOUNT);

        uint256 fee = (DEPOSIT_AMOUNT * PROTOCOL_FEE_BPS) / 10_000;
        uint256 net = DEPOSIT_AMOUNT - fee;

        vm.expectEmit(true, true, false, true);
        emit BugBountyEscrow.FeeDeposited(AUDIT_ID, user, DEPOSIT_AMOUNT, fee, net);

        vm.prank(operator);
        escrow.notifyDeposit(AUDIT_ID, user, DEPOSIT_AMOUNT);
    }

    function test_notifyDeposit_revertsIfAlreadyRegistered() public {
        _depositToEscrow(AUDIT_ID, DEPOSIT_AMOUNT);

        vm.prank(user);
        usdc.transfer(address(escrow), DEPOSIT_AMOUNT);

        vm.expectRevert("BugBountyEscrow: already registered");
        vm.prank(operator);
        escrow.notifyDeposit(AUDIT_ID, user, DEPOSIT_AMOUNT);
    }

    function test_notifyDeposit_revertsIfNotOperator() public {
        vm.prank(user);
        usdc.transfer(address(escrow), DEPOSIT_AMOUNT);

        vm.expectRevert();
        vm.prank(user); // not operator
        escrow.notifyDeposit(AUDIT_ID, user, DEPOSIT_AMOUNT);
    }

    // -----------------------------------------------------------------------
    // releaseReward tests
    // -----------------------------------------------------------------------

    function test_releaseReward_transfersToAgent() public {
        _depositToEscrow(AUDIT_ID, DEPOSIT_AMOUNT);

        uint256 net = DEPOSIT_AMOUNT - (DEPOSIT_AMOUNT * PROTOCOL_FEE_BPS) / 10_000;
        uint256 payout = net / 2;

        uint256 agentBefore = usdc.balanceOf(agent);

        vm.prank(operator);
        escrow.releaseReward(AUDIT_ID, agent, payout);

        assertEq(usdc.balanceOf(agent), agentBefore + payout);

        BugBountyEscrow.EscrowEntry memory entry = escrow.getEscrow(AUDIT_ID);
        assertEq(entry.remaining, net - payout);
    }

    function test_releaseReward_emitsEvent() public {
        _depositToEscrow(AUDIT_ID, DEPOSIT_AMOUNT);

        uint256 payout = 100_000; // 0.1 USDC

        vm.expectEmit(true, true, false, true);
        emit BugBountyEscrow.RewardReleased(AUDIT_ID, agent, payout);

        vm.prank(operator);
        escrow.releaseReward(AUDIT_ID, agent, payout);
    }

    function test_releaseReward_revertsIfInsufficient() public {
        _depositToEscrow(AUDIT_ID, DEPOSIT_AMOUNT);

        BugBountyEscrow.EscrowEntry memory entry = escrow.getEscrow(AUDIT_ID);

        vm.expectRevert("BugBountyEscrow: insufficient escrow");
        vm.prank(operator);
        escrow.releaseReward(AUDIT_ID, agent, entry.remaining + 1);
    }

    function test_releaseReward_revertsIfSettled() public {
        _depositToEscrow(AUDIT_ID, DEPOSIT_AMOUNT);

        vm.prank(operator);
        escrow.settle(AUDIT_ID);

        vm.expectRevert("BugBountyEscrow: already settled");
        vm.prank(operator);
        escrow.releaseReward(AUDIT_ID, agent, 1);
    }

    // -----------------------------------------------------------------------
    // refund tests
    // -----------------------------------------------------------------------

    function test_refund_returnsNetToDepositor() public {
        _depositToEscrow(AUDIT_ID, DEPOSIT_AMOUNT);

        BugBountyEscrow.EscrowEntry memory entry = escrow.getEscrow(AUDIT_ID);
        uint256 net = entry.remaining;
        uint256 userBefore = usdc.balanceOf(user);

        vm.prank(operator);
        escrow.refund(AUDIT_ID);

        assertEq(usdc.balanceOf(user), userBefore + net);

        entry = escrow.getEscrow(AUDIT_ID);
        assertEq(entry.remaining, 0);
        assertTrue(entry.settled);
    }

    function test_refund_partialPayout_thenRefund() public {
        _depositToEscrow(AUDIT_ID, DEPOSIT_AMOUNT);

        BugBountyEscrow.EscrowEntry memory entry = escrow.getEscrow(AUDIT_ID);
        uint256 net = entry.remaining;
        uint256 payout = net / 3;

        // Pay one finding
        vm.prank(operator);
        escrow.releaseReward(AUDIT_ID, agent, payout);

        uint256 userBefore = usdc.balanceOf(user);

        // Refund the rest
        vm.prank(operator);
        escrow.refund(AUDIT_ID);

        assertEq(usdc.balanceOf(user), userBefore + (net - payout));
        assertTrue(escrow.getEscrow(AUDIT_ID).settled);
    }

    function test_refund_revertsIfNothingLeft() public {
        _depositToEscrow(AUDIT_ID, DEPOSIT_AMOUNT);

        BugBountyEscrow.EscrowEntry memory entry = escrow.getEscrow(AUDIT_ID);

        // Pay out entire net
        vm.prank(operator);
        escrow.releaseReward(AUDIT_ID, agent, entry.remaining);

        vm.expectRevert("BugBountyEscrow: nothing to refund");
        vm.prank(operator);
        escrow.refund(AUDIT_ID);
    }

    // -----------------------------------------------------------------------
    // settle tests
    // -----------------------------------------------------------------------

    function test_settle_marksSettledAndEmitsEvent() public {
        _depositToEscrow(AUDIT_ID, DEPOSIT_AMOUNT);

        vm.expectEmit(true, false, false, false);
        emit BugBountyEscrow.AuditSettled(AUDIT_ID);

        vm.prank(operator);
        escrow.settle(AUDIT_ID);

        assertTrue(escrow.getEscrow(AUDIT_ID).settled);
    }

    // -----------------------------------------------------------------------
    // withdrawProtocolFees tests
    // -----------------------------------------------------------------------

    function test_withdrawProtocolFees_sendsToRecipient() public {
        _depositToEscrow(AUDIT_ID, DEPOSIT_AMOUNT);

        uint256 fee = escrow.accumulatedProtocolFees();
        assertGt(fee, 0);

        uint256 recipientBefore = usdc.balanceOf(feeRecipient);

        vm.prank(owner);
        escrow.withdrawProtocolFees();

        assertEq(usdc.balanceOf(feeRecipient), recipientBefore + fee);
        assertEq(escrow.accumulatedProtocolFees(), 0);
    }

    function test_withdrawProtocolFees_revertsIfNotAdmin() public {
        _depositToEscrow(AUDIT_ID, DEPOSIT_AMOUNT);

        vm.expectRevert();
        vm.prank(operator); // not admin
        escrow.withdrawProtocolFees();
    }

    // -----------------------------------------------------------------------
    // Admin setter tests
    // -----------------------------------------------------------------------

    function test_setProtocolFeeBps_updatesValue() public {
        vm.prank(owner);
        escrow.setProtocolFeeBps(500);
        assertEq(escrow.protocolFeeBps(), 500);
    }

    function test_setProtocolFeeBps_revertsIfOver10Pct() public {
        vm.prank(owner);
        vm.expectRevert("BugBountyEscrow: fee > 10%");
        escrow.setProtocolFeeBps(1001);
    }

    function test_setProtocolFeeRecipient_updates() public {
        address newRecipient = address(0x9999);
        vm.prank(owner);
        escrow.setProtocolFeeRecipient(newRecipient);
        assertEq(escrow.protocolFeeRecipient(), newRecipient);
    }

    // -----------------------------------------------------------------------
    // auditIdFromUuid helper
    // -----------------------------------------------------------------------

    function test_auditIdFromUuid_matchesKeccak() public view {
        string memory uuid = "some-uuid-1234";
        bytes32 expected = keccak256(abi.encodePacked(uuid));
        assertEq(escrow.auditIdFromUuid(uuid), expected);
    }

    // -----------------------------------------------------------------------
    // Fuzz tests
    // -----------------------------------------------------------------------

    function testFuzz_depositAndRelease(uint96 amount, uint96 payout) public {
        vm.assume(amount > 0 && amount <= 1_000_000_000); // up to 1000 USDC
        uint256 fee = (uint256(amount) * PROTOCOL_FEE_BPS) / 10_000;
        uint256 net = uint256(amount) - fee;
        vm.assume(payout <= net);

        usdc.mint(user, amount);

        vm.prank(user);
        usdc.transfer(address(escrow), amount);

        vm.prank(operator);
        escrow.notifyDeposit(AUDIT_ID, user, amount);

        if (payout > 0) {
            vm.prank(operator);
            escrow.releaseReward(AUDIT_ID, agent, payout);
            assertEq(usdc.balanceOf(agent), payout);
        }

        vm.prank(operator);
        if (net - payout > 0) {
            escrow.refund(AUDIT_ID);
        } else {
            escrow.settle(AUDIT_ID);
        }

        assertTrue(escrow.getEscrow(AUDIT_ID).settled);
    }
}
