import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, MessageCircleHeart } from "lucide-react";

export function MascotCallout() {
  return (
    <Card className="mb-10 border-primary/30 bg-gradient-to-br from-background to-primary/5">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        <img
          src="/images/rally-mascot.png"
          alt="Rally mascot cheering"
          width={128}
          height={128}
          loading="lazy"
          className="mx-auto h-28 w-28 rounded-2xl border bg-background object-cover shadow-lg sm:mx-0"
        />

        <div className="space-y-3">
          <Badge variant="outline" className="inline-flex items-center gap-2">
            <MessageCircleHeart className="h-4 w-4 text-primary" />
            RugKiller-chan says
          </Badge>
          <p className="text-base text-muted-foreground">
            Drop me in your Discord or Telegram using the /alpha commands and I will ping the squad the second a smart wallet touches a token.
          </p>
          <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Use <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/alpha setchannel</code> to bind alerts.
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Run <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/alpha status</code> anytime to confirm I am live.
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
