import { NextResponse } from "next/server"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const {
      participant_wallet,
      agent_id,
      agent_name,
      compiled_findings,
      approval_confirmed,
    } = body

    if (!approval_confirmed) {
      return NextResponse.json(
        { success: false, error: "You must confirm participant approval before submitting the compiled report." },
        { status: 400 }
      )
    }

    if (!participant_wallet) {
      return NextResponse.json(
        { success: false, error: "Bound participant wallet address is required for submission." },
        { status: 400 }
      )
    }

    const submissionReceipt = {
      submission_id: "sub-" + Math.random().toString(36).substring(2, 9),
      competition_id: id,
      participant_wallet,
      agent_id: agent_id || "custom-agent",
      agent_name: agent_name || "Custom Security Agent",
      compiled_findings_count: Array.isArray(compiled_findings) ? compiled_findings.length : 0,
      approval_status: "APPROVED_AND_SUBMITTED",
      submitted_at: new Date().toISOString(),
      disqualification_risk: "CLEAR_ON_TIME",
    }

    return NextResponse.json({
      success: true,
      message: "Compiled report approved and submitted successfully before competition deadline.",
      receipt: submissionReceipt,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process compiled report submission" },
      { status: 500 }
    )
  }
}
