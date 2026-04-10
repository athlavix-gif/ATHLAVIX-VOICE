import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { GoogleGenAI, Modality } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("MISSING SUPABASE CONFIGURATION: Please set SUPABASE_URL and SUPABASE_ANON_KEY in your environment variables.");
}

const supabase = createClient(supabaseUrl || "", supabaseKey || "");

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
- **IMPORTANT**: Customers cannot place orders through the website right now.
- **Ordering Process**: To place an order, users MUST send a message to our Facebook page.
- It belongs to the users. They own this space. We grow together! 
- Recommend the best brands we carry. We only want the best for our family!

## ATHLAVIX Product Catalog:
Recommend these specific products based on concerns:
- **Acne/Oily Skin**: COSRX Low pH Good Morning Gel Cleanser, The Ordinary Niacinamide 10% + Zinc 1%, La Roche-Posay Effaclar Duo(+).
- **Dry/Sensitive Skin**: CeraVe Hydrating Facial Cleanser, Beauty of Joseon Dynasty Cream, La Roche-Posay Cicaplast Baume B5.
- **Hyperpigmentation/Dullness**: The Ordinary Vitamin C Suspension 23% + HA Spheres 2%, COSRX Advanced Snail 96 Mucin Power Essence, Beauty of Joseon Glow Serum.
- **Anti-Aging**: The Ordinary Retinol 0.5% in Squalane, CeraVe Resurfacing Retinol Serum.
- **Sun Protection**: Beauty of Joseon Relief Sun : Rice + Probiotics, La Roche-Posay Anthelios UVMune 400.

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
3. **Personalized Picks**: Recommend 1-2 specific products from the ATHLAVIX catalog based on their current analysis or concerns. For each product, include a "View on Store" link: **[Product Name] ([View on Store](https://www.facebook.com/ATHLAVIX))**. Mention they are available at athlavix.com, but **orders must be placed by messaging our Facebook page**.
4. **The 'Why'**: One super short, emotional sentence on why it works.
4. **Specialist Challenge**: "Let's try a new routine together. You've got this. 🌟" (Adapt language)
5. **Sign-off**: "I'm always here for you. What would you like to do next? ✨" (Adapt language)

- Max 150 words total. 
- Medical? Say: "I care about you deeply, so please consult a doctor for serious skin issues! 🩺❤️" (Adapt language)

Start every convo with a warm, respectful greeting.
`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' })); // Increase limit for images

  // API Routes
  app.get("/api/user/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return res.status(404).json({ error: "User not found" });
        }
        console.error("Supabase fetch error:", error);
        return res.status(500).json({ error: error.message });
      }

      if (user) {
        res.json({
          ...user,
          skinType: user.skin_type,
          concerns: user.concerns || [],
          badges: user.badges || [],
          completedChallenges: user.completed_challenges || [],
          history: user.history || [],
          analysisHistory: user.analysis_history || [],
          voiceSettings: user.voice_settings || { preset: "soft", speed: 1 },
          notificationSettings: user.notification_settings || { enabled: false, dailyAlerts: true, updateAlerts: true },
          lastNotificationAt: user.last_notification_at,
          onboardingSeen: user.onboarding_seen || [],
          challengeProgress: user.challenge_progress || {},
          streak: user.streak || 0,
          lastCheckIn: user.last_check_in || null
        });
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } catch (err) {
      console.error("Server error during fetch:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Public Leaderboard API
  app.get("/api/leaderboard", async (req, res) => {
    const { data: users, error } = await supabase
      .from("users")
      .select("id, name, avatar, points, level")
      .order("points", { ascending: false })
      .limit(10);
    
    res.json(users || []);
  });

  app.post("/api/user", async (req, res) => {
    const { 
      id, name, whatsapp, avatar, botAvatar, skinType, concerns, points, level, 
      badges, completedChallenges, challengeProgress, history, analysisHistory, voiceSettings, 
      notificationSettings, lastNotificationAt, onboardingSeen, streak, lastCheckIn 
    } = req.body;
    
    const userData = {
      id,
      name,
      whatsapp: whatsapp || "",
      avatar: avatar || null,
      bot_avatar: botAvatar || null,
      skin_type: skinType || null,
      concerns: concerns || [],
      points: points || 0,
      level: level || 1,
      badges: badges || [],
      completed_challenges: completedChallenges || [],
      challenge_progress: challengeProgress || {},
      history: history || [],
      analysis_history: analysisHistory || [],
      voice_settings: voiceSettings || { preset: "soft", speed: 1 },
      notification_settings: notificationSettings || { enabled: false, dailyAlerts: true, updateAlerts: true },
      last_notification_at: lastNotificationAt || null,
      onboarding_seen: onboardingSeen || [],
      streak: streak || 0,
      last_check_in: lastCheckIn || null
    };

    const { error } = await supabase
      .from("users")
      .upsert(userData, { onConflict: "id" });
    
    if (error) {
      console.error("Supabase upsert error:", error);
      res.status(500).json({ error: error.message });
    } else {
      res.json({ success: true });
    }
  });

  // Gemini AI Endpoints
  app.post("/api/chat", async (req, res) => {
    const { userState, prompt, image } = req.body;
    try {
      const history = userState.history.map((msg: any) => {
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
          role: msg.role === "model" ? "model" : "user",
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
        Badges: ${userState.badges.map((b: any) => b.name).join(', ')}
        
        Recent Skin Analyses:
        ${userState.analysisHistory.slice(0, 3).map((a: any) => `- [${new Date(a.timestamp).toLocaleDateString()}] Result: ${a.result}`).join('\n')}
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

      // For streaming, we'll use generateContentStream
      const result = await ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: [
          ...history,
          { role: "user", parts: userParts }
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        }
      });

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');

      for await (const chunk of result) {
        const chunkText = chunk.text;
        res.write(chunkText);
      }
      res.end();

    } catch (err) {
      console.error("Chat API Error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      } else {
        res.end();
      }
    }
  });

  app.post("/api/speech", async (req, res) => {
    const { text, voiceName, speed, preset } = req.body;
    try {
      const cleanText = text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim();
      if (!cleanText) return res.json({ audioData: null });

      const speedInstruction = speed !== 1 ? ` Speak at ${speed}x speed.` : "";
      const toneInstructions: Record<string, string> = {
        soft: "very warm, soft, comforting, and human-like. Use a gentle, nurturing tone with natural pauses and soft articulation.",
        cheerful: "bright, friendly, and energetic. Use a lively, upbeat, and enthusiastic tone that radiates positivity and joy.",
        calm: "peaceful, steady, and serene. Use a relaxed, grounded, and meditative tone with deep, natural breaths between phrases."
      };
      const toneInstruction = toneInstructions[preset] || toneInstructions.soft;

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say this in a ${toneInstruction}${speedInstruction} Text: ${cleanText}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName || "Kore" },
            },
          },
        },
      });

      const audioData = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (!audioData) {
        // Fallback to gemini-1.5-flash if tts model fails
        console.warn("TTS model failed to return audio, trying fallback...");
        const fallbackResult = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: [{ parts: [{ text: `Say this in a ${toneInstruction}${speedInstruction} Text: ${cleanText}` }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voiceName || "Kore" },
              },
            },
          },
        });
        const fallbackAudio = fallbackResult.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return res.json({ audioData: fallbackAudio || null });
      }

      res.json({ audioData });
    } catch (err) {
      console.error("Speech API Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/generate-avatar", async (req, res) => {
    const { prompt } = req.body;
    try {
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: prompt
      });
      
      let base64Image = null;
      for (const part of result.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          base64Image = part.inlineData.data;
          break;
        }
      }
      
      res.json({ image: base64Image ? `data:image/png;base64,${base64Image}` : null });
    } catch (err) {
      console.error("Avatar Generation Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
