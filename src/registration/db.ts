import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '../../db/alertbridge.db');

export const db = new Database(DB_PATH);

// Create tables on startup
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

export interface UserRecord {
  phone: string;
  zip: string;
  language: string;
}

const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO users (phone, zip, language)
  VALUES (@phone, @zip, @language)
`);

export function insertUser(user: UserRecord): void {
  insertStmt.run(user);
}
