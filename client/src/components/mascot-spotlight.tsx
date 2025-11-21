import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, ShieldCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type MascotHeroStats = {
  walletsGuarded: number;
  alphaPings7d: number;
  relayDestinations: number;
  discordDestinations: number;
  telegramDestinations: number;
  discordRelayPings7d: number;
  telegramRelayPings7d: number;
  avgRelayLatencyMs: number;
  maxRelayLatencyMs: number;
  running: boolean;
  lastAlertAt: string | null;
};

const compactFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const formatMetric = (value?: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  const formatted = compactFormatter.format(value);
  return value >= 1000 ? `${formatted}+` : formatted;
};

async function fetchMascotStats(): Promise<MascotHeroStats> {
  const response = await apiRequest("GET", "/api/alpha/hero-stats");
  return (await response.json()) as MascotHeroStats;
}

export function MascotSpotlight() {
  const { data: stats } = useQuery<MascotHeroStats>({
    queryKey: ["/api/alpha/hero-stats"],
    queryFn: fetchMascotStats,
    staleTime: 60_000,
  });

  const lastAlertAgo = useMemo(() => {
    if (!stats?.lastAlertAt) return null;
    try {
      return formatDistanceToNow(new Date(stats.lastAlertAt), { addSuffix: true });
    } catch {
      return null;
    }
  }, [stats?.lastAlertAt]);

  const handleScrollToAnalyzer = () => {
    const target = document.getElementById("token-input");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="rounded-3xl border bg-gradient-to-br from-background via-background/90 to-primary/5 px-6 py-8 shadow-lg sm:px-10">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center">
        <div className="space-y-5">
          <Badge variant="outline" className="inline-flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            Meet our alpha spotter
          </Badge>

          <div className="space-y-3">
            <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl">
              Say hello to RugKiller-chan, your 24/7 trench buddy.
            </h2>
            <p className="text-base text-muted-foreground sm:text-lg">
              She keeps eyes on the chain, calls out bad actors, and celebrates every legit win.
              Drop her into your flow and let her vibe-check every token before you ape.
            </p>
          </div>

          <ul className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Honeypot + blacklist alerts on every scan
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Instant signal relays to Discord + Telegram
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Wallet reputation + exit risk overlays
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Backed by the 80+ RPC balancer we ship in prod
            </li>
          </ul>

          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={handleScrollToAnalyzer}>
              Start scanning with her
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="/bot-guide">See her playbook</a>
            </Button>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 -z-10 rounded-[32px] bg-primary/20 blur-3xl" aria-hidden />
          <img
            src="/images/rug-killer-mascot.png"
            alt="Rug Killer mascot illustration"
            width={512}
            height={512}
            loading="lazy"
            className="mx-auto h-72 w-72 rounded-[32px] border bg-gradient-to-b from-secondary/10 to-background object-cover shadow-2xl sm:h-80 sm:w-80"
          />

          <div className="absolute -bottom-6 left-1/2 w-full max-w-3xl -translate-x-1/2 rounded-2xl border bg-background/95 p-5 shadow-xl">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Wallets guarded</p>
                <p className="text-2xl font-semibold leading-tight">{formatMetric(stats?.walletsGuarded)}</p>
                <p className="text-xs text-muted-foreground">
                  {stats
                    ? `${stats.discordDestinations} Discord · ${stats.telegramDestinations} Telegram`
                    : 'Syncing relay destinations...'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Alpha relays (7d)</p>
                <p className="text-2xl font-semibold leading-tight">{formatMetric(stats?.alphaPings7d)}</p>
                <p className="text-xs text-muted-foreground">
                  {stats
                    ? `${formatMetric(stats.discordRelayPings7d)} Discord · ${formatMetric(stats.telegramRelayPings7d)} Telegram`
                    : 'Estimating per-platform volume...'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Relay latency</p>
                <p className="text-2xl font-semibold leading-tight">
                  {stats ? `${Math.max(0, Math.round(stats.avgRelayLatencyMs)).toLocaleString()} ms` : '—'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {lastAlertAgo
                    ? `Last alert ${lastAlertAgo}`
                    : stats
                      ? `p95 ${Math.max(0, Math.round(stats.maxRelayLatencyMs)).toLocaleString()} ms`
                      : 'Checking live feed...'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
