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
import Arcade from "@/pages/Arcade";
import Wheel from "@/pages/Wheel";
import TicTacToe from "@/pages/TicTacToe";
import RPS from "@/pages/RPS";
import Stream from "@/pages/Stream";
import Stocks from "@/pages/Stocks";
import Inbox from "@/pages/Inbox";
import AdminBahamas from "@/pages/AdminBahamas";
import Vault from "@/pages/Vault";
import Banned from "@/pages/Banned";
import Exile from "@/pages/Exile";
import Citizenship from "@/pages/Citizenship";
import News from "@/pages/News";
import Police from "@/pages/Police";
import PostOffice from "@/pages/PostOffice";

import { CustomCursor } from "@/components/CustomCursor";
import { CRTOverlay } from "@/components/CRTOverlay";
import { OGCheat } from "@/components/OGCheat";
import { EasterEggs } from "@/components/EasterEggs";
import { MediaEasterEggs } from "@/components/MediaEasterEggs";
import { ConsoleEggs } from "@/components/ConsoleEggs";
import { NattounComments } from "@/components/NattounComments";
import { IdleNotifications } from "@/components/IdleNotifications";
import { PresidentBroadcast } from "@/components/PresidentBroadcast";
import { AutoReload } from "@/components/AutoReload";
import { ActivityTracker } from "@/components/ActivityTracker";

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
          <EasterEggs />
          <MediaEasterEggs />
          <ConsoleEggs />
          <NattounComments />
          <IdleNotifications />
          <PresidentBroadcast />
          <AutoReload />
          <ActivityTracker />
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
