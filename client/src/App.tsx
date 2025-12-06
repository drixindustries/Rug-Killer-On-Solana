import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import { Provider as AnkrProvider } from "ankr-react";
import Home from "@/pages/home";
import Subscription from "@/pages/subscription";
import Pricing from "@/pages/pricing";
import Features from "@/pages/features";
import Documentation from "@/pages/documentation";
import BotGuide from "@/pages/bot-guide";
import About from "@/pages/about";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import VanityGenerator from "@/pages/vanity-generator";
import AdminWallet from "@/pages/admin-wallet";
import Admin from "@/pages/admin";
import BotSetup from "@/pages/bot-setup";
import Watchlist from "@/pages/watchlist";
import Portfolio from "@/pages/portfolio";
// Alerts page removed - bots handle notifications
import Comparison from "@/pages/comparison";
import Analytics from "@/pages/analytics";
import Profile from "@/pages/profile";
import Leaderboard from "@/pages/leaderboard";
import LiveScans from "@/pages/live-scans";
import TrendingCalls from "@/pages/trending-calls";
import Moderation from "@/pages/admin/moderation";
import Rugs from "@/pages/rugs";
import NotFound from "@/pages/not-found";

function Router() {
  // Authentication disabled - all routes are publicly accessible
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/subscription" component={Subscription} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/features" component={Features} />
      <Route path="/bot-setup" component={BotSetup} />
      <Route path="/bot-guide" component={BotGuide} />
      <Route path="/watchlist" component={Watchlist} />
      <Route path="/portfolio" component={Portfolio} />
      {/* Alerts page removed - bots handle notifications */}
      <Route path="/compare" component={Comparison} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/profile/:userId" component={Profile} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/live-scans" component={LiveScans} />
      <Route path="/trending-calls" component={TrendingCalls} />
      <Route path="/rugs" component={Rugs} />
      <Route path="/admin/moderation" component={Moderation} />
      <Route path="/documentation" component={Documentation} />
      <Route path="/about" component={About} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/vanity" component={VanityGenerator} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/wallet" component={AdminWallet} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AnkrProvider apiKey={import.meta.env.VITE_ANKR_API_KEY}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <a className="skip-link" href="#main-content">
              Skip to main content
            </a>
            <Toaster />
            <div id="main-content" tabIndex={-1}>
              <Router />
            </div>
          </TooltipProvider>
        </QueryClientProvider>
      </AnkrProvider>
    </ErrorBoundary>
  );
}

export default App;
