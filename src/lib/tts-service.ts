
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import EventEmitter from 'events';

class TTSService extends EventEmitter {
    private process: ChildProcess | null = null;
    private queue: { text: string; resolve: (data: Buffer) => void; reject: (err: Error) => void }[] = [];
    private isProcessing = false;
    private buffer = '';

    constructor() {
        super();
        this.ensureProcess();
    }

    private ensureProcess() {
        if (this.process && !this.process.killed) return;

        const scriptPath = path.join(process.cwd(), 'src/scripts/tts_wrapper.py');
        console.log("Starting TTS Service at:", scriptPath);

        this.process = spawn('python', [scriptPath]);

        this.process.stdout?.on('data', (data) => {
            this.buffer += data.toString();
            this.processBuffer();
        });

        this.process.stderr?.on('data', (data) => {
            console.error('[TTS Service Error]:', data.toString());
        });

        this.process.on('close', (code) => {
            console.warn(`TTS Service process exited with code ${code}. Restarting...`);
            this.process = null;
            setTimeout(() => this.ensureProcess(), 1000);
        });
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
            this.processQueue();
        });
    }

    private processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;
        if (!this.process || this.process.killed) {
            this.ensureProcess();
            return; // wait for restart
        }

        const request = this.queue[0]; // Peek
        this.isProcessing = true;

        const payload = JSON.stringify({ text: request.text }) + '\n';
        this.process.stdin?.write(payload);
    }
}

// Global singleton to persist across hot reloads in dev (best effort)
const globalForTTS = global as unknown as { ttsService: TTSService };

export const ttsService = globalForTTS.ttsService || new TTSService();

if (process.env.NODE_ENV !== 'production') {
    globalForTTS.ttsService = ttsService;
}
