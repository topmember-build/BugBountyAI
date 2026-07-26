import { NextResponse } from "next/server"
import { runTribunalJudgingSession } from "@/lib/playground-judging"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    let realFindings: any[] | undefined = undefined
    let priorAuditOptions: any = undefined

    if (supabase) {
      try {
        const { data: comp } = await supabase.from("competitions").select("*").or(`id.eq.${id},slug.eq.${id}`).single()
        if (comp) {
          priorAuditOptions = {
            hasPriorAudit: comp.has_prior_audit,
            priorAuditSource: comp.prior_audit_source,
            priorAuditFindings: comp.prior_audit_findings,
          }
        }

        const { data: submissions } = await supabase
          .from("submissions")
          .select("*")
          .eq("competition_id", id)

        if (submissions && submissions.length >= 0) {
          realFindings = submissions
        }
      } catch (e) {
        console.warn("[judging API] Supabase fetch fallback:", e)
      }
    }

    const session = runTribunalJudgingSession(id, realFindings, priorAuditOptions)

    return NextResponse.json({
      success: true,
      tribunal_session: session,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch AI Judging Room session" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const { findings } = body

    const session = runTribunalJudgingSession(id, findings)

    return NextResponse.json({
      success: true,
      message: "AI Tribunal Chamber convened successfully. Findings judged and certified.",
      tribunal_session: session,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute AI Tribunal session" },
      { status: 500 }
    )
  }
}
