export interface GuideStep {
  id: string
  title: string
  description: string
  badge: string
}

interface GuideInput {
  walletReady: boolean
  feeAuthorized: boolean
  prompt?: string
}

export function buildAiGuideSteps({ walletReady, feeAuthorized }: GuideInput): GuideStep[] {
  const steps: GuideStep[] = []

  if (!walletReady) {
    steps.push({
      id: "wallet",
      title: "Set up your wallet",
      description: "Create your Circle wallet so the platform can route audit fees and track your account securely.",
      badge: "Step 1",
    })
  }

  if (walletReady && !feeAuthorized) {
    steps.push({
      id: "fee",
      title: "Authorize the audit fee",
      description: "A small USDC fee unlocks the audit workflow and confirms you are ready to submit a scan.",
      badge: "Step 2",
    })
  }

  if (feeAuthorized) {
    steps.push({
      id: "audit",
      title: "Submit your first audit",
      description: "Point the agent swarm at a repository, review the findings, and use the results to improve your workflow.",
      badge: "Step 3",
    })
  }

  if (steps.length === 0) {
    steps.push({
      id: "ready",
      title: "You are all set",
      description: "You have the essentials in place. Submit an audit or review the latest results from your dashboard.",
      badge: "Ready",
    })
  }

  return steps
}

export function getAiGuideResponse({ walletReady, feeAuthorized, prompt = "" }: GuideInput): string {
  const text = prompt.toLowerCase()

  if (text.includes("wallet") || text.includes("setup")) {
    if (!walletReady) {
      return "Start by setting up your wallet. That unlocks the audit fee flow and gives the platform a secure way to track your account."
    }
    return "Your wallet is already ready. The next step is to authorize the audit fee if you have not done that yet."
  }

  if (text.includes("fee") || text.includes("pay")) {
    if (!feeAuthorized) {
      return "Authorize the audit fee to continue. This is the small step that enables the actual audit submission flow."
    }
    return "The fee is already authorized, so you can move on to submitting an audit."
  }

  if (text.includes("audit") || text.includes("submit")) {
    return "Once your wallet and fee are ready, open the audit form and point the agent swarm at the repository you want reviewed."
  }

  if (text.includes("how") || text.includes("work")) {
    return "This product helps you launch bug-bounty style audits by connecting a wallet, authorizing a fee, and then submitting a repository for review."
  }

  if (!walletReady) {
    return "The fastest next step is to set up your wallet so the rest of the onboarding flow becomes available."
  }

  if (!feeAuthorized) {
    return "You are close. Authorize the audit fee and then you can submit your first audit."
  }

  return "You are ready to begin. Submit an audit and review the findings from your dashboard."
}
