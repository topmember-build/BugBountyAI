/**
 * Shared Seed Competitions and CTF Scenarios for BugBountyAI Playground
 */

export const SEED_COMPETITIONS: any[] = []

export const CTF_SCENARIOS = [
  {
    id: "reentrancy-gauntlet",
    slug: "reentrancy-gauntlet",
    title: "Reentrancy Gauntlet Vault",
    difficulty: "Intermediate",
    category: "Smart Contracts",
    description: "Audit a multi-user yield vault contract featuring external reward tokens. Identify state modification order flaws and cross-function reentrancy vectors.",
    vulnerabilities_count: 2,
    target_contract: "YieldVault.sol",
    solidity_code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract YieldVault {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "Zero balance");

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        balances[msg.sender] = 0;
    }
}`,
    expected_findings: [
      {
        id: "vuln-1",
        title: "Reentrancy vulnerability in withdraw()",
        severity: "Critical",
        line: 24,
        description: "State balance update occurs after external call.",
      },
    ],
  },
  {
    id: "access-control-escalation",
    slug: "access-control-escalation",
    title: "Governance Role & Operator Bypass",
    difficulty: "Advanced",
    category: "Access Control",
    description: "Analyze a privileged administrative role management module. Detect missing authorization modifiers on emergency fee recipient updates and operator migration.",
    vulnerabilities_count: 2,
    target_contract: "GovernanceRoleVault.sol",
    solidity_code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract GovernanceRoleVault {
    address public owner;
    address public feeRecipient;
    bool public isPaused;

    constructor() {
        owner = msg.sender;
        feeRecipient = msg.sender;
    }

    // Missing onlyOwner modifier!
    function setFeeRecipient(address _newRecipient) external {
        require(_newRecipient != address(0), "Invalid address");
        feeRecipient = _newRecipient;
    }

    function setPaused(bool _paused) external {
        require(msg.sender == owner, "Unauthorized");
        isPaused = _paused;
    }
}`,
    expected_findings: [
      {
        id: "vuln-2",
        title: "Unprotected setFeeRecipient allows unauthorized takeover of protocol fees",
        severity: "Critical",
        line: 16,
        description: "Public function lacks onlyOwner access control check.",
      },
    ],
  },
  {
    id: "oracle-flashloan-manipulation",
    slug: "oracle-flashloan-manipulation",
    title: "AMM Spot Price Oracle Manipulation",
    difficulty: "Expert",
    category: "DeFi / Oracles",
    description: "Audit a lending pool relying on instant DEX spot balance ratios for collateral valuation. Spot instant price manipulation via flashloans.",
    vulnerabilities_count: 1,
    target_contract: "FlashLenderPool.sol",
    solidity_code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
}

contract FlashLenderPool {
    IERC20 public tokenA;
    IERC20 public tokenB;

    constructor(address _a, address _b) {
        tokenA = IERC20(_a);
        tokenB = IERC20(_b);
    }

    // Vulnerable: Relies on instant spot balance ratio without TWAP window
    function getCollateralValue(address user) public view returns (uint256) {
        uint256 resA = tokenA.balanceOf(address(this));
        uint256 resB = tokenB.balanceOf(address(this));
        require(resB > 0, "Zero liquidity");
        return (resA * 1e18) / resB;
    }
}`,
    expected_findings: [
      {
        id: "vuln-3",
        title: "Flashloan spot price oracle manipulation in getCollateralValue()",
        severity: "Critical",
        line: 20,
        description: "Instant spot reserve query can be manipulated in a single atomic transaction.",
      },
    ],
  },
  {
    id: "fee-bps-precision-loss",
    slug: "fee-bps-precision-loss",
    title: "Fee BPS Underflow & Precision Loss",
    difficulty: "Intermediate",
    category: "Arithmetic Flaws",
    description: "Audit a staking rewards distribution contract for rounding errors and integer precision loss during fee BPS calculations.",
    vulnerabilities_count: 1,
    target_contract: "StakingRewardsFees.sol",
    solidity_code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract StakingRewardsFees {
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public feeBps = 250; // 2.5%

    function calculateNetPayout(uint256 grossAmount) public view returns (uint256) {
        // Integer division before multiplication causes zero payout on small amounts
        uint256 fee = (grossAmount / BPS_DENOMINATOR) * feeBps;
        return grossAmount - fee;
    }
}`,
    expected_findings: [
      {
        id: "vuln-4",
        title: "Precision loss / zero fee extraction due to division before multiplication",
        severity: "High",
        line: 9,
        description: "Order of operations truncates intermediate result to 0 when grossAmount < BPS_DENOMINATOR.",
      },
    ],
  },
]

