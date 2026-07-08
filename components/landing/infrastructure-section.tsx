"use client";

import { useEffect, useState, useRef, type ChangeEvent, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShieldAlert, GitBranch, Package, FileCode2, Github, Upload, Check } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

const selectableAgents = [
  { id: "security", name: "Security Agent", icon: ShieldAlert, task: "Scanning authentication" },
  { id: "logic", name: "Logic Agent", icon: GitBranch, task: "Reviewing payment flows" },
  { id: "dependency", name: "Dependency Agent", icon: Package, task: "Checking packages" },
  { id: "contract", name: "Smart Contract Agent", icon: FileCode2, task: "Auditing contract logic" },
];

export function AuditSwarmSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [selected, setSelected] = useState<string[]>(["security", "logic", "dependency"]);
  const [running, setRunning] = useState(true);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadPath, setUploadPath] = useState<string | null>(null);
  const [uploadFilename, setUploadFilename] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { t } = useLanguage();
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();


  const uploadArchive = async (file: File) => {
    setIsUploading(true);
    setUploadStatus("Uploading archive...");
    setFileError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed.");

      setUploadPath(data.path ?? null);
      setUploadFilename(data.fileName ?? null);
      setUploadStatus("Upload complete.");
    } catch (error) {
      setUploadPath(null);
      setUploadFilename(null);
      setUploadStatus(null);
      setFileError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFiles = (files: FileList) => {
    const fileArray = Array.from(files).filter((file) => file.type === "application/zip" || file.name.endsWith(".zip") || file.name.endsWith(".tar") || file.name.endsWith(".gz") || file.name.endsWith(".7z"));
    if (fileArray.length === 0) {
      setFileError("Please add a ZIP or compressed source archive.");
      setUploadedFiles([]);
      setUploadPath(null);
      setUploadFilename(null);
      setUploadStatus(null);
      return;
    }
    setFileError(null);
    setUploadedFiles(fileArray);
    uploadArchive(fileArray[0]);
  };

  const onDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(true);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
    if (event.dataTransfer.files?.length) {
      handleFiles(event.dataTransfer.files);
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      handleFiles(event.target.files);
    }
  };

  const onLaunchAudit = () => {
    const base = "/dashboard";
    if (uploadPath && uploadFilename) {
      const params = new URLSearchParams({
        archivePath: uploadPath,
        archiveFilename: uploadFilename,
      });
      router.push(`${base}?${params.toString()}`);
      return;
    }

    router.push(base);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = { ...prev };
        selected.forEach((id) => {
          const current = next[id] ?? 0;
          next[id] = current >= 100 ? 8 : Math.min(100, current + Math.random() * 12);
        });
        return next;
      });
    }, 600);
    return () => clearInterval(interval);
  }, [running, selected]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  return (
    <section id="audit" ref={sectionRef} className="relative py-24 lg:py-32 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="mb-16 max-w-3xl">
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
            <span className="w-8 h-px bg-primary/40" />
            {t("launch_an_audit")}
          </span>
          <h2 className="text-4xl lg:text-6xl font-display tracking-tight">
            Select your swarm.
            <br />
            <span className="text-muted-foreground">Watch it work in real time.</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: select + upload */}
          <div
            className={`transition-all duration-700 ${
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
            }`}
          >
            <div className="bg-card border border-border rounded-xl p-6 lg:p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-xl">{t("choose_agents")}</h3>
                {selected.length > 0 && (
                  <span className="inline-flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-full bg-accent text-accent-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    {t("audit_swarm_ready")}
                  </span>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-3 mb-8">
                {selectableAgents.map((agent) => {
                  const Icon = agent.icon;
                  const isOn = selected.includes(agent.id);
                  return (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => toggle(agent.id)}
                      className={`flex items-center gap-3 p-4 rounded-lg border text-left transition-all duration-300 ${
                        isOn
                          ? "border-primary bg-accent"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <span
                        className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                          isOn ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="flex-1 text-sm font-medium leading-tight">{agent.name}</span>
                      <span
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isOn ? "bg-primary border-primary text-primary-foreground" : "border-border"
                        }`}
                      >
                        {isOn && <Check className="w-3 h-3" />}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Upload */}
              <h3 className="font-display text-xl mb-4">{t("add_your_code")}</h3>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center mb-4 transition-colors ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                onDragEnter={onDragEnter}
                onDragLeave={onDragLeave}
                onDragOver={onDragOver}
                onDrop={onDrop}
              >
                <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  {t("drag_drop")}
                </p>
                <Button type="button" onClick={openFilePicker} variant="outline" className="rounded-full px-5 py-2">
                  {t("select_file")}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip,.tar,.gz,.7z"
                  className="hidden"
                  onChange={onFileChange}
                />
              </div>
              {fileError ? (
                <div className="text-sm text-destructive mb-4">{fileError}</div>
              ) : uploadStatus ? (
                <div className="text-sm text-foreground mb-4">{uploadStatus}</div>
              ) : uploadedFiles.length > 0 ? (
                <div className="mb-4 rounded-xl border border-border bg-background p-4 text-left text-sm">
                  <div className="font-medium mb-2">{uploadedFiles.length > 1 ? t("selected_files") : t("selected_file")}:</div>
                  <ul className="space-y-1">
                    {uploadedFiles.map((file) => (
                      <li key={file.name} className="truncate">
                        {file.name} • {(file.size / 1024).toFixed(1)} KB
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="flex items-center gap-2 rounded-lg border border-border px-4 py-3 mb-6">
                <Github className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-mono text-muted-foreground truncate">
                  {t("paste_repo_url")}
                </span>
                <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-mono text-primary shrink-0">
                  <Check className="w-3 h-3" /> {t("connected")}
                </span>
              </div>

              <Button
                onClick={onLaunchAudit}
                disabled={selected.length === 0 || isUploading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 rounded-full"
              >
                {isUploading ? t("uploading_audit_archive") : `${t("launch_audit")} with ${selected.length} agent${selected.length === 1 ? "" : "s"}`}
              </Button>
            </div>
          </div>

          {/* Right: live execution */}
          <div
            className={`transition-all duration-700 delay-200 ${
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
            }`}
          >
            <div className="bg-card border border-border rounded-xl overflow-hidden h-full">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <span className="text-sm font-mono text-muted-foreground">Audit Execution</span>
                <span className="flex items-center gap-2 text-xs font-mono text-primary">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  Live
                </span>
              </div>
              <div className="p-6 space-y-5">
                {selected.length === 0 && (
                  <p className="text-sm text-muted-foreground font-mono py-8 text-center">
                    Select at least one agent to begin.
                  </p>
                )}
                {selectableAgents
                  .filter((a) => selected.includes(a.id))
                  .map((agent) => {
                    const Icon = agent.icon;
                    const pct = Math.round(progress[agent.id] ?? 0);
                    return (
                      <div key={agent.id}>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="w-7 h-7 rounded-md bg-accent text-primary flex items-center justify-center shrink-0">
                            <Icon className="w-3.5 h-3.5" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium truncate">{agent.name}</span>
                              <span className="text-xs font-mono text-muted-foreground">{pct}%</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs font-mono text-muted-foreground mb-2 pl-10">
                          {agent.task}
                          <span className="inline-block animate-pulse">...</span>
                        </p>
                        <div className="h-1.5 rounded-full bg-secondary overflow-hidden ml-10">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
