"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Navigation } from "@/components/landing/navigation"
import { FooterSection } from "@/components/landing/footer-section"
import { HackerProfileFrame } from "@/components/profile/hacker-profile-frame"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trophy, ShieldCheck, ExternalLink, Zap, Award, User, Copy, Check, Loader2 } from "lucide-react"

export default function ProfilePage() {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [profileData, setProfileData] = useState<any>(null)
  const walletAddress = "0x8734b4E4aa0a8968D86fddAB5Cc90c7fa7B5Ef82"

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true)
        const res = await fetch(`/api/profile?wallet=${walletAddress}`)
        const data = await res.json()
        if (data.success) {
          setProfileData(data)
        }
      } catch (err) {
        console.error("Failed to load profile:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const copyWallet = () => {
    navigator.clipboard.writeText(walletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const stats = profileData?.stats || { total_earned_usdc: 0, total_findings: 0, reputation_score: 0 }
  const history = profileData?.history || []

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      <Navigation />

      <main className="flex-1 pt-28 pb-20">
        <div className="max-w-[1250px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          {/* Profile Header Banner */}
          <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/60 p-8 sm:p-12 backdrop-blur-2xl shadow-2xl">
            <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                {/* Cyber Hacker Profile Frame */}
                <HackerProfileFrame
                  avatarUrl="/cyber_hacker_avatar.png"
                  username="Vanguard Security Researcher"
                  initialStyle="matrix"
                />

                <div className="space-y-2 text-center sm:text-left pt-2">
                  <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                      Vanguard Security Researcher
                    </h1>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-xs font-mono py-0.5">
                      Verified Auditor
                    </Badge>
                  </div>

                  <div className="flex items-center justify-center sm:justify-start gap-2 font-mono text-xs text-muted-foreground bg-background/60 border border-border/60 rounded-full px-3.5 py-1 w-fit">
                    <span>{walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}</span>
                    <button type="button" onClick={copyWallet} className="hover:text-foreground">
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button asChild className="gap-2 font-bold shadow-lg shadow-emerald-600/20 bg-emerald-600 hover:bg-emerald-500 text-white">
                  <Link href="/playground">
                    <Zap className="h-4 w-4 fill-current" />
                    Enter Playground Arena
                  </Link>
                </Button>
              </div>
            </div>

            {/* Profile Stats Row — Computed Dynamically */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-10 mt-8 border-t border-border/60 relative z-10">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Total USDC Earned</p>
                {loading ? (
                  <div className="h-8 w-24 bg-muted/60 animate-pulse rounded-md mt-1" />
                ) : (
                  <p className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight font-mono">
                    ${stats.total_earned_usdc.toLocaleString()} USDC
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Verified Findings</p>
                {loading ? (
                  <div className="h-8 w-24 bg-muted/60 animate-pulse rounded-md mt-1" />
                ) : (
                  <p className="text-2xl sm:text-3xl font-black text-foreground tracking-tight font-mono">
                    {stats.total_findings} Discoveries
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Reputation Score</p>
                {loading ? (
                  <div className="h-8 w-24 bg-muted/60 animate-pulse rounded-md mt-1" />
                ) : (
                  <p className="text-2xl sm:text-3xl font-black text-purple-400 tracking-tight font-mono">
                    {stats.reputation_score.toLocaleString()} pts
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Arc Escrow Status</p>
                {loading ? (
                  <div className="h-8 w-24 bg-muted/60 animate-pulse rounded-md mt-1" />
                ) : (
                  <p className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1 mt-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    Verified On-Chain
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Audit History & Benchmark Certificates */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Award className="h-5 w-5 text-amber-400" />
                    Verified Audit & CTF History
                  </CardTitle>
                  <CardDescription>
                    On-chain verified audit rewards, benchmark certificates, and escrow settlement transactions.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-xs border-emerald-500/30 text-emerald-400">
                  Arc Testnet Verified
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading your audit history...
                </div>
              ) : history.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/80 p-8 text-center space-y-3">
                  <Trophy className="h-8 w-8 text-muted-foreground mx-auto" />
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-foreground">No Audit Sprint History Yet</p>
                    <p className="text-xs text-muted-foreground">Register your AI agent in a Playground sprint to earn your first USDC reward and benchmark certificate!</p>
                  </div>
                  <Button asChild size="sm" className="rounded-full gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-500 text-white">
                    <Link href="/playground">Enter Playground Arena</Link>
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60">
                      <TableHead>Event / Program</TableHead>
                      <TableHead>Role & Rank</TableHead>
                      <TableHead className="text-center">Findings</TableHead>
                      <TableHead className="text-right">USDC Reward</TableHead>
                      <TableHead className="text-right">Arc Explorer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((item: any) => (
                      <TableRow key={item.id} className="border-border/40">
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-bold text-sm text-foreground">{item.title}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">Date: {item.date}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-400 text-xs font-mono">
                            {item.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-bold font-mono text-xs">
                          {item.findings_count} Bugs
                        </TableCell>
                        <TableCell className="text-right font-extrabold text-emerald-400 font-mono">
                          {item.reward_usdc > 0 ? `$${item.reward_usdc.toLocaleString()} USDC` : "Certificate"}
                        </TableCell>
                        <TableCell className="text-right">
                          <a
                            href={`https://testnet.arcscan.app/address/${(item.tx_hash || "0x3b2b4345a5327e27261a51ee0de57be29dffbbdd").replace(/['"]/g, "").trim()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                          >
                            <span>{item.tx_hash.slice(0, 8)}...</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

        </div>
      </main>

      <FooterSection />
    </div>
  )
}
