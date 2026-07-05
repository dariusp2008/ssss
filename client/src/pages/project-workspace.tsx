import { useState, useRef } from "react";
import { CreditConfirmDialog } from "@/components/credit-confirm-dialog";
import { DocumentDraftDialog } from "@/components/document-draft-dialog";
import { isBusinessPlanDocType } from "@shared/document-templates";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { stripHtml } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useRoute } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FileText, Upload, CheckCircle2, Clock, AlertTriangle, XCircle,
  Building2, Calendar, ArrowLeft, MoreVertical, Eye, Pencil, Trash2,
  Download, RefreshCw, MessageSquare, History, Users, UserPlus, Send, X,
  ExternalLink, BookOpen, Sparkles, File, Network, Plus, Search, Crown,
  ShieldCheck, ShieldX, Loader2, ThumbsUp, ShieldAlert, ClipboardCheck,
  FileSearch, ChevronDown, ChevronUp,
} from "lucide-react";
import { Link } from "wouter";
import { AiDisclaimer } from "@/components/ai-disclaimer";
import type {
  ActiveProject, Document, Company, FundingCall,
  FundingCallDoc, StatusHistory, Collaborator, DocumentComment, DocumentVersion,
} from "@shared/schema";
import { RELEVANCE_MISMATCH_REQUIREMENT, findRelevanceMismatch } from "@shared/document-templates";

interface ConformityReport {
  id: string;
  projectId: string;
  documentId: string;
  verdict: string;
  score: number | null;
  summary: string | null;
  isTemplate?: boolean;
  relevanceMismatch?: boolean;
  relevanceReason?: string;
  criteria: Array<{ requirement: string; status: string; details: string }>;
  missingElements: string[];
  recommendations: string[];
  ragSectionsUsed: number | null;
  model: string | null;
  createdAt: string | null;
  documentName?: string;
}

const docStatusConfig: Record<string, { icon: any; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-muted-foreground", label: "În așteptare" },
  uploaded: { icon: CheckCircle2, color: "text-green-600 dark:text-green-400", label: "Încărcat" },
  expiring: { icon: AlertTriangle, color: "text-yellow-600 dark:text-yellow-400", label: "Expiră curând" },
  expired: { icon: XCircle, color: "text-red-500", label: "Expirat" },
};

const DEFAULT_REQUIRED_DOCS = [
  { name: "Certificat CUI", type: "cui", sortOrder: 1 },
  { name: "Situații financiare (Bilanț)", type: "bilant", sortOrder: 2 },
  { name: "Extras de cont bancar", type: "bank_statement", sortOrder: 3 },
  { name: "Plan de afaceri", type: "plan_afaceri", sortOrder: 4 },
  { name: "Certificat de atestare fiscală", type: "tax_clearance", sortOrder: 5 },
  { name: "Act constitutiv", type: "incorporation", sortOrder: 6 },
];

const PROJECT_STATUSES = [
  { value: "initiated", label: "Inițiat", color: "bg-gray-200 dark:bg-gray-700" },
  { value: "documents_pending", label: "Pregătire documente", color: "bg-yellow-200 dark:bg-yellow-800" },
  { value: "internal_review", label: "Verificare internă", color: "bg-blue-200 dark:bg-blue-800" },
  { value: "submitted", label: "Depus la autoritate", color: "bg-purple-200 dark:bg-purple-800" },
  { value: "evaluation", label: "În evaluare", color: "bg-orange-200 dark:bg-orange-800" },
  { value: "approved", label: "Aprobat", color: "bg-green-200 dark:bg-green-800" },
  { value: "rejected", label: "Respins", color: "bg-red-200 dark:bg-red-800" },
];

