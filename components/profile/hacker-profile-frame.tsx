"use client"

import { useState } from "react"
import Image from "next/image"
import { ShieldCheck, Terminal, Sparkles, Zap, Flame, Award, Crosshair } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export type HackerFrameStyle = "matrix" | "void" | "gold" | "crimson"

interface HackerProfileFrameProps {
  avatarUrl?: string
  username?: string
  initialStyle?: HackerFrameStyle
}

export function HackerProfileFrame({
  avatarUrl = "/cyber_hacker_avatar.png",
  username = "Vanguard Security Researcher",
  initialStyle = "matrix",
}: HackerProfileFrameProps) {
  const [frameStyle, setFrameStyle] = useState<HackerFrameStyle>(initialStyle)

  // Style mappings for different Cyber Hacker frames
  const frameConfigs = {
    matrix: {
      name: "Neon Matrix",
      borderGradient: "from-emerald-400 via-teal-500 to-cyan-500",
      glowColor: "rgba(16, 185, 129, 0.4)",
      cornerColor: "border-emerald-400 text-emerald-400",
      badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      icon: Terminal,
      rankTitle: "CYBER HACKER // VERIFIED AUDITOR",
    },
    void: {
      name: "Void Shadow",
      borderGradient: "from-purple-500 via-indigo-500 to-blue-500",
      glowColor: "rgba(168, 85, 247, 0.4)",
      cornerColor: "border-purple-400 text-purple-400",
      badgeBg: "bg-purple-500/20 text-purple-300 border-purple-500/40",
      icon: Sparkles,
      rankTitle: "ELITE VOID RED-TEAM HACKER",
    },
    gold: {
      name: "Gold Arbiter",
      borderGradient: "from-amber-400 via-yellow-500 to-orange-500",
      glowColor: "rgba(245, 158, 11, 0.4)",
      cornerColor: "border-amber-400 text-amber-400",
      badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      icon: Award,
      rankTitle: "LEGENDARY ARBITER // TOP 1%",
    },
    crimson: {
      name: "Crimson Breach",
      borderGradient: "from-red-500 via-rose-600 to-pink-500",
      glowColor: "rgba(239, 68, 68, 0.4)",
      cornerColor: "border-red-400 text-red-400",
      badgeBg: "bg-red-500/20 text-red-300 border-red-500/40",
      icon: Flame,
      rankTitle: "CRITICAL BREACH HUNTER",
    },
  }

  const currentConfig = frameConfigs[frameStyle]
  const ActiveIcon = currentConfig.icon

  return (
    <div className="flex flex-col items-center sm:items-start gap-3">
      {/* Outer Hacker Profile Container */}
      <div className="relative group">
        {/* Outer Pulsing Glow Aura */}
        <div
          className="absolute -inset-1.5 rounded-3xl blur-md opacity-75 group-hover:opacity-100 transition-all duration-500 animate-pulse"
          style={{ background: `linear-gradient(to right, ${currentConfig.glowColor}, transparent)` }}
        />

        {/* Rotating Futuristic HUD Outer Ring */}
        <div className="relative p-1.5 rounded-[28px] bg-background/90 border border-border shadow-2xl backdrop-blur-xl">
          {/* Cyber Corner Reticle Accents */}
          <span className={`absolute -top-1 -left-1 h-3.5 w-3.5 border-t-2 border-l-2 ${currentConfig.cornerColor} rounded-tl-md z-20`} />
          <span className={`absolute -top-1 -right-1 h-3.5 w-3.5 border-t-2 border-r-2 ${currentConfig.cornerColor} rounded-tr-md z-20`} />
          <span className={`absolute -bottom-1 -left-1 h-3.5 w-3.5 border-b-2 border-l-2 ${currentConfig.cornerColor} rounded-bl-md z-20`} />
          <span className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 border-b-2 border-r-2 ${currentConfig.cornerColor} rounded-br-md z-20`} />

          {/* Animated Gradient Frame Ring */}
          <div className={`relative h-24 w-24 sm:h-28 sm:w-28 rounded-2xl p-[2px] bg-gradient-to-br ${currentConfig.borderGradient} overflow-hidden`}>
            {/* Inner Avatar Display */}
            <div className="relative h-full w-full rounded-[14px] bg-slate-950 overflow-hidden flex items-center justify-center">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={username}
                  width={112}
                  height={112}
                  className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                  priority
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-primary">
                  <Terminal className="h-10 w-10 animate-pulse" />
                </div>
              )}

              {/* Cyber Scanline Overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent pointer-events-none opacity-30 group-hover:opacity-60 transition-opacity" />

              {/* Live LED Status Badge */}
              <div className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-white/10 z-20">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                <span className="text-[9px] font-mono text-emerald-300 font-bold tracking-tight">LIVE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Crosshair Target Icon Badge */}
        <div className={`absolute -bottom-2 -right-2 p-1.5 rounded-xl bg-background border ${currentConfig.cornerColor} shadow-lg z-30`}>
          <Crosshair className="h-4 w-4 animate-spin-slow" />
        </div>
      </div>

      {/* Cyber Rank Tag & Frame Selector */}
      <div className="flex flex-col items-center sm:items-start gap-1.5">
        <Badge variant="outline" className={`text-[10px] font-mono tracking-wider uppercase font-bold gap-1 px-2.5 py-0.5 ${currentConfig.badgeBg}`}>
          <ActiveIcon className="h-3 w-3" />
          <span>{currentConfig.rankTitle}</span>
        </Badge>

        {/* Cyber Frame Selector Options */}
        <div className="flex items-center gap-1 pt-1">
          {(Object.keys(frameConfigs) as HackerFrameStyle[]).map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => setFrameStyle(style)}
              title={`Switch to ${frameConfigs[style].name} Frame`}
              className={`h-4 w-4 rounded-full border transition-all ${
                frameStyle === style
                  ? "scale-125 border-white ring-2 ring-purple-500/50"
                  : "opacity-60 hover:opacity-100 border-border"
              }`}
              style={{
                background:
                  style === "matrix"
                    ? "#10b981"
                    : style === "void"
                      ? "#a855f7"
                      : style === "gold"
                        ? "#f59e0b"
                        : "#ef4444",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
