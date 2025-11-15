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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold">Rug Killer Alpha Bot</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4">
              Protecting Solana investors from rug pulls since 2025
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Official Token:</span>
                <span className="text-base sm:text-lg font-bold text-primary">$ANTIRUG</span>
              </div>
              <div 
                className="flex items-center gap-1 bg-muted px-2 py-1.5 rounded group cursor-pointer hover:bg-muted/80 transition-colors" 
                onClick={copyCA}
                data-testid="button-copy-ca-footer"
              >
                <code className="font-mono text-[10px] sm:text-xs flex-1 truncate text-muted-foreground">
                  {CONTRACT_ADDRESS}
                </code>
                <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            </div>
          </div>
          
          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Resources</h3>
            <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <li><a href="/pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
              <li><a href="/documentation" className="hover:text-foreground transition-colors">Documentation</a></li>
              <li><a href="/bot-guide" className="hover:text-foreground transition-colors">Bot Guide</a></li>
              <li><a href="/about" className="hover:text-foreground transition-colors">About</a></li>
              <li><a href="https://github.com/drixindustries/Rug-Killer-On-Solana#roadmap" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors" data-testid="footer-link-roadmap">Roadmap</a></li>
            </ul>
          </div>
          
          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Legal</h3>
            <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <li><a href="/terms" className="hover:text-foreground transition-colors" data-testid="footer-link-terms">Terms of Service</a></li>
              <li><a href="/privacy" className="hover:text-foreground transition-colors" data-testid="footer-link-privacy">Privacy Policy</a></li>
            </ul>
          </div>
          
          {/* Community & Bots */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Community & Bots</h3>
            <div className="space-y-3">
              {/* Social Icons */}
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline"
                  size="icon"
                  asChild
                  className="h-9 w-9"
                  data-testid="footer-button-github"
                >
                  <a href="https://github.com/drixindustries/Rug-Killer-On-Solana" target="_blank" rel="noopener noreferrer" title="GitHub" aria-label="View on GitHub">
                    <SiGithub className="h-4 w-4" />
                  </a>
                </Button>
                
                {botLinks?.telegram && (
                  <Button 
                    variant="outline"
                    size="icon"
                    asChild
                    className="h-9 w-9"
                    data-testid="footer-button-telegram"
                  >
                    <a href={botLinks.telegram} target="_blank" rel="noopener noreferrer" title="Telegram" aria-label="Chat on Telegram">
                      <SiTelegram className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                
                {botLinks?.discord && (
                  <Button 
                    variant="outline"
                    size="icon"
                    asChild
                    className="h-9 w-9"
                    data-testid="footer-button-discord"
                  >
                    <a href={botLinks.discord} target="_blank" rel="noopener noreferrer" title="Discord" aria-label="Join Discord">
                      <SiDiscord className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
              
              {/* Bot Invite Buttons */}
              <div className="space-y-2">
                {botLinks?.telegram && (
                  <Button
                    variant="default"
                    size="sm"
                    asChild
                    className="w-full text-xs"
                    data-testid="footer-button-add-telegram"
                  >
                    <a 
                      href={botLinks.telegram} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <SiTelegram className="h-3.5 w-3.5 mr-2" />
                      Add Telegram Bot
                    </a>
                  </Button>
                )}
                
                {botLinks?.discord && (
                  <Button
                    variant="default"
                    size="sm"
                    asChild
                    className="w-full text-xs"
                    data-testid="footer-button-invite-discord"
                  >
                    <a 
                      href={botLinks.discord} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <SiDiscord className="h-3.5 w-3.5 mr-2" />
                      Invite Discord Bot
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="border-t pt-6">
          <p className="text-xs text-muted-foreground text-center">
            © 2025 Rug Killer Alpha Bot. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

