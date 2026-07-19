// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {AgentIdentityRegistry} from "../src/AgentIdentityRegistry.sol";

/**
 * @notice Deployment script for AgentIdentityRegistry.
 *
 * Required env vars:
 *   AGENT_IDENTITY_DEPLOYER_PRIVATE_KEY — deployer who becomes owner
 *
 * Run with:
 *   forge script script/DeployAgentIdentity.s.sol:DeployAgentIdentityRegistry \
 *     --rpc-url $ESCROW_RPC_URL \
 *     --broadcast \
 *     --private-key $AGENT_IDENTITY_DEPLOYER_PRIVATE_KEY
 */
contract DeployAgentIdentityRegistry is Script {
    function run() external {
        console2.log("=== AgentIdentityRegistry Deployment ===");

        vm.startBroadcast();
        AgentIdentityRegistry registry = new AgentIdentityRegistry();
        vm.stopBroadcast();

        console2.log("");
        console2.log("=== Deployment Complete ===");
        console2.log("AgentIdentityRegistry:", address(registry));
        console2.log("");
        console2.log("Add to your .env:");
        console2.log("AGENT_IDENTITY_REGISTRY_ADDRESS=", address(registry));
    }
}
