import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("MISSING SUPABASE CONFIGURATION: Please set SUPABASE_URL and SUPABASE_ANON_KEY in your environment variables.");
}

const supabase = createClient(supabaseUrl || "", supabaseKey || "");

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
      id, name, whatsapp, avatar, skinType, concerns, points, level, 
      badges, completedChallenges, challengeProgress, history, analysisHistory, voiceSettings, 
      notificationSettings, lastNotificationAt, onboardingSeen, streak, lastCheckIn 
    } = req.body;
    
    const userData = {
      id,
      name,
      whatsapp: whatsapp || "",
      avatar: avatar || null,
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
