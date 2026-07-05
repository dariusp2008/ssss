import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { X, Star, ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SurveyConfig, SurveyQuestion } from "@shared/micro-survey-triggers";

interface MicroSurveyProps {
  config: SurveyConfig;
  onSubmit: (payload: { responseData: Record<string, unknown>; rating?: number; message?: string }) => void;
  onDismiss: () => void;
  isSubmitting?: boolean;
}

export function MicroSurvey({ config, onSubmit, onDismiss, isSubmitting }: MicroSurveyProps) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  const visibleQuestions = useMemo(() => {
    return config.questions.filter((q) => {
      if (!q.showWhen) return true;
      return answers[q.showWhen.questionId] === q.showWhen.equals;
    });
  }, [config.questions, answers]);

  const canSubmit = useMemo(() => {
    return visibleQuestions.every((q) => {
      if (!q.required) return true;
      const v = answers[q.id];
      if (v === undefined || v === null || v === "") return false;
      if (Array.isArray(v) && v.length === 0) return false;
      return true;
    });
  }, [visibleQuestions, answers]);

  const setAnswer = (id: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = () => {
    if (!canSubmit || isSubmitting) return;
    const responseData: Record<string, unknown> = {};
    let rating: number | undefined;
    let message: string | undefined;
    for (const q of visibleQuestions) {
      const v = answers[q.id];
      if (v === undefined || v === null || v === "") continue;
      responseData[q.id] = v;
      if (q.kind === "rating5" && typeof v === "number") rating = v;
      if (q.kind === "shortText" && typeof v === "string") message = v;
    }
    onSubmit({ responseData, rating, message });
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] sm:w-[420px] max-w-[420px] animate-in slide-in-from-bottom-4 fade-in duration-300"
      data-testid="micro-survey"
      role="dialog"
      aria-label={config.title}
    >
      <Card className="shadow-2xl border-2 border-blue-200 dark:border-blue-900 bg-white dark:bg-gray-900">
        <CardHeader className="pb-3 relative">
          <button
            type="button"
            onClick={onDismiss}
            className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Închide sondajul"
            data-testid="button-survey-dismiss"
          >
            <X className="h-4 w-4" />
          </button>
          <CardTitle className="text-base pr-8">{config.title}</CardTitle>
          {config.subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{config.subtitle}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto">
          {visibleQuestions.map((q) => (
            <QuestionField
              key={q.id}
              question={q}
              value={answers[q.id]}
              onChange={(v) => setAnswer(q.id, v)}
            />
          ))}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              disabled={isSubmitting}
              data-testid="button-survey-skip"
            >
              Mai târziu
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1"
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              data-testid="button-survey-submit"
            >
              {isSubmitting ? "Se trimite..." : "Trimite feedback"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function QuestionField({ question, value, onChange }: { question: SurveyQuestion; value: unknown; onChange: (v: unknown) => void }) {
  const id = `q-${question.id}`;
  if (question.kind === "rating5") {
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{question.label}{question.required ? " *" : ""}</Label>
        <div className="flex gap-1" id={id} data-testid={`field-${question.id}`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={cn(
                "p-2 rounded-md transition-colors hover:bg-muted",
                value === n ? "text-yellow-500" : "text-muted-foreground"
              )}
              aria-label={`${n} stele`}
              data-testid={`button-rating-${n}`}
            >
              <Star className={cn("h-5 w-5", typeof value === "number" && value >= n ? "fill-yellow-400 text-yellow-500" : "")} />
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (question.kind === "yesNoPartial") {
    const opts: { v: string; label: string }[] = [
      { v: "yes", label: "Da" },
      { v: "partial", label: "Parțial" },
      { v: "no", label: "Nu" },
    ];
    return (
      <div className="space-y-2">
        <Label>{question.label}{question.required ? " *" : ""}</Label>
        <div className="flex gap-2" data-testid={`field-${question.id}`}>
          {opts.map((o) => (
            <Button
              key={o.v}
              type="button"
              variant={value === o.v ? "default" : "outline"}
              size="sm"
              onClick={() => onChange(o.v)}
              data-testid={`button-${question.id}-${o.v}`}
            >
              {o.label}
            </Button>
          ))}
        </div>
      </div>
    );
  }
  if (question.kind === "thumbs") {
    return (
      <div className="space-y-2">
        <Label>{question.label}{question.required ? " *" : ""}</Label>
        <div className="flex gap-3" data-testid={`field-${question.id}`}>
          <Button
            type="button"
            variant={value === "up" ? "default" : "outline"}
            size="sm"
            onClick={() => onChange("up")}
            data-testid={`button-${question.id}-up`}
          >
            <ThumbsUp className="h-4 w-4 mr-1" /> Da
          </Button>
          <Button
            type="button"
            variant={value === "down" ? "default" : "outline"}
            size="sm"
            onClick={() => onChange("down")}
            data-testid={`button-${question.id}-down`}
          >
            <ThumbsDown className="h-4 w-4 mr-1" /> Nu
          </Button>
        </div>
      </div>
    );
  }
  if (question.kind === "multiSelect") {
    const arr: string[] = Array.isArray(value) ? value : [];
    const toggle = (v: string) => {
      onChange(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
    };
    return (
      <div className="space-y-2">
        <Label>{question.label}{question.required ? " *" : ""}</Label>
        <div className="grid grid-cols-1 gap-1.5" data-testid={`field-${question.id}`}>
          {(question.options || []).map((o) => {
            const checked = arr.includes(o.value);
            return (
              <label key={o.value} className="flex items-center gap-2 cursor-pointer text-sm py-1">
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggle(o.value)}
                  data-testid={`checkbox-${question.id}-${o.value}`}
                />
                <span>{o.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  }
  if (question.kind === "shortText") {
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{question.label}{question.required ? " *" : ""}</Label>
        <Textarea
          id={id}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          maxLength={question.maxLength || 500}
          rows={3}
          data-testid={`textarea-${question.id}`}
        />
      </div>
    );
  }
  return null;
}
