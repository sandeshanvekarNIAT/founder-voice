
import { EdgeTTSClient } from 'edge-tts-client';
import fs from 'fs';

async function main() {
    console.time('TTS Generation');
    try {
        const client = new EdgeTTSClient();

        // Trying standard MP3 format string
        await client.setMetadata('en-US-AndrewMultilingualNeural', 'audio-24khz-48kbitrate-mono-mp3' as any);

        const stream = client.toStream('Hello world, this is a test of the Node JS client.');
        const chunks: Buffer[] = [];

        stream.on('data', (chunk) => {
            if (Buffer.isBuffer(chunk)) {
                chunks.push(chunk);
            } else {
                chunks.push(Buffer.from(chunk));
            }
        });

        stream.on('end', () => {
            const buffer = Buffer.concat(chunks);
            fs.writeFileSync('test_node.mp3', buffer);
            console.log(`Audio saved to test_node.mp3 (${buffer.length} bytes)`);
            console.timeEnd('TTS Generation');
            client.close();
        });

        stream.on('error', (err) => {
            console.error("Stream error:", err);
            client.close();
        });

    } catch (e) {
        console.error('Error:', e);
    }
}

main();
