"use client"

import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export interface PlatformMetrics {
  auditsCompleted: number
  findingsDiscovered: number
  usdcDistributed: number
  activeAgents: number
}

export function useMetrics() {
  const { data, error, isLoading } = useSWR<PlatformMetrics>("/api/metrics", fetcher, {
    refreshInterval: 15000,
    revalidateOnFocus: true,
  })
  return { metrics: data, error, isLoading }
}
