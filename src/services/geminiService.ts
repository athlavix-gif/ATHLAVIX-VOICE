import { UserState } from "../types";

export async function getGeminiSpeech(text: string, voiceName: string = 'Kore', speed: number = 1, preset: string = 'soft') {
  try {
    const res = await fetch("/api/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voiceName, speed, preset }),
    });

    if (!res.ok) throw new Error("Speech API failed");
    const { audioData } = await res.json();

    if (audioData) {
      return createWavUrl(audioData, 24000);
    }
    return null;
  } catch (error) {
    console.error("Speech Generation Error:", error);
    return null;
  }
}

function createWavUrl(base64Pcm: string, sampleRate: number) {
  const binaryString = atob(base64Pcm);
  const len = binaryString.length;
  const buffer = new ArrayBuffer(44 + len);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + len, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // AudioFormat (PCM)
  view.setUint16(22, 1, true); // NumChannels (Mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, len, true);

  // Write PCM samples
  for (let i = 0; i < len; i++) {
    view.setUint8(44 + i, binaryString.charCodeAt(i));
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export async function getGeminiResponse(userState: UserState, prompt: string, image?: string) {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userState, prompt, image }),
    });

    if (!res.ok) throw new Error("Chat API failed");
    return await res.text();
  } catch (error) {
    console.error("AI Error:", error);
    return "I'm sorry, I couldn't process that. Please try again! 😊";
  }
}

export async function* getGeminiResponseStream(userState: UserState, prompt: string, image?: string) {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userState, prompt, image }),
    });

    if (!res.ok) throw new Error("Chat API failed");

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No reader available");

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield decoder.decode(value, { stream: true });
    }
  } catch (error) {
    console.error("AI Stream Error:", error);
    yield "I'm sorry, I'm having trouble connecting right now. Please try again in a moment! 😊";
  }
}
