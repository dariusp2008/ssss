import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CalendarDays, Clock, FileWarning, Landmark, AlertTriangle } from "lucide-react";
import { daysUntil } from "@/components/lifecycle-countdown";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: "deadline" | "expiry" | "project";
  color: string;
  details?: string;
}

interface UpcomingDeadline {
  name: string;
  deadline: string;
  type: string;
}

function DeadlineCountdown({ deadline }: { deadline: string }) {
  // Sursă unică de adevăr pentru numărul de zile (vezi `daysUntil`) — identic cu
  // countdown-ul de pe dashboard.
  const diffDays = daysUntil(deadline);

  if (diffDays < 0) return <Badge variant="destructive" className="text-[10px] no-default-active-elevate">Expirat</Badge>;
  if (diffDays === 0) return <Badge variant="destructive" className="text-[10px] no-default-active-elevate">Astăzi</Badge>;
  if (diffDays === 1) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-[10px] no-default-active-elevate">Mâine</Badge>;
  if (diffDays <= 7) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-[10px] no-default-active-elevate">{diffDays} zile</Badge>;
  if (diffDays <= 30) return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 text-[10px] no-default-active-elevate">{diffDays} zile</Badge>;
  return <Badge variant="secondary" className="text-[10px] no-default-active-elevate">{diffDays} zile</Badge>;
}

const MONTH_NAMES = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
];

const DAY_NAMES = ["Lun", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export default function CalendarPage() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar/events"],
  });

  const { data: statsData } = useQuery<{ upcomingDeadlines: UpcomingDeadline[] }>({
    queryKey: ["/api/dashboard/stats"],
  });

  const upcomingDeadlines = statsData?.upcomingDeadlines?.slice(0, 8) || [];

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(null);
  };

  const getEventsForDate = (dateStr: string) => {
    return events.filter((e) => e.date === dateStr);
  };

  const formatDateStr = (day: number) => {
    const m = String(currentMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${currentYear}-${m}-${d}`;
  };

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  const eventColorMap: Record<string, string> = {
    blue: "bg-blue-500",
    red: "bg-red-500",
    slate: "bg-slate-400",
    green: "bg-green-500",
  };

  const badgeColorMap: Record<string, string> = {
    deadline: "bg-blue-100 text-blue-800 border-blue-200",
    expiry: "bg-red-100 text-red-800 border-red-200",
    project: "bg-green-100 text-green-800 border-green-200",
  };

  const typeLabel: Record<string, string> = {
    deadline: "Termen limită",
    expiry: "Expirare document",
    project: "Proiect",
  };

  const allMonthEvents = events.filter((e) => {
    const [y, m] = e.date.split("-").map(Number);
    return y === currentYear && m === currentMonth + 1;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2" data-testid="text-calendar-title">
            <CalendarDays className="w-6 h-6 text-blue-600" />
            Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Termene limită și evenimente importante</p>
        </div>
        <Button variant="outline" size="sm" onClick={goToToday} data-testid="button-today">
          Astăzi
        </Button>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={prevMonth} data-testid="button-prev-month">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <CardTitle className="text-lg" data-testid="text-current-month">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={nextMonth} data-testid="button-next-month">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-0">
              {DAY_NAMES.map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2 border-b">
                  {day}
                </div>
              ))}

              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="h-20 border-b border-r last:border-r-0" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = formatDateStr(day);
                const dayEvents = getEventsForDate(dateStr);
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(dateStr === selectedDate ? null : dateStr)}
                    className={`h-20 border-b border-r p-1 text-left transition-colors hover:bg-accent/50 relative ${
                      isSelected ? "bg-accent ring-2 ring-primary" : ""
                    }`}
                    data-testid={`calendar-day-${day}`}
                  >
                    <span
                      className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${
                        isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                      }`}
                    >
                      {day}
                    </span>
                    {dayEvents.length > 0 && (
                      <div className="flex items-center gap-0.5 mt-0.5 justify-center">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <span
                            key={ev.id}
                            className={`w-1.5 h-1.5 rounded-full ${eventColorMap[ev.color] || "bg-slate-500"}`}
                            data-testid={`dot-event-${ev.id}`}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[8px] text-muted-foreground leading-none">+{dayEvents.length - 3}</span>
                        )}
                      </div>
                    )}
                    <div className="mt-0.5 space-y-0.5 overflow-hidden hidden sm:block">
                      {dayEvents.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          className={`text-[10px] leading-tight truncate rounded px-1 py-0.5 text-white ${eventColorMap[ev.color] || "bg-slate-500"}`}
                        >
                          {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[10px] text-muted-foreground pl-1">
                          +{dayEvents.length - 2} mai mult
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {upcomingDeadlines.length > 0 && (
            <Card data-testid="card-upcoming-deadlines">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Termene apropiate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[320px] overflow-y-auto">
                  {upcomingDeadlines.map((dl, idx) => {
                    const deadlineDate = new Date(dl.deadline);
                    const dateStr = `${deadlineDate.getUTCFullYear()}-${String(deadlineDate.getUTCMonth() + 1).padStart(2, "0")}-${String(deadlineDate.getUTCDate()).padStart(2, "0")}`;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setCurrentYear(deadlineDate.getUTCFullYear());
                          setCurrentMonth(deadlineDate.getUTCMonth());
                          setSelectedDate(dateStr);
                        }}
                        className="w-full text-left flex items-center justify-between gap-2 p-2 rounded-lg border bg-card transition-colors hover:bg-accent/50"
                        data-testid={`deadline-item-${idx}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{dl.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {deadlineDate.toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" })}
                            {" · "}
                            {dl.type === "funding_deadline" || dl.type === "funding_call" ? "Apel" : dl.type === "document_expiry" ? "Document" : dl.type}
                          </p>
                        </div>
                        <div className="shrink-0">
                          <DeadlineCountdown deadline={dl.deadline} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {selectedDate && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Evenimente — {new Date(selectedDate + "T00:00:00").toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Niciun eveniment în această zi.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedEvents.map((ev) => (
                      <div key={ev.id} className="flex items-start gap-3 p-2 rounded-lg border bg-card">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${eventColorMap[ev.color] || "bg-slate-500"}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{ev.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={`text-[10px] ${badgeColorMap[ev.type] || ""}`}>
                              {typeLabel[ev.type] || ev.type}
                            </Badge>
                            {ev.details && (
                              <span className="text-xs text-muted-foreground">{ev.details}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Evenimente luna aceasta ({allMonthEvents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Se încarcă...</p>
              ) : allMonthEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Niciun eveniment luna aceasta.</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {allMonthEvents
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => setSelectedDate(ev.date)}
                        className="w-full text-left flex items-center gap-2 p-2 rounded hover:bg-accent transition-colors"
                        data-testid={`event-${ev.id}`}
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${eventColorMap[ev.color] || "bg-slate-500"}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{ev.title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(ev.date + "T00:00:00").toLocaleDateString("ro-RO", { day: "numeric", month: "short" })}
                            {" · "}
                            {typeLabel[ev.type]}
                          </p>
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-blue-100 bg-blue-50/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Landmark className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Legendă</p>
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span>Termen limită — proiect activ</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full bg-slate-400" />
                      <span>Termen limită — apel disponibil</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span>Expirare document</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
