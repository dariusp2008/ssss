import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { MessageCircle, X, Lightbulb, AlertTriangle, HelpCircle, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { getVersionString } from "@shared/version";

const feedbackTypes = [
  { value: "sugestie", label: "Sugestie", icon: Lightbulb, color: "text-yellow-500", bgColor: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800", activeColor: "bg-yellow-100 border-yellow-400 dark:bg-yellow-900 dark:border-yellow-600" },
  { value: "problema", label: "Problemă", icon: AlertTriangle, color: "text-red-500", bgColor: "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800", activeColor: "bg-red-100 border-red-400 dark:bg-red-900 dark:border-red-600" },
  { value: "intrebare", label: "Întrebare", icon: HelpCircle, color: "text-blue-500", bgColor: "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800", activeColor: "bg-blue-100 border-blue-400 dark:bg-blue-900 dark:border-blue-600" },
];

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: async (data: { type: string; message: string; page: string; appVersion?: string }) => {
      const res = await apiRequest("POST", "/api/feedback", data);
      return res.json();
    },
    onSuccess: () => {
      setSent(true);
      setTimeout(() => {
        setOpen(false);
        setSent(false);
        setSelectedType(null);
        setMessage("");
      }, 2000);
    },
  });

  const handleSubmit = () => {
    if (!selectedType || !message.trim()) return;
    mutation.mutate({ type: selectedType, message: message.trim(), page: window.location.pathname, appVersion: getVersionString() });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        data-testid="button-feedback-open"
        className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
      >
        <MessageCircle className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 w-80 bg-background border rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200" data-testid="feedback-panel">
      <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
        <span className="font-semibold text-sm">Trimite-ne un mesaj</span>
        <button onClick={() => { setOpen(false); setSent(false); setSelectedType(null); setMessage(""); }} data-testid="button-feedback-close">
          <X className="w-4 h-4" />
        </button>
      </div>

      {sent ? (
        <div className="p-8 flex flex-col items-center gap-3 text-center">
          <CheckCircle className="w-10 h-10 text-green-500" />
          <p className="font-semibold">Mulțumim!</p>
          <p className="text-sm text-muted-foreground">Feedback-ul tău a fost trimis.</p>
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
                    "flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all",
                    isActive ? ft.activeColor : ft.bgColor,
                    "hover:scale-105"
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
                placeholder="Scrie mesajul tău aici..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[80px] resize-none text-sm"
                data-testid="input-feedback-message"
              />
              <Button
                onClick={handleSubmit}
                disabled={!message.trim() || mutation.isPending}
                className="w-full gap-2"
                size="sm"
                data-testid="button-feedback-submit"
              >
                <Send className="w-3.5 h-3.5" />
                {mutation.isPending ? "Se trimite..." : "Trimite"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
