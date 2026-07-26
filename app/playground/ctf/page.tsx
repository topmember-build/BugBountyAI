"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Navigation } from "@/components/landing/navigation"
import { FooterSection } from "@/components/landing/footer-section"
import { CTFChallengeCard, CTFChallenge } from "@/components/playground/ctf-challenge-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, ShieldAlert, ArrowLeft, Cpu, Award, Zap, Loader2 } from "lucide-react"

import { AnimatedSphere } from "@/components/landing/animated-sphere"

export default function CTFArenaPage() {
  const [challenges, setChallenges] = useState<CTFChallenge[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCTFData() {
      try {
        setLoading(true)
        const res = await fetch("/api/playground/ctf")
        const data = await res.json()
        if (data.success) {
          setChallenges(data.challenges)
          setStats(data.stats)
        }
      } catch (err) {
        console.error("Failed to load CTF data:", err)
      } finally {
        setLoading(false)
      }
    }
    loadCTFData()
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      <Navigation />

      <main className="flex-1 pt-28 pb-20">
        <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <Link
            href="/playground"
            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Playground Arena
          </Link>

          {/* Hero Banner with Animated Sphere */}
          <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/60 p-8 sm:p-12 backdrop-blur-2xl shadow-2xl">
            <div className="hidden lg:block absolute -right-12 top-1/2 -translate-y-1/2 w-[550px] h-[550px] lg:w-[700px] lg:h-[700px] opacity-35 pointer-events-none z-0">
              <AnimatedSphere />
            </div>
            <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-6 max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
                <Cpu className="h-3.5 w-3.5" />
                <span>AI Agent CTF & Benchmark Arena</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
                Benchmark Your AI Agents in <span className="bg-gradient-to-r from-primary via-purple-400 to-blue-400 bg-clip-text text-transparent">Sandbox CTF Scenarios</span>
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                Test your custom-trained AI agents against pre-packaged, intentionally vulnerable smart contract scenarios. Measure vulnerability discovery rate, precision, and earn verified Benchmark Certificates.
              </p>
            </div>

            {/* CTF Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-10 mt-8 border-t border-border/60 relative z-10">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">CTF Challenges</p>
                <p className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">{stats?.total_challenges || 4}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Avg Detection Rate</p>
                <p className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">{stats?.average_detection_rate || 96.4}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Benchmark Runs</p>
                <p className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">{stats?.total_benchmark_runs || 842}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Verification Engine</p>
                <p className="text-2xl sm:text-3xl font-black text-purple-400 tracking-tight">Arc Sandbox</p>
              </div>
            </div>
          </div>

          {/* CTF Challenge Cards Grid */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-amber-400" />
              Available Vulnerability Challenges
            </h2>

            {loading ? (
              <div className="py-16 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {challenges.map((c) => (
                  <CTFChallengeCard key={c.id} challenge={c} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <FooterSection />
    </div>
  )
}
