"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, CheckCircle, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface DeckUploaderProps {
    onDeckLoaded: (text: string) => void;
    initialContext?: string | null;
    contextLabel?: string;
}

export function DeckUploader({ onDeckLoaded, initialContext, contextLabel = "Previous Context" }: DeckUploaderProps) {
    const [mode, setMode] = useState<'upload' | 'text'>('upload');
    const [textInput, setTextInput] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [fileName, setFileName] = useState<string | null>(initialContext ? contextLabel : null);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Sync state if initialContext changes from parent (e.g. async load or retry)
    useEffect(() => {
        if (initialContext && !fileName) {
            setFileName(contextLabel);
        }
    }, [initialContext, contextLabel, fileName]);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setIsUploading(true);
        setUploadProgress(10); // Start progress
        const formData = new FormData();
        formData.append("file", file);

        // Simulate progress interval
        const interval = setInterval(() => {
            setUploadProgress((prev) => (prev < 90 ? prev + 10 : prev));
        }, 300);

        try {
            const res = await fetch("/api/parse-pdf", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Upload failed");
            }

            clearInterval(interval);
            setUploadProgress(100);

            if (data.text) {
                // Short Delay to show 100%
                setTimeout(() => {
                    onDeckLoaded(data.text);
                    setFileName(file.name);
                    setIsUploading(false);
                }, 500);
            }
        } catch (error: any) {
            console.error(error);
            clearInterval(interval);
            setUploadProgress(0);
            setIsUploading(false);
            alert(`Upload Error: ${error.message}`);
        }
    }, [onDeckLoaded]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { "application/pdf": [".pdf"] },
        maxFiles: 1,
        disabled: !!fileName || isUploading,
    });

    const resetUpload = (e: React.MouseEvent) => {
        e.stopPropagation();
        setFileName(null);
        onDeckLoaded(""); // Clear context
    };

    const handleTextSubmit = () => {
        if (!textInput.trim()) return;
        onDeckLoaded(textInput);
        // Visual feedback or lock?
    };

    return (
        <div className="w-full space-y-4">
            {/* Toggle Tabs */}
            {!fileName && (
                <div className="flex p-1 bg-white/5 rounded-lg border border-white/10 w-fit mx-auto">
                    <button
                        onClick={() => setMode('upload')}
                        className={cn(
                            "px-4 py-1.5 text-xs font-medium rounded-md transition-all",
                            mode === 'upload' ? "bg-primary text-white shadow-sm" : "text-zinc-400 hover:text-white"
                        )}
                    >
                        Upload Deck
                    </button>
                    <button
                        onClick={() => setMode('text')}
                        className={cn(
                            "px-4 py-1.5 text-xs font-medium rounded-md transition-all",
                            mode === 'text' ? "bg-primary text-white shadow-sm" : "text-zinc-400 hover:text-white"
                        )}
                    >
                        Paste Idea
                    </button>
                </div>
            )}

            <AnimatePresence mode="wait">
                {fileName ? (
                    <motion.div
                        key="file-loaded"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative flex items-center justify-between p-4 bg-green-500/10 border border-green-500/30 rounded-xl group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500/20 rounded-lg">
                                {mode === 'upload' ? <CheckCircle className="w-5 h-5 text-green-400" /> : <FileText className="w-5 h-5 text-green-400" />}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-green-100">Context Loaded Successfully</p>
                                <p className="text-xs text-green-400/80">{mode === 'upload' ? fileName : 'Text Idea Provided'}</p>
                            </div>
                        </div>
                        <button
                            onClick={resetUpload}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                            title="Remove context"
                        >
                            <X className="w-4 h-4 text-white/70" />
                        </button>
                    </motion.div>
                ) : mode === 'upload' ? (
                    <motion.div
                        key="dropzone"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        {...(getRootProps() as any)}
                        className={cn(
                            "relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 overflow-hidden min-h-[200px]",
                            isDragActive
                                ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(var(--primary),0.2)]"
                                : "border-white/10 hover:border-white/20 hover:bg-white/5",
                            isUploading && "pointer-events-none"
                        )}
                    >
                        <input {...getInputProps()} />

                        {/* Progress Background */}
                        {isUploading && (
                            <motion.div
                                className="absolute bottom-0 left-0 h-1 bg-primary z-10"
                                initial={{ width: "0%" }}
                                animate={{ width: `${uploadProgress}%` }}
                                transition={{ ease: "linear" }}
                            />
                        )}

                        {isUploading ? (
                            <div className="flex flex-col items-center space-y-4">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                <div className="text-center">
                                    <p className="text-sm font-medium text-white mb-1">Analyzing Pitch Deck...</p>
                                    <p className="text-xs text-muted-foreground">Extracting insights for the AI</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="p-3 bg-white/5 rounded-full mb-4 ring-1 ring-white/10 group-hover:scale-110 transition-transform duration-300">
                                    <Upload className="w-6 h-6 text-white/70" />
                                </div>
                                <div className="text-center space-y-2">
                                    <p className="text-sm font-medium text-white">
                                        Drag & drop your deck here
                                    </p>
                                    <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
                                        Supports PDF (Max 10MB). We'll use this to grill you harder.
                                    </p>
                                </div>
                            </>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="text-input"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4 min-h-[200px]"
                    >
                        <textarea
                            className="flex min-h-[150px] w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                            placeholder="Describe your startup here... (e.g., 'Uber for Dog Walking. We solve the problem of busy owners...')"
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                        />
                        <button
                            onClick={() => {
                                if (textInput.trim()) {
                                    onDeckLoaded(textInput);
                                    setFileName("Text Description");
                                }
                            }}
                            disabled={!textInput.trim()}
                            className="w-full py-2 bg-primary hover:bg-primary/90 text-white rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Set Context
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
