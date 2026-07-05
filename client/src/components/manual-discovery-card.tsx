import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Search, Save, RotateCcw, Send, Loader2,
  CheckCircle, Clock, XCircle, Link2, FileText, Info, Plus, Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SourceUrlEntry {
  url: string;
  label?: string;
}

interface ManualDiscoveryData {
  manualDiscoveryStatus: string | null;
  manualSourceType: string | null;
  manualSourceUrl: string | null;
  manualSourceUrls: SourceUrlEntry[] | null;
  manualSourceNotes: string | null;
  manualCheckedAt: string | null;
  manualCheckedBy: string | null;
  manualMonitoringEnabled: boolean | null;
  manualLastN8nSyncAt: string | null;
  manualLastN8nStatus: string | null;
  manualLastN8nMessage: string | null;
  manualLastN8nDocumentsFound: number | null;
  manualLastN8nPageHash: string | null;
  manualLastN8nPageCheckedAt: string | null;
  documentSourceMethod: string | null;
  documentSourceUrl: string | null;
  candidateManualSourceUrl: string | null;
  candidateSourceOrigin: string | null;
  candidateSourceConfidence: number | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  unknown: { label: "Necunoscut", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  human_link_provided: { label: "Link furnizat", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  no_guide_published_yet: { label: "Ghid nepublicat", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  cannot_find_official_source: { label: "Sursa negasita", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
  completed: { label: "Completat", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  error: { label: "Eroare", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
};

const N8N_STATUS_LABELS: Record<string, string> = {
  queued: "In asteptare",
  processing: "Se procesează",
  success: "Succes",
  partial: "Partial",
  no_files_found: "Niciun fișier",
  monitoring_only: "Doar monitorizare",
  failed: "Esuat",
};

function formatDate(d: string | null) {
  if (!d) return "--";
  return new Date(d).toLocaleString("ro-RO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return url;
  } catch {}
  return null;
}

function SafeLink({ href, children, className }: { href: string | null | undefined; children: React.ReactNode; className?: string }) {
  const safe = safeUrl(href);
  if (!safe) return <span className={className}>{children}</span>;
  return <a href={safe} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>;
}

function getEffectiveUrls(data: ManualDiscoveryData | undefined): SourceUrlEntry[] {
  if (data?.manualSourceUrls && Array.isArray(data.manualSourceUrls) && data.manualSourceUrls.length > 0) {
    return data.manualSourceUrls;
  }
  if (data?.manualSourceUrl) {
    return [{ url: data.manualSourceUrl, label: "" }];
  }
  return [];
}

export function ManualDiscoveryCard({ fundingCallId }: { fundingCallId: string }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState("unknown");
  const [sourceType, setSourceType] = useState("none");
  const [sourceUrls, setSourceUrls] = useState<SourceUrlEntry[]>([]);
  const [notes, setNotes] = useState("");
  const [monitoring, setMonitoring] = useState(true);

  const { data, isLoading } = useQuery<ManualDiscoveryData>({
    queryKey: ["/api/admin/funding-calls", fundingCallId, "manual-discovery"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/funding-calls/${fundingCallId}/manual-discovery`, { credentials: "include" });
      if (!res.ok) throw new Error("Nu s-au putut prelua datele");
      return res.json();
    },
  });

  function startEditing() {
    if (data) {
      setStatus(data.manualDiscoveryStatus || "unknown");
      setSourceType(data.manualSourceType || "none");
      const urls = getEffectiveUrls(data);
      setSourceUrls(urls.length > 0 ? urls : [{ url: "", label: "" }]);
      setNotes(data.manualSourceNotes || "");
      setMonitoring(data.manualMonitoringEnabled !== false);
    }
    setEditing(true);
  }

  function addUrl() {
    setSourceUrls([...sourceUrls, { url: "", label: "" }]);
  }

  function removeUrl(index: number) {
    setSourceUrls(sourceUrls.filter((_, i) => i !== index));
  }

  function updateUrl(index: number, field: "url" | "label", value: string) {
    const updated = [...sourceUrls];
    updated[index] = { ...updated[index], [field]: value };
    setSourceUrls(updated);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const validUrls = sourceUrls.filter(e => e.url.trim());
      const res = await apiRequest("PATCH", `/api/admin/funding-calls/${fundingCallId}/manual-discovery`, {
        manualDiscoveryStatus: status,
        manualSourceType: sourceType,
        manualSourceUrl: validUrls[0]?.url || null,
        manualSourceUrls: validUrls,
        manualSourceNotes: notes,
        manualMonitoringEnabled: monitoring,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Salvat", description: "Descoperirea manuala a fost actualizata" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/funding-calls", fundingCallId, "manual-discovery"] });
      setEditing(false);
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    },
  });

  const enqueueMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/funding-calls/${fundingCallId}/manual-discovery/enqueue`);
      return res.json();
    },
    onSuccess: (d: any) => {
      toast({ title: "Trimis", description: d.message });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/funding-calls", fundingCallId, "manual-discovery"] });
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/funding-calls/${fundingCallId}/manual-discovery/reset`);
      return res.json();
    },
    onSuccess: (d: any) => {
      toast({ title: "Resetat", description: d.message });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/funding-calls", fundingCallId, "manual-discovery"] });
      setEditing(false);
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) return <Card><CardContent className="py-6"><div className="h-20 animate-pulse bg-muted rounded" /></CardContent></Card>;

  const currentStatus = data?.manualDiscoveryStatus || "unknown";
  const statusInfo = STATUS_LABELS[currentStatus] || STATUS_LABELS.unknown;
  const effectiveUrls = getEffectiveUrls(data);
  const hasUrls = effectiveUrls.length > 0;
  const canEnqueue = hasUrls && ["human_link_provided", "no_guide_published_yet", "error"].includes(currentStatus);

  return (
    <Card className="border-dashed border-amber-300 dark:border-amber-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="w-4 h-4 text-amber-500" />
            Descoperire manuala documente
          </CardTitle>
          <Badge className={`${statusInfo.color} text-xs`} data-testid="badge-manual-discovery-status">
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {data?.candidateManualSourceUrl && currentStatus === "unknown" && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 text-sm space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-blue-700 dark:text-blue-300">
              <Info className="w-3.5 h-3.5" />
              URL candidat disponibil
            </div>
            <SafeLink href={data.candidateManualSourceUrl} className="text-blue-600 hover:underline text-xs break-all">
              {data.candidateManualSourceUrl}
            </SafeLink>
            {data.candidateSourceOrigin && (
              <p className="text-xs text-muted-foreground">Sursa: {data.candidateSourceOrigin} | Incredere: {((data.candidateSourceConfidence || 0) * 100).toFixed(0)}%</p>
            )}
          </div>
        )}

        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger data-testid="select-manual-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unknown">Necunoscut</SelectItem>
                    <SelectItem value="human_link_provided">Link furnizat manual</SelectItem>
                    <SelectItem value="no_guide_published_yet">Ghid nepublicat inca</SelectItem>
                    <SelectItem value="cannot_find_official_source">Nu se gaseste sursa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Tip sursa</label>
                <Select value={sourceType} onValueChange={setSourceType}>
                  <SelectTrigger data-testid="select-manual-source-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Niciuna</SelectItem>
                    <SelectItem value="page">Pagina web</SelectItem>
                    <SelectItem value="direct_file">Fisier direct</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium">URL-uri sursa ({sourceUrls.length})</label>
                <Button type="button" size="sm" variant="outline" onClick={addUrl} className="h-7 text-xs" data-testid="button-add-url">
                  <Plus className="w-3 h-3 mr-1" /> Adaugă URL
                </Button>
              </div>
              {sourceUrls.map((entry, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1">
                    <Input
                      value={entry.url}
                      onChange={(e) => updateUrl(i, "url", e.target.value)}
                      placeholder="https://..."
                      className="text-xs h-8"
                      data-testid={`input-source-url-${i}`}
                    />
                    <Input
                      value={entry.label || ""}
                      onChange={(e) => updateUrl(i, "label", e.target.value)}
                      placeholder="Eticheta (optional, ex: Ghid solicitant)"
                      className="text-xs h-7 text-muted-foreground"
                      data-testid={`input-source-label-${i}`}
                    />
                  </div>
                  {sourceUrls.length > 1 && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeUrl(i)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700 shrink-0" data-testid={`button-remove-url-${i}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Observatii operator</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ex: pagina prioritatea 3, sectiunea apeluri active..."
                rows={2}
                data-testid="input-manual-notes"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={monitoring}
                onChange={(e) => setMonitoring(e.target.checked)}
                className="h-4 w-4 rounded accent-amber-500"
                data-testid="checkbox-monitoring"
              />
              <span className="text-sm">Activează monitorizarea acestei pagini</span>
            </label>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-manual">
                {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                Salvează
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)} data-testid="button-cancel-manual">
                Anulează
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {hasUrls && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Link2 className="w-3.5 h-3.5 shrink-0" />
                  URL-uri sursa ({data?.manualSourceType === "direct_file" ? "fisiere directe" : "pagini"}) - {effectiveUrls.length}:
                </div>
                {effectiveUrls.map((entry, i) => (
                  <div key={i} className="pl-5">
                    <SafeLink href={entry.url} className="text-blue-600 hover:underline text-xs break-all block">
                      {entry.label || entry.url}
                    </SafeLink>
                    {entry.label && (
                      <span className="text-[10px] text-muted-foreground break-all">{entry.url}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {data?.manualSourceNotes && (
              <div className="flex items-start gap-2 text-sm">
                <FileText className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground">{data.manualSourceNotes}</p>
              </div>
            )}
            {data?.manualCheckedAt && (
              <p className="text-xs text-muted-foreground">Verificat: {formatDate(data.manualCheckedAt)}</p>
            )}
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={startEditing} data-testid="button-edit-manual">
                <Search className="w-3.5 h-3.5 mr-1" /> Editează
              </Button>
              {canEnqueue && (
                <Button size="sm" variant="outline" onClick={() => enqueueMutation.mutate()} disabled={enqueueMutation.isPending} data-testid="button-enqueue-manual">
                  {enqueueMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                  Trimite la n8n
                </Button>
              )}
              {currentStatus !== "unknown" && (
                <Button size="sm" variant="ghost" onClick={() => resetMutation.mutate()} disabled={resetMutation.isPending} data-testid="button-reset-manual">
                  <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
                </Button>
              )}
            </div>
          </div>
        )}

        {(data?.manualLastN8nStatus || data?.documentSourceMethod) && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Rezultate n8n</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {data.manualLastN8nStatus && (
                  <>
                    <span className="text-muted-foreground">Status n8n:</span>
                    <span className="font-medium flex items-center gap-1">
                      {data.manualLastN8nStatus === "success" && <CheckCircle className="w-3 h-3 text-green-500" />}
                      {data.manualLastN8nStatus === "failed" && <XCircle className="w-3 h-3 text-red-500" />}
                      {data.manualLastN8nStatus === "queued" && <Clock className="w-3 h-3 text-yellow-500" />}
                      {data.manualLastN8nStatus === "processing" && <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />}
                      {N8N_STATUS_LABELS[data.manualLastN8nStatus] || data.manualLastN8nStatus}
                    </span>
                  </>
                )}
                {data.manualLastN8nSyncAt && (
                  <>
                    <span className="text-muted-foreground">Ultima sincronizare:</span>
                    <span>{formatDate(data.manualLastN8nSyncAt)}</span>
                  </>
                )}
                {(data.manualLastN8nDocumentsFound ?? 0) > 0 && (
                  <>
                    <span className="text-muted-foreground">Documente gasite:</span>
                    <span className="font-medium">{data.manualLastN8nDocumentsFound}</span>
                  </>
                )}
                {data.manualLastN8nMessage && (
                  <>
                    <span className="text-muted-foreground">Mesaj:</span>
                    <span className="break-all">{data.manualLastN8nMessage}</span>
                  </>
                )}
                {data.documentSourceMethod && (
                  <>
                    <span className="text-muted-foreground">Metoda sursa:</span>
                    <span>{data.documentSourceMethod}</span>
                  </>
                )}
                {data.documentSourceUrl && (
                  <>
                    <span className="text-muted-foreground">URL sursa doc:</span>
                    <SafeLink href={data.documentSourceUrl} className="text-blue-600 hover:underline break-all">{data.documentSourceUrl}</SafeLink>
                  </>
                )}
                {data.manualLastN8nPageHash && (
                  <>
                    <span className="text-muted-foreground">Hash pagina:</span>
                    <span className="font-mono text-[10px]">{data.manualLastN8nPageHash.substring(0, 16)}...</span>
                  </>
                )}
                {data.manualLastN8nPageCheckedAt && (
                  <>
                    <span className="text-muted-foreground">Pagina verificata:</span>
                    <span>{formatDate(data.manualLastN8nPageCheckedAt)}</span>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
