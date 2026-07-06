import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FolderOpen, ArrowRight, Calendar, Building2, Briefcase, Trash2 } from "lucide-react";
import type { ActiveProject, Company, FundingCall } from "@shared/schema";

type ProjectWithNames = ActiveProject & { fundingCallName?: string | null; companyName?: string | null };

const statusLabels: Record<string, string> = {
  initiated: "Inițiat",
  in_progress: "În progres",
  documents_pending: "Documente în așteptare",
  completed: "Finalizat",
};

const statusColors: Record<string, string> = {
  initiated: "default",
  in_progress: "secondary",
  documents_pending: "destructive",
  completed: "default",
};

export default function ProjectsPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [deletingProject, setDeletingProject] = useState<ProjectWithNames | null>(null);

  const { data: projects, isLoading } = useQuery<ProjectWithNames[]>({
    queryKey: ["/api/projects"],
  });
  const { data: companies } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });
  const { data: fundingCalls } = useQuery<any[]>({
    queryKey: ["/api/funding-calls-list"],
    queryFn: async () => {
      const res = await fetch("/api/funding-calls-list", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      setDeletingProject(null);
      toast({ title: "Proiect eliminat", description: "Ai ieșit din proiect cu succes." });
    },
    onError: (error: Error) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  function getCompanyName(project: ProjectWithNames) {
    return project.companyName || companies?.find((c) => c.id === project.companyId)?.name || "Necunoscut";
  }
  function getFundingCallName(project: ProjectWithNames) {
    return project.fundingCallName || fundingCalls?.find((f) => f.id === project.fundingCallId)?.name || "Necunoscut";
  }

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-2xl font-serif font-bold tracking-tight" data-testid="text-projects-title">
          Proiecte active
        </h1>
        <p className="text-muted-foreground">Urmărește și gestionează aplicațiile tale pentru programe de finanțare.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="p-5 space-y-4 cursor-pointer hover-elevate"
              role="link"
              tabIndex={0}
              onClick={() => navigate(`/projects/${project.id}`)}
              onKeyDown={(e) => {
                if (e.currentTarget !== e.target) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(`/projects/${project.id}`);
                }
              }}
              data-testid={`card-project-${project.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[hsl(228,100%,19.6%)] flex items-center justify-center shrink-0">
                    <Briefcase className="w-4 h-4 text-[hsl(48,100%,50%)]" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-sm hover:underline" data-testid={`text-project-name-${project.id}`}>{getFundingCallName(project)}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Building2 className="w-3 h-3" />
                      {getCompanyName(project)}
                    </div>
                  </div>
                </div>
                <Badge
                  variant={(statusColors[project.status || "initiated"] as any) || "default"}
                  className="no-default-active-elevate"
                >
                  {statusLabels[project.status || "initiated"] || project.status}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4 text-xs">
                  <span className="text-muted-foreground">Progres</span>
                  <span className="font-medium">{Math.round(project.progress || 0)}%</span>
                </div>
                <Progress value={project.progress || 0} className="h-2" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  Creat la {project.createdAt ? new Date(project.createdAt).toLocaleDateString("ro-RO") : "N/A"}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); setDeletingProject(project); }}
                    data-testid={`button-leave-project-${project.id}`}
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> Șterge
                  </Button>
                  <Link href={`/projects/${project.id}`} onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" size="sm" data-testid={`button-view-project-${project.id}`}>
                      Deschide <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center space-y-4">
          <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Niciun proiect activ</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Mergi la Panou de control pentru a verifica o companie și a iniția un proiect nou dintr-un apel de finanțare potrivit.
            </p>
          </div>
          <div className="pt-4">
            <Link href="/dashboard">
              <Button data-testid="button-go-to-dashboard">
                Mergi la Panou de control <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </Card>
      )}

      <AlertDialog open={!!deletingProject} onOpenChange={(open) => !open && setDeletingProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Șterge proiectul?</AlertDialogTitle>
            <AlertDialogDescription>
              Ești sigur că vrei să ștergi proiectul <span className="font-semibold">{deletingProject ? getFundingCallName(deletingProject) : ""}</span>? Toate documentele asociate vor fi șterse permanent și această acțiune nu poate fi anulată.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-leave-project">Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingProject && deleteProjectMutation.mutate(deletingProject.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-leave-project"
            >
              {deleteProjectMutation.isPending ? "Se procesează..." : "Șterge proiectul"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
