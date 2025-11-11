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
import Documentation from "@/pages/documentation";
import About from "@/pages/about";
import VanityGenerator from "@/pages/vanity-generator";
import AdminWallet from "@/pages/admin-wallet";
import AdminDeployToken from "@/pages/admin-deploy-token";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/documentation" component={Documentation} />
          <Route path="/about" component={About} />
        </>
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/subscription" component={Subscription} />
          <Route path="/pricing" component={Pricing} />
          <Route path="/documentation" component={Documentation} />
          <Route path="/about" component={About} />
          <Route path="/vanity" component={VanityGenerator} />
          <Route path="/admin" component={Admin} />
          <Route path="/admin/wallet" component={AdminWallet} />
          <Route path="/admin/deploy-token" component={AdminDeployToken} />
        </>
      )}
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
