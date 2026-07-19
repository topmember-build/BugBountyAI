// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {BugBountyEscrow} from "../src/BugBountyEscrow.sol";

/**
 * @notice Deployment script for BugBountyEscrow.
 *
 * Required env vars:
 *   ESCROW_DEPLOYER_PRIVATE_KEY   — deployer (becomes DEFAULT_ADMIN_ROLE)
 *   ESCROW_OPERATOR_ADDRESS       — server relayer wallet (gets OPERATOR_ROLE)
 *   USDC_CONTRACT_ADDRESS         — USDC token on target chain
 *   PROTOCOL_FEE_BPS              — e.g. "300" for 3%  (defaults to 300)
 *   PROTOCOL_FEE_RECIPIENT        — address receiving protocol fees (defaults to deployer)
 *
 * Run with:
 *   forge script script/Deploy.s.sol:DeployBugBountyEscrow \
 *     --rpc-url $ESCROW_RPC_URL \
 *     --broadcast \
 *     --private-key $ESCROW_DEPLOYER_PRIVATE_KEY
 */
contract DeployBugBountyEscrow is Script {
    function run() external {
        address usdcAddress = vm.envAddress("USDC_CONTRACT_ADDRESS");
        address operatorAddress = vm.envAddress("ESCROW_OPERATOR_ADDRESS");

        uint256 feeBps = vm.envOr("PROTOCOL_FEE_BPS", uint256(300));
        // Use msg.sender (the deployer) as the default fee recipient
        address feeRecipient = vm.envOr("PROTOCOL_FEE_RECIPIENT", msg.sender);

        console2.log("=== BugBountyEscrow Deployment ===");
        console2.log("Operator:          ", operatorAddress);
        console2.log("USDC:              ", usdcAddress);
        console2.log("Protocol fee bps:  ", feeBps);

        // startBroadcast() without args automatically uses the private key passed via --private-key
        vm.startBroadcast();

        BugBountyEscrow escrowContract = new BugBountyEscrow(
            usdcAddress,
            feeBps,
            feeRecipient,
            operatorAddress
        );

        vm.stopBroadcast();

        console2.log("");
        console2.log("=== Deployment Complete ===");
        console2.log("BugBountyEscrow:   ", address(escrowContract));
        console2.log("");
        console2.log("Add to your .env:");
        console2.log("ESCROW_CONTRACT_ADDRESS=", address(escrowContract));
        console2.log("NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=", address(escrowContract));
    }
}
