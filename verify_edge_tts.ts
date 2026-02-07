
import { writeFile } from 'fs/promises';
import { randomBytes } from 'crypto';
import WebSocket from 'ws';

const EDGE_WS_URL = "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4";

const VOICE = "en-US-AndrewMultilingualNeural";

function createSSML(text: string) {
    return `
        <speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>
            <voice name='${VOICE}'>
                <prosody pitch='+0Hz' rate='+0%'>${text}</prosody>
            </voice>
        </speak>
    `.trim();
}

function generateRequestId() {
    return randomBytes(16).toString('hex');
}

async function testEdgeTTS() {
    console.log("Connecting to Edge TTS...");

    const ws = new WebSocket(EDGE_WS_URL, {
        headers: {
            "Pragma": "no-cache",
            "Cache-Control": "no-cache",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36 Edg/91.0.864.41",
            "Origin": "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold"
        }
    });

    const audioChunks: Buffer[] = [];

    return new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
            console.log("Connected!");
            const requestId = generateRequestId();

            // 1. Send Configuration
            const configMsg = `X-Timestamp:${new Date().toString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
                JSON.stringify({
                    context: {
                        synthesis: {
                            audio: {
                                metadataoptions: { sentenceBoundaryEnabled: "false", wordBoundaryEnabled: "false" },
                                outputFormat: "audio-24khz-48kbitrate-mono-mp3"
                            }
                        }
                    }
                });

            ws.send(configMsg);

            // 2. Send SSML
            const ssml = createSSML("This is a test of the natural AI voice for the founder pitch application. It should sound realistic. If you can hear this, the setup is working perfectly.");
            const ssmlMsg = `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n` + ssml;

            ws.send(ssmlMsg);
        });

        ws.on('message', async (data, isBinary) => {
            if (isBinary) {
                const buffer = data as Buffer;

                // Protocol: First 2 bytes are header length
                const headerLen = buffer.readUInt16BE(0);
                const header = buffer.subarray(2, headerLen).toString();

                if (header.includes("Path:audio")) {
                    const audioData = buffer.subarray(headerLen); // Skip header
                    audioChunks.push(audioData);
                } else if (header.includes("Path:turn.end")) {
                    console.log("Turn end received.");
                    ws.close();
                }

            } else {
                const text = data.toString();
                console.log("Text message:", text);
                if (text.includes("turn.end")) {
                    ws.close();
                }
            }
        });

        ws.on('close', async () => {
            console.log("Connection closed.");
            if (audioChunks.length > 0) {
                const finalBuffer = Buffer.concat(audioChunks);
                await writeFile("test_output.mp3", finalBuffer);
                console.log(`Saved test_output.mp3 (${finalBuffer.length} bytes)`);
                resolve();
            } else {
                reject(new Error("No audio received"));
            }
        });

        ws.on('error', (err) => {
            console.error("WebSocket Error:", err);
            reject(err);
        });
    });
}

testEdgeTTS().catch(console.error);
