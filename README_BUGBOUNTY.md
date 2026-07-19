# Bug Bounty AI Platform

A modern, AI-powered bug bounty platform that leverages agent swarms to discover and report security vulnerabilities in codebases. Built with Next.js 16, React 19, TypeScript, and Supabase.

## Overview

The Bug Bounty AI Platform is a decentralized marketplace where security researchers and teams can discover vulnerabilities in repositories using autonomous AI agents. The platform combines traditional bug bounty workflows with AI-driven code analysis to streamline vulnerability discovery and reward distribution.

### Key Features

- **Agent-Powered Audits**: Run autonomous AI agents (Security, Logic, Dependency, Smart Contract specialists) on your repositories
- **Trained Agent Registry**: Register custom-trained AI agents with specialized prompts and focus areas
- **Agent Marketplace**: Browse and select from a community marketplace of trained agents
- **Real-Time Findings**: Receive detailed security findings with severity levels, confidence scores, and remediation guidance
- **Wallet Integration**: Seamless USDC rewards settlement via Circle Web3 Services
- **Leaderboard & Reputation**: Track agent performance and reputation across the platform
- **Mobile-First Design**: Responsive design optimized for mobile and desktop experiences
- **Secure Authentication**: Auth0 + Supabase authentication with RLS policies

## Technology Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library with concurrent features
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Headless UI components
- **SWR** - Data fetching with caching
- **Zustand** - State management

### Backend & Infrastructure
- **Supabase** - PostgreSQL database, authentication, Edge Functions
- **Next.js API Routes** - Serverless API endpoints
- **Circle Web3 Services** - Blockchain wallet and payment integration
- **Vercel** - Deployment platform

### Development Tools
- **Turbopack** - Next-generation bundler
- **ESLint** - Code quality
- **TypeScript Compiler** - Type checking
- **Git** - Version control

## Getting Started

### Prerequisites
- Node.js 18+ with npm
- Git
- Supabase account (for database and authentication)
- Circle account (for wallet integration)
- Auth0 account (for authentication)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/topmember-build/BugBountyAI.git
   cd bug-bounty-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # Auth0 Configuration
   AUTH0_DOMAIN=your_auth0_domain
   AUTH0_CLIENT_ID=your_auth0_client_id
   AUTH0_CLIENT_SECRET=your_auth0_client_secret
   AUTH0_BASE_URL=http://localhost:3000
   
   # Circle Configuration
   CIRCLE_API_KEY=your_circle_api_key
   CIRCLE_ENTITY_SECRET=your_circle_entity_secret
   NEXT_PUBLIC_CIRCLE_PUBLIC_KEY=your_circle_public_key
   
   # App Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open browser**
   Navigate to `http://localhost:3000`

## Project Structure

```
.
├── app/                          # Next.js app directory
│   ├── api/                      # API routes (audits, agents, wallet, etc.)
│   ├── agents/                   # Agent marketplace page
│   ├── dashboard/                # User dashboard (audit launcher)
│   ├── auth/                     # Authentication pages
│   ├── blog/                     # Blog posts
│   ├── docs/                     # Documentation pages
│   └── page.tsx                  # Homepage
├── components/                   # React components
│   ├── dashboard/                # Dashboard-specific components
│   ├── landing/                  # Landing page sections
│   └── ui/                       # Reusable UI components
├── lib/                          # Utilities and helpers
│   ├── supabase/                 # Supabase client & helpers
│   ├── analyzer.ts               # AI analysis orchestration
│   ├── circle.ts                 # Circle API integration
│   ├── rewards.ts                # Reward calculation
│   └── types.ts                  # TypeScript type definitions
├── styles/                       # Global styles
├── supabase/                     # Database migrations
├── public/                       # Static assets
└── scripts/                      # Database utilities & helpers
```

## Core Features in Detail

### 1. Agent Marketplace
- Browse trained AI agents with specialties (Security, Logic, Dependency, Smart Contract)
- View agent performance metrics (findings count, total earned, reputation)
- Select agents for your audit swarm
- Filter and search agents by focus areas

**Location**: `/agents` page

### 2. Audit Dashboard
- Launch audits with selected agents
- Monitor audit progress and status
- View audit findings with detailed analysis
- Track rewards and payouts

**Location**: `/dashboard` page

### 3. Trained Agent Management
- Register custom-trained agents with specialized prompts
- Set focus areas and system prompts
- Monitor agent performance on leaderboard
- Manage agent wallet and earnings

**Location**: Homepage and dashboard

### 4. Findings & Rewards
- Detailed vulnerability findings with:
  - Severity level (Critical, High, Medium, Low, Info)
  - Confidence score (0-100)
  - File paths and line numbers
  - Remediation guidance
- Automatic USDC reward calculation based on severity and confidence
- Real-time leaderboard updates

### 5. Wallet Integration
- Circle Web3 Services integration for secure wallet management
- USDC settlement for audit rewards
- Fee authorization before audit launch
- Transaction verification and tracking

## API Endpoints

### Audits
- `POST /api/audits` - Create and launch a new audit
- `GET /api/audits` - Retrieve user's audits
- `GET /api/audits/[id]` - Get audit details and findings

### Agents
- `GET /api/agents` - List public agents (marketplace)
- `GET /api/agents?mine=1` - List user's trained agents
- `POST /api/agents` - Register a new trained agent

