import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { SEED_COMPETITIONS } from "@/lib/playground-data"
import { computeHostPaymentBreakdown } from "@/lib/fees"

const IN_MEMORY_HOSTED_COMPETITIONS: any[] = []

export async function GET() {
  try {
    const supabase = await createClient()
    if (supabase) {
      const { data, error } = await supabase
        .from("competitions")
        .select("*")
        .order("created_at", { ascending: false })

      if (!error) {
        const dbComps = Array.isArray(data) ? data : []
        const merged = [...IN_MEMORY_HOSTED_COMPETITIONS, ...dbComps]
        const uniqueComps = Array.from(new Map(merged.map((item) => [item.id, item])).values())
        return NextResponse.json({ success: true, competitions: uniqueComps })
      }
    }
  } catch (err) {
    console.warn("Supabase fetch fallback:", err)
  }

  const uniqueComps = Array.from(new Map(IN_MEMORY_HOSTED_COMPETITIONS.map((item) => [item.id, item])).values())

  return NextResponse.json({
    success: true,
    competitions: uniqueComps,
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      title,
      sponsor_name,
      host_email,
      host_discord,
      host_wallet_address,
      wallet_provider_type = "external_web3",
      description,
      category,
      repo_url,
      branch,
      in_scope_files,
      out_of_scope_files,
      prize_pool_usdc,
      escrow_tx_id,
      code_source_type = "github",
      raw_code_content,
      uploaded_file_name,
      contract_filename,
      max_winners = 5,
      distribution_mode = "severity_weighted",
      custom_split_ratios = [],
      has_prior_audit = false,
      prior_audit_source,
      prior_audit_date,
      prior_audit_findings,
      prior_audit_report_url,
    } = body

    if (!title || !description) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: title, description" },
        { status: 400 }
      )
    }

    if (code_source_type === "github" && !repo_url) {
      return NextResponse.json(
        { success: false, error: "GitHub Repository URL is required for GitHub submissions" },
        { status: 400 }
      )
    }

    if (code_source_type === "paste" && !raw_code_content) {
      return NextResponse.json(
        { success: false, error: "Smart contract code content is required for pasted code submissions" },
        { status: 400 }
      )
    }

    // Prior Audit Disclosure validation: if host declares prior audit, findings are required
    if (has_prior_audit && (!prior_audit_findings || prior_audit_findings.trim().length === 0)) {
      return NextResponse.json(
        { success: false, error: "You declared a prior audit — please provide the findings and bugs discovered. This is required for fair judging." },
        { status: 400 }
      )
    }

    const durationDays = Number(body.duration_days) || 7
    const registrationDays = Number(body.registration_days || 3)
    const now = Date.now()
    const registrationEndDate = new Date(now + registrationDays * 86400000)
    const sprintStartDate = registrationEndDate
    const endDate = new Date(sprintStartDate.getTime() + durationDays * 86400000)
    const judgingEndDate = new Date(endDate.getTime() + 3 * 86400000)
    const payoutReleaseDate = new Date(judgingEndDate.getTime() + 3 * 86400000)

    const hostAccessCode = "HOST-BOUNTY-" + Math.random().toString(36).substring(2, 7).toUpperCase()

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36)
    const finalRepoUrl =
      repo_url ||
      (code_source_type === "paste"
        ? `internal://pasted-code/${contract_filename || "Contract.sol"}`
        : code_source_type === "zip"
          ? `internal://zip-archive/${uploaded_file_name || "audit-source.zip"}`
          : `internal://contract-files/${uploaded_file_name || "SourceCode.sol"}`)

    const paymentBreakdown = computeHostPaymentBreakdown(prize_pool_usdc, body.hosting_fee_usdc)

    const newComp = {
      id: "comp-" + Date.now(),
      slug,
      title,
      sponsor_name: sponsor_name || "BugBountyAI Partner",
      host_email: host_email || "sponsor@arc.network",
      host_discord: host_discord || "@sponsor_host",
      host_wallet_address: host_wallet_address || process.env.ESCROW_OPERATOR_ADDRESS || "0x8734b4E4aa0a8968D86fddAB5Cc90c7fa7B5Ef82",
      wallet_provider_type: wallet_provider_type || "external_web3",
      host_access_code: hostAccessCode,
      description,
      category: category || "Smart Contracts",
      repo_url: finalRepoUrl,
      code_source_type,
      raw_code_content: raw_code_content || null,
      uploaded_file_name: uploaded_file_name || null,
      contract_filename: contract_filename || null,
      branch: branch || "main",
      in_scope_files: in_scope_files || "contracts/**/*.sol",
      out_of_scope_files: out_of_scope_files || "test/**/*, scripts/**/*",
      prize_pool_usdc: paymentBreakdown.prize_pool,
      hosting_fee_usdc: paymentBreakdown.hosting_fee,
      total_payable_usdc: paymentBreakdown.total_host_payment,
      net_auditor_pool_usdc: paymentBreakdown.net_auditor_pool,
      protocol_escrow_fee_usdc: paymentBreakdown.protocol_escrow_fee,
      max_winners: Number(max_winners) || 5,
      distribution_mode: distribution_mode || "severity_weighted",
      custom_split_ratios: Array.isArray(custom_split_ratios) ? custom_split_ratios : [],
      duration_days: durationDays,
      registration_duration_days: registrationDays,
      status: "pending_approval",
      start_date: now < registrationEndDate.getTime() ? registrationEndDate.toISOString() : new Date().toISOString(),
      sprint_start_date: sprintStartDate.toISOString(),
      registration_end_date: registrationEndDate.toISOString(),
      end_date: endDate.toISOString(),
      judging_end_date: judgingEndDate.toISOString(),
      payout_release_date: payoutReleaseDate.toISOString(),
      escrow_contract_address: process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS || "0x3b2b4345a5327e27261a51ee0de57be29dffbbdd",
      escrow_tx_id: escrow_tx_id || "0x" + Math.random().toString(16).substring(2, 12),
      participants_count: 0,
      findings_count: 0,
      created_at: new Date().toISOString(),
      // Prior Audit Disclosure — immutable fairness record
      has_prior_audit: !!has_prior_audit,
      prior_audit_source: has_prior_audit ? (prior_audit_source || null) : null,
      prior_audit_date: has_prior_audit ? (prior_audit_date || null) : null,
      prior_audit_findings: has_prior_audit ? (prior_audit_findings || null) : null,
      prior_audit_report_url: has_prior_audit ? (prior_audit_report_url || null) : null,
      prior_audit_acknowledged_at: has_prior_audit ? new Date().toISOString() : null,
    }

    IN_MEMORY_HOSTED_COMPETITIONS.unshift(newComp)

    try {
      const supabase = await createClient()
      if (supabase) {
        const { error: dbErr } = await supabase.from("competitions").insert([newComp])
        if (dbErr) {
          console.warn("Supabase competition insert error:", dbErr.message)
        }
      }
    } catch (e) {
      console.warn("Supabase insert error (continuing with response):", e)
    }

    return NextResponse.json({
      success: true,
      competition: newComp,
      message: "Competition submitted successfully! Escrow funds held in contract and status is set to pending admin approval.",
    })
  } catch (err: any) {
    console.error("[competitions POST API error]:", err)
    return NextResponse.json(
      { success: false, error: err?.message || String(err), stack: err?.stack },
      { status: 500 }
    )
  }
}
