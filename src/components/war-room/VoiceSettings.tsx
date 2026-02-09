
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Settings2 } from "lucide-react";

export type VoiceMode = 'patient' | 'manual' | 'dynamic';

interface VoiceSettingsProps {
    currentMode: VoiceMode;
    onModeChange: (mode: VoiceMode) => void;
}

export function VoiceSettings({ currentMode, onModeChange }: VoiceSettingsProps) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8 ml-2">
                    <Settings2 className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-white/10 text-foreground">
                <DialogHeader>
                    <DialogTitle>Voice Pacing</DialogTitle>
                    <DialogDescription>
                        Adjust how quickly the AI responds to you.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <RadioGroup defaultValue={currentMode} onValueChange={(v) => onModeChange(v as VoiceMode)}>
                        <div className="flex items-center space-x-2 border p-4 rounded-md border-white/10 hover:bg-white/5 transition-colors">
                            <RadioGroupItem value="patient" id="patient" />
                            <div className="flex-1">
                                <Label htmlFor="patient" className="font-bold cursor-pointer">Patient Mode</Label>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Waits 3 seconds. Good for streaming thoughts.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 border p-4 rounded-md border-white/10 hover:bg-white/5 transition-colors">
                            <RadioGroupItem value="manual" id="manual" />
                            <div className="flex-1">
                                <Label htmlFor="manual" className="font-bold cursor-pointer">Push-to-Talk</Label>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Click "I'm Done" when finished. Zero accidental interruptions.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 border p-4 rounded-md border-white/10 hover:bg-white/5 transition-colors">
                            <RadioGroupItem value="interview" id="interview" />
                            <div className="flex-1">
                                <Label htmlFor="interview" className="font-bold cursor-pointer">Interview Mode</Label>
                                <p className="text-sm text-muted-foreground mt-1">
                                    AI asks "Are you done?" after silence. Saves tokens.
                                </p>
                            </div>
                        </div>
                    </RadioGroup>
                </div>
            </DialogContent>
        </Dialog>
    );
}
