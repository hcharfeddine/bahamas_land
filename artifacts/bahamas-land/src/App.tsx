import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/Home";
import World from "@/pages/World";
import Court from "@/pages/Court";
import Museum from "@/pages/Museum";
import Library from "@/pages/Library";
import Bank from "@/pages/Bank";
import Palace from "@/pages/Palace";
import Secret from "@/pages/Secret";
import Passport from "@/pages/Passport";

import { CustomCursor } from "@/components/CustomCursor";
import { CRTOverlay } from "@/components/CRTOverlay";
import { OGCheat } from "@/components/OGCheat";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/world" component={World} />
      <Route path="/court" component={Court} />
      <Route path="/museum" component={Museum} />
      <Route path="/library" component={Library} />
      <Route path="/bank" component={Bank} />
      <Route path="/palace" component={Palace} />
      <Route path="/secret" component={Secret} />
      <Route path="/passport" component={Passport} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <CustomCursor />
          <CRTOverlay />
          <OGCheat />
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
