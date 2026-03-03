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
    skin_type TEXT,
    concerns TEXT,
    points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    badges TEXT DEFAULT '[]',
    completed_challenges TEXT DEFAULT '[]',
    history TEXT DEFAULT '[]'
  )
`);

// Migration: Add completed_challenges column if it doesn't exist
try {
  db.exec("ALTER TABLE users ADD COLUMN completed_challenges TEXT DEFAULT '[]'");
} catch (e) {
  // Column probably already exists
}

// Migration: Add whatsapp column if it doesn't exist
try {
  db.exec("ALTER TABLE users ADD COLUMN whatsapp TEXT");
} catch (e) {
  // Column probably already exists
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
        history: JSON.parse(user.history || "[]")
      });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });

  app.post("/api/user", (req, res) => {
    const { id, name, whatsapp, skinType, concerns, points, level, badges, completedChallenges, history } = req.body;
    const stmt = db.prepare(`
      INSERT INTO users (id, name, whatsapp, skin_type, concerns, points, level, badges, completed_challenges, history)
      VALUES (@id, @name, @whatsapp, @skin_type, @concerns, @points, @level, @badges, @completed_challenges, @history)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        whatsapp = excluded.whatsapp,
        skin_type = excluded.skin_type,
        concerns = excluded.concerns,
        points = excluded.points,
        level = excluded.level,
        badges = excluded.badges,
        completed_challenges = excluded.completed_challenges,
        history = excluded.history
    `);
    
    stmt.run({
      id,
      name,
      whatsapp: whatsapp || "",
      skin_type: skinType || null,
      concerns: JSON.stringify(concerns || []),
      points: points || 0,
      level: level || 1,
      badges: JSON.stringify(badges || []),
      completed_challenges: JSON.stringify(completedChallenges || []),
      history: JSON.stringify(history || [])
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
