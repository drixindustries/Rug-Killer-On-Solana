import { Shield, Plus, Wallet, Check, User, LogOut, Settings, Menu } from "lucide-react";
import { SiTelegram, SiDiscord, SiGithub } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import type { User as UserType } from "@shared/schema";
import { navigationConfig } from "./navigation-config";
import { useState } from "react";

interface HeaderProps {
  onNewAnalysis?: () => void;
}

interface BotInviteLinks {
  telegram?: string;
  discord?: string;
  message?: string;
}

export function Header({ onNewAnalysis }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: botLinks } = useQuery<BotInviteLinks>({
    queryKey: ['/api/bot/invite-links'],
    retry: false,
    refetchOnWindowFocus: false,
  });
  
  const { walletAddress, connection, isConnecting, connectWallet, disconnectWallet } = useWallet();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        {/* Main Navigation Bar */}
        <div className="flex h-14 items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg hidden sm:inline">Solana Rug Killer</span>
              <span className="font-bold text-lg sm:hidden">SRK</span>
            </Link>

            {/* Desktop Navigation Menu */}
            <div className="hidden lg:block">
              <NavigationMenu>
                <NavigationMenuList>
                  {navigationConfig.map((section) => (
                    <NavigationMenuItem key={section.title}>
                      <NavigationMenuTrigger className="text-sm">
                        {section.title}
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <ul className="grid w-[400px] gap-3 p-4">
                          {section.items.map((item) => (
                            <li key={item.href}>
                              <NavigationMenuLink asChild>
                                <Link 
                                  href={item.href}
                                  className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                                  data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                                >
                                  <div className="text-sm font-medium leading-none">{item.title}</div>
                                  {item.description && (
                                    <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                                      {item.description}
                                    </p>
                                  )}
                                </Link>
                              </NavigationMenuLink>
                            </li>
                          ))}
                        </ul>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  ))}
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Social Links - Hidden on mobile to reduce clutter */}
            <Button 
              variant="ghost"
              size="icon"
              asChild
              className="hidden md:inline-flex min-h-[44px] min-w-[44px]"
              data-testid="button-github"
            >
              <a href="https://github.com/yourusername/solana-rug-killer" target="_blank" rel="noopener noreferrer" title="View on GitHub" aria-label="View project on GitHub">
                <SiGithub className="h-5 w-5" />
              </a>
            </Button>
            
            {botLinks?.telegram && (
              <Button 
                variant="ghost"
                size="icon"
                asChild
                className="hidden md:inline-flex min-h-[44px] min-w-[44px]"
                data-testid="button-telegram-bot"
              >
                <a href={botLinks.telegram} target="_blank" rel="noopener noreferrer" title="Join Telegram Bot" aria-label="Join Telegram bot">
                  <SiTelegram className="h-5 w-5" />
                </a>
              </Button>
            )}
            
            {botLinks?.discord && (
              <Button 
                variant="ghost"
                size="icon"
                asChild
                className="hidden md:inline-flex min-h-[44px] min-w-[44px]"
                data-testid="button-discord-bot"
              >
                <a href={botLinks.discord} target="_blank" rel="noopener noreferrer" title="Join Discord Bot" aria-label="Join Discord bot">
                  <SiDiscord className="h-5 w-5" />
                </a>
              </Button>
            )}

            {/* Wallet Connect */}
            {walletAddress ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline"
                    size="sm"
                    className="hidden md:inline-flex"
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
                        Balance: {connection.tokenBalance.toLocaleString()} $RUGK
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
                className="hidden md:inline-flex"
                data-testid="button-connect-wallet"
              >
                <Wallet className="h-4 w-4 mr-1" />
                {isConnecting ? "Connecting..." : "Connect"}
              </Button>
            )}

            {/* New Analysis Button */}
            {onNewAnalysis && (
              <Button 
                onClick={onNewAnalysis}
                size="sm"
                className="hidden md:inline-flex"
                data-testid="button-new-analysis"
              >
                <Plus className="h-4 w-4 mr-1" />
                New Scan
              </Button>
            )}

            {/* User Menu */}
            {user && <UserMenu user={user as UserType} />}

            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  data-testid="button-mobile-menu"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-6 flex flex-col space-y-6">
                  {navigationConfig.map((section) => (
                    <div key={section.title} className="space-y-3">
                      <h3 className="font-semibold text-sm text-muted-foreground">{section.title}</h3>
                      <div className="space-y-2">
                        {section.items.map((item) => (
                          <Link 
                            key={item.href} 
                            href={item.href}
                            className="block rounded-md p-2 hover:bg-accent transition-colors"
                            onClick={() => setMobileMenuOpen(false)}
                            data-testid={`mobile-nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            <div className="font-medium text-sm">{item.title}</div>
                            {item.description && (
                              <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Mobile Actions */}
                  <div className="space-y-2 pt-4 border-t">
                    {walletAddress ? (
                      <Button 
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={disconnectWallet}
                      >
                        <Wallet className="h-4 w-4 mr-2" />
                        Disconnect Wallet
                      </Button>
                    ) : (
                      <Button 
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={connectWallet}
                        disabled={isConnecting}
                      >
                        <Wallet className="h-4 w-4 mr-2" />
                        Connect Wallet
                      </Button>
                    )}
                    
                    {onNewAnalysis && (
                      <Button 
                        onClick={() => {
                          onNewAnalysis();
                          setMobileMenuOpen(false);
                        }}
                        size="sm"
                        className="w-full justify-start"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        New Scan
                      </Button>
                    )}
                  </div>

                  {/* Social Links Mobile */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button 
                      variant="outline"
                      size="icon"
                      asChild
                    >
                      <a href="https://github.com/yourusername/solana-rug-killer" target="_blank" rel="noopener noreferrer" title="GitHub" aria-label="View project on GitHub">
                        <SiGithub className="h-4 w-4" />
                      </a>
                    </Button>
                    {botLinks?.telegram && (
                      <Button 
                        variant="outline"
                        size="icon"
                        asChild
                      >
                        <a href={botLinks.telegram} target="_blank" rel="noopener noreferrer" title="Telegram" aria-label="Join Telegram bot">
                          <SiTelegram className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {botLinks?.discord && (
                      <Button 
                        variant="outline"
                        size="icon"
                        asChild
                      >
                        <a href={botLinks.discord} target="_blank" rel="noopener noreferrer" title="Discord" aria-label="Join Discord bot">
                          <SiDiscord className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}

interface UserMenuProps {
  user: UserType;
}

function UserMenu({ user }: UserMenuProps) {
  const [, setLocation] = useLocation();
  const { data: adminCheck } = useQuery<{ isAdmin: boolean }>({
    queryKey: ['/api/admin/check'],
    retry: false,
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost"
          size="sm"
          data-testid="button-user-menu"
        >
          <User className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">{user.email?.split('@')[0] || 'Account'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-sm">
          <p className="text-xs text-muted-foreground">
            {user.email}
          </p>
        </div>
        <DropdownMenuSeparator />
        {adminCheck?.isAdmin && (
          <>
            <DropdownMenuItem onClick={() => setLocation('/admin')}>
              <Settings className="h-4 w-4 mr-2" />
              Admin Dashboard
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem 
          onClick={() => window.location.href = '/api/logout'}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Log Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
