import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  MessageCircle, X, Send, Loader2, Bot, User,
  Lightbulb, AlertTriangle, HelpCircle, CheckCircle,
  MessageSquare, Minus, Sparkles, BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { getVersionString } from "@shared/version";
import { useSurveyTrigger } from "@/hooks/use-survey-trigger";
import { MicroSurvey } from "@/components/micro-survey";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SUPPORT_STARTERS = [
  "Cum adaug o companie?",
  "Ce este Match Engine-ul?",
  "Cum funcționează eligibilitatea?",
  "Sunt o primărie, există programe de finanțare pentru mine?",
];

const RAG_STARTERS = [
  "Ce documente sunt necesare?",
  "Care sunt criteriile de eligibilitate?",
  "Care e bugetul maxim?",
];

const feedbackTypes = [
  { value: "sugestie", label: "Sugestie", icon: Lightbulb, color: "text-yellow-500", bgColor: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800", activeColor: "bg-yellow-100 border-yellow-400 dark:bg-yellow-900 dark:border-yellow-600" },
  { value: "problema", label: "Problema", icon: AlertTriangle, color: "text-red-500", bgColor: "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800", activeColor: "bg-red-100 border-red-400 dark:bg-red-900 dark:border-red-600" },
  { value: "intrebare", label: "Întrebare", icon: HelpCircle, color: "text-blue-500", bgColor: "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800", activeColor: "bg-blue-100 border-blue-400 dark:bg-blue-900 dark:border-blue-600" },
];

type TabMode = "chat" | "feedback";

function parseFundingCallId(path: string): string | null {
  const match = path.match(/^\/funding-calls\/([a-f0-9-]+)/);
  return match ? match[1] : null;
}

export function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const [activeTab, setActiveTab] = useState<TabMode>("chat");

  const [supportMessages, setSupportMessages] = useState<ChatMessage[]>([]);
  const [ragMessages, setRagMessages] = useState<ChatMessage[]>([]);
  const [ragCallId, setRagCallId] = useState<string | null>(null);

  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      const maxX = window.innerWidth - (panelRef.current?.offsetWidth || 400);
      const maxY = window.innerHeight - (panelRef.current?.offsetHeight || 520);
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };
    const handleMouseUp = () => {
      isDragging.current = false;
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      const touch = e.touches[0];
      const newX = touch.clientX - dragOffset.current.x;
      const newY = touch.clientY - dragOffset.current.y;
      const maxX = window.innerWidth - (panelRef.current?.offsetWidth || 400);
      const maxY = window.innerHeight - (panelRef.current?.offsetHeight || 520);
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };
    const handleTouchEnd = () => {
      isDragging.current = false;
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    isDragging.current = true;
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0];
      dragOffset.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    } else {
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    if (!position) {
      setPosition({ x: rect.left, y: rect.top });
    }
  }, [position]);

  const [location] = useLocation();
  const currentCallId = useMemo(() => parseFundingCallId(location), [location]);
  const isRagMode = !!currentCallId;

  const { data: callData } = useQuery({
    queryKey: ["/api/funding-calls", currentCallId],
    enabled: !!currentCallId,
  });
  const callName = (callData as any)?.name || "";

  const [firstRagAnswerDone, setFirstRagAnswerDone] = useState(false);

  useEffect(() => {
    if (currentCallId && currentCallId !== ragCallId) {
      setRagMessages([]);
      setRagCallId(currentCallId);
      setFirstRagAnswerDone(false);
    }
  }, [currentCallId, ragCallId]);

  const ragSurvey = useSurveyTrigger({
    event: "rag_first_answer",
    enabled: !!isRagMode && firstRagAnswerDone,
    delayMs: 1500,
  });

  const messages = isRagMode ? ragMessages : supportMessages;
  const setMessages = isRagMode ? setRagMessages : setSupportMessages;

  const starterQuestions = isRagMode ? RAG_STARTERS : SUPPORT_STARTERS;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMessage: ChatMessage = { role: "user", content: text.trim() };
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInput("");
    setIsStreaming(true);

    const assistantMessage: ChatMessage = { role: "assistant", content: "" };
    setMessages([...currentMessages, assistantMessage]);

    const endpoint = isRagMode
      ? `/api/funding-calls/${currentCallId}/chat`
      : "/api/support-chat";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: text.trim(),
          history: messages.slice(-10),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 402) {
          throw new Error(errData.message || "Credite insuficiente. Acceseaza pagina de Abonament pentru a achizitiona credite suplimentare.");
        }
        throw new Error(errData.message || "Eroare la trimiterea mesajului");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Nu s-a putut citi răspunsul");

      const wasFirstAssistant = isRagMode && messages.filter((m) => m.role === "assistant").length === 0;
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === "chunk" && parsed.content) {
              accumulated += parsed.content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: accumulated };
                return updated;
              });
            }
          } catch {
            buffer = line + "\n";
          }
        }
      }
      if (wasFirstAssistant && accumulated.trim().length > 0) {
        setFirstRagAnswerDone(true);
      }
    } catch (err: any) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: `Eroare: ${err.message || "Nu s-a putut procesa întrebarea. Încearcă din nou."}`,
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [messages, isStreaming, isRagMode, currentCallId, setMessages]);

  const feedbackMutation = useMutation({
    mutationFn: async (data: { type: string; message: string; page: string; appVersion?: string }) => {
      const res = await apiRequest("POST", "/api/feedback", data);
      return res.json();
    },
    onSuccess: () => {
      setFeedbackSent(true);
      setTimeout(() => {
        setFeedbackSent(false);
        setSelectedType(null);
        setFeedbackMessage("");
      }, 2500);
    },
  });

  const handleFeedbackSubmit = () => {
    if (!selectedType || !feedbackMessage.trim()) return;
    feedbackMutation.mutate({
      type: selectedType,
      message: feedbackMessage.trim(),
      page: window.location.pathname,
      appVersion: getVersionString(),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setPosition(null);
  };

  const headerTitle = isRagMode ? "Asistent AI" : "Suport";
  const headerSubtitle = isRagMode && callName
    ? callName.length > 45 ? callName.slice(0, 45) + "..." : callName
    : null;
  const headerBg = isRagMode ? "bg-gradient-to-r from-primary to-primary/80" : "bg-primary";
  const HeaderIcon = isRagMode ? Sparkles : Bot;
  const placeholderText = isRagMode
    ? "Întreabă despre acest apel..."
    : "Scrie o întrebare...";
  const emptyTitle = isRagMode
    ? "Întreabă despre acest apel"
    : "Cum te putem ajuta?";
  const emptySubtitle = isRagMode
    ? "Răspund pe baza ghidurilor oficiale ale acestui apel de finanțare."
    : "Întreabă orice despre platformă sau despre programele de finanțare disponibile.";

  const surveyOverlay = ragSurvey.surveyConfig ? (
    <MicroSurvey
      config={ragSurvey.surveyConfig}
      onSubmit={(payload) => ragSurvey.submit(payload)}
      onDismiss={() => ragSurvey.dismiss()}
      isSubmitting={ragSurvey.isSubmitting}
    />
  ) : null;

  if (!open) {
    return (
      <>
      {surveyOverlay}
      <button
        onClick={() => { setOpen(true); setHasBeenOpened(true); }}
        data-testid="button-support-chat-open"
        className={cn(
          "fixed bottom-5 right-5 z-[35] rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-all duration-200 max-md:bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))]",
          hasBeenOpened ? "w-10 h-10" : "w-12 h-12"
        )}
        title={isRagMode ? "Întreabă asistentul AI" : "Deschide suportul"}
      >
        {isRagMode ? (
          <Sparkles className={hasBeenOpened ? "w-4 h-4" : "w-5 h-5"} />
        ) : (
          <MessageSquare className={hasBeenOpened ? "w-4 h-4" : "w-5 h-5"} />
        )}
      </button>
      </>
    );
  }

  return (
    <>
    {surveyOverlay}
    <div
      ref={panelRef}
      className={cn(
        "z-[35] w-[400px] h-[520px] max-md:w-[calc(100vw-1rem)] max-md:h-[calc(100vh-8rem)] flex flex-col bg-background border rounded-2xl shadow-xl",
        !position && "fixed bottom-5 right-5 max-md:bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] max-md:right-2 max-md:left-2 animate-in slide-in-from-bottom-4 fade-in duration-200"
      )}
      style={position ? { position: "fixed", left: position.x, top: position.y } : undefined}
      data-testid="support-chat-panel"
    >
      <div
        className={cn("flex items-center justify-between gap-2 px-4 py-2.5 border-b text-primary-foreground rounded-t-2xl shrink-0 cursor-grab active:cursor-grabbing select-none", headerBg)}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        <div className="flex items-center gap-2 min-w-0">
          <HeaderIcon className="w-4 h-4 shrink-0" />
          <div className="min-w-0">
            <span className="font-semibold text-sm block truncate">{headerTitle}</span>
            {headerSubtitle && (
              <span className="text-xs text-primary-foreground/70 block truncate">{headerSubtitle}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => { setOpen(false); setHasBeenOpened(true); setPosition(null); }}
            data-testid="button-support-chat-minimize"
            title="Minimizează"
            className="h-6 w-6 rounded flex items-center justify-center hover:bg-white/20 transition-colors border border-white/30"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleClose}
            data-testid="button-support-chat-close"
            title="Închide"
            className="h-6 w-6 rounded flex items-center justify-center hover:bg-white/20 transition-colors border border-white/30"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isRagMode && (
        <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 border-b shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300">
            <BookOpen className="w-3 h-3 shrink-0" />
            <span>Răspunsuri bazate pe ghidurile oficiale ale apelului</span>
          </div>
        </div>
      )}

      <div className="flex border-b shrink-0">
        <button
          onClick={() => setActiveTab("chat")}
          data-testid="tab-support-chat"
          className={cn(
            "flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5",
            activeTab === "chat"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground"
          )}
        >
          {isRagMode ? (
            <><Sparkles className="w-3.5 h-3.5" />Asistent AI</>
          ) : (
            <><MessageSquare className="w-3.5 h-3.5" />Chat suport</>
          )}
        </button>
        <button
          onClick={() => setActiveTab("feedback")}
          data-testid="tab-support-feedback"
          className={cn(
            "flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5",
            activeTab === "feedback"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground"
          )}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Trimite feedback
        </button>
      </div>

      {activeTab === "chat" ? (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-6">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", isRagMode ? "bg-blue-100 dark:bg-blue-900/30" : "bg-primary/10")}>
                  <HeaderIcon className={cn("w-5 h-5", isRagMode ? "text-blue-600 dark:text-blue-400" : "text-primary")} />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium">{emptyTitle}</p>
                  <p className="text-xs text-muted-foreground max-w-[280px]">
                    {emptySubtitle}
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full px-2">
                  {starterQuestions.map((q) => (
                    <Button
                      key={q}
                      variant="outline"
                      className="text-xs justify-start text-left h-auto py-2 whitespace-normal"
                      onClick={() => sendMessage(q)}
                      disabled={isStreaming}
                      data-testid={`button-starter-${q.slice(0, 15).replace(/\s+/g, "-").toLowerCase()}`}
                    >
                      <MessageSquare className="w-3.5 h-3.5 mr-2 shrink-0" />
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                data-testid={`support-message-${msg.role}-${i}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3 h-3 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {msg.content ? (
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span className="text-xs text-muted-foreground">Se generează...</span>
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3 h-3" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {messages.length > 0 && (
            <div className="px-3 pb-1 shrink-0">
              <div className="flex flex-wrap gap-1.5">
                {starterQuestions.filter((q) => !messages.some((m) => m.content === q)).slice(0, 2).map((q) => (
                  <Badge
                    key={q}
                    variant="outline"
                    className="text-xs cursor-pointer no-default-active-elevate hover-elevate"
                    onClick={() => !isStreaming && sendMessage(q)}
                    data-testid={`badge-support-suggestion-${q.slice(0, 10).replace(/\s+/g, "-").toLowerCase()}`}
                  >
                    {q}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {isRagMode && messages.length === 0 && (
            <div className="px-3 pb-2 shrink-0">
              <p className="text-[10px] text-muted-foreground text-center italic">
                Fiecare întrebare consumă 1 credit. Răspunsurile sunt bazate pe ghidurile oficiale.
              </p>
            </div>
          )}

          <div className="p-3 border-t shrink-0">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholderText}
                className="resize-none text-sm min-h-[38px] max-h-[80px]"
                rows={1}
                disabled={isStreaming}
                data-testid="input-support-chat-message"
              />
              <Button
                size="icon"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isStreaming}
                data-testid="button-support-send-message"
              >
                {isStreaming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {feedbackSent ? (
            <div className="p-8 flex flex-col items-center gap-3 text-center">
              <CheckCircle className="w-10 h-10 text-green-500" />
              <p className="font-semibold">Multumim!</p>
              <p className="text-sm text-muted-foreground">Feedback-ul tau a fost trimis.</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              <p className="text-sm text-muted-foreground">Ce tip de mesaj ai?</p>
              <div className="grid grid-cols-3 gap-2">
                {feedbackTypes.map((ft) => {
                  const Icon = ft.icon;
                  const isActive = selectedType === ft.value;
                  return (
                    <button
                      key={ft.value}
                      onClick={() => setSelectedType(ft.value)}
                      data-testid={`button-feedback-type-${ft.value}`}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-md border text-xs font-medium transition-all",
                        isActive ? ft.activeColor : ft.bgColor
                      )}
                    >
                      <Icon className={cn("w-5 h-5", ft.color)} />
                      {ft.label}
                    </button>
                  );
                })}
              </div>

              {selectedType && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <Textarea
                    placeholder="Scrie mesajul tau aici..."
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    className="min-h-[80px] resize-none text-sm"
                    data-testid="input-feedback-message"
                  />
                  <Button
                    onClick={handleFeedbackSubmit}
                    disabled={!feedbackMessage.trim() || feedbackMutation.isPending}
                    className="w-full gap-2"
                    size="sm"
                    data-testid="button-feedback-submit"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {feedbackMutation.isPending ? "Se trimite..." : "Trimite"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
}
