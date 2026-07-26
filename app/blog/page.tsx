"use client"

import { useState } from "react"
import Link from "next/link"
import { Navigation } from "@/components/landing/navigation"
import { FooterSection } from "@/components/landing/footer-section"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Clock, ArrowUpRight, FileText, User, Sparkles } from "lucide-react"

export interface BlogPost {
  id: string
  slug: string
  title: string
  category: string
  read_time: string
  published_at: string
  author: string
  image: string
  summary: string
  featured?: boolean
}

const BLOG_POSTS: BlogPost[] = [
  {
    id: "end-of-manual-audits",
    slug: "end-of-manual-audits",
    title: "The End of Manual Audits — How Autonomous AI Swarms Scan Smart Contracts in 10 Minutes",
    category: "AI Security",
    read_time: "6 min read",
    published_at: "July 24, 2026",
    author: "BugBountyAI Security Research Team",
    image: "/images/blog/end-of-manual-audits.png",
    summary: "Traditional smart contract audits take 2 to 4 weeks and cost upwards of $50,000. Discover how multi-agent LLM swarms analyze Solidity AST vulnerability graphs to deliver 100% verified PoCs in minutes.",
    featured: true,
  },
  {
    id: "eliminating-partiality",
    slug: "eliminating-partiality",
    title: "Eliminating Partiality in Web3 Bug Bounties with Immutable Prior Audit Disclosures",
    category: "Platform Architecture",
    read_time: "5 min read",
    published_at: "July 22, 2026",
    author: "Security Protocol Labs",
    image: "/images/blog/eliminating-partiality.png",
    summary: "Retroactive rejection of valid bug bounty reports is a major friction point in Web3. Learn how BugBountyAI's Prior Audit Disclosure engine forces hosts to declare pre-known bugs on launch.",
    featured: true,
  },
  {
    id: "agent-monetization",
    slug: "agent-monetization",
    title: "On-Chain Agent Monetization: How Prompt Engineers Earn 67% Passive Royalties on Arc Testnet",
    category: "Web3 Monetization",
    read_time: "8 min read",
    published_at: "July 20, 2026",
    author: "Tokenomics Working Group",
    image: "/images/blog/agent-monetization.png",
    summary: "Prompt engineers can now deploy security agents on AgentIdentityRegistry.sol. Explore the mathematical breakdown of how custom agents earn 10% to 67% passive USDC royalties per sprint.",
  },
  {
    id: "flashloan-reentrancy-ast",
    slug: "flashloan-reentrancy-ast",
    title: "Deconstructing Flash Loan Attacks & Reentrancy Vectors with DeepSeek-R1 AST Graphs",
    category: "Vulnerability Deep Dive",
    read_time: "10 min read",
    published_at: "July 18, 2026",
    author: "Autonomous Security Lab",
    image: "/images/blog/flashloan-reentrancy-ast.png",
    summary: "An in-depth technical analysis of state modification ordering, spot price manipulation in AMM pools, and how automated formal verification detects subtle rounding precision flaws.",
  },
]

export default function BlogPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  const filteredPosts = BLOG_POSTS.filter((post) => {
    const matchesCat = selectedCategory === "all" || post.category.toLowerCase().includes(selectedCategory.toLowerCase())
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.summary.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCat && matchesSearch
  })

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      <Navigation />

      <main className="flex-1 pt-28 pb-20">
        <div className="max-w-[1250px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/60 p-8 sm:p-12 backdrop-blur-2xl shadow-2xl space-y-6">
            <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />

            <div className="space-y-4 max-w-3xl relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3.5 py-1 text-xs font-semibold text-purple-300 font-mono uppercase tracking-wider">
                <FileText className="h-3.5 w-3.5" />
                <span>Technical Engineering Journal</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
                Research, Insights & <span className="bg-gradient-to-r from-purple-400 via-primary to-emerald-400 bg-clip-text text-transparent">AI Security Analysis</span>
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                Deep-dive engineering articles covering multi-agent security swarms, smart contract vulnerability benchmarks, prior audit fairness, and on-chain royalty economics.
              </p>
            </div>
          </div>

          {/* Filter & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full sm:w-auto">
              <TabsList className="bg-card/80 border border-border p-1 rounded-full flex-wrap">
                <TabsTrigger value="all" className="rounded-full text-xs font-semibold px-4">
                  All Articles ({BLOG_POSTS.length})
                </TabsTrigger>
                <TabsTrigger value="AI Security" className="rounded-full text-xs font-semibold px-4">
                  AI Security
                </TabsTrigger>
                <TabsTrigger value="Platform Architecture" className="rounded-full text-xs font-semibold px-4">
                  Platform Architecture
                </TabsTrigger>
                <TabsTrigger value="Web3 Monetization" className="rounded-full text-xs font-semibold px-4">
                  Web3 Monetization
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search research topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs rounded-full bg-card/60 border-border"
              />
            </div>
          </div>

          {/* Blog Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredPosts.map((post) => (
              <Card key={post.id} className="group relative flex flex-col justify-between overflow-hidden border border-border/60 bg-card/60 backdrop-blur-xl transition-all duration-300 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/5">
                <div className="relative h-56 w-full overflow-hidden">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <Badge variant="outline" className="border-purple-500/40 bg-card/80 text-purple-300 backdrop-blur-md text-xs font-mono uppercase">
                      {post.category}
                    </Badge>
                  </div>
                </div>

                <div className="p-6 sm:p-8 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                      <span>{post.published_at}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {post.read_time}
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-bold text-foreground group-hover:text-purple-400 transition-colors leading-snug">
                      {post.title}
                    </h2>

                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-3">
                      {post.summary}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-border/40 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3.5 w-3.5 text-primary" />
                      <span>{post.author}</span>
                    </div>

                    <Button asChild size="sm" variant="ghost" className="gap-1 font-semibold text-xs text-purple-400 group-hover:text-purple-300">
                      <Link href={`/blog/${post.slug}`}>
                        Read Article
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

        </div>
      </main>

      <FooterSection />
    </div>
  )
}
