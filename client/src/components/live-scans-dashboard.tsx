import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Fish,
  Flame,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Filter
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface LiveScan {
  id: number;
  tokenAddress: string;
  symbol: string;
  name: string | null;
  riskScore: number;
  riskLevel: string;
  grade: string;
  whaleCount: number;
  bundleScore: number | null;
  honeypotDetected: boolean;
  insight: string | null;
  scannedAt: string;
  source: string;
}

interface LiveScanStats {
  totalScans: number;
  avgRiskScore: number;
  honeypotCount: number;
  whaleDetectedCount: number;
}

export function LiveScansDashboard() {
  const [scans, setScans] = useState<LiveScan[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "safe" | "risky" | "honeypot">("all");
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch initial scan history
  const { data: historyData, refetch } = useQuery<{ scans: LiveScan[] }>({
    queryKey: ["/api/scan-history"],
    staleTime: 60 * 1000, // 1 minute fresh
    refetchInterval: 60 * 1000, // Refetch every 1 minute (reduced from 30s)
  });

  // Fetch scan stats
  const { data: stats } = useQuery<LiveScanStats>({
    queryKey: ["/api/scan-stats"],
    staleTime: 2 * 60 * 1000, // 2 minutes fresh
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes (reduced from 1 min)
  });

  // WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/live-scans`;

    const connect = () => {
      try {
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('[LiveScans] WebSocket connected');
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            if (message.type === 'scan_complete') {
              // Add new scan to the top of the list
              setScans(prev => {
                const newScan: LiveScan = {
                  id: Date.now(),
                  tokenAddress: message.data.tokenAddress,
                  symbol: message.data.symbol,
                  name: message.data.name,
                  riskScore: message.data.riskScore,
                  riskLevel: message.data.riskLevel,
                  grade: message.data.grade,
                  whaleCount: message.data.whaleCount,
                  bundleScore: message.data.bundleScore,
                  honeypotDetected: message.data.honeypotDetected,
                  insight: message.data.insight,
                  scannedAt: new Date().toISOString(),
                  source: 'pumpfun',
                };
                return [newScan, ...prev].slice(0, 100); // Keep last 100
              });
            }
          } catch (error) {
            console.error('[LiveScans] Error parsing message:', error);
          }
        };

        ws.onclose = () => {
          console.log('[LiveScans] WebSocket disconnected');
          setIsConnected(false);
          // Reconnect after 5 seconds
          setTimeout(connect, 5000);
        };

        ws.onerror = (error) => {
          console.error('[LiveScans] WebSocket error:', error);
          setIsConnected(false);
        };

        wsRef.current = ws;
      } catch (error) {
        console.error('[LiveScans] Failed to connect:', error);
        setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Initialize scans from history
  useEffect(() => {
    if (historyData?.scans) {
      setScans(historyData.scans);
    }
  }, [historyData]);

  // Filter scans
  const filteredScans = scans.filter(scan => {
    // Search filter
    const matchesSearch = 
      scan.symbol.toLowerCase().includes(search.toLowerCase()) ||
      scan.tokenAddress.toLowerCase().includes(search.toLowerCase()) ||
      scan.name?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    // Grade filter
    if (filter === "safe") return scan.riskScore >= 75;
    if (filter === "risky") return scan.riskScore < 60;
    if (filter === "honeypot") return scan.honeypotDetected;

    return true;
  });

  const getGradeBadgeColor = (grade: string) => {
    switch (grade) {
      case 'Diamond': return 'bg-gradient-to-r from-blue-500 to-purple-500 text-white';
      case 'Gold': return 'bg-gradient-to-r from-yellow-500 to-orange-400 text-white';
      case 'Silver': return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white';
      case 'Bronze': return 'bg-gradient-to-r from-orange-600 to-orange-700 text-white';
      default: return 'bg-destructive text-white';
    }
  };

  const getGradeIcon = (grade: string) => {
    switch (grade) {
      case 'Diamond': return '💎';
      case 'Gold': return '🥇';
      case 'Silver': return '🥈';
      case 'Bronze': return '🥉';
      default: return '🚨';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">Live Pump.fun Scans</h2>
          <p className="text-sm text-muted-foreground">
            Real-time rug detection for all new Pump.fun launches
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "destructive"} className="gap-1">
            <Activity className="h-3 w-3" />
            {isConnected ? 'Live' : 'Disconnected'}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totalScans}</div>
              <p className="text-xs text-muted-foreground">Total Scans</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.avgRiskScore}/100</div>
              <p className="text-xs text-muted-foreground">Avg Risk Score</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-destructive">{stats.honeypotCount}</div>
              <p className="text-xs text-muted-foreground">Honeypots Detected</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-500">{stats.whaleDetectedCount}</div>
              <p className="text-xs text-muted-foreground">Whale Activity</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by symbol, name, or CA..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full sm:w-auto">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="safe" className="text-xs">Safe</TabsTrigger>
            <TabsTrigger value="risky" className="text-xs">Risky</TabsTrigger>
            <TabsTrigger value="honeypot" className="text-xs">Honeypots</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Scan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredScans.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            {search ? 'No scans match your search' : 'Waiting for new tokens...'}
          </div>
        ) : (
          filteredScans.map((scan) => (
            <Card 
              key={scan.id} 
              className={`hover:shadow-lg transition-shadow ${
                scan.honeypotDetected ? 'border-destructive' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg truncate">
                      {scan.symbol}
                    </CardTitle>
                    <CardDescription className="text-xs truncate">
                      {scan.tokenAddress.slice(0, 8)}...{scan.tokenAddress.slice(-6)}
                    </CardDescription>
                  </div>
                  <Badge className={`${getGradeBadgeColor(scan.grade)} shrink-0`}>
                    {getGradeIcon(scan.grade)} {scan.grade}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Risk Score */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Risk Score</span>
                  <Badge variant="outline" className="font-mono">
                    {scan.riskScore}/100
                  </Badge>
                </div>

                {/* Alerts */}
                {scan.honeypotDetected && (
                  <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/50 rounded text-xs text-destructive">
                    <Flame className="h-4 w-4 shrink-0" />
                    <span className="font-semibold">HONEYPOT DETECTED</span>
                  </div>
                )}

                {scan.whaleCount > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-orange-500/10 border border-orange-500/50 rounded text-xs text-orange-600 dark:text-orange-400">
                    <Fish className="h-4 w-4 shrink-0" />
                    <span>{scan.whaleCount} whale buy{scan.whaleCount > 1 ? 's' : ''} detected</span>
                  </div>
                )}

                {scan.bundleScore && scan.bundleScore >= 60 && (
                  <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/50 rounded text-xs text-yellow-600 dark:text-yellow-400">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Bundle score: {scan.bundleScore}/100</span>
                  </div>
                )}

                {/* Insight */}
                {scan.insight && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {scan.insight}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                  <span>{formatDistanceToNow(new Date(scan.scannedAt), { addSuffix: true })}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-xs"
                    onClick={() => window.open(`/?token=${scan.tokenAddress}`, '_blank')}
                  >
                    Full Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
