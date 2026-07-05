import { FundingCallsManager } from "@/components/funding-calls-manager";
import { FileText } from "lucide-react";

export default function CallsManagementPage() {
  return (
    <div className="p-4 sm:p-6 w-full space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-calls-management-title">Apeluri & Indexare</h1>
          <p className="text-sm text-muted-foreground">Gestionează apelurile de finanțare, ghiduri și indexare AI</p>
        </div>
      </div>
      <FundingCallsManager />
    </div>
  );
}
