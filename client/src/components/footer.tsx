import { Shield, Copy } from "lucide-react";
import { SiTelegram, SiDiscord, SiGithub } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { CONTRACT_ADDRESS } from "@/constants";

interface BotInviteLinks {
  telegram?: string;
  discord?: string;
  message?: string;
}

export function Footer() {
  const { toast } = useToast();
  const { data: botLinks } = useQuery<BotInviteLinks>({
    queryKey: ['/api/bot/invite-links'],
    retry: false,
    refetchOnWindowFocus: false,
  });

  const copyCA = () => {
    navigator.clipboard.writeText(CONTRACT_ADDRESS);
    toast({
      title: "Copied!",
      description: "Contract address copied to clipboard",
    });
  };

  return (
    <footer className="border-t bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold">Rug Killer Alpha Bot</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Protecting Solana investors from rug pulls since 2025
            </p>
            <div className="text-xs text-muted-foreground">
              <p className="font-semibold mb-1">Official Token: $ANTIRUG</p>
              <div 
                className="flex items-center gap-1 bg-muted px-2 py-1 rounded group cursor-pointer hover-elevate" 
                onClick={copyCA}
                data-testid="button-copy-ca-footer"
              >
                <code className="font-mono text-[10px] flex-1 truncate">
                  {CONTRACT_ADDRESS}
                </code>
                <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold mb-3">Resources</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/pricing" className="hover:text-foreground">Pricing</a></li>
              <li><a href="/documentation" className="hover:text-foreground">Documentation</a></li>
              <li><a href="/bot-guide" className="hover:text-foreground">Bot Guide</a></li>
              <li><a href="/about" className="hover:text-foreground">About</a></li>
              <li><a href="https://github.com/drixindustries/Rug-Killer-On-Solana#roadmap" target="_blank" rel="noopener noreferrer" className="hover:text-foreground" data-testid="footer-link-roadmap">Roadmap</a></li>
              <li><a href="https://docs.solana.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">Solana Docs</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold mb-3">Legal</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/terms" className="hover:text-foreground" data-testid="footer-link-terms">Terms of Service</a></li>
              <li><a href="/privacy" className="hover:text-foreground" data-testid="footer-link-privacy">Privacy Policy</a></li>
            </ul>
          </div>
          
          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold mb-3">Community</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  size="icon"
                  asChild
                  className="min-h-[44px] min-w-[44px]"
                  data-testid="footer-button-github"
                >
                  <a href="https://github.com/drixindustries/Rug-Killer-On-Solana" target="_blank" rel="noopener noreferrer" title="GitHub" aria-label="View on GitHub">
                    <SiGithub className="h-5 w-5" />
                  </a>
                </Button>
                
                {botLinks?.telegram && (
                  <Button 
                    variant="outline"
                    size="icon"
                    asChild
                    className="min-h-[44px] min-w-[44px]"
                    data-testid="footer-button-telegram"
                  >
                    <a href={botLinks.telegram} target="_blank" rel="noopener noreferrer" title="Telegram" aria-label="Join Telegram bot">
                      <SiTelegram className="h-5 w-5" />
                    </a>
                  </Button>
                )}
                
                {botLinks?.discord && (
                  <Button 
                    variant="outline"
                    size="icon"
                    asChild
                    className="min-h-[44px] min-w-[44px]"
                    data-testid="footer-button-discord"
                  >
                    <a href={botLinks.discord} target="_blank" rel="noopener noreferrer" title="Discord" aria-label="Join Discord server">
                      <SiDiscord className="h-5 w-5" />
                    </a>
                  </Button>
                )}
              </div>
              <Button
                variant="default"
                size="sm"
                asChild
                className="w-full sm:w-auto"
                data-testid="footer-button-invite-discord"
              >
                <a 
                  href="https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot&permissions=3072" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <SiDiscord className="h-4 w-4 mr-2" />
                  Invite Discord Bot
                </a>
              </Button>
            </div>
          </div>
        </div>
        
        <div className="border-t pt-6">
          <p className="text-xs text-muted-foreground text-center">
            © 2025 Rug Killer Alpha Bot. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

