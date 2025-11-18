import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Copy, Download, AlertCircle, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/header-new";
import { Footer } from "@/components/footer";

interface VanityEstimate {
  difficulty: number;
  estimatedAttempts: string;
  estimatedTime: string;
}

interface VanityResult {
  publicKey: string;
  secretKey: string;
  attempts: number;
  timeMs: number;
}

export default function VanityGenerator() {
  const { toast } = useToast();
  const [pattern, setPattern] = useState("KILL");
  const [matchType, setMatchType] = useState<"prefix" | "suffix" | "contains">("suffix");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [estimate, setEstimate] = useState<VanityEstimate | null>(null);
  const [result, setResult] = useState<VanityResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);

  const handleEstimate = async () => {
    if (!pattern.trim()) {
      toast({
        title: "Error",
        description: "Please enter a pattern",
        variant: "destructive",
      });
      return;
    }

    setIsEstimating(true);
    try {
      const response = await apiRequest("POST", "/api/vanity/estimate", {
        pattern: pattern.trim(),
        matchType,
      });
      const data = await response.json() as VanityEstimate;
      setEstimate(data);
    } catch (error) {
      toast({
        title: "Estimation Failed",
        description: error instanceof Error ? error.message : "Failed to estimate difficulty",
        variant: "destructive",
      });
    } finally {
      setIsEstimating(false);
    }
  };

  const handleGenerate = async () => {
    if (!pattern.trim()) {
      toast({
        title: "Error",
        description: "Please enter a pattern",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      const response = await apiRequest("POST", "/api/vanity/generate", {
        pattern: pattern.trim(),
        matchType,
        caseSensitive,
        maxAttempts: 10_000_000,
      });
      const data = await response.json() as VanityResult;
      setResult(data);
      toast({
        title: "Success!",
        description: `Found matching address in ${data.attempts.toLocaleString()} attempts (${(data.timeMs / 1000).toFixed(2)}s)`,
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate vanity address",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const downloadKeypair = () => {
    if (!result) return;

    const data = {
      publicKey: result.publicKey,
      secretKey: result.secretKey,
      generatedAt: new Date().toISOString(),
      pattern,
      matchType,
      attempts: result.attempts,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vanity-keypair-${result.publicKey}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Keypair saved to file",
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-primary" />
              Vanity Address Generator
            </h1>
            <p className="text-muted-foreground">
              Generate a custom Solana address with your desired pattern
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>
                Choose your pattern and matching type. Shorter patterns are faster to find.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="pattern">Pattern</Label>
                <Input
                  id="pattern"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  placeholder="KILL"
                  maxLength={10}
                  data-testid="input-vanity-pattern"
                />
                <p className="text-xs text-muted-foreground">
                  Max 10 characters. Longer patterns take exponentially longer to find.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Match Type</Label>
                <RadioGroup value={matchType} onValueChange={(v) => setMatchType(v as any)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="prefix" id="prefix" data-testid="radio-prefix" />
                    <Label htmlFor="prefix" className="font-normal cursor-pointer">
                      Prefix (starts with pattern)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="suffix" id="suffix" data-testid="radio-suffix" />
                    <Label htmlFor="suffix" className="font-normal cursor-pointer">
                      Suffix (ends with pattern)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="contains" id="contains" data-testid="radio-contains" />
                    <Label htmlFor="contains" className="font-normal cursor-pointer">
                      Contains (pattern anywhere)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="caseSensitive"
                  checked={caseSensitive}
                  onChange={(e) => setCaseSensitive(e.target.checked)}
                  className="rounded"
                  data-testid="checkbox-case-sensitive"
                />
                <Label htmlFor="caseSensitive" className="font-normal cursor-pointer">
                  Case sensitive
                </Label>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleEstimate}
                  disabled={isEstimating || isGenerating}
                  variant="outline"
                  data-testid="button-estimate"
                >
                  {isEstimating ? "Estimating..." : "Estimate Difficulty"}
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  data-testid="button-generate"
                >
                  {isGenerating ? "Generating..." : "Generate Address"}
                </Button>
              </div>

              {isGenerating && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Generating vanity address... This may take a while.
                  </p>
                  <Progress value={undefined} className="w-full" />
                </div>
              )}
            </CardContent>
          </Card>

          {estimate && !isGenerating && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-semibold">Difficulty Estimate:</p>
                  <p className="text-sm">
                    Expected attempts: <span className="font-mono">{estimate.estimatedAttempts}</span>
                  </p>
                  <p className="text-sm">
                    Estimated time: <span className="font-mono">{estimate.estimatedTime}</span>
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {result && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="text-primary">Address Generated!</CardTitle>
                <CardDescription>
                  Found in {result.attempts.toLocaleString()} attempts ({(result.timeMs / 1000).toFixed(2)}s)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Public Key (Address)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={result.publicKey}
                      readOnly
                      className="font-mono text-sm"
                      data-testid="text-public-key"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(result.publicKey, "Public key")}
                      data-testid="button-copy-public"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Secret Key (Private Key)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={result.secretKey}
                      readOnly
                      type="password"
                      className="font-mono text-sm"
                      data-testid="text-secret-key"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(result.secretKey, "Secret key")}
                      data-testid="button-copy-secret"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-destructive">
                    ⚠️ Keep this secret key safe! Anyone with this key controls the address.
                  </p>
                </div>

                <Button
                  onClick={downloadKeypair}
                  variant="outline"
                  className="w-full"
                  data-testid="button-download-keypair"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Keypair JSON
                </Button>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <p className="font-semibold mb-1">Next Steps:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Save the secret key securely (download JSON or copy to safe storage)</li>
                      <li>Use this keypair to create your SPL token with Solana CLI</li>
                      <li>Never share your secret key with anyone</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </div>
        {/* Close page container */}
        </div>
      </main>
      <Footer />
    </div>
  );
}
