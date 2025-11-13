import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Users, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BubbleMapsCardProps {
  tokenAddress: string;
}

export function BubbleMapsCard({ tokenAddress }: BubbleMapsCardProps) {
  const holderTools = [
    {
      name: "Whale Hunter",
      url: `https://whalehunter.site/?token=${tokenAddress}`,
      description: "Real-time bubble visualization with physics",
      icon: Activity,
      badge: "Interactive",
      testId: "button-whale-hunter"
    },
    {
      name: "SolScan Holders",
      url: `https://solscan.io/token/${tokenAddress}#holders`,
      description: "Complete holder list with rankings",
      icon: Users,
      badge: "Explorer",
      testId: "button-solscan"
    },
    {
      name: "DEX Screener",
      url: `https://dexscreener.com/solana/${tokenAddress}`,
      description: "Charts + integrated BubbleMaps",
      icon: ExternalLink,
      badge: "Charts",
      testId: "button-dexscreener"
    }
  ];

  return (
    <Card data-testid="card-holder-visualization">
      <CardHeader className="space-y-1 pb-3">
        <CardTitle className="text-base font-medium">Holder Visualization</CardTitle>
        <CardDescription className="text-xs">
          Explore holder distribution with free analysis tools
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {holderTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Button
                key={tool.name}
                variant="outline"
                className="w-full justify-start"
                asChild
                data-testid={tool.testId}
              >
                <a href={tool.url} target="_blank" rel="noopener noreferrer">
                  <div className="flex items-center gap-3 w-full">
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{tool.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {tool.badge}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {tool.description}
                      </p>
                    </div>
                    <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-50" />
                  </div>
                </a>
              </Button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          All tools open in new tabs and are free to use
        </p>
      </CardContent>
    </Card>
  );
}
