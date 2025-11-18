import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Home from "@/pages/home";
import Landing from "@/pages/landing";
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
import Alerts from "@/pages/alerts";
import Comparison from "@/pages/comparison";
import Analytics from "@/pages/analytics";
import Profile from "@/pages/profile";
import Leaderboard from "@/pages/leaderboard";
import LiveScans from "@/pages/live-scans";
import TrendingCalls from "@/pages/trending-calls";
import Moderation from "@/pages/admin/moderation";
import NotFound from "@/pages/not-found";

function Router() {
  // Authentication disabled - all routes are publicly accessible
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/landing" component={Landing} />
      <Route path="/subscription" component={Subscription} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/features" component={Features} />
      <Route path="/bot-setup" component={BotSetup} />
      <Route path="/bot-guide" component={BotGuide} />
      <Route path="/watchlist" component={Watchlist} />
      <Route path="/portfolio" component={Portfolio} />
      <Route path="/alerts" component={Alerts} />
      <Route path="/compare" component={Comparison} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/profile/:userId" component={Profile} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/live-scans" component={LiveScans} />
      <Route path="/trending-calls" component={TrendingCalls} />
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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