function StatusTimeline({ currentStatus, history }: { currentStatus: string; history: StatusHistory[] }) {
  const mainStatuses = PROJECT_STATUSES.filter((s) => s.value !== "rejected");
  const currentIdx = mainStatuses.findIndex((s) => s.value === currentStatus);
  const isRejected = currentStatus === "rejected";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {mainStatuses.map((status, idx) => {
          const isCompleted = !isRejected && idx < currentIdx;
          const isCurrent = status.value === currentStatus;
          return (
            <div key={status.value} className="flex items-center">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap
                ${isCurrent ? "bg-primary text-primary-foreground" : isCompleted ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`}
                data-testid={`status-step-${status.value}`}
              >
                {isCompleted && <CheckCircle2 className="w-3 h-3" />}
                {status.label}
              </div>
              {idx < mainStatuses.length - 1 && (
                <div className={`w-6 h-0.5 mx-1 ${isCompleted ? "bg-green-400" : "bg-muted"}`} />
              )}
            </div>
          );
        })}
      </div>
      {isRejected && (
        <Badge variant="destructive" className="no-default-active-elevate">
          <XCircle className="w-3 h-3 mr-1" /> Respins
        </Badge>
      )}
      {history.length > 0 && (
        <div className="space-y-2 mt-4">
          <h4 className="text-sm font-medium text-muted-foreground">Istoricul statusurilor</h4>
          <div className="space-y-2">
            {history.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                <div>
                  <span className="font-medium">{PROJECT_STATUSES.find((s) => s.value === entry.status)?.label || entry.status}</span>
                  {entry.note && <span className="text-muted-foreground"> — {entry.note}</span>}
                  <p className="text-xs text-muted-foreground">
                    {entry.createdAt ? new Date(entry.createdAt).toLocaleString("ro-RO") : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentComments({ docId, projectId }: { docId: string; projectId: string }) {
  const [content, setContent] = useState("");
  const { user } = useAuth();

  const { data: comments, isLoading } = useQuery<any[]>({
    queryKey: ["/api/documents", docId, "comments"],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${docId}/comments`, { credentials: "include" });
      return res.json();
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(`/api/documents/${docId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
        credentials: "include",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", docId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "comment-counts"] });
      setContent("");
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await fetch(`/api/documents/${docId}/comments/${commentId}`, {
        method: "DELETE",
        credentials: "include",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", docId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "comment-counts"] });
    },
  });

  return (
    <div className="space-y-3 mt-3 pl-11">
      {isLoading ? (
        <Skeleton className="h-8" />
      ) : comments && comments.length > 0 ? (
        <div className="space-y-2">
          {comments.map((c) => {
            const commentName = [c.userFirstName, c.userLastName].filter(Boolean).join(" ") || "Utilizator";
            const commentInitials = `${(c.userFirstName?.[0] || "").toUpperCase()}${(c.userLastName?.[0] || "").toUpperCase()}` || "?";
            return (
              <div key={c.id} className="flex items-start gap-2 bg-muted/50 rounded-md p-2.5 text-sm" data-testid={`comment-${c.id}`}>
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden mt-0.5">
                  {c.userProfileImage ? (
                    <img src={c.userProfileImage} alt={commentName} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <span className="text-[10px] font-medium text-primary">{commentInitials}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">{commentName}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {c.createdAt ? new Date(c.createdAt).toLocaleString("ro-RO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm">{c.content}</p>
                </div>
                {c.userId === user?.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => deleteCommentMutation.mutate(c.id)}
                    data-testid={`button-delete-comment-${c.id}`}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Niciun comentariu încă.</p>
      )}
      <div className="flex gap-2">
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Adaugă o observație..."
          className="text-sm h-8"
          onKeyDown={(e) => {
            if (e.key === "Enter" && content.trim()) {
              addCommentMutation.mutate(content.trim());
            }
          }}
          data-testid={`input-comment-${docId}`}
        />
        <Button
          size="sm"
          className="h-8"
          disabled={!content.trim() || addCommentMutation.isPending}
          onClick={() => content.trim() && addCommentMutation.mutate(content.trim())}
          data-testid={`button-add-comment-${docId}`}
        >
          <Send className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

export default function ProjectWorkspacePage() {
  const [, params] = useRoute("/projects/:id");
  const projectId = params?.id;
  const { toast } = useToast();
  const { user } = useAuth();

  const [uploadingType, setUploadingType] = useState<{ name: string; type: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [editName, setEditName] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<Document | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [versionsDocId, setVersionsDocId] = useState<string | null>(null);
  const [draftDialogOpen, setDraftDialogOpen] = useState(false);
  const [draftSlotType, setDraftSlotType] = useState<string>("plan_afaceri");
  const [statusNote, setStatusNote] = useState("");
  const [showStatusDialog, setShowStatusDialog] = useState(false);

  const isSuperAdmin = user?.role === "super_admin";
  const [newStatus, setNewStatus] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const { data: project, isLoading: projectLoading } = useQuery<ActiveProject>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: documents, isLoading: docsLoading } = useQuery<Document[]>({
    queryKey: ["/api/projects", projectId, "documents"],
    enabled: !!projectId,
  });

  const { data: requiredDocs } = useQuery<FundingCallDoc[]>({
    queryKey: ["/api/funding-calls", project?.fundingCallId, "required-docs"],
    queryFn: async () => {
      const res = await fetch(`/api/funding-calls/${project?.fundingCallId}/required-docs`, { credentials: "include" });
      return res.json();
    },
    enabled: !!project?.fundingCallId,
    refetchInterval: (query) => {
      const docs = query.state.data;
      if (!docs || docs.length === 0) return 3000;
      const hasAiDocs = docs.some(d => d.type === "__ai_generated__");
      return hasAiDocs ? false : 5000;
    },
  });

  const { data: statusHistory } = useQuery<StatusHistory[]>({
    queryKey: ["/api/projects", projectId, "status-history"],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/status-history`, { credentials: "include" });
      return res.json();
    },
    enabled: !!projectId,
  });

  interface SourceDocumentsData {
    sourceUrl: string | null;
    summary: string | null;
    documents: Array<{ name: string; section: string | null; sizeBytes: number | null; sourceUrl: string | null }>;
  }

  const { data: eligibilityReport } = useQuery<any>({
    queryKey: ["/api/projects", projectId, "eligibility-report"],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/eligibility-report`, { credentials: "include" });
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: fundingCallVersion } = useQuery<{ currentVersion: number }>({
    queryKey: ["/api/funding-calls", project?.fundingCallId, "version"],
    queryFn: async () => {
      const res = await fetch(`/api/funding-calls/${project?.fundingCallId}`, { credentials: "include" });
      const data = await res.json();
      return { currentVersion: data.currentVersion ?? 1 };
    },
    enabled: !!project?.fundingCallId,
  });

  const guideOutdated = project?.guideVersionAtInit != null &&
    fundingCallVersion != null &&
    project.guideVersionAtInit < fundingCallVersion.currentVersion;

  const { data: sourceDocsData, isLoading: sourceDocsLoading } = useQuery<SourceDocumentsData>({
    queryKey: ["/api/funding-calls", project?.fundingCallId, "source-documents"],
    queryFn: async () => {
      const res = await fetch(`/api/funding-calls/${project?.fundingCallId}/source-documents`, { credentials: "include" });
      return res.json();
    },
    enabled: !!project?.fundingCallId,
  });

  const { data: collaborators } = useQuery<Collaborator[]>({
    queryKey: ["/api/projects", projectId, "collaborators"],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/collaborators`, { credentials: "include" });
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: commentCounts } = useQuery<Record<string, number>>({
    queryKey: ["/api/projects", projectId, "comment-counts"],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/comment-counts`, { credentials: "include" });
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: companies } = useQuery<Company[]>({ queryKey: ["/api/companies"] });
  const { data: fundingCalls } = useQuery<any[]>({
    queryKey: ["/api/funding-calls-list"],
    queryFn: async () => {
      const res = await fetch("/api/funding-calls-list", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const [conformityDocId, setConformityDocId] = useState<string | null>(null);
  const [conformityReport, setConformityReport] = useState<ConformityReport | null>(null);
  const [checkingConformity, setCheckingConformity] = useState<string | null>(null);
  const [conformityDocToConfirm, setConformityDocToConfirm] = useState<string | null>(null);
  const [expandedAnalysisId, setExpandedAnalysisId] = useState<string | null>(null);

  const { data: conformityReports, refetch: refetchConformity, isLoading: conformityLoading } = useQuery<ConformityReport[]>({
    queryKey: ["/api/projects", projectId, "conformity-reports"],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/conformity-reports`, { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!projectId,
  });

  const conformityMap = (Array.isArray(conformityReports) ? conformityReports : []).reduce((acc, r) => {
    if (!acc[r.documentId] || new Date(r.createdAt || 0) > new Date(acc[r.documentId].createdAt || 0)) {
      acc[r.documentId] = r;
    }
    return acc;
  }, {} as Record<string, ConformityReport>);

  async function runConformityCheck(docId: string) {
    setCheckingConformity(docId);
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}/check-conformity`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        if (res.status === 402) {
          toast({ title: "Credite insuficiente", description: d?.message || "Nu ai suficiente credite pentru această acțiune.", variant: "destructive" });
          return;
        }
        throw new Error(d?.message || "Eroare la verificarea conformității");
      }
      const report = await res.json();
      setConformityReport(report);
      setConformityDocId(docId);
      refetchConformity();
      queryClient.invalidateQueries({ queryKey: ["/api/credits/balance"] });
      toast({ title: "Analiză completă", description: `Verdict: ${report.verdict === "conform" ? "Conform" : report.verdict === "partial_conform" ? "Parțial conform" : "Neconform"} — Scor: ${report.score ?? 0}%` });
    } catch (error: any) {
      toast({ title: "Eroare analiză document", description: error.message, variant: "destructive" });
    } finally {
      setCheckingConformity(null);
    }
  }

  const [consortiumCui, setConsortiumCui] = useState("");
  const [consortiumRole, setConsortiumRole] = useState("partener");
  const [consortiumName, setConsortiumName] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("partener");
  const [editBudgetShare, setEditBudgetShare] = useState("");

  interface ConsortiumData {
    consortium: { id: string; projectId: string; name: string; userId: string; createdAt: string } | null;
    members: Array<{
      id: string; consortiumId: string; companyId: string; role: string | null;
      budgetShare: number | null; notes: string | null; createdAt: string | null;
      company: Company;
    }>;
  }

  interface EligibilityResult {
    fundingCallName: string;
    members: Array<{
      memberId: string; companyId: string; companyName: string; cui: string;
      role: string | null; budgetShare: number | null; eligible: boolean;
      criteria: Array<{ name: string; matched: boolean; details: string }>;
      passedCount: number; totalCount: number;
    }>;
  }

  const { data: consortiumData, isLoading: consortiumLoading } = useQuery<ConsortiumData>({
    queryKey: ["/api/projects", projectId, "consortium"],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/consortium`, { credentials: "include" });
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: consortiumEligibility, isLoading: eligibilityLoading } = useQuery<EligibilityResult>({
    queryKey: ["/api/projects", projectId, "consortium", "eligibility"],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/consortium/eligibility`, { credentials: "include" });
      return res.json();
    },
    enabled: !!consortiumData?.consortium,
  });

  const invalidateConsortium = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "consortium"] });
    queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "consortium", "eligibility"] });
  };

  const createConsortiumMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`/api/projects/${projectId}/consortium`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        credentials: "include",
      });
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.message || "Eroare"); }
      return res.json();
    },
    onSuccess: () => { invalidateConsortium(); setConsortiumName(""); toast({ title: "Consorțiu creat", description: "Compania dvs. a fost adăugată automat ca lider." }); },
    onError: (error: Error) => { toast({ title: "Eroare", description: error.message, variant: "destructive" }); },
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({ cui, role }: { cui: string; role: string }) => {
      const res = await fetch(`/api/projects/${projectId}/consortium/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cui, role }),
        credentials: "include",
      });
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.message || "Eroare"); }
      return res.json();
    },
    onSuccess: () => { invalidateConsortium(); setConsortiumCui(""); setShowAddMember(false); toast({ title: "Partener adăugat" }); },
    onError: (error: Error) => { toast({ title: "Eroare", description: error.message, variant: "destructive" }); },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ memberId, role, budgetShare }: { memberId: string; role: string; budgetShare?: number }) => {
      const res = await fetch(`/api/projects/${projectId}/consortium/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, budgetShare }),
        credentials: "include",
      });
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.message || "Eroare"); }
      return res.json();
    },
    onSuccess: () => { invalidateConsortium(); setEditingMember(null); toast({ title: "Membru actualizat" }); },
    onError: (error: Error) => { toast({ title: "Eroare", description: error.message, variant: "destructive" }); },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const res = await fetch(`/api/projects/${projectId}/consortium/members/${memberId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.message || "Eroare"); }
      return res.json();
    },
    onSuccess: () => { invalidateConsortium(); toast({ title: "Membru eliminat" }); },
    onError: (error: Error) => { toast({ title: "Eroare", description: error.message, variant: "destructive" }); },
  });

  const invalidateDocs = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "documents"] });
    queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
    queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
  };

  const uploadMutation = useMutation({
    mutationFn: async ({ name, type, file }: { name: string; type: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", name);
      formData.append("type", type);
      const res = await fetch(`/api/projects/${projectId}/documents`, {
        method: "POST", body: formData, credentials: "include",
      });
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.message || "Încărcarea a eșuat"); }
      return res.json();
    },
    onSuccess: () => { invalidateDocs(); setUploadingType(null); setSelectedFile(null); toast({ title: "Document încărcat", description: "Fișierul a fost încărcat cu succes." }); },
    onError: (error: Error) => { toast({ title: "Încărcare eșuată", description: error.message, variant: "destructive" }); },
  });

  const editMutation = useMutation({
    mutationFn: async ({ docId, name, file }: { docId: string; name?: string; file?: File }) => {
      const formData = new FormData();
      if (name) formData.append("name", name);
      if (file) formData.append("file", file);
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}`, {
        method: "PUT", body: formData, credentials: "include",
      });
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.message || "Actualizarea a eșuat"); }
      return res.json();
    },
    onSuccess: () => { invalidateDocs(); setEditingDoc(null); setEditFile(null); setEditName(""); toast({ title: "Document actualizat", description: "Modificările au fost salvate." }); },
    onError: (error: Error) => { toast({ title: "Actualizare eșuată", description: error.message, variant: "destructive" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.message || "Ștergerea a eșuat"); }
    },
    onSuccess: () => { invalidateDocs(); setDeletingDoc(null); toast({ title: "Document șters", description: "Documentul a fost eliminat." }); },
    onError: (error: Error) => { toast({ title: "Ștergere eșuată", description: error.message, variant: "destructive" }); },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, note }: { status: string; note: string }) => {
      const res = await fetch(`/api/projects/${projectId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note }),
        credentials: "include",
      });
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.message || "Eroare"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "status-history"] });
      setShowStatusDialog(false);
      setStatusNote("");
      toast({ title: "Status actualizat" });
    },
    onError: (error: Error) => { toast({ title: "Eroare", description: error.message, variant: "destructive" }); },
  });

  const addCollaboratorMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const res = await fetch(`/api/projects/${projectId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
        credentials: "include",
      });
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.message || "Eroare"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "collaborators"] });
      setInviteEmail("");
      toast({ title: "Colaborator invitat", description: "Invitația a fost trimisă." });
    },
    onError: (error: Error) => { toast({ title: "Eroare", description: error.message, variant: "destructive" }); },
  });

  const removeCollaboratorMutation = useMutation({
    mutationFn: async (collabId: string) => {
      await fetch(`/api/projects/${projectId}/collaborators/${collabId}`, { method: "DELETE", credentials: "include" });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "collaborators"] }); toast({ title: "Colaborator eliminat" }); },
  });

  const docList = requiredDocs && requiredDocs.length > 0
    ? requiredDocs.filter(d => d.type !== "__ai_generated__")
    : DEFAULT_REQUIRED_DOCS;

  function openPreview(doc: Document) { setPreviewUrl(`/api/projects/${projectId}/documents/${doc.id}/download`); setPreviewName(doc.name); }
  function openEditDialog(doc: Document) { setEditingDoc(doc); setEditName(doc.name); setEditFile(null); }
  function toggleComments(docId: string) {
    setExpandedComments((prev) => { const n = new Set(prev); if (n.has(docId)) n.delete(docId); else n.add(docId); return n; });
  }

  const company = companies?.find((c) => c.id === project?.companyId);
  const fundingCall = fundingCalls?.find((f) => f.id === project?.fundingCallId);
  const uploadedDocs = documents?.filter((d) => d.status === "uploaded").length || 0;
  const totalDocs = docList.length;

  if (projectLoading) {
    return <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-6xl mx-auto"><Skeleton className="h-8 w-48" /><Skeleton className="h-48" /><Skeleton className="h-64" /></div>;
  }

  if (!project) {
    return (
      <div className="p-4 sm:p-6 space-y-4 max-w-6xl mx-auto">
        <Card className="p-12 text-center space-y-4">
          <XCircle className="w-12 h-12 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-semibold">Proiectul nu a fost găsit</h3>
          <Link href="/projects"><Button><ArrowLeft className="w-4 h-4 mr-1" /> Înapoi la proiecte</Button></Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/projects">
          <Button variant="outline" size="sm" data-testid="button-back-projects"><ArrowLeft className="w-3.5 h-3.5 mr-1" /> Înapoi</Button>
        </Link>
        <div className="space-y-1">
          <h1 className="text-lg sm:text-2xl font-serif font-bold tracking-tight truncate" data-testid="text-project-title">{fundingCall?.name || "Spațiu de lucru proiect"}</h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
            <span className="flex items-center gap-1 truncate"><Building2 className="w-3.5 h-3.5 shrink-0" />{company?.name || "Companie necunoscută"}</span>
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 shrink-0" />{project.createdAt ? new Date(project.createdAt).toLocaleDateString("ro-RO") : "N/A"}</span>
          </div>
        </div>
      </div>

      {guideOutdated && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-300 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-950/40 p-4" data-testid="alert-guide-updated">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Ghid actualizat (Erată)</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              O versiune mai nouă a Ghidului a fost publicată după ce ai deschis acest proiect. Verifică noile condiții și re-evaluează eligibilitatea!
            </p>
          </div>
        </div>
      )}

      {eligibilityReport?.verdict === "NEELIGIBIL" && (
        <div className="flex items-start gap-3 rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/40 p-4" data-testid="alert-project-ineligible">
          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">Companie neeligibilă pentru acest apel</p>
            <p className="text-sm text-red-700 dark:text-red-300">
              Conform ultimei verificări (scor {eligibilityReport.verdictScore ?? 0}/100), compania nu îndeplinește condițiile de eligibilitate. Poți continua pregătirea documentelor, dar șansele de aprobare sunt reduse — verifică criteriile înainte de depunere.
            </p>
          </div>
        </div>
      )}

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-semibold">Flux proiect</h3>
          <Button size="sm" variant="outline" onClick={() => { setNewStatus(project.status || "initiated"); setShowStatusDialog(true); }} data-testid="button-change-status">
            Schimbă status
          </Button>
        </div>
        <StatusTimeline currentStatus={project.status || "initiated"} history={statusHistory || []} />
      </Card>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card className="p-3 sm:p-5 space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs sm:text-sm text-muted-foreground">Documente</p>
            <span className="text-xs sm:text-sm font-medium">{uploadedDocs}/{totalDocs}</span>
          </div>
          <Progress value={Math.round(project.progress || 0)} className="h-1.5 sm:h-2" />
        </Card>
        <Card className="p-3 sm:p-5 space-y-1 sm:space-y-2">
          <p className="text-xs sm:text-sm text-muted-foreground">Progres</p>
          <p className="text-lg sm:text-2xl font-bold" data-testid="text-project-progress">{Math.round(project.progress || 0)}%</p>
        </Card>
        <Card className="p-3 sm:p-5 space-y-1 sm:space-y-2">
          <p className="text-xs sm:text-sm text-muted-foreground">Colaboratori</p>
          <p className="text-lg sm:text-2xl font-bold" data-testid="text-collaborators-count">{(collaborators?.length || 0) + 1}</p>
        </Card>
      </div>

      <Tabs defaultValue="documents" className="space-y-4 sm:space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1 sm:inline-flex sm:flex-nowrap sm:h-10 sm:gap-0 w-full">
          <TabsTrigger value="documents" className="text-xs sm:text-sm flex-1 sm:flex-initial" data-testid="tab-documents">Documente</TabsTrigger>
          <TabsTrigger value="authority-docs" className="text-xs sm:text-sm flex-1 sm:flex-initial" data-testid="tab-authority-docs">
            <BookOpen className="w-3 sm:w-3.5 h-3 sm:h-3.5 mr-1" />
            <span className="hidden sm:inline">Documente autoritate</span>
            <span className="sm:hidden">Autoritate</span>
          </TabsTrigger>
          <TabsTrigger value="consortium" className="text-xs sm:text-sm flex-1 sm:flex-initial" data-testid="tab-consortium">
            <Network className="w-3 sm:w-3.5 h-3 sm:h-3.5 mr-1" />
            Consorțiu
            {consortiumData?.members && consortiumData.members.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 no-default-active-elevate">{consortiumData.members.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="team" className="text-xs sm:text-sm flex-1 sm:flex-initial" data-testid="tab-team">Echipa</TabsTrigger>
          <TabsTrigger value="eligibility" className="text-xs sm:text-sm flex-1 sm:flex-initial" data-testid="tab-eligibility">Eligibilitate</TabsTrigger>
          <TabsTrigger value="doc-analysis" className="text-xs sm:text-sm flex-1 sm:flex-initial" data-testid="tab-doc-analysis">
            <FileSearch className="w-3 sm:w-3.5 h-3 sm:h-3.5 mr-1" />
            <span className="hidden sm:inline">Analiza documente</span>
            <span className="sm:hidden">Analiza</span>
            {conformityReports && conformityReports.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 no-default-active-elevate">{conformityReports.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="details" className="text-xs sm:text-sm flex-1 sm:flex-initial" data-testid="tab-details">Detalii</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          {docsLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : (
            <div className="space-y-3">
              {docList.map((reqDoc) => {
                const doc = documents?.find((d) => d.type === reqDoc.type);
                const status = doc?.status || "pending";
                const cfg = docStatusConfig[status] || docStatusConfig.pending;
                const StatusIcon = cfg.icon;
                const isExpiring = doc?.expiresAt && new Date(doc.expiresAt) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                const isExpanded = doc ? expandedComments.has(doc.id) : false;

                return (
                  <div key={reqDoc.type}>
                    <Card className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${status === "uploaded" ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"}`}>
                          <StatusIcon className={`w-4 h-4 ${cfg.color}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{doc?.name || reqDoc.name}</p>
                            {doc && checkingConformity === doc.id && (
                              <Loader2 className="w-3 h-3 animate-spin text-blue-500 shrink-0" />
                            )}
                            {doc && conformityMap[doc.id] && checkingConformity !== doc.id && (
                              <button
                                onClick={() => { setConformityReport(conformityMap[doc.id]); setConformityDocId(doc.id); }}
                                className="shrink-0"
                                data-testid={`badge-conformity-${reqDoc.type}`}
                              >
                                <Badge
                                  variant="secondary"
                                  className={`text-[10px] px-1.5 py-0 no-default-active-elevate cursor-pointer ${
                                    conformityMap[doc.id].verdict === "conform"
                                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                      : conformityMap[doc.id].verdict === "partial_conform"
                                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                  }`}
                                >
                                  {conformityMap[doc.id].verdict === "conform" ? "✓ Conform" : conformityMap[doc.id].verdict === "partial_conform" ? "◐ Parțial" : "✗ Neconform"}
                                </Badge>
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {status === "uploaded" && doc?.createdAt
                              ? `Încărcat la ${new Date(doc.createdAt).toLocaleDateString("ro-RO")}`
                              : cfg.label}
                            {isExpiring && status === "uploaded" && (
                              <span className="text-yellow-600 dark:text-yellow-400 ml-2">
                                — Expiră la {doc?.expiresAt ? new Date(doc.expiresAt).toLocaleDateString("ro-RO") : ""}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {isSuperAdmin && isBusinessPlanDocType(reqDoc.type) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setDraftSlotType(reqDoc.type); setDraftDialogOpen(true); }}
                            data-testid="button-ai-draft-business-plan"
                          >
                            <Sparkles className="w-3.5 h-3.5 mr-1" /> Draft AI
                          </Button>
                        )}
                        {status !== "uploaded" ? (
                          <Button variant="outline" size="sm" onClick={() => setUploadingType(reqDoc)} data-testid={`button-upload-${reqDoc.type}`}>
                            <Upload className="w-3.5 h-3.5 mr-1" /> Încarcă
                          </Button>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8 relative" onClick={() => doc && toggleComments(doc.id)} data-testid={`button-comments-${reqDoc.type}`}>
                              <MessageSquare className="w-4 h-4" />
                              {doc && commentCounts && commentCounts[doc.id] > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
                                  {commentCounts[doc.id]}
                                </span>
                              )}
                            </Button>
                            <DropdownMenu modal={false}>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-doc-menu-${reqDoc.type}`}>
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => doc && openPreview(doc)} data-testid={`button-preview-${reqDoc.type}`}>
                                  <Eye className="w-4 h-4 mr-2" /> Previzualizare
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <a href={`/api/projects/${projectId}/documents/${doc?.id}/download`} download data-testid={`button-download-${reqDoc.type}`}>
                                    <Download className="w-4 h-4 mr-2" /> Descarcă
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => doc && openEditDialog(doc)} data-testid={`button-edit-${reqDoc.type}`}>
                                  <Pencil className="w-4 h-4 mr-2" /> Editează
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => doc && setVersionsDocId(doc.id)} data-testid={`button-versions-${reqDoc.type}`}>
                                  <History className="w-4 h-4 mr-2" /> Istoric versiuni
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => doc && setConformityDocToConfirm(doc.id)}
                                  disabled={checkingConformity === doc?.id}
                                  data-testid={`button-conformity-${reqDoc.type}`}
                                >
                                  {checkingConformity === doc?.id ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <ClipboardCheck className="w-4 h-4 mr-2" />
                                  )}
                                  Analiză AI document
                                </DropdownMenuItem>
                                {doc && conformityMap[doc.id] && (
                                  <DropdownMenuItem
                                    onClick={() => { setConformityReport(conformityMap[doc.id]); setConformityDocId(doc.id); }}
                                    data-testid={`button-view-conformity-${reqDoc.type}`}
                                  >
                                    <Eye className="w-4 h-4 mr-2" /> Vezi raport analiză
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => setUploadingType(reqDoc)} data-testid={`button-replace-${reqDoc.type}`}>
                                  <RefreshCw className="w-4 h-4 mr-2" /> Reîncarcă
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => doc && setDeletingDoc(doc)} data-testid={`button-delete-${reqDoc.type}`}>
                                  <Trash2 className="w-4 h-4 mr-2" /> Șterge
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        )}
                      </div>
                    </Card>
                    {isExpanded && doc && (
                      <DocumentComments docId={doc.id} projectId={projectId!} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="authority-docs" className="space-y-4">
          {sourceDocsLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : (
            <>
              {sourceDocsData?.sourceUrl && (
                <Card className="p-4 flex items-center gap-3 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800" data-testid="card-authority-link">
                  <ExternalLink className="w-5 h-5 text-blue-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Pagina oficială a apelului</p>
                    <p className="text-xs text-muted-foreground truncate">{sourceDocsData.sourceUrl}</p>
                  </div>
                  <a href={sourceDocsData.sourceUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" data-testid="button-open-source-url">
                      <ExternalLink className="w-3.5 h-3.5 mr-1" />
                      Deschide
                    </Button>
                  </a>
                </Card>
              )}

              {sourceDocsData?.summary && (
                <Card className="p-5 space-y-3" data-testid="card-authority-summary">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Rezumat AI al apelului
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{sourceDocsData.summary}</p>
                </Card>
              )}

              <Card className="p-5 space-y-3" data-testid="card-authority-documents">
                <h3 className="font-semibold flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Documente publicate de autoritate
                  {sourceDocsData?.documents && sourceDocsData.documents.length > 0 && (
                    <Badge variant="secondary" className="ml-auto no-default-active-elevate">{sourceDocsData.documents.length} documente</Badge>
                  )}
                </h3>
                {sourceDocsData?.documents && sourceDocsData.documents.length > 0 ? (
                  <div className="space-y-2">
                    {(() => {
                      const sections = new Map<string, typeof sourceDocsData.documents>();
                      for (const doc of sourceDocsData.documents) {
                        const key = doc.section || "Alte documente";
                        if (!sections.has(key)) sections.set(key, []);
                        sections.get(key)!.push(doc);
                      }
                      return Array.from(sections.entries()).map(([section, docs]) => (
                        <div key={section} className="space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">{section}</p>
                          {docs.map((doc, i) => {
                            const inner = (
                              <>
                                <File className="w-4 h-4 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{doc.name}</p>
                                  {doc.sizeBytes && (
                                    <p className="text-xs text-muted-foreground">
                                      {doc.sizeBytes > 1048576
                                        ? `${(doc.sizeBytes / 1048576).toFixed(1)} MB`
                                        : `${Math.round(doc.sizeBytes / 1024)} KB`}
                                    </p>
                                  )}
                                </div>
                                {doc.sourceUrl && <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                              </>
                            );
                            return doc.sourceUrl ? (
                              <a key={i} href={doc.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-muted/50 rounded-md hover:bg-primary/5 hover:border-primary/20 border border-transparent transition-colors cursor-pointer" data-testid={`authority-doc-${i}`}>
                                {inner}
                              </a>
                            ) : (
                              <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-md" data-testid={`authority-doc-${i}`}>
                                {inner}
                              </div>
                            );
                          })}
                        </div>
                      ));
                    })()}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Nu sunt disponibile documente publicate de autoritate pentru acest apel.
                    {sourceDocsData?.sourceUrl && " Verificați pagina oficială a apelului."}
                  </p>
                )}
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="consortium" className="space-y-4">
          {consortiumLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : !consortiumData?.consortium ? (
            <Card className="p-8 text-center space-y-4" data-testid="card-create-consortium">
              <Network className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-lg">Creează un consorțiu</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Adaugă parteneri la acest proiect pentru a aplica împreună la finanțare.
                  Compania dvs. va fi adăugată automat ca lider de consorțiu.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 justify-center max-w-sm mx-auto">
                <Input
                  placeholder="Nume consortiu (optional)"
                  value={consortiumName}
                  onChange={(e) => setConsortiumName(e.target.value)}
                  className="flex-1"
                  data-testid="input-consortium-name"
                />
                <Button
                  onClick={() => createConsortiumMutation.mutate(consortiumName)}
                  disabled={createConsortiumMutation.isPending}
                  data-testid="button-create-consortium"
                  className="shrink-0"
                >
                  {createConsortiumMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                  Creează
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <Network className="w-4 h-4" />
                    {consortiumData.consortium.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {consortiumData.members.length} {consortiumData.members.length === 1 ? "membru" : "membri"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddMember(true)}
                  data-testid="button-add-member"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Adaugă partener
                </Button>
              </div>

              {showAddMember && (
                <Card className="p-4 space-y-3 border-dashed" data-testid="card-add-member-form">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Search className="w-3.5 h-3.5" />
                    Adaugă partener prin CUI
                  </h4>
                  <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">CUI companie partener</Label>
                      <Input
                        placeholder="ex: 12345678"
                        value={consortiumCui}
                        onChange={(e) => setConsortiumCui(e.target.value)}
                        data-testid="input-member-cui"
                      />
                    </div>
                    <div className="w-36 space-y-1">
                      <Label className="text-xs">Rol</Label>
                      <Select value={consortiumRole} onValueChange={setConsortiumRole}>
                        <SelectTrigger data-testid="select-member-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lider">Lider</SelectItem>
                          <SelectItem value="partener">Partener</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={() => addMemberMutation.mutate({ cui: consortiumCui, role: consortiumRole })}
                      disabled={!consortiumCui.trim() || addMemberMutation.isPending}
                      data-testid="button-confirm-add-member"
                    >
                      {addMemberMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                      Adaugă
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setShowAddMember(false); setConsortiumCui(""); }} data-testid="button-cancel-add-member">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Compania va fi verificată automat prin termene.ro și adăugată în sistem dacă nu există deja.
                  </p>
                </Card>
              )}

              <div className="space-y-2">
                {consortiumData.members.map((member) => {
                  const eligibility = consortiumEligibility?.members.find((e) => e.memberId === member.id);
                  const isLider = member.role === "lider";
                  const isEditing = editingMember === member.id;

                  return (
                    <Card key={member.id} className="p-4" data-testid={`card-consortium-member-${member.id}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isLider ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600" : "bg-blue-100 dark:bg-blue-900/30 text-blue-600"}`}>
                          {isLider ? <Crown className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{member.company.name}</span>
                            <Badge variant={isLider ? "default" : "outline"} className="text-[10px] no-default-active-elevate">
                              {isLider ? "Lider" : "Partener"}
                            </Badge>
                            {member.budgetShare != null && (
                              <Badge variant="secondary" className="text-[10px] no-default-active-elevate">
                                {member.budgetShare}% buget
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span>CUI: {member.company.cui}</span>
                            {member.company.judet && <span>• {member.company.judet}</span>}
                            {member.company.caen && <span>• CAEN: {member.company.caen}</span>}
                            {member.company.employees && <span>• {member.company.employees} angajați</span>}
                          </div>

                          {eligibility && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {eligibility.criteria.map((c, i) => (
                                <Badge
                                  key={i}
                                  variant={c.matched ? "default" : "destructive"}
                                  className="text-[10px] gap-1 no-default-active-elevate"
                                  title={c.details}
                                >
                                  {c.matched ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                  {c.name}
                                </Badge>
                              ))}
                              <Badge
                                variant={eligibility.eligible ? "default" : "destructive"}
                                className="text-[10px] gap-1 font-semibold no-default-active-elevate"
                              >
                                {eligibility.eligible ? <ShieldCheck className="w-3 h-3" /> : <ShieldX className="w-3 h-3" />}
                                {eligibility.passedCount}/{eligibility.totalCount}
                              </Badge>
                            </div>
                          )}

                          {isEditing && (
                            <div className="mt-3 flex items-end gap-2 p-2 bg-muted/50 rounded-md">
                              <div className="w-32 space-y-1">
                                <Label className="text-xs">Rol</Label>
                                <Select value={editRole} onValueChange={setEditRole}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="lider">Lider</SelectItem>
                                    <SelectItem value="partener">Partener</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="w-24 space-y-1">
                                <Label className="text-xs">% Buget</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={editBudgetShare}
                                  onChange={(e) => setEditBudgetShare(e.target.value)}
                                  placeholder="0-100"
                                />
                              </div>
                              <Button
                                size="sm"
                                onClick={() => updateMemberMutation.mutate({
                                  memberId: member.id,
                                  role: editRole,
                                  budgetShare: editBudgetShare ? parseFloat(editBudgetShare) : undefined,
                                })}
                                disabled={updateMemberMutation.isPending}
                              >
                                {updateMemberMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Salvează"}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingMember(null)}>Anulează</Button>
                            </div>
                          )}
                        </div>

                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="shrink-0" data-testid={`button-member-menu-${member.id}`}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setEditingMember(member.id);
                              setEditRole(member.role || "partener");
                              setEditBudgetShare(member.budgetShare?.toString() || "");
                            }}>
                              <Pencil className="w-3.5 h-3.5 mr-2" />
                              Editează rol / buget
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => removeMemberMutation.mutate(member.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              Elimină din consorțiu
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {eligibilityLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Se verifică eligibilitatea membrilor...
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4" /> Echipa proiectului</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                  {user?.firstName?.[0]?.toUpperCase() || "?"}{user?.lastName?.[0]?.toUpperCase() || ""}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <Badge variant="default" className="no-default-active-elevate">Proprietar</Badge>
              </div>
              {collaborators?.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                    {c.email[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{c.email}</p>
                    <p className="text-xs text-muted-foreground">{c.role === "editor" ? "Editor" : "Vizualizator"}</p>
                  </div>
                  <Badge variant={c.status === "accepted" ? "default" : "secondary"} className="no-default-active-elevate">
                    {c.status === "accepted" ? "Acceptat" : "În așteptare"}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeCollaboratorMutation.mutate(c.id)} data-testid={`button-remove-collab-${c.id}`}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><UserPlus className="w-4 h-4" /> Invită colaborator</h3>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="Email colaborator" className="flex-1" data-testid="input-invite-email" />
              <div className="flex gap-2">
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="w-[130px] sm:w-[140px]" data-testid="select-invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Vizualizator</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                  </SelectContent>
                </Select>
                <Button disabled={!inviteEmail.trim() || addCollaboratorMutation.isPending} onClick={() => addCollaboratorMutation.mutate({ email: inviteEmail, role: inviteRole })} data-testid="button-invite-collaborator">
                  {addCollaboratorMutation.isPending ? "Se trimite..." : "Invita"}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="eligibility" className="space-y-4">
          {eligibilityReport && eligibilityReport.verdict ? (
            <div className="space-y-4">
              <Card className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  {eligibilityReport.verdict === "ELIGIBIL" ? (
                    <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
                  ) : eligibilityReport.verdict === "NEELIGIBIL" ? (
                    <XCircle className="w-7 h-7 text-red-500" />
                  ) : (
                    <AlertTriangle className="w-7 h-7 text-yellow-600 dark:text-yellow-400" />
                  )}
                  <div>
                    <h3 className="text-lg font-bold" data-testid="text-report-verdict">{eligibilityReport.verdict}</h3>
                    <p className="text-sm text-muted-foreground">Scor: {eligibilityReport.verdictScore}/100</p>
                  </div>
                </div>
                {eligibilityReport.verdictSummary && (
                  <p className="text-sm leading-relaxed">{eligibilityReport.verdictSummary}</p>
                )}
              </Card>

              {eligibilityReport.hasDualAnalysis && eligibilityReport.optimistAnalysis && eligibilityReport.skepticAnalysis && (
                <Card className="p-5 space-y-4" data-testid="card-workspace-dual">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h3 className="text-sm font-semibold">Analiza Expertului (Perspectivă Duală)</h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <ThumbsUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-semibold text-green-700 dark:text-green-300">Puncte Forte & Oportunități</span>
                      </div>
                      {eligibilityReport.optimistAnalysis.summary && (
                        <p className="text-xs text-green-700 dark:text-green-400 italic">{eligibilityReport.optimistAnalysis.summary}</p>
                      )}
                      <ul className="space-y-2">
                        {(eligibilityReport.optimistAnalysis.points || []).map((p: any, i: number) => (
                          <li key={i} className="text-sm">
                            <div className="flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                              <div>
                                <span className="font-medium text-green-800 dark:text-green-200">{p.title}</span>
                                <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">{p.detail}</p>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <span className="text-sm font-semibold text-red-700 dark:text-red-300">Riscuri & Bariere de Eligibilitate</span>
                      </div>
                      {eligibilityReport.skepticAnalysis.summary && (
                        <p className="text-xs text-red-700 dark:text-red-400 italic">{eligibilityReport.skepticAnalysis.summary}</p>
                      )}
                      <ul className="space-y-2">
                        {(eligibilityReport.skepticAnalysis.points || []).map((p: any, i: number) => (
                          <li key={i} className="text-sm">
                            <div className="flex items-start gap-2">
                              <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                              <div>
                                <span className="font-medium text-red-800 dark:text-red-200">{p.title}</span>
                                <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">{p.detail}</p>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              )}

              {eligibilityReport.criteria && Array.isArray(eligibilityReport.criteria) && eligibilityReport.criteria.length > 0 && (
                <Card className="p-5 space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    Criterii analizate ({eligibilityReport.criteria.length})
                  </h3>
                  <div className="space-y-2">
                    {eligibilityReport.criteria.map((c: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        {c.status === "îndeplinit" ? (
                          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-green-600 dark:text-green-400" />
                        ) : c.status === "neîndeplinit" ? (
                          <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-yellow-600 dark:text-yellow-400" />
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{c.criteriu}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">{c.detalii}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          ) : (
            <Card className="p-12 text-center space-y-3">
              <Sparkles className="w-10 h-10 text-muted-foreground mx-auto" />
              <h3 className="font-semibold">Nicio analiză de eligibilitate</h3>
              <p className="text-sm text-muted-foreground">
                Verifică eligibilitatea companiei pentru acest apel de finanțare din pagina de eligibilitate.
              </p>
              <Link href={`/eligibility?companyId=${project.companyId}&callId=${project.fundingCallId}`}>
                <Button size="sm" data-testid="button-check-eligibility">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Verifică eligibilitatea
                </Button>
              </Link>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="doc-analysis" className="space-y-4">
          {conformityLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : conformityReports && conformityReports.length > 0 ? (
            <div className="space-y-4">
              <Card className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSearch className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Istoric analize documente</h3>
                  </div>
                  <Badge variant="secondary" className="no-default-active-elevate">
                    {conformityReports.length} {conformityReports.length === 1 ? "analiză" : "analize"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Fiecare analiză AI verifică documentul încărcat față de cerințele din ghidul de finanțare. Rezultatele sunt salvate și pot fi consultate oricând.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-analysis-conform-count">
                      {conformityReports.filter(r => r.verdict === "conform").length}
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-400">Conforme</p>
                  </div>
                  <div className="text-center p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400" data-testid="text-analysis-partial-count">
                      {conformityReports.filter(r => r.verdict === "partial_conform").length}
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400">Parțial conforme</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-analysis-nonconform-count">
                      {conformityReports.filter(r => r.verdict === "neconform").length}
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-400">Neconforme</p>
                  </div>
                </div>
              </Card>

              {conformityReports.map((report, idx) => {
                const docName = report.documentName || documents?.find(d => d.id === report.documentId)?.name || "Document";
                return (
                  <Card key={report.id} className="overflow-hidden" data-testid={`card-analysis-${idx}`}>
                    <button
                      className="w-full p-4 flex items-center justify-between gap-3 text-left"
                      onClick={() => setExpandedAnalysisId(expandedAnalysisId === report.id ? null : report.id)}
                      data-testid={`button-expand-analysis-${idx}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                          report.verdict === "conform" ? "bg-green-100 dark:bg-green-900/30" :
                          report.verdict === "partial_conform" ? "bg-amber-100 dark:bg-amber-900/30" :
                          "bg-red-100 dark:bg-red-900/30"
                        }`}>
                          {report.verdict === "conform" ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                          ) : report.verdict === "partial_conform" ? (
                            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{docName}</p>
                          <p className="text-xs text-muted-foreground">
                            {report.createdAt ? new Date(report.createdAt).toLocaleString("ro-RO") : ""}
                            {report.model && <span className="ml-2 text-[10px] opacity-60">({report.model})</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <Badge
                            variant="secondary"
                            className={`text-xs no-default-active-elevate ${
                              report.verdict === "conform"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : report.verdict === "partial_conform"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                            data-testid={`badge-analysis-verdict-${idx}`}
                          >
                            {report.verdict === "conform" ? "Conform" : report.verdict === "partial_conform" ? "Parțial conform" : "Neconform"}
                          </Badge>
                          {report.score != null && (
                            <p className="text-xs font-semibold mt-1">{report.score}%</p>
                          )}
                        </div>
                        {expandedAnalysisId === report.id ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {expandedAnalysisId === report.id && (
                      <div className="px-4 pb-4 space-y-4 border-t" data-testid={`analysis-details-${idx}`}>
                        {(() => {
                          const sentinel = findRelevanceMismatch(report.criteria);
                          const mismatch = report.relevanceMismatch === true || sentinel != null;
                          if (!mismatch) return null;
                          const reason = sentinel?.reason || report.relevanceReason || "Documentul nu corespunde apelului de finanțare sau solicitantului curent.";
                          return (
                            <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-800 rounded-lg flex items-start gap-2" data-testid={`alert-relevance-mismatch-${idx}`}>
                              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-semibold text-red-800 dark:text-red-300">Document nepotrivit pentru acest apel/solicitant</p>
                                <p className="text-xs text-red-700 dark:text-red-400 mt-0.5" data-testid={`text-relevance-reason-${idx}`}>{reason}</p>
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1">Documentul pare să aparțină altui apel de finanțare sau altei firme. Încărcați documentul corect pentru acest proiect.</p>
                              </div>
                            </div>
                          );
                        })()}
                        {report.isTemplate && (
                          <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg flex items-start gap-2" data-testid={`alert-template-${idx}`}>
                            <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-orange-800 dark:text-orange-300">Document template/model detectat</p>
                              <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">Acest document pare a fi un formular necompletat sau un model oficial. Completați toate secțiunile cu datele reale ale proiectului.</p>
                            </div>
                          </div>
                        )}
                        {report.score != null && (
                          <div className="pt-4">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-muted-foreground">Scor analiză</span>
                              <span className="text-sm font-bold">{report.score}%</span>
                            </div>
                            <Progress value={report.score} className="h-2" />
                          </div>
                        )}

                        {report.summary && (
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm leading-relaxed" data-testid={`text-analysis-summary-${idx}`}>{report.summary}</p>
                          </div>
                        )}

                        {(() => {
                          const visibleCriteria = (report.criteria || []).filter(
                            (c) => c?.requirement !== RELEVANCE_MISMATCH_REQUIREMENT,
                          );
                          if (visibleCriteria.length === 0) return null;
                          return (
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-primary" />
                              Criterii verificate ({visibleCriteria.length})
                            </h4>
                            <div className="space-y-1.5">
                              {visibleCriteria.map((c, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30" data-testid={`analysis-criterion-${idx}-${i}`}>
                                  <span className="shrink-0 mt-0.5">
                                    {c.status === "îndeplinit" ? (
                                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    ) : c.status === "neîndeplinit" ? (
                                      <XCircle className="w-4 h-4 text-red-500" />
                                    ) : c.status === "parțial" ? (
                                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                                    ) : (
                                      <Clock className="w-4 h-4 text-muted-foreground" />
                                    )}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium">{c.requirement}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{c.details}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          );
                        })()}

                        {report.missingElements && report.missingElements.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                              <XCircle className="w-4 h-4" />
                              Elemente lipsă ({report.missingElements.length})
                            </h4>
                            <div className="space-y-1">
                              {report.missingElements.map((m, i) => (
                                <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-red-50/50 dark:bg-red-950/20 text-sm">
                                  <span className="text-red-500 shrink-0 mt-0.5">•</span>
                                  <span>{m}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {report.recommendations && report.recommendations.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                              <Sparkles className="w-4 h-4" />
                              Recomandări ({report.recommendations.length})
                            </h4>
                            <div className="space-y-1">
                              {report.recommendations.map((r, i) => (
                                <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-blue-50/50 dark:bg-blue-950/20 text-sm">
                                  <span className="text-blue-500 shrink-0 mt-0.5">→</span>
                                  <span>{r}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <AiDisclaimer compact />

                        {report.ragSectionsUsed != null && (
                          <p className="text-xs text-muted-foreground text-right">
                            {report.ragSectionsUsed} secțiuni din ghid analizate
                          </p>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-12 text-center space-y-3">
              <FileSearch className="w-10 h-10 text-muted-foreground mx-auto" />
              <h3 className="font-semibold">Nicio analiză de document</h3>
              <p className="text-sm text-muted-foreground">
                Analizează documentele încărcate față de cerințele din ghidul de finanțare. Deschide meniul unui document din tab-ul „Documente" și selectează „Analiză AI document".
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">Detalii apel de finanțare</h3>
            {fundingCall && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-muted-foreground">Numele programului</p><p className="font-medium">{fundingCall.name}</p></div>
                  <div><p className="text-muted-foreground">Finanțare maximă</p><p className="font-medium">{fundingCall.maxFunding ? `${(fundingCall.maxFunding / 1000).toFixed(0)}k EUR` : "N/A"}</p></div>
                  <div><p className="text-muted-foreground">Termen limită</p><p className="font-medium">{fundingCall.deadline ? new Date(fundingCall.deadline).toLocaleDateString("ro-RO") : "N/A"}</p></div>
                  <div><p className="text-muted-foreground">Categorie</p><p className="font-medium">{fundingCall.category || "N/A"}</p></div>
                </div>
                {fundingCall.description && (<div><p className="text-muted-foreground">Descriere</p><p className="mt-1 text-muted-foreground leading-relaxed">{stripHtml(fundingCall.description)}</p></div>)}
              </div>
            )}
          </Card>
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">Detalii companie</h3>
            {company && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Denumire companie</p><p className="font-medium">{company.name}</p></div>
                <div><p className="text-muted-foreground">CUI</p><p className="font-medium">{company.cui}</p></div>
                <div><p className="text-muted-foreground">Cod CAEN</p><p className="font-medium">{company.caen || "N/A"}</p></div>
                <div><p className="text-muted-foreground">Angajați</p><p className="font-medium">{company.employees || "N/A"}</p></div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={!!uploadingType} onOpenChange={(open) => { if (!open) { setUploadingType(null); setSelectedFile(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle><Upload className="w-5 h-5 inline mr-2" />Încarcă {uploadingType?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Selectează fișierul</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => fileInputRef.current?.click()} data-testid="dropzone-upload">
                <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} data-testid="input-file-upload" />
                {selectedFile ? (
                  <div className="space-y-1"><FileText className="w-8 h-8 mx-auto text-primary" /><p className="text-sm font-medium">{selectedFile.name}</p><p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p></div>
                ) : (
                  <div className="space-y-1"><Upload className="w-8 h-8 mx-auto text-muted-foreground" /><p className="text-sm text-muted-foreground">Click pentru a selecta un fișier</p><p className="text-xs text-muted-foreground">PDF, DOC, DOCX, XLS, XLSX, PNG, JPG (max 20MB)</p></div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUploadingType(null); setSelectedFile(null); }} data-testid="button-cancel-upload">Anulează</Button>
            <Button disabled={!selectedFile || uploadMutation.isPending} onClick={() => {
              if (uploadingType && selectedFile) {
                const existingDoc = documents?.find((d) => d.type === uploadingType.type);
                if (existingDoc) { editMutation.mutate({ docId: existingDoc.id, file: selectedFile }); setUploadingType(null); setSelectedFile(null); }
                else { uploadMutation.mutate({ name: uploadingType.name, type: uploadingType.type, file: selectedFile }); }
              }
            }} data-testid="button-confirm-upload">
              {uploadMutation.isPending ? "Se încarcă..." : "Încarcă fișierul"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingDoc} onOpenChange={(open) => { if (!open) { setEditingDoc(null); setEditFile(null); setEditName(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle><Pencil className="w-5 h-5 inline mr-2" />Editează documentul</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-doc-name">Numele documentului</Label>
              <Input id="edit-doc-name" value={editName} onChange={(e) => setEditName(e.target.value)} data-testid="input-edit-doc-name" />
            </div>
            <div className="space-y-2">
              <Label>Înlocuiește fișierul (opțional)</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => editFileInputRef.current?.click()} data-testid="dropzone-edit">
                <input ref={editFileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" onChange={(e) => setEditFile(e.target.files?.[0] || null)} data-testid="input-file-edit" />
                {editFile ? (
                  <div className="flex items-center justify-center gap-2"><FileText className="w-4 h-4 text-primary" /><span className="text-sm font-medium">{editFile.name}</span></div>
                ) : (<p className="text-sm text-muted-foreground">Click pentru a selecta un fișier nou</p>)}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingDoc(null); setEditFile(null); setEditName(""); }} data-testid="button-cancel-edit">Anulează</Button>
            <Button disabled={editMutation.isPending || (!editFile && editName === editingDoc?.name)} onClick={() => { if (editingDoc) { editMutation.mutate({ docId: editingDoc.id, name: editName !== editingDoc.name ? editName : undefined, file: editFile || undefined }); } }} data-testid="button-confirm-edit">
              {editMutation.isPending ? "Se salvează..." : "Salvează"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingDoc} onOpenChange={(open) => !open && setDeletingDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Șterge documentul?</AlertDialogTitle>
            <AlertDialogDescription>Ești sigur că vrei să ștergi documentul <span className="font-semibold">{deletingDoc?.name}</span>?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-doc">Anulează</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingDoc && deleteMutation.mutate(deletingDoc.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="button-confirm-delete-doc">
              {deleteMutation.isPending ? "Se șterge..." : "Șterge"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Change Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schimbă statusul proiectului</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Status nou</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger data-testid="select-new-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notă (opțional)</Label>
              <Textarea value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder="Adaugă o notă despre această schimbare..." data-testid="input-status-note" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>Anulează</Button>
            <Button disabled={updateStatusMutation.isPending || newStatus === project.status} onClick={() => updateStatusMutation.mutate({ status: newStatus, note: statusNote })} data-testid="button-confirm-status">
              {updateStatusMutation.isPending ? "Se actualizează..." : "Actualizează"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <VersionHistoryDialog docId={versionsDocId} projectId={projectId!} onClose={() => setVersionsDocId(null)} />

      {/* Preview Dialog */}
      <Dialog open={!!conformityDocId} onOpenChange={(open) => { if (!open) { setConformityDocId(null); setConformityReport(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSearch className="w-5 h-5" />
              Raport analiză document
            </DialogTitle>
            <DialogDescription>
              Rezultatele analizei AI a documentului față de cerințele din ghidul de finanțare
            </DialogDescription>
          </DialogHeader>
          {conformityReport ? (
            <div className="space-y-4" data-testid="conformity-report">
              {(() => {
                const sentinel = findRelevanceMismatch(conformityReport.criteria);
                const mismatch = conformityReport.relevanceMismatch === true || sentinel != null;
                if (!mismatch) return null;
                const reason = sentinel?.reason || conformityReport.relevanceReason || "Documentul nu corespunde apelului de finanțare sau solicitantului curent.";
                return (
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-800 rounded-lg flex items-start gap-2" data-testid="alert-relevance-mismatch">
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-800 dark:text-red-300">Document nepotrivit pentru acest apel/solicitant</p>
                      <p className="text-xs text-red-700 dark:text-red-400 mt-0.5" data-testid="text-relevance-reason">{reason}</p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">Documentul pare să aparțină altui apel de finanțare sau altei firme. Încărcați documentul corect pentru acest proiect.</p>
                    </div>
                  </div>
                );
              })()}
              <div className="flex items-center justify-between">
                <Badge
                  className={`text-sm px-3 py-1 no-default-active-elevate ${
                    conformityReport.verdict === "conform"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : conformityReport.verdict === "partial_conform"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                  data-testid="conformity-verdict"
                >
                  {conformityReport.verdict === "conform" ? "✓ Conform" : conformityReport.verdict === "partial_conform" ? "◐ Parțial conform" : "✗ Neconform"}
                </Badge>
                {conformityReport.score != null && (
                  <div className="flex items-center gap-2" data-testid="conformity-score">
                    <span className="text-sm text-muted-foreground">Scor:</span>
                    <span className="text-lg font-bold">{conformityReport.score}%</span>
                  </div>
                )}
              </div>

              {conformityReport.score != null && (
                <Progress value={conformityReport.score} className="h-2" />
              )}

              {conformityReport.summary && (
                <div className="p-3 bg-muted/50 rounded-md">
                  <p className="text-sm leading-relaxed" data-testid="conformity-summary">{conformityReport.summary}</p>
                </div>
              )}

              {(() => {
                const visibleCriteria = (conformityReport.criteria || []).filter(
                  (c) => c?.requirement !== RELEVANCE_MISMATCH_REQUIREMENT,
                );
                if (visibleCriteria.length === 0) return null;
                return (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Criterii verificate</h4>
                  <div className="space-y-1.5">
                    {visibleCriteria.map((c, i) => (
                      <div key={i} className="flex items-start gap-2 p-2.5 bg-muted/30 rounded-md text-sm" data-testid={`conformity-criterion-${i}`}>
                        <span className="shrink-0 mt-0.5">
                          {c.status === "îndeplinit" ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                          ) : c.status === "neîndeplinit" ? (
                            <XCircle className="w-4 h-4 text-red-500" />
                          ) : c.status === "parțial" ? (
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Clock className="w-4 h-4 text-muted-foreground" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium">{c.requirement}</p>
                          <p className="text-muted-foreground text-xs mt-0.5">{c.details}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                );
              })()}

              {conformityReport.missingElements && conformityReport.missingElements.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-red-600 dark:text-red-400">Elemente lipsă</h4>
                  <ul className="space-y-1 text-sm list-disc pl-5" data-testid="conformity-missing">
                    {conformityReport.missingElements.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}

              {conformityReport.recommendations && conformityReport.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400">Recomandări</h4>
                  <ul className="space-y-1 text-sm list-disc pl-5" data-testid="conformity-recommendations">
                    {conformityReport.recommendations.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              <AiDisclaimer compact />

              {conformityReport.createdAt && (
                <p className="text-xs text-muted-foreground text-right">
                  Generat la {new Date(conformityReport.createdAt).toLocaleString("ro-RO")}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewUrl} onOpenChange={(open) => { if (!open) setPreviewUrl(null); }}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader><DialogTitle><Eye className="w-5 h-5 inline mr-2" />{previewName}</DialogTitle></DialogHeader>
          <div className="flex-1 min-h-0 h-full">
            {previewUrl && <iframe src={previewUrl} className="w-full h-full rounded-md border" title={previewName} data-testid="iframe-preview" />}
          </div>
        </DialogContent>
      </Dialog>

      <CreditConfirmDialog
        open={!!conformityDocToConfirm}
        onOpenChange={(open) => { if (!open) setConformityDocToConfirm(null); }}
        onConfirm={() => { const docId = conformityDocToConfirm; setConformityDocToConfirm(null); if (docId) runConformityCheck(docId); }}
        actionLabel="Analiza conformitate document"
        creditCost={5}
        isPending={!!checkingConformity}
      />

      {isSuperAdmin && projectId && (
        <DocumentDraftDialog
          projectId={projectId}
          open={draftDialogOpen}
          onOpenChange={setDraftDialogOpen}
          slotType={draftSlotType}
        />
      )}
    </div>
  );
}

function VersionHistoryDialog({ docId, projectId, onClose }: { docId: string | null; projectId: string; onClose: () => void }) {
  const { data: versions, isLoading } = useQuery<DocumentVersion[]>({
    queryKey: ["/api/projects", projectId, "documents", docId, "versions"],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}/versions`, { credentials: "include" });
      return res.json();
    },
    enabled: !!docId,
  });

  return (
    <Dialog open={!!docId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle><History className="w-5 h-5 inline mr-2" />Istoric versiuni</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          {isLoading ? (
            <Skeleton className="h-16" />
          ) : versions && versions.length > 0 ? (
            versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                <div>
                  <p className="text-sm font-medium">Versiunea {v.versionNumber}</p>
                  <p className="text-xs text-muted-foreground">{v.createdAt ? new Date(v.createdAt).toLocaleString("ro-RO") : ""}</p>
                </div>
                <Badge variant="secondary" className="no-default-active-elevate">v{v.versionNumber}</Badge>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Nicio versiune anterioară.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
