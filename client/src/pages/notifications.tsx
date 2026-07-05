import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell, BellOff, CheckCheck, Info, AlertTriangle, FileText,
  ChevronLeft, ChevronRight, Filter, Settings,
} from "lucide-react";
import { Link } from "wouter";
import type { Notification } from "@shared/schema";

const typeIcons: Record<string, any> = {
  info: Info,
  warning: AlertTriangle,
  error: AlertTriangle,
  document: FileText,
  reminder: Bell,
};

const typeLabels: Record<string, string> = {
  info: "Sistem",
  warning: "Atenționare",
  error: "Eroare",
  document: "Document",
  reminder: "Reminder",
};

type ReadFilter = "all" | "unread" | "read";
type TypeFilter = "all" | "info" | "warning" | "error" | "document" | "reminder";

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const { toast } = useToast();
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [page, setPage] = useState(1);

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/notifications/mark-all-read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "Toate marcate ca citite" });
    },
  });

  const filtered = useMemo(() => {
    if (!notifications) return [];
    let list = [...notifications];
    if (readFilter === "unread") list = list.filter((n) => !n.read);
    if (readFilter === "read") list = list.filter((n) => n.read);
    if (typeFilter !== "all") list = list.filter((n) => n.type === typeFilter);
    return list;
  }, [notifications, readFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const unreadCount = notifications?.filter((n) => !n.read).length || 0;

  const dayLabel = (d: Date) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dd = new Date(d); dd.setHours(0, 0, 0, 0);
    const diff = Math.round((today.getTime() - dd.getTime()) / 86400000);
    if (diff === 0) return "Astăzi";
    if (diff === 1) return "Ieri";
    return d.toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" });
  };

  const grouped = useMemo(() => {
    const groups: { label: string; items: Notification[] }[] = [];
    for (const n of paginated) {
      const label = n.createdAt ? dayLabel(new Date(n.createdAt)) : "Fără dată";
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.items.push(n);
      else groups.push({ label, items: [n] });
    }
    return groups;
  }, [paginated]);

  const readFilterOptions: { value: ReadFilter; label: string }[] = [
    { value: "all", label: "Toate" },
    { value: "unread", label: `Necitite${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
    { value: "read", label: "Citite" },
  ];

  const availableTypes = useMemo(() => {
    if (!notifications) return [];
    const types = new Set(notifications.map((n) => n.type || "info"));
    return Array.from(types);
  }, [notifications]);

  const typeFilterOptions: { value: TypeFilter; label: string }[] = [
    { value: "all", label: "Toate tipurile" },
    ...availableTypes.map((t) => ({
      value: t as TypeFilter,
      label: typeLabels[t] || t,
    })),
  ];

  const handleFilterChange = (rf: ReadFilter, tf: TypeFilter) => {
    setReadFilter(rf);
    setTypeFilter(tf);
    setPage(1);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-tight" data-testid="text-notifications-title">
            Notificări
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            {unreadCount > 0
              ? `${unreadCount} notificar${unreadCount > 1 ? "i" : "e"} necitit${unreadCount > 1 ? "e" : "a"}`
              : "Totul este la zi"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              data-testid="button-mark-all-read"
              className="text-xs sm:text-sm"
            >
              <CheckCheck className="w-3.5 h-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Marchează toate ca citite</span>
            </Button>
          )}
          <Link href="/notification-settings">
            <Button variant="outline" size="sm" data-testid="link-notification-settings" className="text-xs sm:text-sm">
              <Settings className="w-3.5 h-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Preferințe</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Status:</span>
          <div className="flex flex-wrap gap-1">
            {readFilterOptions.map((opt) => (
              <Button
                key={opt.value}
                variant={readFilter === opt.value ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => handleFilterChange(opt.value, typeFilter)}
                data-testid={`filter-read-${opt.value}`}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {availableTypes.length > 1 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium">Tip:</span>
            <div className="flex gap-1">
              {typeFilterOptions.map((opt) => (
                <Button
                  key={opt.value}
                  variant={typeFilter === opt.value ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs px-2.5"
                  onClick={() => handleFilterChange(readFilter, opt.value)}
                  data-testid={`filter-type-${opt.value}`}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {(readFilter !== "all" || typeFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => handleFilterChange("all", "all")}
            data-testid="filter-reset"
          >
            Resetează filtrele
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : filtered.length > 0 ? (
        <>
          <div className="space-y-5">
            {grouped.map((group) => (
              <div key={group.label} className="space-y-2">
                <div className="flex items-center gap-3 px-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" data-testid={`group-label-${group.label}`}>{group.label}</p>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="space-y-2">
                  {group.items.map((notif) => {
                    const Icon = typeIcons[notif.type || "info"] || Info;
                    return (
                      <Card
                        key={notif.id}
                        className={`p-3 sm:p-4 flex items-start gap-3 transition-colors ${!notif.read ? "bg-primary/5 border-primary/20" : ""}`}
                        data-testid={`notification-${notif.id}`}
                      >
                        <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${!notif.read ? "bg-primary/10" : "bg-muted"}`}>
                          <Icon className={`w-4 h-4 ${!notif.read ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm ${!notif.read ? "font-semibold" : "font-medium"}`}>
                              {notif.title}
                            </p>
                            {!notif.read && (
                              <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{notif.message}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground">
                              {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }) : ""}
                            </p>
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                              {typeLabels[notif.type || "info"] || "Sistem"}
                            </Badge>
                          </div>
                        </div>
                        {!notif.read && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markReadMutation.mutate(notif.id)}
                            disabled={markReadMutation.isPending}
                            data-testid={`button-read-${notif.id}`}
                            className="text-xs shrink-0"
                          >
                            <span className="hidden sm:inline">Marchează ca citit</span>
                            <span className="sm:hidden">Citit</span>
                          </Button>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                {filtered.length} notificăr{filtered.length !== 1 ? "i" : "e"} · pagina {safePage} din {totalPages}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  data-testid="button-page-prev"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Înapoi
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  data-testid="button-page-next"
                >
                  Înainte <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : notifications && notifications.length > 0 ? (
        <Card className="p-12 text-center space-y-4">
          <Filter className="w-12 h-12 text-muted-foreground mx-auto" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Nicio notificare pentru filtrele selectate</h3>
            <p className="text-sm text-muted-foreground">
              Încearcă să schimbi filtrele sau apasă „Resetează filtrele".
            </p>
          </div>
        </Card>
      ) : (
        <Card className="p-12 text-center space-y-4">
          <BellOff className="w-12 h-12 text-muted-foreground mx-auto" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Nicio notificare</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Vei primi notificări despre expirarea documentelor, actualizări ale proiectelor și multe altele.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
