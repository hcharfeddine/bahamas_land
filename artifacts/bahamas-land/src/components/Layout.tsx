import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeft, Volume2, VolumeX, IdCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { audio } from "@/lib/audio";
import { useState } from "react";
import { useUsername, useCoins } from "@/lib/store";

export function Layout({ children, showBack = true }: { children: ReactNode; showBack?: boolean }) {
  const [isMuted, setIsMuted] = useState(audio.isMuted());
  const [username] = useUsername();
  const [coins] = useCoins();
  const [location] = useLocation();
  const showPassport = !!username && location !== "/passport";

  const toggleMute = () => {
    const newMuted = !isMuted;
    audio.setMuted(newMuted);
    setIsMuted(newMuted);
  };

  return (
    <div className="min-h-[100dvh] w-full relative bg-background overflow-hidden flex flex-col">
      {/* Top HUD */}
      <div className="fixed top-0 left-0 right-0 p-4 flex justify-between items-start z-40 pointer-events-none">
        <div className="pointer-events-auto">
          {showBack && (
            <Link href="/world" className="inline-flex items-center gap-2 px-4 py-2 bg-black/50 border border-primary text-primary hover:bg-primary/20 transition-colors uppercase text-sm font-bold tracking-wider neon-box">
              <ChevronLeft className="w-4 h-4" />
              Return to Map
            </Link>
          )}
        </div>
        
        <div className="flex items-start gap-4 pointer-events-auto">
          {username && (
            showPassport ? (
              <Link href="/passport" className="bg-black/50 border border-secondary text-secondary px-4 py-2 text-sm font-mono uppercase neon-box-cyan flex flex-col items-end hover:bg-secondary/10 transition-colors group">
                <div className="flex items-center gap-2">
                  <IdCard className="w-3 h-3 opacity-70 group-hover:opacity-100" />
                  CITIZEN: {username}
                </div>
                <div>BALANCE: {coins} NC</div>
              </Link>
            ) : (
              <div className="bg-black/50 border border-secondary text-secondary px-4 py-2 text-sm font-mono uppercase neon-box-cyan flex flex-col items-end">
                <div>CITIZEN: {username}</div>
                <div>BALANCE: {coins} NC</div>
              </div>
            )
          )}
          <Button 
            variant="outline" 
            size="icon"
            onClick={toggleMute}
            className="bg-black/50 border-primary text-primary hover:bg-primary/20 hover:text-primary rounded-none neon-box"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative z-10 flex flex-col pt-20 pb-8 px-4 max-w-7xl mx-auto w-full">
        {children}
      </div>
    </div>
  );
}
