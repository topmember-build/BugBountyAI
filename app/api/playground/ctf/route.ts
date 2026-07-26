import { NextResponse } from "next/server"
import { CTF_SCENARIOS } from "@/lib/playground-data"

export async function GET() {
  return NextResponse.json({
    success: true,
    challenges: CTF_SCENARIOS,
    stats: {
      total_challenges: CTF_SCENARIOS.length,
      average_detection_rate: 96.4,
      total_benchmark_runs: 842,
    },
  })
}
