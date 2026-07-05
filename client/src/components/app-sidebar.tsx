import { useLocation, Link } from "wouter";
import { LayoutDashboard, FolderOpen, Settings, Bell, LogOut, Newspaper, Building2, Landmark, ShieldCheck, Shield, CalendarDays, BookOpen, FileText, Coins, UserCheck, Lightbulb } from "lucide-react";
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
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
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
      <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg bg-sidebar-accent/50 border border-sidebar-border hover-elevate cursor-pointer">
        <Coins className="w-4 h-4 text-[hsl(48,100%,45%)] shrink-0" />
        <span className="text-sm font-semibold text-sidebar-foreground" data-testid="text-credit-balance">
          {data.creditBalance} credite
        </span>
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
  { title: "Contul meu", url: "/my-account", icon: Settings, testId: "my-account" },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { setOpenMobile } = useSidebar();

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

  const handleNavClick = () => {
    setOpenMobile(false);
  };

  return (
    <Sidebar variant="floating">
      <SidebarHeader className="p-4 flex items-center justify-center">
        <Link href="/dashboard" onClick={handleNavClick} data-testid="link-logo-home">
          <GrantedLogo size="md" variant="gold" />
        </Link>
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
        <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent/50 border border-sidebar-border">
          <Avatar className="w-9 h-9 ring-2 ring-[hsl(48,100%,50%)] shrink-0">
            {user?.profileImage && <AvatarImage src={user.profileImage} alt="Profil" />}
            <AvatarFallback className="text-xs font-semibold bg-sidebar-primary text-sidebar-primary-foreground">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 space-y-0.5">
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
        <p className="text-[10px] text-muted-foreground/50 text-center mt-1.5" data-testid="text-app-version">{getVersionString()}</p>
      </SidebarFooter>
    </Sidebar>
  );
}
