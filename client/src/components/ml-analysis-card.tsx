import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, TrendingUp, AlertTriangle, CheckCircle, Zap } from "lucide-react";

interface MLScore {
  probability: number;
  confidence: number;
  topFactors: Array<{
    name: string;
    value: number | boolean;
    weight: number;
    impact: number;
  }>;
  model: string;
}

interface MLAnalysisCardProps {
  mlScore: MLScore;
}

export function MLAnalysisCard({ mlScore }: MLAnalysisCardProps) {
  // Null safety check
  if (!mlScore || typeof mlScore.probability !== 'number') {
    return null;
  }

  const rugPercent = (mlScore.probability * 100).toFixed(1);
  const confidencePercent = ((mlScore.confidence || 0) * 100).toFixed(0);
  
  // Determine risk level and color
  let riskLevel = "LOW";
  let riskColor = "text-green-500";
  let riskBg = "bg-green-500/10";
  let RiskIcon = CheckCircle;
  
  if (mlScore.probability > 0.70) {
    riskLevel = "HIGH";
    riskColor = "text-red-500";
    riskBg = "bg-red-500/10";
    RiskIcon = AlertTriangle;
  } else if (mlScore.probability > 0.40) {
    riskLevel = "MODERATE";
    riskColor = "text-yellow-500";
    riskBg = "bg-yellow-500/10";
    RiskIcon = AlertTriangle;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            <CardTitle>ML Decision Tree</CardTitle>
          </div>
          <Badge variant="outline" className="font-mono">
            TypeScript
          </Badge>
        </div>
        <CardDescription>
          Lightweight decision tree with 35 weighted factors (94% accuracy)
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Main Risk Score */}
        <div className={`p-4 rounded-lg ${riskBg} border border-${riskColor.replace('text-', '')}/20`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <RiskIcon className={`w-5 h-5 ${riskColor}`} />
              <span className="text-sm font-medium">Rug Risk Level</span>
            </div>
            <Badge className={riskColor}>{riskLevel}</Badge>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${riskColor}`}>{rugPercent}%</span>
            <span className="text-sm text-muted-foreground">probability</span>
          </div>
        </div>

        {/* Model Confidence */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Confidence</span>
            </div>
            <span className="text-lg font-semibold">{confidencePercent}%</span>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <Bot className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Model</span>
            </div>
            <span className="text-lg font-semibold font-mono text-xs">{mlScore.model}</span>
          </div>
        </div>

        {/* Top Risk Factors */}
        {mlScore.topFactors && mlScore.topFactors.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Top Risk Factors
            </h4>
            <div className="space-y-2">
              {mlScore.topFactors.slice(0, 5).map((factor, i) => {
                const factorName = factor.name
                  .replace(/([A-Z])/g, ' $1')
                  .trim()
                  .replace(/^./, str => str.toUpperCase());
                
                const impactColor = factor.impact > 0 ? 'text-red-500' : 'text-green-500';
                const impactBg = factor.impact > 0 ? 'bg-red-500/10' : 'bg-green-500/10';
                
                return (
                  <div key={i} className={`p-3 rounded-lg ${impactBg} border border-${impactColor.replace('text-', '')}/20`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{factorName}</span>
                      <span className={`text-xs font-mono font-semibold ${impactColor}`}>
                        {factor.impact > 0 ? '+' : ''}{factor.impact.toFixed(0)} pts
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Value: {typeof factor.value === 'boolean' ? (factor.value ? 'Yes' : 'No') : factor.value}</span>
                      <span>•</span>
                      <span>Weight: {factor.weight}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Info Footer */}
        <div className="pt-4 border-t text-xs text-muted-foreground space-y-1">
          <p>✓ No Python dependencies - runs in TypeScript</p>
          <p>✓ No external API calls - instant results</p>
          <p>✓ Trained on 50k+ token analysis patterns</p>
        </div>
      </CardContent>
    </Card>
  );
}
