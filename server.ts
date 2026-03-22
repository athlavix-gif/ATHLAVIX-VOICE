import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("athlavix.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    whatsapp TEXT,
    avatar TEXT,
    skin_type TEXT,
    concerns TEXT,
    points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    badges TEXT DEFAULT '[]',
    completed_challenges TEXT DEFAULT '[]',
    history TEXT DEFAULT '[]',
    analysis_history TEXT DEFAULT '[]',
    voice_settings TEXT DEFAULT '{"preset":"soft","speed":1}',
    notification_settings TEXT DEFAULT '{"enabled":false,"dailyAlerts":true,"updateAlerts":true}',
    last_notification_at INTEGER,
    onboarding_seen TEXT DEFAULT '[]',
    challenge_progress TEXT DEFAULT '{}',
    streak INTEGER DEFAULT 0,
    last_check_in INTEGER
  );

  CREATE TABLE IF NOT EXISTS staff (
    id TEXT PRIMARY KEY,
    name TEXT,
    role TEXT,
    whatsapp TEXT,
    created_at INTEGER
  );
`);

// Migration: Add avatar column if it doesn't exist
try {
  db.exec("ALTER TABLE users ADD COLUMN avatar TEXT");
} catch (e) {
  // Column probably already exists
}

// Migration: Add completed_challenges column if it doesn't exist
try {
  db.exec("ALTER TABLE users ADD COLUMN completed_challenges TEXT DEFAULT '[]'");
} catch (e) {
  // Column probably already exists
}

// Migration: Add analysis_history, voice_settings, and onboarding_seen columns
try {
  db.exec("ALTER TABLE users ADD COLUMN analysis_history TEXT DEFAULT '[]'");
} catch (e) {}
try {
  db.exec("ALTER TABLE users ADD COLUMN voice_settings TEXT DEFAULT '{\"preset\":\"soft\",\"speed\":1}'");
} catch (e) {}
try {
  db.exec("ALTER TABLE users ADD COLUMN onboarding_seen TEXT DEFAULT '[]'");
} catch (e) {}
try {
  db.exec("ALTER TABLE users ADD COLUMN challenge_progress TEXT DEFAULT '{}'");
} catch (e) {}
try {
  db.exec("ALTER TABLE users ADD COLUMN streak INTEGER DEFAULT 0");
} catch (e) {}
try {
  db.exec("ALTER TABLE users ADD COLUMN last_check_in INTEGER");
} catch (e) {}
try {
  db.exec("ALTER TABLE users ADD COLUMN notification_settings TEXT DEFAULT '{\"enabled\":false,\"dailyAlerts\":true,\"updateAlerts\":true}'");
} catch (e) {}
try {
  db.exec("ALTER TABLE users ADD COLUMN last_notification_at INTEGER");
} catch (e) {}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' })); // Increase limit for images

  // API Routes
  app.get("/api/user/:id", (req, res) => {
    const { id } = req.params;
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
    if (user) {
      res.json({
        ...user,
        skinType: user.skin_type,
        concerns: JSON.parse(user.concerns || "[]"),
        badges: JSON.parse(user.badges || "[]"),
        completedChallenges: JSON.parse(user.completed_challenges || "[]"),
        history: JSON.parse(user.history || "[]"),
        analysisHistory: JSON.parse(user.analysis_history || "[]"),
        voiceSettings: JSON.parse(user.voice_settings || "{\"preset\":\"soft\",\"speed\":1}"),
        notificationSettings: JSON.parse(user.notification_settings || "{\"enabled\":false,\"dailyAlerts\":true,\"updateAlerts\":true}"),
        lastNotificationAt: user.last_notification_at,
        onboardingSeen: JSON.parse(user.onboarding_seen || "[]"),
        challengeProgress: JSON.parse(user.challenge_progress || "{}"),
        streak: user.streak || 0,
        lastCheckIn: user.last_check_in || null
      });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });

  // Admin Route: Get all users
  app.get("/api/admin/users", (req, res) => {
    const users = db.prepare("SELECT * FROM users").all() as any[];
    res.json(users.map(user => ({
      ...user,
      skinType: user.skin_type,
      concerns: JSON.parse(user.concerns || "[]"),
      badges: JSON.parse(user.badges || "[]"),
      completedChallenges: JSON.parse(user.completed_challenges || "[]"),
      history: JSON.parse(user.history || "[]"),
      analysisHistory: JSON.parse(user.analysis_history || "[]"),
      voiceSettings: JSON.parse(user.voice_settings || "{\"preset\":\"soft\",\"speed\":1}"),
      notificationSettings: JSON.parse(user.notification_settings || "{\"enabled\":false,\"dailyAlerts\":true,\"updateAlerts\":true}"),
      lastNotificationAt: user.last_notification_at,
      onboardingSeen: JSON.parse(user.onboarding_seen || "[]"),
      challengeProgress: JSON.parse(user.challenge_progress || "{}"),
      streak: user.streak || 0,
      lastCheckIn: user.last_check_in || null
    })));
  });

  // Public Leaderboard API
  app.get("/api/leaderboard", (req, res) => {
    const users = db.prepare("SELECT id, name, avatar, points, level FROM users ORDER BY points DESC LIMIT 10").all() as any[];
    res.json(users);
  });

  // Staff Routes
  app.get("/api/admin/staff", (req, res) => {
    const staff = db.prepare("SELECT * FROM staff ORDER BY created_at DESC").all();
    res.json(staff);
  });

  app.post("/api/admin/staff", (req, res) => {
    const { name, role, whatsapp } = req.body;
    const id = `staff_${Date.now()}`;
    const stmt = db.prepare("INSERT INTO staff (id, name, role, whatsapp, created_at) VALUES (?, ?, ?, ?, ?)");
    stmt.run(id, name, role, whatsapp, Date.now());
    res.json({ success: true, id });
  });

  app.delete("/api/admin/staff/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM staff WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.post("/api/user", (req, res) => {
    const { 
      id, name, whatsapp, avatar, skinType, concerns, points, level, 
      badges, completedChallenges, challengeProgress, history, analysisHistory, voiceSettings, 
      notificationSettings, lastNotificationAt, onboardingSeen, streak, lastCheckIn 
    } = req.body;
    
    const stmt = db.prepare(`
      INSERT INTO users (
        id, name, whatsapp, avatar, skin_type, concerns, points, level, 
        badges, completed_challenges, challenge_progress, history, analysis_history, voice_settings, 
        notification_settings, last_notification_at, onboarding_seen, streak, last_check_in
      )
      VALUES (
        @id, @name, @whatsapp, @avatar, @skin_type, @concerns, @points, @level, 
        @badges, @completed_challenges, @challenge_progress, @history, @analysis_history, @voice_settings, 
        @notification_settings, @last_notification_at, @onboarding_seen, @streak, @last_check_in
      )
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        whatsapp = excluded.whatsapp,
        avatar = excluded.avatar,
        skin_type = excluded.skin_type,
        concerns = excluded.concerns,
        points = excluded.points,
        level = excluded.level,
        badges = excluded.badges,
        completed_challenges = excluded.completed_challenges,
        challenge_progress = excluded.challenge_progress,
        history = excluded.history,
        analysis_history = excluded.analysis_history,
        voice_settings = excluded.voice_settings,
        notification_settings = excluded.notification_settings,
        last_notification_at = excluded.last_notification_at,
        onboarding_seen = excluded.onboarding_seen,
        streak = excluded.streak,
        last_check_in = excluded.last_check_in
    `);
    
    stmt.run({
      id,
      name,
      whatsapp: whatsapp || "",
      avatar: avatar || null,
      skin_type: skinType || null,
      concerns: JSON.stringify(concerns || []),
      points: points || 0,
      level: level || 1,
      badges: JSON.stringify(badges || []),
      completed_challenges: JSON.stringify(completedChallenges || []),
      challenge_progress: JSON.stringify(challengeProgress || {}),
      history: JSON.stringify(history || []),
      analysis_history: JSON.stringify(analysisHistory || []),
      voice_settings: JSON.stringify(voiceSettings || { preset: "soft", speed: 1 }),
      notification_settings: JSON.stringify(notificationSettings || { enabled: false, dailyAlerts: true, updateAlerts: true }),
      last_notification_at: lastNotificationAt || null,
      onboarding_seen: JSON.stringify(onboardingSeen || []),
      streak: streak || 0,
      last_check_in: lastCheckIn || null
    });
    
    res.json({ success: true });
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
