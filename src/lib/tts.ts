
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';

export async function generateTTS(text: string): Promise<Buffer> {
    const scriptPath = path.join(process.cwd(), 'src/scripts/tts_wrapper.py');
    const tempOutputFile = path.join(process.cwd(), `temp_${randomUUID()}.mp3`);

    return new Promise((resolve, reject) => {
        // Spawn the python process
        // We use 'python' assuming it's in the PATH. 
        // In some environments it might be 'python3' or a full path.
        const pythonProcess = spawn('python', [scriptPath, text, tempOutputFile]);

        let errorOutput = '';

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        pythonProcess.on('close', async (code) => {
            if (code !== 0) {
                console.error(`TTS Process exited with code ${code}:`, errorOutput);
                reject(new Error(`TTS generation failed: ${errorOutput}`));
                return;
            }

            try {
                const audioBuffer = await fs.readFile(tempOutputFile);
                // Clean up temp file
                await fs.unlink(tempOutputFile);
                resolve(audioBuffer);
            } catch (err) {
                reject(err);
            }
        });
    });
}
