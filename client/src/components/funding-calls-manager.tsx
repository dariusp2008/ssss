import { useState } from "react";
import { ProgressStepper } from "@/components/progress-stepper";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Trash2, AlertTriangle, RefreshCw, FileText, Pencil,
  Search, Upload, FileUp, File, Download, Sparkles, Loader2, CheckCircle, X, Filter, ArrowUpDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function FundingCallsManager() {
  const { toast } = useToast();

  const [deleteCall, setDeleteCall] = useState<any>(null);
  const [deleteWarning, setDeleteWarning] = useState<{ message: string; linkedProjectsCount: number; linkedProjects: { id: string; name: string }[] } | null>(null);
  const [editCall, setEditCall] = useState<any>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [guideCall, setGuideCall] = useState<any>(null);
  const [uploadingGuide, setUploadingGuide] = useState(false);
  const [callsSearch, setCallsSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [ragFilter, setRagFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [showCreateCallDialog, setShowCreateCallDialog] = useState(false);
  const [createCallName, setCreateCallName] = useState("");
  const [createCallFile, setCreateCallFile] = useState<File | null>(null);
  const [createCallProgressId, setCreateCallProgressId] = useState<string | null>(null);
  const [createCallPhase, setCreateCallPhase] = useState<"idle" | "indexing" | "ai">("idle");
  const [createCallAiProgressId, setCreateCallAiProgressId] = useState<string | null>(null);

  const { data: ragData } = useQuery<any[]>({ queryKey: ["/api/admin/rag-status"] });
  const { data: callsData, isLoading: callsLoading } = useQuery<any[]>({ queryKey: ["/api/admin/funding-calls"] });
  const { data: guidesData, isLoading: guidesLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/funding-calls", guideCall?.id, "guides"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/funding-calls/${guideCall.id}/guides`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!guideCall,
  });

  const ragMap = new Map<string, any>();
  if (ragData) {
    for (const r of ragData) {
      ragMap.set(r.apelId, r);
    }
  }

  const reindexMutation = useMutation({
    mutationFn: async (apelId: string) => {
      const res = await apiRequest("POST", `/api/admin/rag-reindex/${apelId}`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rag-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/funding-calls"] });
      toast({ title: "Re-indexare completă", description: `${data.sectionsCount} secțiuni create.` });
    },
    onError: (err: any) => {
      toast({ title: "Eroare la re-indexare", description: err.message, variant: "destructive" });
    },
  });

  const regenerateAiMutation = useMutation({
    mutationFn: async (apelId: string) => {
      const res = await apiRequest("POST", `/api/admin/funding-calls/${apelId}/regenerate-ai`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/funding-calls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/funding-calls"] });
      toast({ title: "Câmpuri AI regenerate", description: data.message });
    },
    onError: (err: any) => {
      toast({ title: "Eroare la regenerare AI", description: err.message, variant: "destructive" });
    },
  });

  const deleteCallMutation = useMutation({
    mutationFn: async ({ id, force }: { id: string; force?: boolean }) => {
      const url = `/api/admin/funding-calls/${id}${force ? "?force=true" : ""}`;
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err: any = new Error(body?.message || `Eroare ${res.status}`);
        err.status = res.status;
        err.body = body;
        throw err;
      }
      return body;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/funding-calls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rag-status"] });
      setDeleteCall(null);
      setDeleteWarning(null);
      const extra = data?.deletedProjects > 0 ? ` Au fost șterse și ${data.deletedProjects} proiecte legate.` : "";
      toast({ title: "Apel șters", description: "Apelul și toate secțiunile asociate au fost șterse." + extra });
    },
    onError: (err: any) => {
      if (err?.status === 409 && err?.body?.code === "HAS_LINKED_PROJECTS") {
        setDeleteWarning({
          message: err.body.message,
          linkedProjectsCount: err.body.linkedProjectsCount || 0,
          linkedProjects: err.body.linkedProjects || [],
        });
        return;
      }
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    },
  });

  const updateCallMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      const res = await apiRequest("PATCH", `/api/admin/funding-calls/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/funding-calls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/funding-calls"] });
      setEditCall(null);
      toast({ title: "Apel actualizat", description: "Modificările au fost salvate cu succes." });
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    },
  });

  const uploadGuideMutation = useMutation({
    mutationFn: async ({ callId, file }: { callId: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/admin/funding-calls/${callId}/guides`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Eroare la încărcare" }));
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: (data: any, variables: { callId: string; file: File }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/funding-calls", variables.callId, "guides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rag-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/funding-calls"] });
      setUploadingGuide(false);
      toast({ title: "Ghid încărcat", description: data.message || `${data.sections_created || 0} secțiuni indexate.` });
    },
    onError: (err: any) => {
      setUploadingGuide(false);
      toast({ title: "Eroare la încărcare", description: err.message, variant: "destructive" });
    },
  });

  const deleteGuideMutation = useMutation({
    mutationFn: async ({ callId, guideId }: { callId: string; guideId: string }) => {
      const res = await apiRequest("DELETE", `/api/admin/funding-calls/${callId}/guides/${guideId}`);
      return res.json();
    },
    onSuccess: (_data: any, variables: { callId: string; guideId: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/funding-calls", variables.callId, "guides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rag-status"] });
      toast({ title: "Ghid șters", description: "Ghidul și secțiunile asociate au fost șterse." });
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    },
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: async ({ callId, files }: { callId: string; files: File[] }) => {
      const formData = new FormData();
      files.forEach(f => formData.append("files", f));
      const res = await fetch(`/api/admin/funding-calls/${callId}/attachments`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Eroare la încărcare" }));
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: (data: any, variables: { callId: string; files: File[] }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/funding-calls", variables.callId, "guides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rag-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/funding-calls"] });
      setUploadingAttachment(false);
      toast({ title: "Documente atașate", description: data.message || "Documentele au fost încărcate." });

      if (data.backgroundIndexing) {
        const pollInterval = setInterval(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/admin/funding-calls", variables.callId, "guides"] });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/rag-status"] });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/funding-calls"] });
        }, 15000);
        setTimeout(() => clearInterval(pollInterval), 5 * 60 * 1000);
      }
    },
    onError: (err: any) => {
      setUploadingAttachment(false);
      toast({ title: "Eroare la încărcare", description: err.message, variant: "destructive" });
    },
  });

  const createManualCallMutation = useMutation({
    mutationFn: async () => {
      if (!createCallFile) throw new Error("Selectează un fișier");
      const pId = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      setCreateCallProgressId(pId);
      setCreateCallPhase("indexing");
      const formData = new FormData();
      formData.append("file", createCallFile);
      formData.append("progressId", pId);
      if (createCallName.trim()) formData.append("name", createCallName.trim());

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      try {
        const res = await fetch("/api/admin/funding-calls/create-manual", {
          method: "POST",
          credentials: "include",
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: "Eroare la creare" }));
          throw new Error(err.message);
        }
        return await res.json();
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === "AbortError") {
          throw new Error("Timpul de așteptare a expirat. Verificați lista de apeluri — este posibil ca apelul să fi fost creat.");
        }
        throw err;
      }
    },
    onSuccess: (data: any) => {
      setCreateCallPhase("ai");
      toast({
        title: "Apel creat cu succes",
        description: "Procesarea și generarea AI rulează în fundal. Puteți închide acest dialog.",
      });
      setShowCreateCallDialog(false);
      setCreateCallName("");
      setCreateCallFile(null);
      setCreateCallPhase("idle");
      setCreateCallProgressId(null);
      setCreateCallAiProgressId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/funding-calls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rag-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/funding-calls"] });

      if (data.backgroundIndexing && data.fundingCall?.id) {
        const pollInterval = setInterval(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/admin/funding-calls"] });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/rag-status"] });
          queryClient.invalidateQueries({ queryKey: ["/api/funding-calls"] });
        }, 15000);
        setTimeout(() => clearInterval(pollInterval), 5 * 60 * 1000);
      }
    },
    onError: (err: any) => {
      setCreateCallProgressId(null);
      setCreateCallAiProgressId(null);
      setCreateCallPhase("idle");
      toast({ title: "Eroare la creare", description: err.message, variant: "destructive" });
    },
  });

  const handleGuideUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !guideCall) return;
    setUploadingGuide(true);
    uploadGuideMutation.mutate({ callId: guideCall.id, file });
    e.target.value = "";
  };

  const handleAttachmentUpload = (e: any) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || !guideCall) return;
    setUploadingAttachment(true);
    uploadAttachmentMutation.mutate({ callId: guideCall.id, files: Array.from(fileList) });
    e.target.value = "";
  };

  const openEditDialog = (call: any) => {
    setEditCall(call);
    setEditForm({
      name: call.name || "",
      program: call.program || "",
      description: call.description || "",
      summary: call.summary || "",
      category: call.category || "",
      status: call.status || "active",
      deadline: call.deadline ? new Date(call.deadline).toISOString().slice(0, 16) : "",
      maxFunding: call.maxFunding ?? "",
      minEmployees: call.minEmployees ?? "",
      minRevenue: call.minRevenue ?? "",
      minCompanyAge: call.minCompanyAge ?? "",
      requiresProfit: call.requiresProfit || false,
      eligibleCaen: (call.eligibleCaen || []).join(", "),
      eligibleRegions: (call.eligibleRegions || []).join(", "),
      beneficiaryTypes: (call.beneficiaryTypes || []).join(", "),
      eligibleSizeCategories: (call.eligibleSizeCategories || []).join(", "),
      sourceUrl: call.sourceUrl || "",
      bugetUe: call.bugetUe || "",
      dataLimita: call.dataLimita || "",
    });
  };

  const handleSaveCall = () => {
    if (!editCall) return;
    const data: Record<string, any> = { ...editForm };
    for (const key of ["eligibleCaen", "eligibleRegions", "beneficiaryTypes", "eligibleSizeCategories"]) {
      if (typeof data[key] === "string") {
        data[key] = data[key].split(",").map((s: string) => s.trim()).filter(Boolean);
      }
    }
    if (data.maxFunding === "") data.maxFunding = null;
    if (data.minEmployees === "") data.minEmployees = null;
    if (data.minRevenue === "") data.minRevenue = null;
    if (data.minCompanyAge === "") data.minCompanyAge = null;
    if (data.deadline === "") data.deadline = null;
    updateCallMutation.mutate({ id: editCall.id, data });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Apeluri de finanțare & Status indexare</CardTitle>
            <Button size="sm" onClick={() => setShowCreateCallDialog(true)} data-testid="button-create-manual-call">
              <FileUp className="w-4 h-4 mr-1.5" />
              Adaugă apel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {callsLoading ? <Skeleton className="h-40 m-4" /> : callsData && callsData.length > 0 ? (() => {
            const hasActiveFilters = statusFilter !== "all" || sourceFilter !== "all" || ragFilter !== "all" || callsSearch.length > 0;
            const filtered = [...callsData]
              .filter((c: any) => {
                if (callsSearch && !c.name?.toLowerCase().includes(callsSearch.toLowerCase())) return false;
                if (statusFilter === "active" && (c.status === "expired" || c.isExpired)) return false;
                if (statusFilter === "expired" && c.status !== "expired" && !c.isExpired) return false;
                if (sourceFilter === "manual" && c.importSource !== "manual") return false;
                if (sourceFilter === "auto" && c.importSource === "manual") return false;
                if (ragFilter !== "all") {
                  const sections = ragMap.get(c.id)?.activeSections || 0;
                  if (ragFilter === "indexed" && sections === 0) return false;
                  if (ragFilter === "not-indexed" && sections > 0) return false;
                  if (ragFilter === "partial" && (sections === 0 || sections >= 5)) return false;
                }
                return true;
              })
              .sort((a: any, b: any) => {
                if (sortBy === "newest") return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                if (sortBy === "oldest") return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
                if (sortBy === "name") return (a.name || "").localeCompare(b.name || "", "ro");
                if (sortBy === "deadline") {
                  if (!a.deadline && !b.deadline) return 0;
                  if (!a.deadline) return 1;
                  if (!b.deadline) return -1;
                  return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
                }
                return 0;
              });
            return (<>
            <div className="px-3 sm:px-0 pb-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Caută apel după nume..."
                  value={callsSearch}
                  onChange={(e) => setCallsSearch(e.target.value)}
                  className="pl-9 h-9"
                  data-testid="input-calls-search"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-[130px] text-xs" data-testid="select-filter-status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toate statusurile</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expirate</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="h-8 w-[120px] text-xs" data-testid="select-filter-source">
                    <SelectValue placeholder="Sursă" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toate sursele</SelectItem>
                    <SelectItem value="manual">Manual (Staff)</SelectItem>
                    <SelectItem value="auto">Auto (n8n)</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={ragFilter} onValueChange={setRagFilter}>
                  <SelectTrigger className="h-8 w-[140px] text-xs" data-testid="select-filter-rag">
                    <SelectValue placeholder="Indexare AI" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toate</SelectItem>
                    <SelectItem value="indexed">Indexat AI</SelectItem>
                    <SelectItem value="partial">Parțial indexat</SelectItem>
                    <SelectItem value="not-indexed">Neindexat</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1 ml-auto">
                  <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-8 w-[140px] text-xs" data-testid="select-sort">
                      <SelectValue placeholder="Sortare" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Cele mai noi</SelectItem>
                      <SelectItem value="oldest">Cele mai vechi</SelectItem>
                      <SelectItem value="name">Alfabetic (A-Z)</SelectItem>
                      <SelectItem value="deadline">Deadline (apropiat)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs text-muted-foreground"
                    onClick={() => { setCallsSearch(""); setStatusFilter("all"); setSourceFilter("all"); setRagFilter("all"); setSortBy("newest"); }}
                    data-testid="button-clear-filters"
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Resetează
                  </Button>
                )}
              </div>
              {hasActiveFilters && (
                <p className="text-xs text-muted-foreground" data-testid="text-filter-count">
                  {filtered.length} din {callsData.length} apeluri
                </p>
              )}
            </div>
            {filtered.length > 0 ? (
            <div className="divide-y">
              {filtered
                .map((c: any, idx: number) => {
                const rag = ragMap.get(c.id);
                const activeSections = rag?.activeSections || 0;
                return (
                  <div key={c.id} className="p-3 sm:p-4" data-testid={`row-call-${c.id}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-xs text-muted-foreground font-mono mt-0.5 shrink-0 w-8 text-right" data-testid={`call-index-${c.id}`}>{idx + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm leading-snug line-clamp-2" title={c.name}>{c.name}</p>
                          {c.importSource === "manual" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 shrink-0" data-testid={`badge-source-${c.id}`}>✍️ Staff</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 shrink-0" data-testid={`badge-source-${c.id}`}>⚡ Auto</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                          <Badge variant="outline" className="text-xs shrink-0">{c.program || "—"}</Badge>
                          <Badge variant={c.status === "expired" || c.isExpired ? "destructive" : "default"} className="text-xs shrink-0">
                            {c.status === "expired" || c.isExpired ? "Expirat" : "Activ"}
                          </Badge>
                          <Badge
                            variant={activeSections >= 5 ? "default" : activeSections > 0 ? "secondary" : "outline"}
                            className={`text-xs shrink-0 ${activeSections >= 5 ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" : activeSections > 0 ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" : ""}`}
                            data-testid={`badge-rag-${c.id}`}
                          >
                            {activeSections > 0 ? `${activeSections} sectiuni AI` : "Neindexat"}
                          </Badge>
                          <span className="text-xs text-muted-foreground shrink-0">v{c.currentVersion}</span>
                          {c.deadline && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              Termen: {new Date(c.deadline).toLocaleDateString("ro-RO")}
                            </span>
                          )}
                          {c.docsCount > 0 && (
                            <span className="text-xs text-muted-foreground shrink-0">{c.docsCount} doc.</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(c)}
                          title="Editează apelul"
                          className="h-8 px-2 sm:px-3 gap-1.5"
                          data-testid={`button-edit-call-${c.id}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline text-xs">Editează</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setGuideCall(c)}
                          title="Gestionează ghiduri / documente"
                          className="h-8 px-2 sm:px-3 gap-1.5"
                          data-testid={`button-guides-${c.id}`}
                        >
                          <FileUp className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline text-xs">Ghiduri</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => reindexMutation.mutate(c.id)}
                          disabled={reindexMutation.isPending}
                          title="Re-indexează"
                          className="h-8 px-2"
                          data-testid={`button-reindex-${c.id}`}
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${reindexMutation.isPending ? "animate-spin" : ""}`} />
                        </Button>
                        {c.ragSections > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => regenerateAiMutation.mutate(c.id)}
                            disabled={regenerateAiMutation.isPending}
                            title={(!c.summary || !c.eligibleCaen) ? "Regenereaza campurile AI (lipsesc date)" : "Regenereaza campurile AI din sectiunile indexate"}
                            className={`h-8 px-2 ${(!c.summary || !c.eligibleCaen) ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-300" : ""}`}
                            data-testid={`button-regenerate-ai-${c.id}`}
                          >
                            <Sparkles className={`w-3.5 h-3.5 ${regenerateAiMutation.isPending ? "animate-pulse" : ""}`} />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteCall(c)}
                          className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Șterge apelul"
                          data-testid={`button-delete-call-${c.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Niciun apel nu corespunde filtrelor selectate</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 text-xs"
                  onClick={() => { setCallsSearch(""); setStatusFilter("all"); setSourceFilter("all"); setRagFilter("all"); setSortBy("newest"); }}
                  data-testid="button-clear-filters-empty"
                >
                  Resetează filtrele
                </Button>
              </div>
            )}
          </>); })() : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Niciun apel de finanțare</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteCall} onOpenChange={(open) => { if (!open) { setDeleteCall(null); setDeleteWarning(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              {deleteWarning ? "Atenție: există proiecte legate" : "Confirmare ștergere apel"}
            </DialogTitle>
            <DialogDescription asChild>
              {deleteWarning ? (
                <div className="space-y-2">
                  <p>{deleteWarning.message}</p>
                  {deleteWarning.linkedProjects.length > 0 && (
                    <div className="rounded-md border bg-muted/30 p-2 text-xs">
                      <p className="font-medium mb-1">Proiecte care vor fi șterse:</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {deleteWarning.linkedProjects.map((p) => (
                          <li key={p.id}>{p.name}</li>
                        ))}
                        {deleteWarning.linkedProjectsCount > deleteWarning.linkedProjects.length && (
                          <li className="text-muted-foreground italic">
                            și încă {deleteWarning.linkedProjectsCount - deleteWarning.linkedProjects.length} {deleteWarning.linkedProjectsCount - deleteWarning.linkedProjects.length === 1 ? "proiect" : "proiecte"}…
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                  <p className="text-red-600 font-medium">Această acțiune este ireversibilă.</p>
                </div>
              ) : (
                <span>
                  Ești sigur că vrei să ștergi apelul <strong>{deleteCall?.name}</strong>?
                  Toate secțiunile indexate asociate vor fi șterse. Această acțiune este ireversibilă.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteCall(null); setDeleteWarning(null); }} data-testid="button-cancel-delete-call">Anulează</Button>
            <Button
              variant="destructive"
              onClick={() => deleteCall && deleteCallMutation.mutate({ id: deleteCall.id, force: !!deleteWarning })}
              disabled={deleteCallMutation.isPending}
              data-testid="button-confirm-delete-call"
            >
              {deleteCallMutation.isPending
                ? "Se șterge..."
                : deleteWarning
                  ? "Șterge apelul și proiectele"
                  : "Șterge definitiv"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editCall} onOpenChange={(open) => { if (!open) setEditCall(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="text-edit-call-title">
              <Pencil className="w-5 h-5 text-primary" />
              Editare apel de finanțare
            </DialogTitle>
            <DialogDescription>Modifică informațiile apelului. Câmpurile array (CAEN, regiuni, tipuri beneficiari) se separă cu virgulă.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium">Nume apel *</label>
                <Input value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} data-testid="input-edit-call-name" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Program</label>
                <Input value={editForm.program || ""} onChange={(e) => setEditForm({ ...editForm, program: e.target.value })} data-testid="input-edit-call-program" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Categorie</label>
                <Input value={editForm.category || ""} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} placeholder="ex: Digitalizare, Infrastructură" data-testid="input-edit-call-category" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Status</label>
                <Select value={editForm.status || "active"} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger data-testid="select-edit-call-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activ</SelectItem>
                    <SelectItem value="expired">Expirat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Termen limită</label>
                <Input type="datetime-local" value={editForm.deadline || ""} onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })} data-testid="input-edit-call-deadline" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Finanțare maximă (EUR)</label>
                <Input type="number" value={editForm.maxFunding ?? ""} onChange={(e) => setEditForm({ ...editForm, maxFunding: e.target.value })} placeholder="ex: 200000" data-testid="input-edit-call-maxfunding" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Angajați minimi</label>
                <Input type="number" value={editForm.minEmployees ?? ""} onChange={(e) => setEditForm({ ...editForm, minEmployees: e.target.value })} data-testid="input-edit-call-minemployees" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Cifră de afaceri minimă (EUR)</label>
                <Input type="number" value={editForm.minRevenue ?? ""} onChange={(e) => setEditForm({ ...editForm, minRevenue: e.target.value })} data-testid="input-edit-call-minrevenue" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Vârstă minimă firmă (ani)</label>
                <Input type="number" value={editForm.minCompanyAge ?? ""} onChange={(e) => setEditForm({ ...editForm, minCompanyAge: e.target.value })} data-testid="input-edit-call-minage" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Buget UE</label>
                <Input value={editForm.bugetUe || ""} onChange={(e) => setEditForm({ ...editForm, bugetUe: e.target.value })} placeholder="ex: 5.000.000 EUR" data-testid="input-edit-call-bugetue" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Data limită (text)</label>
                <Input value={editForm.dataLimita || ""} onChange={(e) => setEditForm({ ...editForm, dataLimita: e.target.value })} placeholder="ex: 31 decembrie 2027" data-testid="input-edit-call-datalimita" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">URL sursă</label>
                <Input value={editForm.sourceUrl || ""} onChange={(e) => setEditForm({ ...editForm, sourceUrl: e.target.value })} data-testid="input-edit-call-sourceurl" />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={editForm.requiresProfit || false} onCheckedChange={(v) => setEditForm({ ...editForm, requiresProfit: v })} data-testid="switch-edit-call-profit" />
                <label className="text-sm">Necesită profit</label>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">CAEN-uri eligibile</label>
              <Input value={editForm.eligibleCaen || ""} onChange={(e) => setEditForm({ ...editForm, eligibleCaen: e.target.value })} placeholder="ex: 6201, 6202, 6311" data-testid="input-edit-call-caen" />
              <p className="text-xs text-muted-foreground">Separate cu virgulă</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Regiuni eligibile</label>
              <Input value={editForm.eligibleRegions || ""} onChange={(e) => setEditForm({ ...editForm, eligibleRegions: e.target.value })} placeholder="ex: Nord-Vest, Centru, Sud-Est" data-testid="input-edit-call-regions" />
              <p className="text-xs text-muted-foreground">Separate cu virgulă</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Tipuri beneficiari</label>
              <Input value={editForm.beneficiaryTypes || ""} onChange={(e) => setEditForm({ ...editForm, beneficiaryTypes: e.target.value })} placeholder="ex: imm, startup, ong, autoritati-publice" data-testid="input-edit-call-beneficiaries" />
              <p className="text-xs text-muted-foreground">Separate cu virgulă</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Categorii mărime eligibile</label>
              <Input value={editForm.eligibleSizeCategories || ""} onChange={(e) => setEditForm({ ...editForm, eligibleSizeCategories: e.target.value })} placeholder="ex: micro, mica, mijlocie, mare" data-testid="input-edit-call-sizecats" />
              <p className="text-xs text-muted-foreground">Separate cu virgulă</p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Descriere</label>
              <Textarea value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="min-h-[100px]" data-testid="textarea-edit-call-description" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Rezumat AI</label>
              <Textarea value={editForm.summary || ""} onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })} className="min-h-[120px]" data-testid="textarea-edit-call-summary" />
            </div>
          </div>

          {editCall?.ragSections > 0 && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">Regenerare câmpuri AI</p>
                <p className="text-xs text-amber-600">Repopuleaza automat toate campurile (rezumat, CAEN, regiuni, deadline etc.) din sectiunile AI indexate ({editCall.ragSections} sectiuni).</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  regenerateAiMutation.mutate(editCall.id);
                  setEditCall(null);
                }}
                disabled={regenerateAiMutation.isPending}
                className="shrink-0 border-amber-300 text-amber-700"
                data-testid="button-regenerate-ai-dialog"
              >
                {regenerateAiMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
                Regenerează
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCall(null)} data-testid="button-cancel-edit-call">Anulează</Button>
            <Button onClick={handleSaveCall} disabled={updateCallMutation.isPending || !editForm.name} data-testid="button-save-edit-call">
              {updateCallMutation.isPending ? "Se salvează..." : "Salvează modificările"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!guideCall} onOpenChange={(open) => { if (!open) setGuideCall(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="text-guides-title">
              <FileUp className="w-5 h-5 text-primary" />
              Ghiduri și documente
            </DialogTitle>
            <DialogDescription className="line-clamp-2">{guideCall?.name}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Ghiduri (cu analiza AI)</h4>
              <div className="border-2 border-dashed rounded-lg p-4 text-center mb-3">
                <input
                  type="file"
                  id="guide-upload"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleGuideUpload}
                  disabled={uploadingGuide}
                  data-testid="input-guide-upload"
                />
                <label
                  htmlFor="guide-upload"
                  className="cursor-pointer flex flex-col items-center gap-1.5"
                >
                  {uploadingGuide ? (
                    <>
                      <RefreshCw className="w-6 h-6 text-primary animate-spin" />
                      <p className="text-sm font-medium">Se încarcă și se indexează...</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-muted-foreground" />
                      <p className="text-sm font-medium">Încarcă ghid (PDF, Word, Excel)</p>
                      <p className="text-xs text-muted-foreground">Fisierul va fi analizat automat cu AI</p>
                    </>
                  )}
                </label>
              </div>

              {guidesLoading ? (
                <Skeleton className="h-16" />
              ) : (() => {
                const guides = (guidesData || []).filter((g: any) => g.doc_type !== "attachment");
                return guides.length > 0 ? (
                  <div className="space-y-2">
                    {guides.map((g: any) => {
                      const fileIcon = g.file_type === "pdf" ? "PDF" : g.file_type === "docx" || g.file_type === "doc" ? "DOC" : "XLS";
                      const fileColor = g.file_type === "pdf" ? "text-red-600 bg-red-50" : g.file_type === "docx" || g.file_type === "doc" ? "text-blue-600 bg-blue-50" : "text-green-600 bg-green-50";
                      return (
                        <div key={g.id} className="flex items-center gap-3 p-3 border rounded-lg" data-testid={`guide-row-${g.id}`}>
                          <div className={`text-xs font-bold px-2 py-1 rounded ${fileColor}`}>{fileIcon}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{g.original_name}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{g.file_size ? `${(g.file_size / 1024).toFixed(0)} KB` : "—"}</span>
                              <span>{g.sections_created > 0 ? `${g.sections_created} sectiuni AI` : "Neindexat"}</span>
                              <span>{g.created_at ? new Date(g.created_at).toLocaleDateString("ro-RO") : ""}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`/api/admin/funding-calls/guides/${g.id}/download`, "_blank")}
                              title="Descarcă"
                              data-testid={`button-download-guide-${g.id}`}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Sigur vrei sa stergi ghidul "${g.original_name}"? Sectiunile AI asociate vor fi de asemenea sterse.`)) {
                                  deleteGuideMutation.mutate({ callId: guideCall.id, guideId: g.id });
                                }
                              }}
                              disabled={deleteGuideMutation.isPending}
                              className="text-red-600"
                              title="Șterge ghidul"
                              data-testid={`button-delete-guide-${g.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">Niciun ghid încărcat</p>
                );
              })()}
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><File className="w-4 h-4 text-blue-600" /> Documente adiționale</h4>
              <div className="border-2 border-dashed rounded-lg p-4 text-center mb-3">
                <input
                  type="file"
                  id="attachment-upload"
                  className="hidden"
                  multiple
                  onChange={handleAttachmentUpload}
                  disabled={uploadingAttachment}
                  data-testid="input-attachment-upload"
                />
                <label
                  htmlFor="attachment-upload"
                  className="cursor-pointer flex flex-col items-center gap-1.5"
                >
                  {uploadingAttachment ? (
                    <>
                      <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                      <p className="text-sm font-medium">Se încarcă...</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-muted-foreground" />
                      <p className="text-sm font-medium">Atașează documente suplimentare</p>
                      <p className="text-xs text-muted-foreground">Orice format, mai multe fisiere o data -- PDF/Word/Excel se analizeaza AI automat</p>
                    </>
                  )}
                </label>
              </div>

              {(() => {
                const attachments = (guidesData || []).filter((g: any) => g.doc_type === "attachment");
                return attachments.length > 0 ? (
                  <div className="space-y-2">
                    {attachments.map((g: any) => {
                      const ext = (g.file_type || "").toLowerCase();
                      const fileIcon = ext === "pdf" ? "PDF" : ext === "docx" || ext === "doc" ? "DOC" : ext === "xlsx" || ext === "xls" ? "XLS" : ext.toUpperCase() || "FILE";
                      const fileColor = ext === "pdf" ? "text-red-600 bg-red-50" : ext === "docx" || ext === "doc" ? "text-blue-600 bg-blue-50" : ext === "xlsx" || ext === "xls" ? "text-green-600 bg-green-50" : "text-gray-600 bg-gray-50";
                      return (
                        <div key={g.id} className="flex items-center gap-3 p-3 border rounded-lg" data-testid={`attachment-row-${g.id}`}>
                          <div className={`text-xs font-bold px-2 py-1 rounded ${fileColor}`}>{fileIcon}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{g.original_name}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{g.file_size ? g.file_size > 1024 * 1024 ? `${(g.file_size / 1024 / 1024).toFixed(1)} MB` : `${(g.file_size / 1024).toFixed(0)} KB` : "—"}</span>
                              {["pdf", "doc", "docx", "xls", "xlsx"].includes(ext) && (
                                <span>{g.sections_created > 0 ? `${g.sections_created} sectiuni AI` : "Se analizeaza..."}</span>
                              )}
                              <span>{g.created_at ? new Date(g.created_at).toLocaleDateString("ro-RO") : ""}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`/api/admin/funding-calls/guides/${g.id}/download`, "_blank")}
                              title="Descarcă"
                              data-testid={`button-download-attachment-${g.id}`}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Sigur vrei să ștergi documentul "${g.original_name}"?`)) {
                                  deleteGuideMutation.mutate({ callId: guideCall.id, guideId: g.id });
                                }
                              }}
                              disabled={deleteGuideMutation.isPending}
                              className="text-red-600"
                              title="Șterge documentul"
                              data-testid={`button-delete-attachment-${g.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">Niciun document adițional</p>
                );
              })()}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGuideCall(null)} data-testid="button-close-guides">Închide</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateCallDialog} onOpenChange={(open) => { if (!open && !createManualCallMutation.isPending) { setShowCreateCallDialog(false); setCreateCallName(""); setCreateCallFile(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adaugă apel de finanțare</DialogTitle>
            <DialogDescription>
              Încarcă ghidul oficial (PDF, Word sau Excel). Platforma va indexa documentul și va completa automat câmpurile apelului folosind AI.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nume apel (opțional)</label>
              <Input
                value={createCallName}
                onChange={(e) => setCreateCallName(e.target.value)}
                placeholder="Se extrage automat din ghid dacă nu este completat..."
                disabled={createManualCallMutation.isPending}
                data-testid="input-create-call-name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ghid oficial *</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                onChange={(e) => setCreateCallFile(e.target.files?.[0] || null)}
                disabled={createManualCallMutation.isPending}
                data-testid="input-create-call-file"
              />
              <p className="text-xs text-muted-foreground">Formate acceptate: PDF, Word (.doc, .docx), Excel (.xls, .xlsx)</p>
            </div>
            {createManualCallMutation.isPending && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-primary">Se creează apelul...</p>
                <ProgressStepper
                  operationId={createCallProgressId}
                  steps={[
                    "Salvare apel în baza de date",
                    "Upload fișier în storage",
                  ]}
                  isActive={true}
                />
                <p className="text-xs text-muted-foreground">Procesarea si generarea AI vor rula automat in fundal.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateCallDialog(false); setCreateCallName(""); setCreateCallFile(null); }} disabled={createManualCallMutation.isPending} data-testid="button-cancel-create-call">
              Anulează
            </Button>
            <Button
              onClick={() => createManualCallMutation.mutate()}
              disabled={!createCallFile || createManualCallMutation.isPending}
              data-testid="button-submit-create-call"
            >
              {createManualCallMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <FileUp className="w-4 h-4 mr-1.5" />}
              Creează apel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
