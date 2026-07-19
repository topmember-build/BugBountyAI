# BugBountyEscrow Smart Contract

Trustless USDC escrow for the BugBounty AI platform, replacing the Circle developer-controlled wallet treasury.

## Architecture

```
User Wallet (Circle User-Controlled)
       │  USDC transfer → Contract Address  (Circle W3S challenge)
       ▼
BugBountyEscrow.sol   ◄──── Server relayer calls:
       │                       notifyDeposit()
       │                       releaseReward()
       │                       refund() / settle()
       ├── Agent Wallet 1 (releaseReward)
       ├── Agent Wallet 2 (releaseReward)
       └── User Wallet   (refund)
```

## Prerequisites

Install [Foundry](https://getfoundry.sh):

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

## Setup

```bash
cd contracts

# Install OpenZeppelin contracts
forge install OpenZeppelin/openzeppelin-contracts --no-commit
```

## Compile

```bash
forge build
```

## Test

```bash
# Run all tests
forge test -vvv

# Run with gas report
forge test --gas-report

# Fuzz with more runs
forge test --fuzz-runs 10000
```

## Deploy to Arc Testnet

### 1. Set environment variables

Create a `contracts/.env` file (never commit this):

```env
# Chain
ESCROW_RPC_URL=https://rpc.arctest.circle.com    # Arc Testnet RPC
ESCROW_BLOCK_EXPLORER_URL=https://explorer.arctest.circle.com

# Deployer wallet (becomes DEFAULT_ADMIN_ROLE)
ESCROW_DEPLOYER_PRIVATE_KEY=0x...

# Server relayer wallet (becomes OPERATOR_ROLE — this is the server's signing key)
ESCROW_OPERATOR_ADDRESS=0x...
ESCROW_OPERATOR_PRIVATE_KEY=0x...   # Add this to your Next.js .env too

# Token
USDC_CONTRACT_ADDRESS=0x...         # USDC on Arc Testnet

# Fee config
PROTOCOL_FEE_BPS=300                # 3%
PROTOCOL_FEE_RECIPIENT=0x...        # Where protocol fees go
```

### 2. Deploy

```bash
source .env
forge script script/Deploy.s.sol:DeployBugBountyEscrow \
  --rpc-url $ESCROW_RPC_URL \
  --broadcast \
  --private-key $ESCROW_DEPLOYER_PRIVATE_KEY
```

The script prints the deployed contract address. Copy it.

### 3. Update Next.js environment

Add to your `.env.development.local` (and Vercel project settings):

```env
ESCROW_CONTRACT_ADDRESS=0x<deployed-address>
ESCROW_OPERATOR_PRIVATE_KEY=0x<operator-key>
ESCROW_RPC_URL=https://rpc.arctest.circle.com
NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=0x<deployed-address>
```

## Contract Functions

| Function | Role | Description |
|---|---|---|
| `notifyDeposit(auditId, depositor, amount)` | OPERATOR | Register a user's USDC transfer as an escrow deposit |
| `releaseReward(auditId, recipient, amount)` | OPERATOR | Pay an agent wallet from escrow |
| `refund(auditId)` | OPERATOR | Return remaining balance to depositor |
| `settle(auditId)` | OPERATOR | Finalize with no refund |
| `withdrawProtocolFees()` | ADMIN | Sweep accumulated protocol fees |
| `getEscrow(auditId)` | view | Read escrow entry |
| `auditIdFromUuid(uuid)` | pure | Derive bytes32 key from a UUID string |

## On-Chain Audit ID

The `auditId` is `keccak256(abi.encodePacked(feeRowUuid))` where `feeRowUuid` is the `audit_fees.id` UUID from Supabase.

In TypeScript (server-side):
```ts
import { auditIdFromUuid } from "@/lib/escrow-contract"
const auditId = auditIdFromUuid(feeRow.id) // returns 0x... bytes32 hex
```

In Solidity:
```solidity
bytes32 auditId = keccak256(abi.encodePacked(uuid));
// or use the helper:
bytes32 auditId = escrow.auditIdFromUuid("some-uuid");
```

## Security Notes

- **OPERATOR_ROLE** is the server relayer key — keep `ESCROW_OPERATOR_PRIVATE_KEY` secret
- **DEFAULT_ADMIN_ROLE** (deployer) should be a hardware wallet or multisig in production
- Protocol fees accumulate in the contract and are withdrawn explicitly via `withdrawProtocolFees()`
- The contract uses OpenZeppelin's `ReentrancyGuard` and `SafeERC20`
