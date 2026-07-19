// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {AgentIdentityRegistry} from "../src/AgentIdentityRegistry.sol";

contract AgentIdentityRegistryTest is Test {
    AgentIdentityRegistry public registry;

    address public owner = address(0xBEEF);
    address public user = address(0xCAFE);

    function setUp() public {
        vm.prank(owner);
        registry = new AgentIdentityRegistry();
    }

    function test_registerAgent_andBindWallet() public {
        vm.prank(owner);
        uint256 agentId = registry.registerAgent(user, "Atlas", "ipfs://metadata");

        assertEq(registry.getAgentIdByOwner(user), agentId);

        vm.prank(owner);
        registry.bindWallet(agentId, user);

        AgentIdentityRegistry.AgentProfile memory profile = registry.getAgent(agentId);
        assertEq(profile.wallet, user);
        assertEq(profile.reputation, 0);
    }

    function test_reputationUpdates() public {
        vm.prank(owner);
        uint256 agentId = registry.registerAgent(user, "Atlas", "ipfs://metadata");

        vm.prank(owner);
        registry.addReputation(agentId, 25);

        AgentIdentityRegistry.AgentProfile memory profile = registry.getAgent(agentId);
        assertEq(profile.reputation, 25);
    }
}
