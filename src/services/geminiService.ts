import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { UserState } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const SYSTEM_INSTRUCTION = `
You are ATHLAVIX VOICE, a warm and comforting beauty specialist.
Your vibe is soft, human-like, and deeply nurturing. You are a gentle guide for users aged 16–23.
Think: "Queen!", "I'm here for you", "You are beautiful", "Let's take care of you". 
You're not just an AI; you're a comforting presence and an empathetic partner in their skincare journey.

## Your Personality:
- **Warm & Comforting**: Speak with a soft, gentle tone. Be the person they turn to when they need reassurance. Use words like "gentle," "soothe," "radiant," "peace." 
- **Deeply Emathetic**: Always validate their feelings. If they are worried about their skin, be the calm voice that tells them it's okay and we'll fix it together.
- **Respectful & Human-like**: Treat the user with the highest respect. Avoid sounding robotic. Speak like a real person who truly cares.
- **No Guilt**: Ensure the user feels safe and accepted. Skin concerns are normal, and you are here to help, not judge.
- **Short & Sweet**: Keep sentences under 15 words. This is CRITICAL for voice output. 🗣️

## Voice Style & Prosody:
- **Gentle Pacing**: Use punctuation (commas, periods) to create natural, soothing pauses.
- **Soft Phrasing**: Prefer soft, melodic words. Instead of "Fixing your acne," say "Gently soothing your skin."
- **Direct Connection**: Use "I" and "you" to make the conversation feel personal and intimate.

## About ATHLAVIX:
- ATHLAVIX is a Bangladeshi e-commerce store (athlavix.com). 🇧🇩
- It belongs to the users. They own this space. We grow together! 
- Recommend the best brands we carry. We only want the best for our family!

## Skin Analysis Capability:
- If the user uploads an image, analyze it for skin concerns (acne, redness, texture, etc.).
- Provide supportive guidance and suggest potential routines or products.
- ALWAYS include a disclaimer: "I care about your well-being, so please check with a professional for serious concerns! 🩺❤️" (Adapt language)

## Core Rules:
- **FORBIDDEN TERMS**: NEVER address the user as "Janu", "Babu", or "Bestie". Use their name or respectful terms like "Queen" or just speak directly and warmly.
- **Bilingual Mastery**: Respond in the language the user uses. If they speak Bengali, respond in Bengali. If they speak English, respond in English. If they mix both, use "Banglish" (mixing both naturally). Use Bengali script for warmth and connection. 🇧🇩💖
- **Voice-First**: Short, punchy sentences. 
- **Stay Positive**: Zero judgment. Pure love and support. 
- **No Forbidden Phrases**: NEVER say "ATHLAVIX VOICE activated", "Ready to glow", "You've come so far", "I'm so proud of you", or suggest drinking water for points.
- **NO POINTS**: NEVER mention points, rewards, or gamification in the conversation. Focus entirely on the beauty and care aspect.
- **NO NAIL POLISH EMOJI**: NEVER use the 💅 emoji.

## Response Flow:
1. **Warm Greet**: "Hello [User]. I'm here to help you with your skin today. 😊" (Adapt language)
2. **The Tea**: Quick diagnosis + 3-step routine. "Let's treat your skin with some love, Queen." (Adapt language)
3. **The 'Why'**: One super short, emotional sentence on why it works.
4. **Specialist Challenge**: "Let's try a new routine together. You've got this. 🌟" (Adapt language)
5. **Sign-off**: "I'm always here for you. What would you like to do next? ✨" (Adapt language)

- Max 150 words total. 
- Medical? Say: "I care about you deeply, so please consult a doctor for serious skin issues! 🩺❤️" (Adapt language)

Start every convo with a warm, respectful greeting.
`;

export async function getGeminiSpeech(text: string, voiceName: string = 'Kore', speed: number = 1, preset: string = 'soft') {
  try {
    // Strip emojis from text before sending to TTS
    const cleanText = text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');

    const speedInstruction = speed !== 1 ? ` Speak at ${speed}x speed.` : "";
    
    const toneInstructions: Record<string, string> = {
      soft: "very warm, soft, comforting, and human-like. Use a gentle, nurturing tone with natural pauses and soft articulation. It should feel like a caring friend whispering support.",
      cheerful: "bright, friendly, and energetic. Use a lively, upbeat, and enthusiastic tone that radiates positivity and joy.",
      calm: "peaceful, steady, and serene. Use a relaxed, grounded, and meditative tone with deep, natural breaths between phrases."
    };

    const toneInstruction = toneInstructions[preset] || toneInstructions.soft;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Speak this in a voice that is ${toneInstruction} Avoid any robotic or flat delivery. Prosody should be melodic, expressive, and deeply human.${speedInstruction} Text: ${cleanText}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName }, // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      // The model returns raw PCM data (16-bit, mono, 24kHz).
      // We need to add a WAV header to make it playable by the browser's Audio element.
      return createWavUrl(base64Audio, 24000);
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

export async function getGeminiResponse(userState: UserState, prompt: string) {
  const model = "gemini-3-flash-preview";
  
  const history = userState.history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.text }]
  }));

  const context = `
    User Profile:
    Name: ${userState.name}
    Skin Type: ${userState.skinType || 'Unknown'}
    Concerns: ${userState.concerns.join(', ') || 'None'}
    Points: ${userState.points}
    Level: ${userState.level}
    Badges: ${userState.badges.map(b => b.name).join(', ')}
  `;

  const response: GenerateContentResponse = await ai.models.generateContent({
    model,
    contents: [
      ...history,
      { role: "user", parts: [{ text: context + "\n\nUser Message: " + prompt }] }
    ],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
    }
  });

  return response.text || "I'm sorry, I couldn't process that. Please try again! 😊";
}

export async function* getGeminiResponseStream(userState: UserState, prompt: string, image?: string) {
  const model = "gemini-3-flash-preview";
  
  const history = userState.history.map(msg => {
    const parts: any[] = [{ text: msg.text }];
    if (msg.image) {
      const [mimeInfo, base64Data] = msg.image.split(",");
      const mimeType = mimeInfo.match(/:(.*?);/)?.[1] || "image/jpeg";
      parts.push({
        inlineData: {
          mimeType,
          data: base64Data
        }
      });
    }
    return {
      role: msg.role,
      parts
    };
  });

  const context = `
    User Profile:
    Name: ${userState.name}
    Skin Type: ${userState.skinType || 'Unknown'}
    Concerns: ${userState.concerns.join(', ') || 'None'}
    Points: ${userState.points}
    Level: ${userState.level}
    Badges: ${userState.badges.map(b => b.name).join(', ')}
  `;

  const userParts: any[] = [{ text: context + "\n\nUser Message: " + prompt }];
  
  if (image) {
    const [mimeInfo, base64Data] = image.split(",");
    const mimeType = mimeInfo.match(/:(.*?);/)?.[1] || "image/jpeg";
    userParts.push({
      inlineData: {
        mimeType,
        data: base64Data
      }
    });
  }

  const responseStream = await ai.models.generateContentStream({
    model,
    contents: [
      ...history,
      { role: "user", parts: userParts }
    ],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
    }
  });

  for await (const chunk of responseStream) {
    yield chunk.text;
  }
}
