import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mic } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8 text-center gap-8">
      <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter">
          FOUNDER <span className="text-primary">VOICE</span>_
        </h1>
        <p className="text-muted-foreground font-mono max-w-lg mx-auto">
          THE MOCK VC INTERROGATION PROTOCOL
        </p>
      </div>

      <div className="max-w-2xl text-lg text-muted-foreground leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
        <p>
          Pitching is war. Most founders fail because they crumble under pressure.
          This AI simulates a ruthless Series A investor who interrupts, fact-checks, and smells fear.
        </p>
      </div>

      <div className="flex gap-4 animate-in fade-in zoom-in duration-1000 delay-500">
        <Link href="/pitch">
          <Button size="lg" className="h-14 px-8 text-lg gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
            <Mic className="w-5 h-5" /> ENTER WAR ROOM
          </Button>
        </Link>
        <Button size="lg" variant="outline" className="h-14 px-8 text-lg gap-2">
          READ MANIFESTO
        </Button>
      </div>

      <div className="absolute bottom-8 text-xs text-muted-foreground font-mono opacity-50">
        POWERED BY OPENAI REALTIME API + O1-MINI
      </div>
    </div>
  );
}
