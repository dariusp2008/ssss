import { useEffect, useState, useRef } from "react";
import { Check, Loader2 } from "lucide-react";

interface ProgressStepperProps {
  operationId: string | null;
  steps: string[];
  isActive: boolean;
  // Apelat O SINGURĂ dată când serverul marchează operațiunea drept terminată
  // (`completed=true`, fie succes, fie eroare). Primește label-ul final ca să poată
  // distinge succes/eșec fără euristici. Opțional — backward compatible cu
  // consumatorii care fac polling separat (ex: eligibility).
  onComplete?: (finalLabel?: string) => void;
  // Apelat la FIECARE eveniment de progres (heartbeat de viață) — util pentru un
  // watchdog de „stall" în parinte. Opțional.
  onProgress?: (data: { currentStep: number; totalSteps: number; label?: string; completed: boolean }) => void;
}

export function ProgressStepper({ operationId, steps, isActive, onComplete, onProgress }: ProgressStepperProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  // Ref-uri pentru a evita re-subscribe la SSE când identitatea callback-ului se schimbă.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;
  // Garantează un singur apel onComplete per operațiune.
  const firedRef = useRef(false);

  useEffect(() => {
    if (!isActive || !operationId) {
      setCurrentStep(0);
      setCompleted(false);
      firedRef.current = false;
      return;
    }

    firedRef.current = false;
    const es = new EventSource(`/api/progress/${operationId}`, { withCredentials: true });

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "progress") {
          setCurrentStep(data.currentStep);
          setCompleted(data.completed);
          onProgressRef.current?.({
            currentStep: data.currentStep,
            totalSteps: data.totalSteps,
            label: data.label,
            completed: data.completed,
          });
          if (data.completed && !firedRef.current) {
            firedRef.current = true;
            onCompleteRef.current?.(data.label);
          }
        }
      } catch {}
    };

    es.onerror = () => {
      es.close();
    };

    eventSourceRef.current = es;

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [operationId, isActive]);

  if (!isActive) return null;

  return (
    <div className="space-y-2 p-4 bg-muted/50 rounded-lg border" data-testid="progress-stepper">
      {steps.map((label, index) => {
        const stepNum = index + 1;
        const isCompleted = currentStep > stepNum || completed;
        const isCurrent = currentStep === stepNum && !completed;
        const isPending = currentStep < stepNum && !completed;

        return (
          <div
            key={index}
            className={`flex items-center gap-3 text-sm transition-all duration-300 ${
              isPending ? "text-muted-foreground/50" : ""
            }`}
            data-testid={`progress-step-${index}`}
          >
            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
              {isCompleted ? (
                <div className="w-5 h-5 rounded-full bg-green-500/15 flex items-center justify-center">
                  <Check className="w-3 h-3 text-green-600" />
                </div>
              ) : isCurrent ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
              )}
            </div>
            <span className={`${isCurrent ? "font-medium text-foreground" : ""} ${isCompleted ? "text-muted-foreground" : ""}`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
