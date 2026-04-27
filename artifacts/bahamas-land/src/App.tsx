import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Eager-load Home so the first paint is instant.
import Home from "@/pages/Home";

// Lazy-load every other page so the initial JS bundle is small and
// navigation stays smooth (each page loads on demand and is then cached).
const World = lazy(() => import("@/pages/World"));
const Court = lazy(() => import("@/pages/Court"));
const Museum = lazy(() => import("@/pages/Museum"));
const Library = lazy(() => import("@/pages/Library"));
const Bank = lazy(() => import("@/pages/Bank"));
const Palace = lazy(() => import("@/pages/Palace"));
const Secret = lazy(() => import("@/pages/Secret"));
const Passport = lazy(() => import("@/pages/Passport"));
const Arcade = lazy(() => import("@/pages/Arcade"));
const Wheel = lazy(() => import("@/pages/Wheel"));
const TicTacToe = lazy(() => import("@/pages/TicTacToe"));
const RPS = lazy(() => import("@/pages/RPS"));
const Stream = lazy(() => import("@/pages/Stream"));
const Stocks = lazy(() => import("@/pages/Stocks"));
const Inbox = lazy(() => import("@/pages/Inbox"));
const AdminBahamas = lazy(() => import("@/pages/AdminBahamas"));
const Vault = lazy(() => import("@/pages/Vault"));
const Banned = lazy(() => import("@/pages/Banned"));
const Exile = lazy(() => import("@/pages/Exile"));
const Citizenship = lazy(() => import("@/pages/Citizenship"));
const News = lazy(() => import("@/pages/News"));
const Police = lazy(() => import("@/pages/Police"));
const PostOffice = lazy(() => import("@/pages/PostOffice"));
const Chess = lazy(() => import("@/pages/Chess"));
const Reward = lazy(() => import("@/pages/Reward"));
const Wanted = lazy(() => import("@/pages/Wanted"));
const Decrees = lazy(() => import("@/pages/Decrees"));
const Weather = lazy(() => import("@/pages/Weather"));
const Anthem = lazy(() => import("@/pages/Anthem"));
const CoinFlip = lazy(() => import("@/pages/CoinFlip"));
const Ranking = lazy(() => import("@/pages/Ranking"));
const CustomerService = lazy(() => import("@/pages/CustomerService"));
const BaskoutaChemin = lazy(() =>
  import("@/pages/Chemin").then((m) => ({ default: m.BaskoutaChemin })),
);
const YearChemin = lazy(() =>
  import("@/pages/Chemin").then((m) => ({ default: m.YearChemin })),
);
const FreedomChemin = lazy(() =>
  import("@/pages/Chemin").then((m) => ({ default: m.FreedomChemin })),
);

import { CustomCursor } from "@/components/CustomCursor";
import { CRTOverlay } from "@/components/CRTOverlay";
import { OGCheat } from "@/components/OGCheat";
import { EasterEggs } from "@/components/EasterEggs";
import { MediaEasterEggs } from "@/components/MediaEasterEggs";
import { ConsoleEggs } from "@/components/ConsoleEggs";
import { HiddenEggs } from "@/components/HiddenEggs";
import { NattounComments } from "@/components/NattounComments";
import { AutoReload } from "@/components/AutoReload";
import { ActivityTracker } from "@/components/ActivityTracker";
import { PlayerSetup } from "@/components/PlayerSetup";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Avoid spamming refetches on focus / mount; keep the UI smooth.
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function PageFallback() {
  return (
    <div className="min-h-[60vh] w-full flex items-center justify-center">
      <div className="text-primary font-mono uppercase tracking-widest text-xs animate-pulse">
        loading…
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageFallback />}>
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
        <Route path="/arcade" component={Arcade} />
        <Route path="/wheel" component={Wheel} />
        <Route path="/tictactoe" component={TicTacToe} />
        <Route path="/rps" component={RPS} />
        <Route path="/stream" component={Stream} />
        <Route path="/stocks" component={Stocks} />
        <Route path="/inbox" component={Inbox} />
        <Route path="/adminbahamas" component={AdminBahamas} />
        <Route path="/AdminBahamas" component={AdminBahamas} />
        <Route path="/vault" component={Vault} />
        <Route path="/banned" component={Banned} />
        <Route path="/exile" component={Exile} />
        <Route path="/citizenship" component={Citizenship} />
        <Route path="/police" component={Police} />
        <Route path="/news" component={News} />
        <Route path="/postoffice" component={PostOffice} />
        <Route path="/chess" component={Chess} />
        <Route path="/reward" component={Reward} />
        <Route path="/wanted" component={Wanted} />
        <Route path="/decrees" component={Decrees} />
        <Route path="/weather" component={Weather} />
        <Route path="/anthem" component={Anthem} />
        <Route path="/coinflip" component={CoinFlip} />
        <Route path="/ranking" component={Ranking} />
        <Route path="/customer-service" component={CustomerService} />
        <Route path="/baskouta" component={BaskoutaChemin} />
        <Route path="/177" component={YearChemin} />
        <Route path="/freem3kky" component={FreedomChemin} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
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
          <EasterEggs />
          <MediaEasterEggs />
          <ConsoleEggs />
          <HiddenEggs />
          <NattounComments />
          <AutoReload />
          <ActivityTracker />
          <PlayerSetup />
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
