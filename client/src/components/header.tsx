import { Shield, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onNewAnalysis?: () => void;
}

export function Header({ onNewAnalysis }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-6 flex h-14 items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">Solana Rug Detector</span>
        </div>
        
        {onNewAnalysis && (
          <Button 
            onClick={onNewAnalysis}
            size="sm"
            data-testid="button-new-analysis"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Analysis
          </Button>
        )}
      </div>
    </header>
  );
}
