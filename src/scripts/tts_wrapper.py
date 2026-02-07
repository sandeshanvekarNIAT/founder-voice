
import sys
import json
import asyncio
import base64
import edge_tts

# Default Voice
VOICE = "en-US-AndrewMultilingualNeural"

async def generate_audio(text):
    communicate = edge_tts.Communicate(text, VOICE)
    audio_data = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data += chunk["data"]
    return base64.b64encode(audio_data).decode('utf-8')

async def main():
    # Use standard input for communication
    while True:
        line = await asyncio.to_thread(sys.stdin.readline)
        if not line:
            break
        
        try:
            data = json.loads(line)
            text = data.get("text")
            if not text:
                sys.stdout.write(json.dumps({"error": "No text provided"}) + "\n")
                sys.stdout.flush()
                continue
            
            # Generate
            audio_b64 = await generate_audio(text)
            
            # Respond
            response = {"audio": audio_b64}
            sys.stdout.write(json.dumps(response) + "\n")
            sys.stdout.flush()
        except Exception as e:
            error_response = {"error": str(e)}
            sys.stdout.write(json.dumps(error_response) + "\n")
            sys.stdout.flush()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    run_loop = asyncio.new_event_loop()
    asyncio.set_event_loop(run_loop)
    run_loop.run_until_complete(main())
