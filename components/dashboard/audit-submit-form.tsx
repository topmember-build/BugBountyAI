"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSWRConfig } from "swr"
import useSWR from "swr"
import type { Agent } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, ShieldCheck, GitBranch, Package, FileCode2, Check, Minus } from "lucide-react"

const selectableAgents = [
  { id: "security", name: "Security Agent", icon: ShieldCheck },
  { id: "logic", name: "Logic Agent", icon: GitBranch },
  { id: "dependency", name: "Dependency Agent", icon: Package },
  { id: "smart_contract", name: "Smart Contract Agent", icon: FileCode2 },
]

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function AuditSubmitForm({
  feeTransactionId,
  archivePath,
  archiveFilename,
  initialSelectedAgentIds = [],
}: {
  feeTransactionId: string | null
  archivePath?: string | null
  archiveFilename?: string | null
  initialSelectedAgentIds?: string[]
}) {
  const [scanType, setScanType] = useState<"github" | "smart_contract_paste" | "smart_contract_file" | "project_folder">(
    archivePath ? "project_folder" : "github"
  )
  const [repoUrl, setRepoUrl] = useState("")
  const [branch, setBranch] = useState("main")
  const [contractCode, setContractCode] = useState("")
  const [contractFilename, setContractFilename] = useState("")
  const [internalArchivePath, setInternalArchivePath] = useState<string | null>(archivePath ?? null)
  const [internalArchiveFilename, setInternalArchiveFilename] = useState<string | null>(archiveFilename ?? null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const router = useRouter()
  const { mutate } = useSWRConfig()

  useEffect(() => {
    if (archivePath) {
      setInternalArchivePath(archivePath)
      setScanType("project_folder")
    }
  }, [archivePath])

  useEffect(() => {
    if (archiveFilename) {
      setInternalArchiveFilename(archiveFilename)
    }
  }, [archiveFilename])

  const [dashboardAgentIds, setDashboardAgentIds] = useState<string[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("dashboard_agent_ids")
    if (saved) {
      try {
        setDashboardAgentIds(JSON.parse(saved))
      } catch (e) {
        // ignore
      }
    }
  }, [])

  const saveDashboardAgentIds = (ids: string[]) => {
    setDashboardAgentIds(ids)
    localStorage.setItem("dashboard_agent_ids", JSON.stringify(ids))
  }

  useEffect(() => {
    if (initialSelectedAgentIds.length > 0) {
      setSelectedAgentIds((prev) => Array.from(new Set([...prev, ...initialSelectedAgentIds])))
      setDashboardAgentIds((prev) => {
        const next = Array.from(new Set([...prev, ...initialSelectedAgentIds]))
        localStorage.setItem("dashboard_agent_ids", JSON.stringify(next))
        return next
      })
    }
  }, [initialSelectedAgentIds])

  const { data: registeredData, isLoading: registeredLoading } = useSWR<{ agents: Agent[] }>(
    "/api/agents?mine=1",
    fetcher,
    { revalidateOnFocus: false },
  )
  const { data: publicAgentsData, isLoading: publicAgentsLoading } = useSWR<{ agents: Agent[] }>(
    "/api/agents",
    fetcher,
    { revalidateOnFocus: false },
  )

  const registeredAgents = registeredData?.agents ?? []
  const publicAgents = publicAgentsData?.agents ?? []

  // Auto-populate dashboard with user's own registered agents if not initialized
  useEffect(() => {
    if (registeredAgents.length > 0 && !localStorage.getItem("dashboard_agent_ids")) {
      const ids = registeredAgents.map((a) => a.id)
      saveDashboardAgentIds(ids)
    }
  }, [registeredAgents])

  const toggleAgent = (id: string) => {
    setSelectedAgents((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    )
  }

  const handleRemoveAgent = (e: React.MouseEvent, agentId: string) => {
    e.stopPropagation() // Prevent selecting/deselecting the agent card
    const nextDashboardIds = dashboardAgentIds.filter((id) => id !== agentId)
    saveDashboardAgentIds(nextDashboardIds)
    setSelectedAgentIds((prev) => prev.filter((id) => id !== agentId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    if (!feeTransactionId) {
      setError("Authorize the audit fee with your Circle wallet before submitting.")
      setIsSubmitting(false)
      return
    }

    if (selectedAgentIds.length === 0 && selectedAgents.length === 0) {
      setError("Please select at least one agent or agent specialty.")
      setIsSubmitting(false)
      return
    }

    if (scanType === "github" && !repoUrl.trim()) {
      setError("Repository URL is required.")
      setIsSubmitting(false)
      return
    }

    if ((scanType === "smart_contract_paste" || scanType === "smart_contract_file") && !contractCode.trim()) {
      setError("Smart contract code is required. Please paste code or upload a file.")
      setIsSubmitting(false)
      return
    }

    if (scanType === "project_folder" && !internalArchivePath) {
      setError("Please upload a project folder archive (.zip).")
      setIsSubmitting(false)
      return
    }

    try {
      const payload: any = {
        agents: selectedAgents,
        agent_ids: selectedAgentIds,
        fee_transaction_id: feeTransactionId,
      }

      if (scanType === "github") {
        payload.repo_url = repoUrl.trim()
        payload.branch = branch.trim() || "main"
      } else if (scanType === "smart_contract_paste" || scanType === "smart_contract_file") {
        payload.contract_code = contractCode
        payload.contract_filename = contractFilename || "contract.sol"
      } else if (scanType === "project_folder") {
        payload.archive_path = internalArchivePath
        payload.archive_filename = internalArchiveFilename
      }

      const res = await fetch("/api/audits", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const responseText = await res.text()
      let data: any
      try {
        data = JSON.parse(responseText)
      } catch {
        throw new Error(responseText || "Audit failed")
      }
      if (!res.ok) {
        const message = data.error ?? "Audit failed"
        if (message.toLowerCase().includes("refund") || message.toLowerCase().includes("refunded")) {
          setSuccessMessage(message)
        } else {
          throw new Error(message)
        }
        return
      }

      // Refresh audits list, metrics, wallet state, and leaderboard
      await Promise.all([
        mutate("/api/audits"),
        mutate("/api/metrics"),
        mutate("/api/agents"),
        mutate("/api/wallet"),
      ])

      setRepoUrl("")
      setContractCode("")
      setContractFilename("")
      setInternalArchivePath(null)
      setInternalArchiveFilename(null)
      if (data.audit?.id) router.push(`/dashboard/audits/${data.audit.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  const visibleAgents = React.useMemo(() => {
    const agentMap = new Map<string, Agent>()

    const addAgent = (agent: Agent) => {
      const key = agent.id
      if (!agentMap.has(key)) {
        agentMap.set(key, agent)
      }
    }

    registeredAgents.forEach((agent) => {
      if (dashboardAgentIds.includes(agent.id)) {
        addAgent(agent)
      }
    })
    publicAgents.forEach((agent) => {
      if (dashboardAgentIds.includes(agent.id)) {
        addAgent(agent)
      }
    })

    selectedAgentIds
      .map((id) => publicAgents.find((agent) => agent.id === id) ?? registeredAgents.find((agent) => agent.id === id))
      .filter((agent): agent is Agent => Boolean(agent))
      .forEach(addAgent)

    return Array.from(agentMap.values())
  }, [publicAgents, registeredAgents, dashboardAgentIds, selectedAgentIds])

  const isAgentSelectionLoading = registeredLoading || (selectedAgentIds.length > 0 && publicAgentsLoading)

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-border rounded-xl bg-card p-6 lg:p-8"
    >
      <div className="space-y-6">
        {/* Scan Target Selection */}
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="scan_type">Scan Target Type</Label>
            <select
              id="scan_type"
              value={scanType}
              onChange={(e) => {
                setScanType(e.target.value as any)
                setUploadError(null)
              }}
              className="border-input dark:bg-input/30 flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="github" className="bg-popover text-foreground">GitHub Repository</option>
              <option value="smart_contract_paste" className="bg-popover text-foreground">Paste Smart Contract Code</option>
              <option value="smart_contract_file" className="bg-popover text-foreground">Upload Smart Contract File</option>
              <option value="project_folder" className="bg-popover text-foreground">Upload Project Folder (.zip)</option>
            </select>
          </div>

          {scanType === "github" && (
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 grid gap-2">
                <Label htmlFor="repo_url">Repository URL</Label>
                <Input
                  id="repo_url"
                  type="url"
                  required
                  placeholder="https://github.com/org/repo"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                />
              </div>
              <div className="w-full md:w-40 grid gap-2">
                <Label htmlFor="branch">Branch</Label>
                <Input
                  id="branch"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                />
              </div>
            </div>
          )}

          {scanType === "smart_contract_paste" && (
            <div className="grid gap-2">
              <Label htmlFor="contract_code">Smart Contract Code</Label>
              <Textarea
                id="contract_code"
                required
                placeholder="Paste contract code here..."
                className="font-mono min-h-60 text-sm"
                value={contractCode}
                onChange={(e) => setContractCode(e.target.value)}
              />
            </div>
          )}

          {scanType === "smart_contract_file" && (
            <div className="grid gap-2">
              <Label htmlFor="contract_file">Upload Smart Contract File</Label>
              <Input
                id="contract_file"
                type="file"
                required={!contractCode}
                accept=".sol,.vy,.json,.js,.ts,.py"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setContractFilename(file.name)
                    const reader = new FileReader()
                    reader.onload = (evt) => {
                      if (evt.target?.result) {
                        setContractCode(evt.target.result as string)
                      }
                    }
                    reader.readAsText(file)
                  }
                }}
              />
              {contractFilename && (
                <p className="text-xs text-muted-foreground mt-1">
                  Loaded contract file: <span className="font-mono">{contractFilename}</span> ({contractCode.length} characters)
                </p>
              )}
            </div>
          )}

          {scanType === "project_folder" && (
            <div className="grid gap-2">
              <Label htmlFor="project_folder_file">Upload Project Folder Archive (.zip)</Label>
              <Input
                id="project_folder_file"
                type="file"
                required={!internalArchivePath}
                accept=".zip,.tar,.gz,.7z"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setIsUploading(true)
                    setUploadError(null)
                    try {
                      const uploadFormData = new FormData()
                      uploadFormData.append("file", file)
                      const res = await fetch("/api/uploads", {
                        method: "POST",
                        body: uploadFormData,
                      })
                      const responseText = await res.text()
                      let data: any
                      try {
                        data = JSON.parse(responseText)
                      } catch {
                        throw new Error(responseText || "Failed to upload folder archive")
                      }
                      if (!res.ok) {
                        throw new Error(data.error ?? "Failed to upload folder archive")
                      }
                      setInternalArchivePath(data.path)
                      setInternalArchiveFilename(data.fileName)
                    } catch (err: any) {
                      setUploadError(err.message)
                    } finally {
                      setIsUploading(false)
                    }
                  }
                }}
              />
              {isUploading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Uploading folder archive...
                </div>
              )}
              {uploadError && (
                <p className="text-xs text-destructive mt-1">
                  Upload failed: {uploadError}
                </p>
              )}
              {internalArchiveFilename && !isUploading && (
                <p className="text-xs text-green-500 mt-1">
                  Uploaded successfully: <span className="font-mono">{internalArchiveFilename}</span>
                </p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold">Need more agents?</h3>
              <p className="text-xs text-muted-foreground">
                Browse the marketplace and bring trained agents into your audit setup.
              </p>
            </div>
            <Button type="button" variant="default" size="sm" asChild>
              <Link href="/agents">Browse agent marketplace</Link>
            </Button>
          </div>
        </div>

        {/* Use registered agents */}
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-semibold text-sm">Use trained agents</h3>
            {selectedAgentIds.length > 0 ? (
              <span className="inline-flex w-fit items-center gap-2 text-xs font-mono px-2 py-1 rounded-full bg-primary text-primary-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Using registered agents
              </span>
            ) : null}
          </div>
          {isAgentSelectionLoading ? (
            <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
              Loading your agents...
            </div>
          ) : visibleAgents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              No selected trained agents available. Choose agents from the marketplace or register one.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {visibleAgents.map((agent) => {
                const isSelected = selectedAgentIds.includes(agent.id)
                return (
                  <div
                    key={agent.id}
                    className={`relative group flex w-full flex-col items-start gap-2 rounded-lg border p-3 transition-all duration-300 ${
                      isSelected
                        ? "border-primary bg-accent"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedAgentIds((prev) =>
                          prev.includes(agent.id) ? prev.filter((id) => id !== agent.id) : [...prev, agent.id],
                        )
                      }
                      className="flex w-full flex-col items-start gap-2 text-left"
                    >
                      <div className="flex w-full flex-col gap-1 sm:flex-row sm:items-center sm:justify-between pr-6">
                        <span className="text-sm font-medium">{agent.name}</span>
                        <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                          {agent.agent_type.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 pr-6">{agent.description ?? "No description."}</p>
                      {isSelected && <span className="text-xs font-medium text-primary">Selected</span>}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleRemoveAgent(e, agent.id)}
                      className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive/15 text-destructive transition-all duration-200 hover:bg-destructive hover:text-white"
                      title="Remove agent from dashboard"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
          <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Selecting trained agents will use their custom guidance; otherwise you can choose specialties below.
            </p>
            <Button type="button" variant="outline" size="sm" asChild>
              <a href="/agents">Browse agent marketplace</a>
            </Button>
          </div>
        </div>

        {/* Choose Agents */}
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-semibold text-sm">Choose agent specialties</h3>
            {selectedAgents.length > 0 && selectedAgentIds.length === 0 ? (
              <span className="inline-flex w-fit items-center gap-2 text-xs font-mono px-2 py-1 rounded-full bg-accent text-accent-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Audit Swarm Ready
              </span>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {selectableAgents.map((agent) => {
              const Icon = agent.icon
              const isSelected = selectedAgents.includes(agent.id)
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => toggleAgent(agent.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all duration-300 ${
                    isSelected
                      ? "border-primary bg-accent"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="flex-1 text-sm font-medium">{agent.name}</span>
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Submit Section */}
        <div className="flex items-center gap-2 pt-2">
          <Button type="submit" disabled={isSubmitting || selectedAgents.length === 0}>
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : "Request audit"}
          </Button>
        </div>

        {error ? <div className="text-sm text-destructive">{error}</div> : null}
        {successMessage ? <div className="text-sm text-emerald-600">{successMessage}</div> : null}
      </div>
    </form>
  )
}
