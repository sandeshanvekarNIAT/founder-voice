
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

export function IdeaGenerator() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState<'input' | 'generating' | 'preview'>('input');
    const [formData, setFormData] = useState({
        interests: "",
        industry: "",
        time: "",
        budget: "",
        problem: ""
    });
    const [generatedIdea, setGeneratedIdea] = useState<any>(null);

    const handleGenerate = async () => {
        setStep('generating');
        try {
            const res = await fetch('/api/generate-idea', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Generation failed");
            }

            const data = await res.json();

            // Save context for the Pitch Page
            sessionStorage.setItem('founder_voice_context', data.deckContext);
            setGeneratedIdea(data.idea);
            setStep('preview');

        } catch (e: any) {
            console.error("Generator Error:", e);
            alert(`Error: ${e.message}`);
            setStep('input');
        }
    };

    const { user } = useAuth(); // Get User State

    const handleLaunch = () => {
        if (user) {
            router.push('/pitch');
        } else {
            // Redirect to Login but tell it to come back to /pitch
            router.push('/login?next=/pitch');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" className="h-12 px-6 rounded-full text-muted-foreground hover:text-white hover:bg-white/10">
                    I don't have an idea yet
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-black/90 border-white/10 backdrop-blur-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-yellow-500" />
                        Startup Idea Generator
                    </DialogTitle>
                </DialogHeader>

                {step === 'input' && (
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>What are your skills or interests?</Label>
                            <Input
                                placeholder="e.g. Coding, Cooking, Hiking..."
                                value={formData.interests}
                                onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                                className="bg-white/5 border-white/10"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Industry (Optional)</Label>
                                <Input
                                    placeholder="e.g. SaaS, Fintech"
                                    value={formData.industry}
                                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                                    className="bg-white/5 border-white/10"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Time Availability</Label>
                                <Input
                                    placeholder="e.g. 10 hrs/week"
                                    value={formData.time}
                                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                    className="bg-white/5 border-white/10"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Problem you care about?</Label>
                            <Input
                                placeholder="e.g. Rent is too high..."
                                value={formData.problem}
                                onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
                                className="bg-white/5 border-white/10"
                            />
                        </div>

                        <Button onClick={handleGenerate} className="w-full bg-primary hover:bg-primary/90 mt-4 h-12 text-lg">
                            Generate Idea <Sparkles className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                )}

                {step === 'generating' && (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                        <Loader2 className="w-12 h-12 text-primary animate-spin" />
                        <p className="text-muted-foreground animate-pulse">Consulting the Oracle of Silicon Valley...</p>
                    </div>
                )}

                {step === 'preview' && generatedIdea && (
                    <div className="space-y-6 py-4">
                        <div className="p-4 bg-white/5 rounded-xl space-y-3 border border-white/10">
                            <div>
                                <h3 className="text-xs font-mono text-muted-foreground uppercase">Problem</h3>
                                <p className="font-medium">{generatedIdea.problem}</p>
                            </div>
                            <div>
                                <h3 className="text-xs font-mono text-muted-foreground uppercase">Solution</h3>
                                <p className="font-medium text-green-400">{generatedIdea.solution}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h3 className="text-xs font-mono text-muted-foreground uppercase">Market</h3>
                                    <p className="text-sm text-gray-300">{generatedIdea.market}</p>
                                </div>
                                <div>
                                    <h3 className="text-xs font-mono text-muted-foreground uppercase">Model</h3>
                                    <p className="text-sm text-gray-300">{generatedIdea.business_model}</p>
                                </div>
                            </div>
                        </div>

                        <Button onClick={handleLaunch} className="w-full bg-white text-black hover:bg-white/90 h-12 text-lg">
                            Test this idea with VC <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
