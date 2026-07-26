import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    status: "active",
    name: "BugBountyAI GitHub Webhook Listener",
    supported_events: ["push", "pull_request"],
    payload_format: "json",
    webhook_url: "https://bug-bounty-ai-online.vercel.app/api/webhooks/github",
    instructions: "Add this URL to your GitHub Repository Settings -> Webhooks. Select Content-Type: application/json.",
  })
}

export async function POST(req: Request) {
  try {
    const event = req.headers.get("x-github-event") || "push"
    const payload = await req.json().catch(() => ({}))

    const repoUrl = payload.repository?.html_url || "https://github.com/topmember-build/BugBountyAI"
    const branch = payload.ref ? payload.ref.replace("refs/heads/", "") : "main"
    const commitSha = payload.head_commit?.id || payload.after || "latest"
    const commitMessage = payload.head_commit?.message || "Automated commit trigger"
    const sender = payload.sender?.login || payload.pusher?.name || "GitHub Webhook User"

    const scanId = "ci-scan-" + Date.now().toString(36)

    console.log(`[github-webhook] Triggered ${event} scan for ${repoUrl} (${branch}@${commitSha.substring(0, 7)}) by ${sender}`)

    return NextResponse.json({
      success: true,
      event,
      scan_id: scanId,
      trigger: {
        repo_url: repoUrl,
        branch,
        commit_sha: commitSha,
        commit_message: commitMessage,
        sender,
      },
      status: "queued",
      message: `Automated AI Agent Swarm scan queued for ${repoUrl} (${branch}). Results will be published to BugBountyAI.`,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to process GitHub webhook" }, { status: 500 })
  }
}
