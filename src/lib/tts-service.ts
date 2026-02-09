
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import EventEmitter from 'events';

class TTSService extends EventEmitter {
    private process: ChildProcess | null = null;
    private queue: { text: string; resolve: (data: Buffer) => void; reject: (err: Error) => void }[] = [];
    private isIterating = false;

    constructor() {
        super();
        // Lazy init: Do not start process in constructor
    }

    private ensureProcess() {
        if (this.process && !this.process.killed) return;

        const scriptPath = path.join(process.cwd(), 'src/scripts/tts_wrapper.py');
        console.log("Starting TTS Service at:", scriptPath);

        try {
            this.process = spawn('python', [scriptPath]);

            this.process.on('error', (err) => {
                console.error('[TTS Service Error] Failed to spawn python process:', err);
                this.process = null; // Mark as dead
                // We do NOT retry immediately to avoid loop loops if python is missing
            });

            this.process.stdout?.on('data', (data) => {
                this.buffer += data.toString();
                this.processBuffer();
            });

            this.process.stderr?.on('data', (data) => {
                console.error('[TTS Service Error Output]:', data.toString());
            });

            this.process.on('close', (code) => {
                console.warn(`TTS Service process exited with code ${code}.`);
                this.process = null;
                // Only restart if we have a queue and it wasn't a spawn error
                if (this.queue.length > 0) {
                    setTimeout(() => this.ensureProcess(), 1000);
                }
            });

        } catch (e) {
            console.error('[TTS Service Error] Synchronous spawn error:', e);
            this.process = null;
        }
    }

    private processBuffer() {
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
            if (!line.trim()) continue;
            this.handleResponse(line);
        }
    }

    private handleResponse(line: string) {
        const currentRequest = this.queue.shift();
        if (!currentRequest) return;

        try {
            const response = JSON.parse(line);
            if (response.error) {
                currentRequest.reject(new Error(response.error));
            } else if (response.audio) {
                const buffer = Buffer.from(response.audio, 'base64');
                currentRequest.resolve(buffer);
            } else {
                currentRequest.reject(new Error("Invalid response from TTS service"));
            }
        } catch (e) {
            currentRequest.reject(new Error("Failed to parse TTS response: " + e));
        }

        this.isProcessing = false;
        this.processQueue();
    }

    public generate(text: string): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            this.queue.push({ text, resolve, reject });
            this.ensureProcess(); // Try to start if not running
            this.processQueue();
        });
    }

    private processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;

        if (!this.process || this.process.killed) {
            // If process is dead/missing, fail the request immediately
            const req = this.queue.shift();
            if (req) {
                req.reject(new Error("TTS Service Unavailable (Python runtime missing)"));
            }
            return;
        }

        const request = this.queue[0]; // Peek
        this.isProcessing = true;

        const payload = JSON.stringify({ text: request.text }) + '\n';
        if (this.process.stdin && !this.process.stdin.destroyed) {
            this.process.stdin.write(payload);
        } else {
            // Handle broken pipe
            this.process.kill();
            this.ensureProcess();
        }
    }
}

// Global singleton to persist across hot reloads in dev (best effort)
const globalForTTS = global as unknown as { ttsService: TTSService };

export const ttsService = globalForTTS.ttsService || new TTSService();

if (process.env.NODE_ENV !== 'production') {
    globalForTTS.ttsService = ttsService;
}
