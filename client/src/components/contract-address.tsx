import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { CONTRACT_ADDRESS } from "@/constants";

interface ContractAddressProps {
  className?: string;
  showLabel?: boolean;
}

export function ContractAddress({ className = "", showLabel = true }: ContractAddressProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const CA = CONTRACT_ADDRESS;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(CA);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Contract address copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy manually",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className={className} data-testid="card-contract-address">
      <CardContent className="p-4">
        <div className="space-y-2">
          {showLabel && (
            <div className="text-sm font-semibold text-muted-foreground">
              Official Contract Address
            </div>
          )}
          <div className="flex items-center gap-2">
            <code 
              className="flex-1 text-sm font-mono bg-muted px-3 py-2 rounded break-all"
              data-testid="text-contract-address"
            >
              {CA}
            </code>
            <Button
              size="icon"
              variant="outline"
              onClick={copyToClipboard}
              data-testid="button-copy-ca"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
