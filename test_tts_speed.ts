
import { ttsService } from './src/lib/tts-service';
import fs from 'fs';

async function main() {
    console.log("Warming up TTS Service...");
    // First call spawns the process, might be slow
    console.time("First Call (Warmup)");
    await ttsService.generate("Warmup text");
    console.timeEnd("First Call (Warmup)");

    console.log("Testing speed...");

    console.time("Second Call (Cached)");
    const buffer = await ttsService.generate("This should be much faster now that the process is alive.");
    console.timeEnd("Second Call (Cached)");

    fs.writeFileSync("speed_test.mp3", buffer);
    console.log("Saved speed_test.mp3");

    // Explicit exit as the robust service keeps process alive
    process.exit(0);
}

main().catch(console.error);
