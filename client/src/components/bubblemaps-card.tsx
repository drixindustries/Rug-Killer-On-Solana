import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BubbleMapsCardProps {
  tokenAddress: string;
}

export function BubbleMapsCard({ tokenAddress }: BubbleMapsCardProps) {
  const bubbleMapsUrl = `https://bubblemaps.io/sol/token/${tokenAddress}`;

  return (
    <Card data-testid="card-bubblemaps">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-medium">BubbleMaps Visualization</CardTitle>
          <CardDescription className="text-xs">
            Visual holder distribution and wallet connections
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          asChild
          data-testid="button-bubblemaps-open"
        >
          <a href={bubbleMapsUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
          <div className="text-sm text-muted-foreground">
            BubbleMaps provides interactive visual holder distribution maps
          </div>
          <Button
            variant="default"
            asChild
            data-testid="button-view-bubblemaps"
          >
            <a href={bubbleMapsUrl} target="_blank" rel="noopener noreferrer">
              View on BubbleMaps
              <ExternalLink className="h-4 w-4 ml-2" />
            </a>
          </Button>
          <div className="text-xs text-muted-foreground">
            Opens in new tab with full interactive visualization
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
