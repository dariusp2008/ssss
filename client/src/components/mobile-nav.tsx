import { useLocation, Link } from "wouter";
import { LayoutDashboard, Building2, Landmark, FolderOpen, Menu, Bell, ShieldCheck, X } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import type { Notification } from "@shared/schema";

const mainTabs = [
  { title: "Acasa", url: "/dashboard", icon: LayoutDashboard, testId: "mob-dashboard" },
  { title: "Companii", url: "/companies", icon: Building2, testId: "mob-companies" },
  { title: "Apeluri", url: "/funding-calls", icon: Landmark, testId: "mob-funding" },
  { title: "Eligibilitate", url: "/eligibility", icon: ShieldCheck, testId: "mob-eligibility" },
  { title: "Mai mult", url: "__more__", icon: Menu, testId: "mob-more" },
];

const moreItems = [
  { title: "Proiecte", url: "/projects", icon: FolderOpen, testId: "mob-projects" },
  { title: "Notificări", url: "/notifications", icon: Bell, testId: "mob-notifications" },
];

export function MobileBottomNav() {
  const [location] = useLocation();
  const [showMore, setShowMore] = useState(false);
  const { user } = useAuth();

  const { data: notifications } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
  });
  const unreadCount = notifications?.filter((n) => !n.read).length || 0;

  const closeMore = useCallback(() => setShowMore(false), []);

  useEffect(() => {
    if (!showMore) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMore();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showMore, closeMore]);

  const isActive = (url: string) => {
    if (url === "/dashboard") return location === "/" || location === "/dashboard";
    return location === url || location.startsWith(url + "/");
  };

  const moreActive = moreItems.some((item) => isActive(item.url));

  return (
    <>
      {showMore && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={closeMore}
          role="button"
          tabIndex={-1}
          aria-label="Închide meniul"
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") closeMore(); }}
        />
      )}

      {showMore && (
        <div className="fixed bottom-[calc(4.5rem+max(env(safe-area-inset-bottom,0px),4px))] left-3 right-3 z-40 bg-background border rounded-2xl shadow-lg px-2 py-3 md:hidden" data-testid="mobile-more-menu" role="dialog" aria-label="Meniu suplimentar">
          <div className="flex items-center justify-between px-3 pb-2 mb-1 border-b">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mai mult</span>
            <button onClick={closeMore} className="p-1 rounded-md text-muted-foreground" aria-label="Închide meniul">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {moreItems.map((item) => (
              <Link
                key={item.testId}
                href={item.url}
                onClick={closeMore}
                data-testid={`link-${item.testId}`}
              >
                <div className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl transition-colors ${isActive(item.url) ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                  <div className="relative">
                    <item.icon className="w-5 h-5" />
                    {item.testId === "mob-notifications" && unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-2 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">{unreadCount > 9 ? "9+" : unreadCount}</span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium leading-tight">{item.title}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <nav className="fixed bottom-2 left-3 right-3 z-40 bg-background/95 backdrop-blur-md border rounded-2xl shadow-[0_-2px_12px_rgba(0,0,0,0.08)] md:hidden" style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 4px)" }} data-testid="mobile-bottom-nav" aria-label="Navigare mobil">
        <div className="flex items-stretch justify-around h-14">
          {mainTabs.map((tab) => {
            if (tab.url === "__more__") {
              return (
                <button
                  key={tab.testId}
                  onClick={() => setShowMore(!showMore)}
                  className={`flex flex-col items-center justify-center flex-1 gap-0.5 transition-colors ${moreActive || showMore ? "text-primary" : "text-muted-foreground"}`}
                  data-testid={`link-${tab.testId}`}
                  aria-expanded={showMore}
                  aria-label="Mai mult"
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{tab.title}</span>
                </button>
              );
            }

            const active = isActive(tab.url);
            return (
              <Link key={tab.testId} href={tab.url} onClick={closeMore} data-testid={`link-${tab.testId}`} aria-current={active ? "page" : undefined}>
                <div className={`flex flex-col items-center justify-center h-14 px-3 gap-0.5 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
                  <div className="relative">
                    <tab.icon className="w-5 h-5" />
                    {active && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />}
                  </div>
                  <span className="text-[10px] font-medium">{tab.title}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
