import { useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { User, Mail, Shield, Calendar, CheckCircle2, Camera, Lock, Eye, EyeOff, BarChart3, AlertTriangle, Trash2, Building2, FolderOpen, FileText, ClipboardCheck } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type UsageData = Record<string, { used: number; max: number; period: string; resetAt: string; label: string }>;

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: usageData } = useQuery<UsageData>({ queryKey: ["/api/usage"] });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const { data: deletePreview, isLoading: previewLoading } = useQuery<{ companies: number; projects: number; documents: number; eligibilityReports: number }>({
    queryKey: ["/api/auth/delete-preview"],
    enabled: showDeleteDialog,
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/delete-account", { password: deletePassword });
      return res.json();
    },
    onSuccess: () => {
      window.location.href = "/auth";
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    },
  });

  const initials = user
    ? `${(user.firstName?.[0] || "").toUpperCase()}${(user.lastName?.[0] || "").toUpperCase()}`
    : "?";

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("profileImage", file);
      const res = await fetch("/api/profile/upload-image", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Eroare la încărcare");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Imagine actualizată", description: "Imaginea de profil a fost schimbată." });
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/change-password", {
        currentPassword,
        newPassword,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Parolă schimbată", description: data.message });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Eroare", description: "Imaginea trebuie să fie sub 5MB", variant: "destructive" });
        return;
      }
      uploadMutation.mutate(file);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast({ title: "Eroare", description: "Parola nouă trebuie să aibă cel puțin 8 caractere", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Eroare", description: "Parolele noi nu coincid", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate();
  };

  const roleLabel = user?.role === 'super_admin' ? 'Super Admin' : user?.role === 'consultant' ? 'Consultant' : 'Utilizator';

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-2xl font-serif font-bold tracking-tight" data-testid="text-settings-title">
          Setări cont
        </h1>
        <p className="text-muted-foreground">Gestionează profilul și preferințele contului tău.</p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Avatar className="w-16 h-16 ring-2 ring-[hsl(48,100%,50%)]/40">
              {user?.profileImage && <AvatarImage src={user.profileImage} alt="Profil" />}
              <AvatarFallback className="text-lg bg-[hsl(228,100%,19.6%)] text-white">{initials}</AvatarFallback>
            </Avatar>
            <button
              type="button"
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              data-testid="button-upload-avatar"
            >
              <Camera className="w-5 h-5 text-white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
              data-testid="input-profile-image"
            />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold" data-testid="text-profile-name">
              {user?.firstName} {user?.lastName}
            </h2>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">{roleLabel}</Badge>
              {user?.emailVerified && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Verificat
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {uploadMutation.isPending && (
          <p className="text-xs text-muted-foreground">Se încarcă imaginea...</p>
        )}

        <Separator />

        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Informații profil</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-md bg-muted/50 p-3">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Nume complet</p>
                <p className="text-sm font-medium">{user?.firstName} {user?.lastName || "Nesetat"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-md bg-muted/50 p-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{user?.email || "Nesetat"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-md bg-muted/50 p-3">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Rol</p>
                <p className="text-sm font-medium">{roleLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-md bg-muted/50 p-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Membru din</p>
                <p className="text-sm font-medium">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("ro-RO") : "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {usageData && user?.role !== "super_admin" && (
        <Card className="p-6 space-y-6 border-t-2 border-t-[hsl(228,100%,25%)]" data-testid="card-usage-quotas">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[hsl(228,100%,25%)]" />
            Utilizare cont
          </h3>
          <p className="text-xs text-muted-foreground -mt-4">Limitele se resetează automat conform perioadei indicate.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(usageData).map(([key, q]) => {
              const pct = q.max > 0 ? Math.round((q.used / q.max) * 100) : 0;
              const isNearLimit = pct >= 80;
              const isAtLimit = q.used >= q.max;
              return (
                <div key={key} className="rounded-lg border p-3 space-y-2" data-testid={`usage-${key}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{q.label}</span>
                    <Badge variant={isAtLimit ? "destructive" : isNearLimit ? "secondary" : "outline"} className="text-xs">
                      {q.period === "daily" ? "zilnic" : "lunar"}
                    </Badge>
                  </div>
                  <Progress value={pct} className={`h-2 ${isAtLimit ? "[&>div]:bg-red-500" : isNearLimit ? "[&>div]:bg-yellow-500" : ""}`} />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className={isAtLimit ? "text-red-600 font-medium" : ""}>{q.used} / {q.max}</span>
                    <span>Reset: {new Date(q.resetAt).toLocaleDateString("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="p-6 space-y-6 border-t-2 border-t-[hsl(228,100%,25%)]">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Lock className="w-4 h-4 text-[hsl(228,100%,25%)]" />
          Schimbă parola
        </h3>
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Parola curentă</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                data-testid="input-current-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">Parola nouă</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Minim 8 caractere"
                data-testid="input-new-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmă parola nouă</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              data-testid="input-confirm-new-password"
            />
          </div>
          <Button
            type="submit"
            disabled={changePasswordMutation.isPending}
            data-testid="button-change-password"
          >
            {changePasswordMutation.isPending ? "Se procesează..." : "Schimbă parola"}
          </Button>
        </form>
      </Card>

      <Card className="p-6 space-y-4 border-t-2 border-t-red-500" data-testid="card-delete-account">
          <h3 className="font-semibold text-sm flex items-center gap-2 text-red-600">
            <Trash2 className="w-4 h-4" />
            Ștergere cont
          </h3>
          <p className="text-sm text-muted-foreground">
            Odată ce contul este șters, toate datele asociate vor fi eliminate permanent, inclusiv companiile, proiectele, documentele și rapoartele de eligibilitate. Această acțiune este ireversibilă.
          </p>
          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            onClick={() => {
              setShowDeleteDialog(true);
              setDeletePassword("");
              setDeleteConfirmText("");
            }}
            data-testid="button-open-delete-dialog"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Vreau să-mi șterg contul
          </Button>
        </Card>

      <Dialog open={showDeleteDialog} onOpenChange={(open) => { if (!open) { setShowDeleteDialog(false); setDeletePassword(""); setDeleteConfirmText(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Ștergere definitivă cont
            </DialogTitle>
            <DialogDescription>
              Ești pe punctul de a șterge permanent contul <strong>{user?.email}</strong>. Această acțiune este ireversibilă.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4 space-y-3">
              <p className="text-sm font-medium text-red-800 dark:text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Următoarele date vor fi șterse permanent:
              </p>
              {previewLoading ? (
                <p className="text-xs text-muted-foreground">Se încarcă...</p>
              ) : deletePreview ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-red-500" />
                    <span><strong>{deletePreview.companies}</strong> {deletePreview.companies === 1 ? "companie" : "companii"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FolderOpen className="w-4 h-4 text-red-500" />
                    <span><strong>{deletePreview.projects}</strong> {deletePreview.projects === 1 ? "proiect" : "proiecte"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-red-500" />
                    <span><strong>{deletePreview.documents}</strong> {deletePreview.documents === 1 ? "document" : "documente"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <ClipboardCheck className="w-4 h-4 text-red-500" />
                    <span><strong>{deletePreview.eligibilityReports}</strong> {deletePreview.eligibilityReports === 1 ? "raport" : "rapoarte"} eligibilitate</span>
                  </div>
                </div>
              ) : null}
              <p className="text-xs text-red-600 dark:text-red-400">
                De asemenea, toate notificările, preferințele, feedback-ul și istoricul de utilizare vor fi șterse.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deleteConfirm" className="text-sm">
                Scrie <strong className="text-red-600">STERGE CONTUL</strong> pentru confirmare:
              </Label>
              <Input
                id="deleteConfirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="STERGE CONTUL"
                data-testid="input-delete-confirm-text"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deletePassword" className="text-sm">Introdu parola contului:</Label>
              <Input
                id="deletePassword"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Parola ta curentă"
                data-testid="input-delete-password"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} data-testid="button-cancel-delete-account">
              Anulează
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmText !== "STERGE CONTUL" || !deletePassword || deleteAccountMutation.isPending}
              onClick={() => deleteAccountMutation.mutate()}
              data-testid="button-confirm-delete-account"
            >
              {deleteAccountMutation.isPending ? "Se șterge contul..." : "Șterge contul definitiv"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
