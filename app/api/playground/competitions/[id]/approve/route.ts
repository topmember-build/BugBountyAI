import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { notifyContractDeposit, refundContractFee } from "@/lib/escrow-contract"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { action, reason } = body

    if (!action || !["approve", "decline"].includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid action. Must be 'approve' or 'decline'." }, { status: 400 })
    }

    const supabase = await createClient()

    // Fetch target competition
    const { data: comp, error: fetchErr } = await supabase
      .from("competitions")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchErr || !comp) {
      return NextResponse.json({ success: false, error: "Competition not found" }, { status: 404 })
    }

    if (action === "approve") {
      // 1. Notify Escrow contract deposit registration on Arc Testnet
      const escrowResult = await notifyContractDeposit({
        auditUuid: id,
        depositor: comp.host_wallet_address || comp.depositor || process.env.ESCROW_OPERATOR_ADDRESS || "0x8734b4E4aa0a8968D86fddAB5Cc90c7fa7B5Ef82",
        amount: Number(comp.prize_pool_usdc) || 1000,
      })

      // 2. Update status to active
      await supabase
        .from("competitions")
        .update({
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)

      return NextResponse.json({
        success: true,
        status: "active",
        escrow_tx: escrowResult.txHash,
        message: "Competition approved! Escrow funds acknowledged on Arc Testnet and sprint is now live in the Arena.",
      })
    } else {
      // action === "decline"
      // 1. Trigger refund on BugBountyEscrow.sol on Arc Testnet
      const refundResult = await refundContractFee({
        auditUuid: id,
      })

      // 2. Update status to declined
      await supabase
        .from("competitions")
        .update({
          status: "declined",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)

      return NextResponse.json({
        success: true,
        status: "declined",
        refund_tx: refundResult.externalId,
        refund_simulated: refundResult.simulated,
        message: `Competition declined. Funds refunded back to host wallet (${comp.host_wallet_address || "depositor"}) minus protocol escrow fee.`,
      })
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to process competition approval" }, { status: 500 })
  }
}
