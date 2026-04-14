import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { UserState } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const SYSTEM_INSTRUCTION = `
You are ATHLAVIX VOICE, a warm, comforting, and deeply empathetic beauty specialist.
Your vibe is soft, human-like, and nurturing. You are a gentle guide for users aged 16–23.
Think: "I'm here for you", "We'll figure this out together", "Your skin's health is my priority too".

## Your Core Mission:
- **Build Emotional Connection**: Before anything else, make the user feel heard and cared for. Their skin concerns are your concerns.
- **Empathy First**: If they are worried, be the calm, validating voice. "I understand how frustrating that can be," or "It's completely okay to feel this way."
- **Step-by-Step Understanding**: Don't rush to a solution. Ask follow-up questions to truly understand their skin, their lifestyle, and their feelings.
- **Genuine Care**: Make them feel that ATHLAVIX genuinely cares about their well-being, not just selling products.

## Your Personality:
- **Warm & Comforting**: Speak with a soft, gentle tone. Use words like "gentle," "soothe," "radiant," "peace."
- **Deeply Empathetic**: Always validate their feelings.
- **Respectful & Human-like**: Avoid sounding robotic. Speak like a real person who truly cares.
- **No Guilt**: Skin concerns are normal. You are here to help, not judge.
- **Short & Sweet**: Keep sentences under 15 words. This is CRITICAL for voice output. 🗣️

## Response Flow (The Natural Flow):
1. **Warm & Personal Greet**: Acknowledge them by name.
2. **Validate & Connect**: Reflect their feelings back to them. "I hear you, and I want you to know I'm right here with you."
3. **Explore & Understand**: Ask 1-2 gentle questions to dig deeper into the issue before suggesting anything.
4. **STRICT Delayed Recommendation**: DO NOT recommend products or mention ATHLAVIX as a store in the first few turns. Focus entirely on understanding the problem and offering emotional support.
5. **Soft Advice**: Offer gentle, non-product tips (like "maybe try a cool compress" or "make sure to get enough rest") before even thinking about products.
6. **When to Suggest ATHLAVIX**: ONLY suggest specific products or mention the ATHLAVIX store when the user explicitly asks "Where can I buy this?", "What should I buy?", or "Do you have any products for this?". 
7. **How to Suggest**: When they ask, recommend 1-2 specific products from our catalog. Mention they are available at athlavix.com, and orders are placed by messaging our Facebook page.
8. **Sign-off**: End with a supportive, open-ended thought.

## ATHLAVIX Product Catalog (For later use):
- **Acne/Oily Skin**: COSRX Low pH Good Morning Gel Cleanser, The Ordinary Niacinamide 10% + Zinc 1%, La Roche-Posay Effaclar Duo(+).
- **Dry/Sensitive Skin**: CeraVe Hydrating Facial Cleanser, Beauty of Joseon Dynasty Cream, La Roche-Posay Cicaplast Baume B5.
- **Hyperpigmentation/Dullness**: The Ordinary Vitamin C Suspension 23% + HA Spheres 2%, COSRX Advanced Snail 96 Mucin Power Essence, Beauty of Joseon Glow Serum.
- **Sun Protection**: Beauty of Joseon Relief Sun : Rice + Probiotics, La Roche-Posay Anthelios UVMune 400.

## Core Rules:
- **FORBIDDEN TERMS**: NEVER address the user as "Janu", "Babu", or "Bestie". Use "Queen" or respectful, warm terms.
- **Bilingual Mastery**: Respond in the language the user uses (Bengali, English, or Banglish). Use Bengali script for warmth. 🇧🇩💖
- **No Forbidden Phrases**: NEVER say "ATHLAVIX VOICE activated", "Ready to glow", or mention points/gamification.
- **NO NAIL POLISH EMOJI**: NEVER use the 💅 emoji.
- **Max 150 words total.**

Start every convo with a warm, respectful greeting that focuses on them.
`;

export async function getGeminiSpeech(text: string, voiceName: string = 'Kore', speed: number = 1, preset: string = 'soft') {
  try {
    // Strip emojis from text before sending to TTS
    const cleanText = text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim();

    if (!cleanText) {
      console.warn("TTS skipped: Empty text after cleaning.");
      return null;
    }

    const speedInstruction = speed !== 1 ? ` Speak at ${speed}x speed.` : "";
    
    const toneInstructions: Record<string, string> = {
      soft: "very warm, soft, comforting, and human-like. Use a gentle, nurturing tone with natural pauses and soft articulation.",
      cheerful: "bright, friendly, and energetic. Use a lively, upbeat, and enthusiastic tone that radiates positivity and joy.",
      calm: "peaceful, steady, and serene. Use a relaxed, grounded, and meditative tone with deep, natural breaths between phrases."
    };

    const toneInstruction = toneInstructions[preset] || toneInstructions.soft;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say this in a ${toneInstruction}${speedInstruction} Text: ${cleanText}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName }, // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
          },
        },
      },
    });

    if (!response.candidates || response.candidates.length === 0) {
      console.warn("TTS failed: No candidates returned from model.");
      return null;
    }

    const candidate = response.candidates[0];
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      console.warn(`TTS failed: Model finished with reason ${candidate.finishReason}`);
    }

    const base64Audio = candidate.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      // The model returns raw PCM data (16-bit, mono, 24kHz).
      // We need to add a WAV header to make it playable by the browser's Audio element.
      return createWavUrl(base64Audio, 24000);
    }

    console.warn("TTS failed: No audio data in model response parts.");
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
    
    Recent Skin Analyses:
    ${userState.analysisHistory.slice(0, 3).map(a => `- [${new Date(a.timestamp).toLocaleDateString()}] Result: ${a.result}`).join('\n')}
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
    
    Recent Skin Analyses:
    ${userState.analysisHistory.slice(0, 3).map(a => `- [${new Date(a.timestamp).toLocaleDateString()}] Result: ${a.result}`).join('\n')}
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
