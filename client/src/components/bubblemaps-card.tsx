import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BubbleMapsCardProps {
  tokenAddress: string;
}

export function BubbleMapsCard({ tokenAddress }: BubbleMapsCardProps) {
  const bubbleMapsUrl = `https://app.bubblemaps.io/sol/token/${tokenAddress}`;
  const embedUrl = `${bubbleMapsUrl}?embed=true`;

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
      <CardContent className="p-0">
        <div className="relative w-full aspect-[16/10] bg-muted">
          <iframe
            src={embedUrl}
            className="absolute inset-0 w-full h-full border-0"
            title="BubbleMaps Token Visualization"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            data-testid="iframe-bubblemaps"
          />
        </div>
      </CardContent>
    </Card>
  );
}
