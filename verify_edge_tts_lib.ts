
import { EdgeTTSClient, ProsodyOptions, OUTPUT_FORMAT } from 'edge-tts-client';
import { writeFile } from 'fs/promises';

async function testEdgeTTS() {
    console.log("Initializing EdgeTTSClient...");
    const ttsClient = new EdgeTTSClient();

    try {
        // Set metadata
        // en-US-AndrewMultilingualNeural is a good male voice
        await ttsClient.setMetadata('en-US-AndrewMultilingualNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

        const options = new ProsodyOptions();
        options.pitch = '+0Hz';
        options.rate = '+0%';
        options.volume = '+0%';

        console.log("Synthesizing...");
        const stream = ttsClient.toStream('This is a test of the natural AI voice using the edge-tts-client library. It should be working now.', options);

        const chunks: Buffer[] = [];

        stream.on('data', (chunk) => {
            // console.log(`Received chunk: ${chunk.length} bytes`);
            chunks.push(Buffer.from(chunk));
        });

        stream.on('end', async () => {
            console.log("Synthesis complete.");
            const fullBuffer = Buffer.concat(chunks);
            if (fullBuffer.length > 0) {
                await writeFile('test_output_lib.mp3', fullBuffer);
                console.log(`Saved test_output_lib.mp3 (${fullBuffer.length} bytes)`);
            } else {
                console.error("No audio data received.");
            }
        });

        stream.on('error', (err) => {
            console.error("Stream error:", err);
        });

    } catch (error) {
        console.error("Error:", error);
    }
}

testEdgeTTS();
