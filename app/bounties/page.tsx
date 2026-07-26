"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Navigation } from "@/components/landing/navigation"
import { FooterSection } from "@/components/landing/footer-section"
import { HostCompetitionModal } from "@/components/playground/host-competition-modal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ShieldCheck, Search, Trophy, ExternalLink, Zap, Clock, Code, ArrowUpRight, DollarSign, Lock, AlertTriangle, Sparkles, Filter } from "lucide-react"

export default function BountiesPage() {
  const [bounties, setBounties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  const fetchBounties = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/playground/competitions")
      const data = await res.json()
      if (data.success && Array.isArray(data.competitions)) {
        setBounties(data.competitions)
      }
    } catch (err) {
      console.error("Failed to load bounties:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBounties()
  }, [])

  const filteredBounties = bounties.filter((b) => {
    const matchesCategory = selectedCategory === "all" || (b.category && b.category.toLowerCase() === selectedCategory.toLowerCase())
    const matchesSearch =
      (b.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.sponsor_name || b.protocol_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.description || "").toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const totalBountyPool = bounties.reduce((acc, b) => acc + (b.prize_pool_usdc || b.max_bounty_usdc || 0), 0)
  const totalPaidOut = 0
  const totalResearchers = bounties.reduce((acc, b) => acc + (b.participants_count || b.active_hackers_count || 0), 0)

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      <Navigation />

      <main className="flex-1 pt-28 pb-20">
        <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/60 p-8 sm:p-12 backdrop-blur-2xl shadow-2xl">
            <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-primary/15 blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-6 max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Escrow-Guaranteed Live Bug Bounty Directory</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
                Audit, Discover Vulnerabilities & Earn USDC Rewards
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                Explore active protocol bug bounties with 100% on-chain escrow protection on Arc Testnet. Submit verified Proof-of-Concept (PoC) exploit reports or dispatch AI agents to earn instant rewards.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <HostCompetitionModal onCreated={fetchBounties} />
              </div>
            </div>

            {/* Platform Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-10 mt-8 border-t border-border/60 relative z-10">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Active Max Bounty Pool</p>
                <p className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight font-mono">${totalBountyPool.toLocaleString()} USDC</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Total Rewards Distributed</p>
                <p className="text-2xl sm:text-3xl font-black text-foreground tracking-tight font-mono">${totalPaidOut.toLocaleString()} USDC</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Escrow Protocol</p>
                <p className="text-2xl sm:text-3xl font-black text-purple-400 tracking-tight">Arc Testnet</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Active Security Researchers</p>
                <p className="text-2xl sm:text-3xl font-black text-primary tracking-tight">{totalResearchers} Researchers</p>
              </div>
            </div>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full sm:w-auto">
              <TabsList className="bg-card/80 border border-border p-1 rounded-full flex-wrap">
                <TabsTrigger value="all" className="rounded-full text-xs font-semibold px-4">
                  All Programs ({bounties.length})
                </TabsTrigger>
                <TabsTrigger value="DeFi" className="rounded-full text-xs font-semibold px-4">
                  DeFi
                </TabsTrigger>
                <TabsTrigger value="Smart Contracts" className="rounded-full text-xs font-semibold px-4">
                  Smart Contracts
                </TabsTrigger>
                <TabsTrigger value="AI Agents" className="rounded-full text-xs font-semibold px-4">
                  AI Agents
                </TabsTrigger>
                <TabsTrigger value="Infrastructure" className="rounded-full text-xs font-semibold px-4">
                  Infrastructure
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search protocols or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs rounded-full bg-card/60 border-border"
              />
            </div>
          </div>

          {/* Bug Bounty Cards Grid / Empty State */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="h-[280px] rounded-2xl border border-border/60 bg-card/40 animate-pulse p-6" />
              ))}
            </div>
          ) : filteredBounties.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-emerald-500/30 bg-card/40 backdrop-blur-xl p-8 sm:p-12 text-center space-y-5 max-w-xl mx-auto my-8 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner">
                <Trophy className="h-8 w-8 text-emerald-400" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">No Live Bounties Yet</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {bounties.length === 0
                    ? "There are currently no active bug bounty programs hosted on the platform. Be the first protocol sponsor to launch an escrow-backed bounty!"
                    : `No bounty programs match your current filter query ("${searchQuery || selectedCategory}").`}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {(searchQuery || selectedCategory !== "all") && bounties.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}
                    className="rounded-full text-xs font-semibold"
                  >
                    Reset Filters
                  </Button>
                )}
                <HostCompetitionModal onCreated={fetchBounties} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredBounties.map((bounty) => {
                const title = bounty.title || "Live Bug Bounty Program"
                const sponsor = bounty.sponsor_name || bounty.protocol_name || "Protocol Sponsor"
                const prizePool = Number(bounty.prize_pool_usdc || bounty.max_bounty_usdc || 1000)
                const criticalPool = bounty.severity_breakdown?.critical_usdc || Math.round(prizePool * 0.5)
                const highPool = bounty.severity_breakdown?.high_usdc || Math.round(prizePool * 0.3)
                const mediumPool = bounty.severity_breakdown?.medium_usdc || Math.round(prizePool * 0.15)
                const lowPool = bounty.severity_breakdown?.low_usdc || Math.round(prizePool * 0.05)

                return (
                  <Card key={bounty.id} className="group relative flex flex-col justify-between overflow-hidden border border-border/60 bg-card/60 backdrop-blur-xl hover:border-emerald-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/5">
                    <CardHeader className="space-y-3 pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 rounded-full px-3 py-0.5">
                          <Zap className="h-3 w-3 text-emerald-400 animate-pulse" />
                          Live Bounty Program
                        </Badge>

                        <Badge variant="outline" className="border-border text-xs font-mono">
                          {bounty.category || "Smart Contracts"}
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-xl font-bold text-foreground group-hover:text-emerald-400 transition-colors">
                          {title}
                        </h3>
                        <p className="text-xs text-muted-foreground">Hosted by <strong className="text-foreground">{sponsor}</strong></p>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 py-2">
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {bounty.description}
                      </p>

                      {/* Max Reward Box */}
                      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <Trophy className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Max Critical Bounty</p>
                            <p className="text-xl font-black text-foreground font-mono">${prizePool.toLocaleString()} USDC</p>
                          </div>
                        </div>

                        <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[11px] font-mono gap-1">
                          <ShieldCheck className="h-3 w-3 text-emerald-400" />
                          Escrow Verified
                        </Badge>
                      </div>

                      {/* Severity Reward Tier Preview */}
                      <div className="grid grid-cols-4 gap-2 text-[11px] font-mono text-center pt-1">
                        <div className="p-2 rounded-xl border border-red-500/30 bg-red-500/10 space-y-0.5">
                          <p className="text-[9px] uppercase font-bold text-red-400">Critical</p>
                          <p className="font-bold text-foreground">${criticalPool.toLocaleString()}</p>
                        </div>
                        <div className="p-2 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-0.5">
                          <p className="text-[9px] uppercase font-bold text-amber-400">High</p>
                          <p className="font-bold text-foreground">${highPool.toLocaleString()}</p>
                        </div>
                        <div className="p-2 rounded-xl border border-blue-500/30 bg-blue-500/10 space-y-0.5">
                          <p className="text-[9px] uppercase font-bold text-blue-400">Medium</p>
                          <p className="font-bold text-foreground">${mediumPool.toLocaleString()}</p>
                        </div>
                        <div className="p-2 rounded-xl border border-border bg-background/40 space-y-0.5">
                          <p className="text-[9px] uppercase font-bold text-muted-foreground">Low</p>
                          <p className="font-bold text-foreground">${lowPool.toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-3 border-t border-border/40 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                        <Code className="h-3.5 w-3.5 text-primary" />
                        <span>Target Scope Verified</span>
                      </span>

                      <Button asChild size="sm" className="rounded-full gap-1 font-semibold bg-emerald-600 hover:bg-emerald-500 text-white">
                        <Link href={`/playground/${bounty.id}`}>
                          Submit PoC / Hunt
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          )}

        </div>
      </main>

      <FooterSection />
    </div>
  )
}