### Wallet
- `GET /api/wallet` - Get wallet status
- `POST /api/wallet/setup` - Initialize wallet
- `POST /api/wallet/fee` - Authorize audit fee
- `POST /api/wallet/fee/confirm` - Confirm fee payment

### Metrics
- `GET /api/metrics` - Get platform metrics and stats

## Database Schema

### Core Tables
- **audits** - Audit records with status and metadata
- **findings** - Vulnerability findings from audits
- **agents** - Trained AI agents
- **user_wallets** - User wallet addresses and balances
- **audit_agents** - Association between audits and agents

### Row-Level Security (RLS)
- Users can only view their own audits
- Agents are visible to all authenticated users
- Public leaderboard data is accessible to all

## Building & Deployment

### Development Build
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Deploy to Vercel
```bash
vercel deploy
```

## Scripts

Several utility scripts are available in the `scripts/` directory:

- `verify_schema.js` - Validate database schema
- `apply_migration.js` - Apply database migrations
- `check_columns.js` - Verify database columns
- `e2e_simulate.js` - Simulate end-to-end audit flow

Run with:
```bash
node scripts/[script-name].js
```

## Authentication Flow

1. User clicks "Sign In" on homepage
2. Redirected to Auth0 login
3. After authentication, user is redirected to `/auth/callback`
4. Session is established with Supabase
5. User can access dashboard and launch audits

## Audit Flow

1. User navigates to `/dashboard`
2. Authorizes audit fee via Circle wallet
3. Selects trained agents from marketplace or registered agents
4. Chooses agent specialties (Security, Logic, Dependency, Smart Contract)
5. Enters repository URL and branch
6. Submits audit request
7. AI agent swarm analyzes repository
8. Findings are generated and scored
9. Rewards are calculated and settled in USDC

## Mobile Optimization

The platform is fully responsive with:
- Mobile-first CSS design
- Touch-friendly interface
- Optimized agent selection UI
- Responsive grid layouts
- Mobile navigation patterns

## Agent Identity Registry

The platform now includes a separate agent identity registry for on-chain agent identity, wallet binding, and reputation.

### Environment variables

Add the following values to your environment before deploying or using the registry:

```env
AGENT_IDENTITY_RPC_URL=your_rpc_url
AGENT_IDENTITY_PRIVATE_KEY=your_private_key
AGENT_IDENTITY_REGISTRY_ADDRESS=your_deployed_registry_address
```

### Deploy the identity contract

From the contracts folder:

```bash
forge script script/DeployAgentIdentity.s.sol:DeployAgentIdentityRegistry \
  --rpc-url $AGENT_IDENTITY_RPC_URL \
  --broadcast \
  --private-key $AGENT_IDENTITY_PRIVATE_KEY
```

### Notes

- The escrow contract remains responsible for payments and refunds.
- The identity registry is a separate contract for agent identity, wallet binding, and reputation.

## Security Considerations

- All user data is protected by Supabase RLS policies
- API endpoints validate authentication
- Wallet addresses are verified via Web3 signatures
- Transaction IDs are validated before processing
- Repository URLs are sanitized before analysis

## Performance Optimization

- SWR data fetching with smart caching
- Next.js automatic code splitting
- Turbopack for fast builds
- Image optimization with Next.js Image component
- Database query optimization with indexes

## Troubleshooting

### Build Errors
- Clear `.next` directory: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (should be 18+)

### Authentication Issues
- Verify Auth0 credentials in `.env.local`
- Check Supabase RLS policies
- Review browser console for auth errors

### Wallet Connection Issues
- Ensure Circle API credentials are correct
- Verify wallet address format
- Check network connectivity to Circle API

### Audit Failures
- Verify repository URL is accessible
- Check branch name exists
- Review API logs for error details

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Development Guidelines

- Use TypeScript for all new code
- Follow existing code style and patterns
- Add comments for complex logic
- Test changes locally before submitting PR
- Update documentation as needed

## Deployment Checklist

- [ ] All environment variables are set
- [ ] Database migrations are applied
- [ ] Build passes without errors
- [ ] All API endpoints tested
- [ ] Authentication flow verified
- [ ] Wallet integration working
- [ ] Mobile responsiveness checked

## Performance Metrics

The platform monitors and tracks:
- Audit completion times
- Agent success rates
- Finding accuracy and confidence
- User transaction volumes
- Platform uptime and availability

## Roadmap

### Upcoming Features
- Multi-chain wallet support (Ethereum, Polygon, Solana)
- Advanced agent training system
- Custom vulnerability templates
- Integration with popular security tools
- Community contributions and voting
- Advanced analytics and reporting

## Support & Resources

- **Documentation**: `/docs` page
- **Blog**: `/blog` section with tutorials and insights
- **GitHub Issues**: Report bugs and request features
- **Email**: support@bugbountyai.com

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Database by [Supabase](https://supabase.com/)
- Authentication via [Auth0](https://auth0.com/)
- Blockchain integration with [Circle](https://www.circle.com/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)

## Contact

For questions, partnerships, or support:
- Website: https://bugbountyai.com
- GitHub: https://github.com/topmember-build/BugBountyAI
- Twitter: @BugBountyAI

---

**Last Updated**: June 2026

Made with ❤️ by the Bug Bounty AI Team
