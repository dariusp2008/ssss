import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useTheme } from "next-themes";
import { LayoutDashboard, FolderOpen, Settings, Bell, LogOut, Newspaper, Building2, Landmark, ShieldCheck, Shield, CalendarDays, BookOpen, FileText, Coins, UserCog, Lightbulb, Palette, SlidersHorizontal, PanelLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import { getVersionString } from "@shared/version";
import { GrantedLogo } from "@/components/granted-logo";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { Notification } from "@shared/schema";
import { useNotificationStream } from "@/hooks/use-notification-stream";

interface CreditBalanceData {
  creditBalance: number;
  plan: { name: string; slug: string } | null;
}

function CreditBalanceBadge({ onClick }: { onClick: () => void }) {
  const { data } = useQuery<CreditBalanceData>({
    queryKey: ["/api/credits/balance"],
  });

  if (data == null) return null;

  return (
    <Link href="/my-account?tab=abonament" onClick={onClick} data-testid="link-credit-balance">
      <div
        className="group/credit flex items-center gap-2 px-3 py-2 mb-2 rounded-lg bg-sidebar-accent/50 border border-sidebar-border hover-elevate cursor-pointer group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:gap-0"
        title={`${data.creditBalance} credite — reîncarcă`}
      >
        <Coins className="w-4 h-4 text-[hsl(48,100%,45%)] shrink-0" />
        <span className="text-sm font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden" data-testid="text-credit-balance">
          {data.creditBalance} credite
        </span>
        <ArrowUpRight className="w-4 h-4 ml-auto text-[hsl(48,100%,45%)] opacity-60 transition-all group-hover/credit:opacity-100 group-hover/credit:translate-x-0.5 group-hover/credit:-translate-y-0.5 shrink-0 group-data-[collapsible=icon]:hidden" />
      </div>
    </Link>
  );
}

const navItems = [
  { title: "Panou de control", url: "/dashboard", icon: LayoutDashboard, testId: "dashboard" },
  { title: "Companiile mele", url: "/companies", icon: Building2, testId: "companies" },
  { title: "Apeluri finanțare", url: "/funding-calls", icon: Landmark, testId: "funding-calls" },
  { title: "Găsește după idee", url: "/cauta-dupa-idee", icon: Lightbulb, testId: "idea-search" },
  { title: "Eligibilitate", url: "/eligibility", icon: ShieldCheck, testId: "eligibility" },
  { title: "Proiecte", url: "/projects", icon: FolderOpen, testId: "projects" },
  { title: "Calendar", url: "/calendar", icon: CalendarDays, testId: "calendar" },
  { title: "Notificări", url: "/notifications", icon: Bell, testId: "notifications" },
  { title: "Contul meu", url: "/my-account", icon: UserCog, testId: "my-account" },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { setOpenMobile, toggleSidebar, state, setOpen } = useSidebar();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Auriu (light) → yellow/white logo; Elegant (dark) → white logo on the dark rail.
  const logoVariant = mounted && resolvedTheme === "dark" ? "white" : "gold";

  const { data: notifications } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });
  const unreadCount = notifications?.filter((n) => !n.read).length || 0;

  useNotificationStream(!!user);

  const { data: adminCheck } = useQuery<{ isSuperAdmin: boolean }>({
    queryKey: ["/api/admin/check"],
  });

  const initials = user
    ? `${(user.firstName?.[0] || "").toUpperCase()}${(user.lastName?.[0] || "").toUpperCase()}`
    : "?";

  const isActive = (url: string) => location === url || location.startsWith(url + "/");
  const settingsActive = location.startsWith("/setari") || location === "/notification-settings";

  const handleNavClick = () => {
    setOpenMobile(false);
  };

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarHeader className="p-3">
        <div className="relative flex items-center justify-center gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1">
          <Link href="/dashboard" onClick={handleNavClick} data-testid="link-logo-home" className="group-data-[collapsible=icon]:hidden">
            <GrantedLogo size="md" variant={logoVariant} />
          </Link>
          <button
            onClick={toggleSidebar}
            data-testid="button-sidebar-collapse"
            title="Restrânge / extinde meniul"
            className="absolute right-0 p-2 rounded-md text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors shrink-0 group-data-[collapsible=icon]:static"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70">Navigare</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.testId}>
                  <SidebarMenuButton
                    asChild
                    data-active={isActive(item.url)}
                    className={isActive(item.url) ? "bg-[hsl(48,100%,50%)]/10 text-[hsl(228,100%,19.6%)] font-medium border-l-2 border-[hsl(48,100%,50%)] rounded-l-none" : ""}
                  >
                    <Link href={item.url} onClick={handleNavClick} data-testid={`link-nav-${item.testId}`}>
                      <item.icon className={`w-4 h-4 ${isActive(item.url) ? "text-[hsl(48,100%,45%)]" : ""}`} />
                      <span>{item.title}</span>
                      {item.testId === "notifications" && unreadCount > 0 && (
                        <Badge variant="destructive" className="ml-auto text-xs no-default-active-elevate">
                          {unreadCount}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70">Altele</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  data-active={isActive("/how-it-works")}
                  className={isActive("/how-it-works") ? "bg-[hsl(48,100%,50%)]/10 text-[hsl(228,100%,19.6%)] font-medium border-l-2 border-[hsl(48,100%,50%)] rounded-l-none" : ""}
                >
                  <Link href="/how-it-works" onClick={handleNavClick} data-testid="link-nav-how-it-works">
                    <BookOpen className={`w-4 h-4 ${isActive("/how-it-works") ? "text-[hsl(48,100%,45%)]" : ""}`} />
                    <span>Cum funcționează</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70">Setări</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <Collapsible defaultOpen={settingsActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      data-testid="button-nav-settings"
                      tooltip="Setări"
                      onClick={() => { if (state === "collapsed") setOpen(true); }}
                    >
                      <Settings className="w-4 h-4" />
                      <span>Setări</span>
                      <ChevronRight className="ml-auto w-4 h-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActive("/setari/aspect")}>
                          <Link href="/setari/aspect" onClick={handleNavClick} data-testid="link-nav-setari-aspect">
                            <Palette className="w-4 h-4" />
                            <span>Aspect</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActive("/setari/panou")}>
                          <Link href="/setari/panou" onClick={handleNavClick} data-testid="link-nav-setari-panou">
                            <SlidersHorizontal className="w-4 h-4" />
                            <span>Detalii panou</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActive("/notification-settings")}>
                          <Link href="/notification-settings" onClick={handleNavClick} data-testid="link-nav-setari-notificari">
                            <Bell className="w-4 h-4" />
                            <span>Setări notificări</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {adminCheck?.isSuperAdmin && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70">Administrare</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      data-active={isActive("/news")}
                      className={isActive("/news") ? "bg-[hsl(48,100%,50%)]/10 text-[hsl(228,100%,19.6%)] font-medium border-l-2 border-[hsl(48,100%,50%)] rounded-l-none" : ""}
                    >
                      <Link href="/news" onClick={handleNavClick} data-testid="link-nav-news">
                        <Newspaper className={`w-4 h-4 ${isActive("/news") ? "text-[hsl(48,100%,45%)]" : ""}`} />
                        <span>Noutăți</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      data-active={isActive("/admin")}
                      className={isActive("/admin") ? "bg-[hsl(48,100%,50%)]/10 text-[hsl(228,100%,19.6%)] font-medium border-l-2 border-[hsl(48,100%,50%)] rounded-l-none" : ""}
                    >
                      <Link href="/admin" onClick={handleNavClick} data-testid="link-nav-admin">
                        <Shield className={`w-4 h-4 ${isActive("/admin") ? "text-[hsl(48,100%,45%)]" : ""}`} />
                        <span>Super Admin</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
      <SidebarFooter className="p-3 pb-3">
        {user && <CreditBalanceBadge onClick={handleNavClick} />}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent/50 border border-sidebar-border group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1.5 group-data-[collapsible=icon]:p-1.5">
          <Link href="/my-account" onClick={handleNavClick} title={`${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()}>
            <Avatar className="w-9 h-9 ring-2 ring-[hsl(48,100%,50%)] shrink-0 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8 cursor-pointer">
              {user?.profileImage && <AvatarImage src={user.profileImage} alt="Profil" />}
              <AvatarFallback className="text-xs font-semibold bg-sidebar-primary text-sidebar-primary-foreground">{initials}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0 space-y-0.5 group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-semibold truncate text-sidebar-foreground" data-testid="text-sidebar-username">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-[11px] font-semibold truncate" data-testid="text-sidebar-role" style={{ color: user?.role === 'super_admin' ? '#f87171' : user?.role === 'consultant' ? '#60a5fa' : 'hsl(48, 100%, 60%)' }}>
              {user?.role === 'super_admin' ? 'Super Admin' : user?.role === 'consultant' ? 'Consultant' : 'Utilizator'}
            </p>
          </div>
          <button onClick={() => { logout(); handleNavClick(); }} data-testid="button-logout" className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-sidebar-accent transition-colors shrink-0" title="Deconectare">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground/50 text-center mt-1.5 group-data-[collapsible=icon]:hidden" data-testid="text-app-version">{getVersionString()}</p>
      </SidebarFooter>
    </Sidebar>
  );
}
