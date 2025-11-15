import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiTelegram, SiDiscord } from "react-icons/si";
import { Zap, Shield, TrendingUp } from "lucide-react";

export function BotShowcase() {
  return (
    <section className="py-20 bg-muted/30" data-testid="section-bot-showcase">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <Badge className="mb-4" data-testid="badge-premium-feature">Premium Feature</Badge>
          <h2 className="text-4xl font-bold mb-4">Telegram & Discord Bots</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get instant token analysis directly in your favorite messaging app. 
            No need to leave Discord or Telegram to check for rug pulls.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <Card className="border-2" data-testid="card-telegram-bot">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <SiTelegram className="h-8 w-8 text-[#0088cc]" />
                  <CardTitle className="text-2xl">Telegram Bot</CardTitle>
                </div>
              </div>
              <CardDescription>
                Fast, private token analysis in your Telegram DMs or groups
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Zap className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">/execute [token]</p>
                    <p className="text-sm text-muted-foreground">Full risk analysis with scores, holder data, and alerts</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">/first20 [token]</p>
                    <p className="text-sm text-muted-foreground">Top 20 holder concentration analysis</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">/devtorture [wallet]</p>
                    <p className="text-sm text-muted-foreground">Developer wallet history and pattern detection</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  className="flex-1" 
                  variant="default"
                  onClick={() => window.open('https://t.me/RugKillerAlphaBot', '_blank')}
                  data-testid="button-telegram-join"
                >
                  <SiTelegram className="h-4 w-4 mr-2" />
                  Join Bot
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/bot-guide'}
                  data-testid="button-telegram-guide"
                >
                  Guide
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2" data-testid="card-discord-bot">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <SiDiscord className="h-8 w-8 text-[#5865F2]" />
                  <CardTitle className="text-2xl">Discord Bot</CardTitle>
                </div>
              </div>
              <CardDescription>
                Rich embeds and slash commands for your Discord server
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Zap className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">/execute [token]</p>
                    <p className="text-sm text-muted-foreground">Beautiful embeds with color-coded risk levels</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">/blacklist [wallet]</p>
                    <p className="text-sm text-muted-foreground">Check if wallet is flagged for scams or rugs</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Real-time alerts</p>
                    <p className="text-sm text-muted-foreground">Auto-scan new tokens in your server channels</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  className="flex-1" 
                  variant="default"
                  onClick={() => window.open('https://discord.gg/rugkiller', '_blank')}
                  data-testid="button-discord-join"
                >
                  <SiDiscord className="h-4 w-4 mr-2" />
                  Join Bot
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/bot-guide'}
                  data-testid="button-discord-guide"
                >
                  Guide
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <Card className="max-w-2xl mx-auto" data-testid="card-bot-access">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-4">
                <strong>Bot access included with:</strong> PRO and GROUP subscriptions, or hold 10M+ $ANTIRUG tokens for free access
              </p>
              <div className="flex gap-3 justify-center">
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/pricing'}
                  data-testid="button-view-pricing"
                >
                  View Pricing Plans
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
