import { Shield, Plus, CreditCard, Wallet, Check } from "lucide-react";
import { SiTelegram, SiDiscord } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/hooks/useWallet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  onNewAnalysis?: () => void;
}

interface BotInviteLinks {
  telegram?: string;
  discord?: string;
  message?: string;
}

export function Header({ onNewAnalysis }: HeaderProps) {
  const { data: botLinks } = useQuery<BotInviteLinks>({
    queryKey: ['/api/bot/invite-links'],
    retry: false,
    refetchOnWindowFocus: false,
  });
  
  const { walletAddress, connection, isConnecting, connectWallet, disconnectWallet } = useWallet();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-6 flex h-14 items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">Solana Rug Killer</span>
        </div>
        
        <div className="flex items-center gap-2">
          {botLinks?.telegram && (
            <Button 
              variant="ghost"
              size="icon"
              asChild
              data-testid="button-telegram-bot"
            >
              <a href={botLinks.telegram} target="_blank" rel="noopener noreferrer">
                <SiTelegram className="h-4 w-4" />
              </a>
            </Button>
          )}
          
          {botLinks?.discord && (
            <Button 
              variant="ghost"
              size="icon"
              asChild
              data-testid="button-discord-bot"
            >
              <a href={botLinks.discord} target="_blank" rel="noopener noreferrer">
                <SiDiscord className="h-4 w-4" />
              </a>
            </Button>
          )}
          
          <Link href="/subscription">
            <Button 
              variant="ghost"
              size="sm"
              data-testid="button-subscription"
            >
              <CreditCard className="h-4 w-4 mr-1" />
              Subscription
            </Button>
          </Link>
          
          <Link href="/pricing">
            <Button 
              variant="ghost"
              size="sm"
              data-testid="button-pricing"
            >
              Pricing
            </Button>
          </Link>
          
          <Link href="/documentation">
            <Button 
              variant="ghost"
              size="sm"
              data-testid="button-documentation"
            >
              Docs
            </Button>
          </Link>
          
          {walletAddress ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline"
                  size="sm"
                  data-testid="button-wallet-menu"
                >
                  {connection?.isEligible && (
                    <Check className="h-4 w-4 mr-1 text-green-500" />
                  )}
                  <Wallet className="h-4 w-4 mr-1" />
                  {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Wallet Connected</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-sm">
                  <p className="font-mono text-xs text-muted-foreground">
                    {walletAddress.slice(0, 16)}...
                  </p>
                  {connection?.tokenBalance !== undefined && (
                    <p className="text-xs mt-1">
                      Balance: {connection.tokenBalance.toLocaleString()} $KILL
                    </p>
                  )}
                  {connection?.isEligible && (
                    <p className="text-xs text-green-500 mt-1">
                      ✓ Premium Access Active
                    </p>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={disconnectWallet}>
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              variant="outline"
              size="sm"
              onClick={connectWallet}
              disabled={isConnecting}
              data-testid="button-connect-wallet"
            >
              <Wallet className="h-4 w-4 mr-1" />
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Button>
          )}
          
          {onNewAnalysis && (
            <Button 
              onClick={onNewAnalysis}
              size="sm"
              data-testid="button-new-analysis"
            >
              <Plus className="h-4 w-4 mr-1" />
              New Analysis
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
