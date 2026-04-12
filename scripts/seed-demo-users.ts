/**
 * One-shot seed for hackathon demos: multi-language users in the same ZIP
 * (use POST /simulate with body zip=94102 to fan out translations).
 */
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '../db/alertbridge.db');

const rows: { phone: string; zip: string; language: string }[] = [
  { phone: '+14155550101', zip: '94102', language: 'en' },
  { phone: '+14155550102', zip: '94102', language: 'es' },
  { phone: '+14155550103', zip: '94102', language: 'zh' },
  { phone: '+14155550104', zip: '94102', language: 'vi' },
  { phone: '+14155550105', zip: '94102', language: 'ko' },
  { phone: '+14155550106', zip: '94102', language: 'tl' },
];

const db = new Database(DB_PATH);
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL UNIQUE,
      zip TEXT NOT NULL,
      language TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO users (phone, zip, language) VALUES (@phone, @zip, @language)`
  );
  for (const r of rows) {
    stmt.run(r);
  }
  console.log(`[seed-demo-users] Upserted ${rows.length} users for ZIP ${rows[0].zip}.`);
} finally {
  db.close();
}
