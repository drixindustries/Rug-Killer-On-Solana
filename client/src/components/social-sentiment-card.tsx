import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { SocialSentimentData } from "@shared/schema";
import { 
  TrendingUp, 
  TrendingDown, 
  MessageCircle, 
  AlertTriangle,
  Twitter,
  Hash,
  Radio,
  Flame,
  Activity
} from "lucide-react";

interface SocialSentimentCardProps {
  sentiment?: SocialSentimentData;
}

export function SocialSentimentCard({ sentiment }: SocialSentimentCardProps) {
  if (!sentiment) {
    return (
      <Card className="bg-black/40 border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-400" />
            Social Sentiment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-400 text-sm">
            Social sentiment analysis not available for this token.
          </div>
        </CardContent>
      </Card>
    );
  }

  const { 
    hypeScore, 
    sentimentScore, 
    sentimentLabel, 
    confidence,
    mentionVolume,
    engagementVelocity,
    positiveRatio,
    negativeRatio,
    neutralRatio,
    platforms,
    signals,
    fusedRugProbability,
    model,
    dataFreshness
  } = sentiment;

  // Hype score color
  const getHypeColor = (score: number) => {
    if (score >= 70) return "text-green-400";
    if (score <= 30) return "text-red-400";
    return "text-yellow-400";
  };

  // Sentiment label badge
  const getSentimentBadge = (label: string) => {
    switch (label) {
      case 'BULLISH':
        return <Badge className="bg-green-600/30 text-green-400 border-green-600/50">🟢 BULLISH</Badge>;
      case 'BEARISH':
        return <Badge className="bg-red-600/30 text-red-400 border-red-600/50">🔴 BEARISH</Badge>;
      case 'MIXED':
        return <Badge className="bg-yellow-600/30 text-yellow-400 border-yellow-600/50">🟡 MIXED</Badge>;
      default:
        return <Badge className="bg-gray-600/30 text-gray-400 border-gray-600/50">⚪ NEUTRAL</Badge>;
    }
  };

  // Data freshness badge
  const getFreshnessBadge = (freshness: string) => {
    switch (freshness) {
      case 'LIVE':
        return <Badge className="bg-green-600/20 text-green-400 text-xs">🟢 LIVE</Badge>;
      case 'CACHED':
        return <Badge className="bg-yellow-600/20 text-yellow-400 text-xs">🟡 CACHED</Badge>;
      default:
        return <Badge className="bg-red-600/20 text-red-400 text-xs">🔴 STALE</Badge>;
    }
  };

  return (
    <Card className="bg-black/40 border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-400" />
            Social Sentiment
          </CardTitle>
          <div className="flex items-center gap-2">
            {getFreshnessBadge(dataFreshness)}
            {getSentimentBadge(sentimentLabel)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hype Score Meter */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400 flex items-center gap-1">
              <Flame className="h-4 w-4 text-orange-400" />
              Hype Score
            </span>
            <span className={`text-2xl font-bold ${getHypeColor(hypeScore)}`}>
              {hypeScore}/100
            </span>
          </div>
          <Progress 
            value={hypeScore} 
            className="h-3 bg-gray-800"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>📉 Bearish (&lt;30)</span>
            <span>⚖️ Neutral (30-70)</span>
            <span>🔥 Bullish (&gt;70)</span>
          </div>
        </div>

        {/* Sentiment Score & Confidence */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-900/50 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">Sentiment Polarity</div>
            <div className={`text-xl font-bold ${sentimentScore >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {sentimentScore >= 0 ? '+' : ''}{(sentimentScore * 100).toFixed(0)}%
            </div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">Model Confidence</div>
            <div className="text-xl font-bold text-blue-400">
              {(confidence * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Mention Volume */}
        {mentionVolume && (
          <div className="bg-gray-900/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-gray-400">Mention Volume</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-white">{mentionVolume.total}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
              <div>
                <div className="text-lg font-bold text-white">{mentionVolume.hourly}</div>
                <div className="text-xs text-gray-500">/hour</div>
              </div>
              <div>
                <div className="text-lg font-bold text-white">{mentionVolume.daily}</div>
                <div className="text-xs text-gray-500">/day</div>
              </div>
              <div>
                <div className={`text-lg font-bold ${mentionVolume.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {mentionVolume.change24h >= 0 ? '+' : ''}{mentionVolume.change24h.toFixed(0)}%
                </div>
                <div className="text-xs text-gray-500">24h Δ</div>
              </div>
            </div>
          </div>
        )}

        {/* Sentiment Breakdown */}
        <div className="space-y-2">
          <div className="text-sm text-gray-400">Sentiment Breakdown</div>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm text-green-400">{positiveRatio.toFixed(0)}% +</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-500"></div>
              <span className="text-sm text-gray-400">{neutralRatio.toFixed(0)}% ○</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm text-red-400">{negativeRatio.toFixed(0)}% -</span>
            </div>
          </div>
          <div className="h-2 flex rounded-full overflow-hidden">
            <div className="bg-green-500" style={{ width: `${positiveRatio}%` }}></div>
            <div className="bg-gray-500" style={{ width: `${neutralRatio}%` }}></div>
            <div className="bg-red-500" style={{ width: `${negativeRatio}%` }}></div>
          </div>
        </div>

        {/* Platform Breakdown */}
        {platforms && (
          <div className="space-y-2">
            <div className="text-sm text-gray-400">Platform Activity</div>
            <div className="grid grid-cols-3 gap-2">
              {platforms.twitter && (
                <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                  <Twitter className="h-4 w-4 text-blue-400 mx-auto mb-1" />
                  <div className="text-sm font-bold text-white">{platforms.twitter.mentions}</div>
                  <div className="text-xs text-gray-500">X/Twitter</div>
                  {platforms.twitter.trending && (
                    <Badge className="bg-blue-600/20 text-blue-400 text-xs mt-1">🔥 Trending</Badge>
                  )}
                </div>
              )}
              {platforms.telegram && (
                <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                  <Radio className="h-4 w-4 text-blue-300 mx-auto mb-1" />
                  <div className="text-sm font-bold text-white">{platforms.telegram.mentions}</div>
                  <div className="text-xs text-gray-500">Telegram</div>
                  {platforms.telegram.alphaCallCount > 0 && (
                    <Badge className="bg-purple-600/20 text-purple-400 text-xs mt-1">
                      {platforms.telegram.alphaCallCount} Alpha
                    </Badge>
                  )}
                </div>
              )}
              {platforms.discord && (
                <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                  <Hash className="h-4 w-4 text-indigo-400 mx-auto mb-1" />
                  <div className="text-sm font-bold text-white">{platforms.discord.mentions}</div>
                  <div className="text-xs text-gray-500">Discord</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Risk Signals */}
        {signals && (
          <div className="space-y-2">
            <div className="text-sm text-gray-400 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              Risk Signals
            </div>
            <div className="flex flex-wrap gap-2">
              {signals.coordinatedHype && (
                <Badge className="bg-red-600/20 text-red-400 border-red-600/30">
                  🚨 Coordinated Hype
                </Badge>
              )}
              {signals.sentimentDrop && (
                <Badge className="bg-orange-600/20 text-orange-400 border-orange-600/30">
                  📉 Sentiment Drop
                </Badge>
              )}
              {signals.fakeEngagement && (
                <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30">
                  🤖 Fake Engagement
                </Badge>
              )}
              {signals.influencerPump && (
                <Badge className="bg-purple-600/20 text-purple-400 border-purple-600/30">
                  📢 Influencer Pump
                </Badge>
              )}
              {signals.rugKeywords && (
                <Badge className="bg-red-600/20 text-red-400 border-red-600/30">
                  ⚠️ Rug Keywords
                </Badge>
              )}
              {!signals.coordinatedHype && !signals.sentimentDrop && !signals.fakeEngagement && !signals.influencerPump && !signals.rugKeywords && (
                <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                  ✅ No Risk Signals
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Fused TGN + FinBERT Probability */}
        {fusedRugProbability !== undefined && (
          <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg p-3 border border-purple-600/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-purple-300 font-medium">TGN + FinBERT Fusion</div>
                <div className="text-xs text-gray-400 mt-1">
                  Combined on-chain + social rug probability
                </div>
              </div>
              <div className={`text-2xl font-bold ${
                fusedRugProbability > 0.7 ? 'text-red-400' : 
                fusedRugProbability > 0.4 ? 'text-yellow-400' : 
                'text-green-400'
              }`}>
                {fusedRugProbability > 0.7 ? '🚨' : fusedRugProbability > 0.4 ? '⚠️' : '✅'}
                {(fusedRugProbability * 100).toFixed(1)}%
              </div>
            </div>
            <Progress 
              value={fusedRugProbability * 100} 
              className="h-2 mt-2 bg-gray-800"
            />
          </div>
        )}

        {/* Model Info */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-800">
          <span>Model: {model}</span>
          <span>Engagement: {engagementVelocity?.toFixed(0) || 0}/hr</span>
        </div>
      </CardContent>
    </Card>
  );
}
