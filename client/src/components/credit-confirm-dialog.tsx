import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useQuery } from "@tanstack/react-query";
import { Coins, Loader2 } from "lucide-react";

interface CreditConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  actionLabel: string;
  creditCost: number;
  isPending?: boolean;
}

export function CreditConfirmDialog({ open, onOpenChange, onConfirm, actionLabel, creditCost, isPending }: CreditConfirmDialogProps) {
  const { data: balance } = useQuery<{ creditBalance: number }>({
    queryKey: ["/api/credits/balance"],
    enabled: open,
  });

  const currentBalance = balance?.creditBalance ?? 0;
  const hasEnough = currentBalance >= creditCost;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="dialog-credit-confirm">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-[hsl(48,100%,45%)]" />
            Confirmare utilizare credite
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-2">
              <p>{actionLabel} va consuma <strong>{creditCost} {creditCost === 1 ? "credit" : "credite"}</strong>.</p>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm">
                <span className="text-muted-foreground">Sold curent:</span>
                <span className={`font-semibold ${hasEnough ? "text-foreground" : "text-red-600"}`} data-testid="text-confirm-balance">
                  {currentBalance} credite
                </span>
              </div>
              {!hasEnough && (
                <p className="text-sm text-red-600">
                  Sold insuficient. Ai nevoie de încă {creditCost - currentBalance} credite.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-credit-cancel">Anulează</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={!hasEnough || isPending}
            data-testid="button-credit-confirm"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Continuă ({creditCost} cr)
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
