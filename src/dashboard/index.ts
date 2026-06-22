import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import router from './routes';
import registrationRouter from '../registration/index';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3000', 10);
const DB_PATH = path.join(__dirname, '../../db/alertbridge.db');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(registrationRouter);
app.use(router);

// Ensure tables exist (graceful if already created by registration-handler)
try {
  const db = new Database(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL UNIQUE,
      zip TEXT NOT NULL,
      language TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sent_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      alert_id TEXT NOT NULL,
      sent_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'sent',
      UNIQUE(phone, alert_id)
    );
  `);
  db.close();
} catch (err) {
  console.warn('[dashboard] Could not init DB:', err);
}

// Export start function for the orchestrator
export function startDashboard() {
  app.listen(PORT, () => {
    console.log(`[dashboard] Server running at http://localhost:${PORT}`);
  });
  return app;
}

export default app;