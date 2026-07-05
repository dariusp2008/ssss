import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FolderOpen, FolderPlus, ChevronDown, AlertTriangle } from "lucide-react";
import type { ActiveProject, Company } from "@shared/schema";

interface ProjectActionButtonProps {
  fundingCallId: string;
  /** Compania explicit selectată (ex: pe catalog). Dacă lipsește, componenta
   * rezolvă compania singură (o singură companie → automat; mai multe → meniu). */
  preferredCompanyId?: string | null;
  /** Apelat înainte de navigare — ex: pentru a închide un dialog. */
  onNavigate?: () => void;
  className?: string;
  fullWidth?: boolean;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline" | "secondary" | "ghost";
}

export function ProjectActionButton({
  fundingCallId,
  preferredCompanyId,
  onNavigate,
  className,
  fullWidth,
  size = "sm",
  variant = "secondary",
}: ProjectActionButtonProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: projects, isLoading: projectsLoading } = useQuery<ActiveProject[]>({
    queryKey: ["/api/projects"],
  });
  const { data: companies, isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const createMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const res = await apiRequest("POST", "/api/projects", {
        companyId,
        fundingCallId,
      });
      return (await res.json()) as { id: string };
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "Proiect inițiat", description: "Proiectul a fost creat. Începe încărcarea documentelor." });
      onNavigate?.();
      navigate(`/projects/${project.id}`);
    },
    onError: (error: any) => {
      if (error?.status === 403) {
        toast({ title: "Limită atinsă", description: error?.message || "Planul tău nu mai permite proiecte noi.", variant: "destructive" });
      } else {
        toast({ title: "Eroare", description: error?.message || "Inițierea proiectului a eșuat.", variant: "destructive" });
      }
    },
  });

  const allProjects = projects || [];
  const allCompanies = companies || [];
  const projectsForCall = allProjects.filter((p) => p.fundingCallId === fundingCallId);

  const [confirm, setConfirm] = useState<{ run: () => void; companyLabel: string } | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  function openProject(projectId: string) {
    onNavigate?.();
    navigate(`/projects/${projectId}`);
  }

  function companyName(id: string) {
    return allCompanies.find((c) => c.id === id)?.name || "Companie";
  }

  // Înainte de a deschide/iniția un proiect, verifică ultimul verdict de
  // eligibilitate al companiei pe acest apel. Dacă e NEELIGIBIL, cere confirmare.
  async function guard(companyId: string, run: () => void) {
    setCheckingId(companyId);
    try {
      const res = await fetch(
        `/api/eligibility-reports/existing?companyId=${encodeURIComponent(companyId)}&fundingCallId=${encodeURIComponent(fundingCallId)}`,
        { credentials: "include" },
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.exists && data.report?.verdict === "NEELIGIBIL") {
          setConfirm({ run, companyLabel: companyName(companyId) });
          return;
        }
      }
    } catch {
      // fail-open: dacă verificarea eșuează, nu blocăm acțiunea
    } finally {
      setCheckingId(null);
    }
    run();
  }

  const widthClass = fullWidth ? "w-full" : "";
  const mergedClass = [widthClass, className].filter(Boolean).join(" ");

  // Cât timp nu știm dacă există proiecte / companii, nu decidem ramura (altfel
  // am putea afișa eronat „Inițiază proiect" sau redirecta la /companies).
  if (projectsLoading || companiesLoading) {
    return (
      <Button size={size} variant={variant} className={mergedClass} disabled data-testid="button-project-action-loading">
        <FolderOpen className="w-4 h-4 mr-2" />
        Proiect
      </Button>
    );
  }

  // 1) Proiect existent pentru compania selectată → „Deschide proiect".
  const preferredProject = preferredCompanyId
    ? projectsForCall.find((p) => p.companyId === preferredCompanyId)
    : undefined;

  // 3) Niciun proiect încă → „Inițiază proiect".
  const initLabel = createMutation.isPending ? "Se inițiază..." : "Inițiază proiect";

  let content: JSX.Element;

  if (preferredProject) {
    content = (
      <Button
        size={size}
        variant={variant}
        className={mergedClass}
        disabled={checkingId === preferredProject.companyId}
        onClick={() => guard(preferredProject.companyId, () => openProject(preferredProject.id))}
        data-testid="button-open-project"
      >
        <FolderOpen className="w-4 h-4 mr-2" />
        Deschide proiect
      </Button>
    );
  } else if (!preferredCompanyId && projectsForCall.length === 1) {
    // 2) Fără companie preferată dar există deja un singur proiect pe acest apel.
    content = (
      <Button
        size={size}
        variant={variant}
        className={mergedClass}
        disabled={checkingId === projectsForCall[0].companyId}
        onClick={() => guard(projectsForCall[0].companyId, () => openProject(projectsForCall[0].id))}
        data-testid="button-open-project"
      >
        <FolderOpen className="w-4 h-4 mr-2" />
        Deschide proiect
      </Button>
    );
  } else if (!preferredCompanyId && projectsForCall.length > 1) {
    content = (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size={size} variant={variant} className={mergedClass} data-testid="button-open-project">
            <FolderOpen className="w-4 h-4 mr-2" />
            Deschide proiect
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {projectsForCall.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onClick={() => guard(p.companyId, () => openProject(p.id))}
              data-testid={`menuitem-open-project-${p.id}`}
            >
              {companyName(p.companyId)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  } else if (preferredCompanyId) {
    // 3a) Companie preferată cunoscută → inițiere directă.
    content = (
      <Button
        size={size}
        variant={variant}
        className={mergedClass}
        disabled={createMutation.isPending || checkingId === preferredCompanyId}
        onClick={() => guard(preferredCompanyId, () => createMutation.mutate(preferredCompanyId))}
        data-testid="button-initiate-project"
      >
        <FolderPlus className="w-4 h-4 mr-2" />
        {initLabel}
      </Button>
    );
  } else if (allCompanies.length === 0) {
    // 3b) Fără companii deloc → trimite la pagina de companii.
    content = (
      <Button
        size={size}
        variant={variant}
        className={mergedClass}
        onClick={() => {
          toast({ title: "Adaugă o companie", description: "Ai nevoie de o companie pentru a iniția un proiect." });
          onNavigate?.();
          navigate("/companies");
        }}
        data-testid="button-initiate-project"
      >
        <FolderPlus className="w-4 h-4 mr-2" />
        Inițiază proiect
      </Button>
    );
  } else if (allCompanies.length === 1) {
    // 3c) O singură companie → inițiere directă.
    content = (
      <Button
        size={size}
        variant={variant}
        className={mergedClass}
        disabled={createMutation.isPending || checkingId === allCompanies[0].id}
        onClick={() => guard(allCompanies[0].id, () => createMutation.mutate(allCompanies[0].id))}
        data-testid="button-initiate-project"
      >
        <FolderPlus className="w-4 h-4 mr-2" />
        {initLabel}
      </Button>
    );
  } else {
    // 3d) Mai multe companii → meniu de selecție.
    content = (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size={size} variant={variant} className={mergedClass} disabled={createMutation.isPending} data-testid="button-initiate-project">
            <FolderPlus className="w-4 h-4 mr-2" />
            {initLabel}
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {allCompanies.map((c) => (
            <DropdownMenuItem
              key={c.id}
              onClick={() => guard(c.id, () => createMutation.mutate(c.id))}
              data-testid={`menuitem-initiate-project-${c.id}`}
            >
              {c.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      {content}
      <AlertDialog open={!!confirm} onOpenChange={(open) => { if (!open) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Companie neeligibilă
            </AlertDialogTitle>
            <AlertDialogDescription>
              Conform ultimei verificări, {confirm?.companyLabel ? `„${confirm.companyLabel}"` : "compania"} nu îndeplinește condițiile de eligibilitate pentru acest apel (verdict NEELIGIBIL). Poți continua, dar șansele de aprobare sunt reduse — verifică criteriile înainte de depunere.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-ineligible">Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { const run = confirm?.run; setConfirm(null); run?.(); }}
              data-testid="button-confirm-ineligible"
            >
              Continuă oricum
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
