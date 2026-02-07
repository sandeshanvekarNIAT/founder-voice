
import { generateTTS } from "./src/lib/tts";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";

async function log(message: string) {
    console.log(message);
    await fs.appendFile("debug_tts.log", message + "\n");
}

async function test() {
    await fs.writeFile("debug_tts.log", ""); // Clear log
    await log(`CWD: ${process.cwd()}`);

    const scriptPath = path.join(process.cwd(), 'src/scripts/tts_wrapper.py');
    await log(`Checking script at: ${scriptPath}`);

    try {
        await fs.access(scriptPath);
        await log("Script file exists.");
    } catch {
        await log("SCRIPT FILE NOT FOUND!");
    }

    await log("Checking python version...");
    await new Promise<void>((resolve) => {
        const p = spawn("python", ["--version"]);
        p.stdout.on("data", (d) => log(`Python stdout: ${d}`));
        p.stderr.on("data", (d) => log(`Python stderr: ${d}`));
        p.on("error", (e) => log(`Python spawn error: ${e.message}`));
        p.on("close", (code) => {
            log(`Python exited with ${code}`);
            resolve();
        });
    });

    await log("Testing generateTTS...");
    try {
        const buffer = await generateTTS("Test audio generation.");
        await log(`Success! Generated ${buffer.length} bytes.`);
        await fs.writeFile("debug_output.mp3", buffer);
    } catch (e: any) {
        await log(`Failed to generate TTS: ${e.message}`);
        if (e.stack) await log(e.stack);
    }
}

test();
