// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract AgentIdentityRegistry is Ownable {
    struct AgentProfile {
        uint256 id;
        address owner;
        string name;
        string metadataURI;
        address wallet;
        uint256 reputation;
        bool exists;
    }

    uint256 public nextAgentId;

    mapping(uint256 => AgentProfile) public profiles;
    mapping(address => uint256) public agentByOwner;
    mapping(address => uint256) public agentByWallet;

    event AgentRegistered(uint256 indexed agentId, address indexed owner, string name, address wallet);
    event WalletBound(uint256 indexed agentId, address indexed wallet);
    event ReputationUpdated(uint256 indexed agentId, uint256 reputation);

    constructor() Ownable(msg.sender) {}

    function registerAgent(address owner, string calldata name, string calldata metadataURI) external onlyOwner returns (uint256) {
        require(owner != address(0), "AgentIdentityRegistry: zero owner");
        require(bytes(name).length > 0, "AgentIdentityRegistry: empty name");
        require(agentByOwner[owner] == 0, "AgentIdentityRegistry: already registered");

        uint256 agentId = ++nextAgentId;
        profiles[agentId] = AgentProfile({
            id: agentId,
            owner: owner,
            name: name,
            metadataURI: metadataURI,
            wallet: address(0),
            reputation: 0,
            exists: true
        });
        agentByOwner[owner] = agentId;

        emit AgentRegistered(agentId, owner, name, address(0));
        return agentId;
    }

    function bindWallet(uint256 agentId, address wallet) external onlyOwner {
        require(profiles[agentId].exists, "AgentIdentityRegistry: agent not found");
        require(wallet != address(0), "AgentIdentityRegistry: zero wallet");
        require(agentByWallet[wallet] == 0 || agentByWallet[wallet] == agentId, "AgentIdentityRegistry: wallet already bound");

        profiles[agentId].wallet = wallet;
        agentByWallet[wallet] = agentId;

        emit WalletBound(agentId, wallet);
    }

    function setMetadataURI(uint256 agentId, string calldata metadataURI) external onlyOwner {
        require(profiles[agentId].exists, "AgentIdentityRegistry: agent not found");
        profiles[agentId].metadataURI = metadataURI;
    }

    function updateReputation(uint256 agentId, uint256 newReputation) external onlyOwner {
        require(profiles[agentId].exists, "AgentIdentityRegistry: agent not found");
        profiles[agentId].reputation = newReputation;
        emit ReputationUpdated(agentId, newReputation);
    }

    function addReputation(uint256 agentId, uint256 delta) external onlyOwner {
        require(profiles[agentId].exists, "AgentIdentityRegistry: agent not found");
        profiles[agentId].reputation += delta;
        emit ReputationUpdated(agentId, profiles[agentId].reputation);
    }

    function getAgent(uint256 agentId) external view returns (AgentProfile memory) {
        return profiles[agentId];
    }

    function getAgentIdByOwner(address owner) external view returns (uint256) {
        return agentByOwner[owner];
    }

    function getAgentIdByWallet(address wallet) external view returns (uint256) {
        return agentByWallet[wallet];
    }
}
