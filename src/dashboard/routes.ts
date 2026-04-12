import { Router, Request, Response } from 'express';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { renderDashboard, DashboardData } from './template';
import { getMockSmsLog, getMockSmsCount, dispatchAlert, clearMockSmsState } from '../dispatcher/index';
import { clearSqliteData } from '../registration/db';
import { clearTranslationCache } from '../rewriter/cache';
import { matchByZip } from '../matcher/index';
import { rewriteDispatch } from '../rewriter/index';
import { Alert } from '../poller/types';
import { getScenario, scenarioIds, SIMULATE_SCENARIOS } from './simulateScenarios';

const DB_PATH = path.join(__dirname, '../../db/alertbridge.db');

function getDb(): Database.Database | null {
  try {
    return new Database(DB_PATH);
  } catch {
    return null;
  }
}

const router = Router();

// --- GET / — server-rendered dashboard shell ---
router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const data: DashboardData = {
    totalUsers: 0,
    languageBreakdown: [],
    totalSmsSent: getMockSmsCount(),
    subscribers: [],
  };

  if (db) {
    try {
      const row = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
      data.totalUsers = row.count;
    } catch { /* table may not exist yet */ }

    try {
      data.languageBreakdown = db.prepare(
        'SELECT language, COUNT(*) as count FROM users GROUP BY language ORDER BY count DESC'
      ).all() as { language: string; count: number }[];
    } catch { /* ignore */ }

    try {
      const rows = db
        .prepare('SELECT phone, zip, language FROM users ORDER BY zip, language')
        .all() as { phone: string; zip: string; language: string }[];
      data.subscribers = rows.map((r) => ({
        zip: r.zip,
        language: r.language,
        phoneLast4: r.phone.replace(/\D/g, '').slice(-4),
      }));
    } catch { /* ignore */ }

    db.close();
  }

  res.setHeader('Content-Type', 'text/html');
  res.send(renderDashboard(data));
});

// --- GET /docs/disasters — markdown reference (linked from dashboard) ---
router.get('/docs/disasters', (_req: Request, res: Response) => {
  const docPath = path.join(__dirname, '../../docs/disasters.md');
  try {
    const body = fs.readFileSync(docPath, 'utf8');
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.send(body);
  } catch {
    res.status(404).type('text/plain').send('disasters.md not found');
  }
});

// --- GET /api/sms-log — live JSON feed for the SMS log panel ---
router.get('/api/sms-log', (_req: Request, res: Response) => {
  res.json(getMockSmsLog());
});


// --- GET /api/subscribers — JSON for live subscriber table ---
router.get("/api/subscribers", (_req: Request, res: Response) => {
  const db = getDb();
  const subscribers: { zip: string; language: string; phoneLast4: string }[] = [];
  if (db) {
    try {
      const rows = db
        .prepare("SELECT phone, zip, language FROM users ORDER BY zip, language")
        .all() as { phone: string; zip: string; language: string }[];
      for (const row of rows) {
        subscribers.push({
          zip: row.zip,
          language: row.language,
          phoneLast4: row.phone.replace(/\D/g, "").slice(-4),
        });
      }
    } catch { /* ignore */ }
    db.close();
  }
  res.json({ subscribers });
});

// --- GET /api/stats — live stats for counter updates ---
router.get('/api/stats', (_req: Request, res: Response) => {
  const db = getDb();
  let totalUsers = 0;
  let languageBreakdown: { language: string; count: number }[] = [];

  if (db) {
    try {
      const row = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
      totalUsers = row.count;
    } catch { /* ignore */ }
    try {
      languageBreakdown = db.prepare(
        'SELECT language, COUNT(*) as count FROM users GROUP BY language ORDER BY count DESC'
      ).all() as { language: string; count: number }[];
    } catch { /* ignore */ }
    db.close();
  }

  res.json({ totalUsers, languageBreakdown, totalSmsSent: getMockSmsCount() });
});

// --- POST /api/clear-data — wipe SQLite demo tables + in-process mock SMS / translation cache ---
router.post('/api/clear-data', (_req: Request, res: Response) => {
  try {
    clearSqliteData();
    clearMockSmsState();
    clearTranslationCache();
    res.json({ ok: true, message: 'Demo data cleared.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[dashboard] clear-data:', err);
    res.status(500).json({ ok: false, message });
  }
});

// --- GET /api/simulate-scenarios — ids + labels for dashboard dropdown ---
router.get('/api/simulate-scenarios', (_req: Request, res: Response) => {
  res.json({
    scenarios: SIMULATE_SCENARIOS.map(({ id, label }) => ({ id, label })),
  });
});

// --- POST /simulate — full pipeline: build alert → match → rewrite → dispatch ---
router.post('/simulate', async (req: Request, res: Response) => {
  const zip: string = String(req.body?.zip ?? '00000').trim();
  const scenario = getScenario(req.body?.scenario ?? req.body?.scenarioId);
  if (!scenario) {
    res.status(400).json({
      ok: false,
      message: `Unknown scenario. Valid ids: ${scenarioIds().join(', ')}`,
    });
    return;
  }

  const alertId = `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const fakeAlert: Alert = {
    id: alertId,
    event: scenario.event,
    severity: scenario.severity,
    onset: new Date().toISOString(),
    expires: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    areaDesc: `Area including ZIP ${zip}`,
    description: scenario.description,
    fipsCodes: [],
    fetchedAt: new Date().toISOString(),
  };

  console.log(
    `[dashboard] Simulating ${scenario.id} for ZIP ${zip} (id: ${alertId})`
  );

  try {
    const dispatch = matchByZip(fakeAlert, zip);

    if (dispatch.users.length === 0) {
      res.json({
        ok: false,
        message: `No registered users found in ZIP ${zip}. Register a phone number first via POST /sms.`,
        alertId,
      });
      return;
    }

    const translations = await rewriteDispatch(dispatch);
    await dispatchAlert(dispatch, translations);

    res.json({
      ok: true,
      message: `Alert dispatched to ${dispatch.users.length} user(s) in ZIP ${zip} (${scenario.label}).`,
      alertId,
      scenario: scenario.id,
      userCount: dispatch.users.length,
      languages: Object.keys(translations),
    });
  } catch (err: any) {
    console.error('[dashboard] Simulate error:', err);
    res.status(500).json({ ok: false, message: err.message ?? 'Internal error' });
  }
});

export default router;
