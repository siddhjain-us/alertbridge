import { Router, Request, Response } from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import { renderDashboard, DashboardData } from './template';
import { getMockSmsLog, getMockSmsCount, dispatchAlert } from '../dispatcher/index';
import { matchByZip } from '../matcher/index';
import { rewriteDispatch } from '../rewriter/index';
import { Alert } from '../poller/types';

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

    db.close();
  }

  res.setHeader('Content-Type', 'text/html');
  res.send(renderDashboard(data));
});

// --- GET /api/sms-log — live JSON feed for the SMS log panel ---
router.get('/api/sms-log', (_req: Request, res: Response) => {
  res.json(getMockSmsLog());
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

// --- POST /simulate — full pipeline: build alert → match → rewrite → dispatch ---
router.post('/simulate', async (req: Request, res: Response) => {
  const zip: string = String(req.body?.zip ?? '00000').trim();
  const alertId = `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const fakeAlert: Alert = {
    id: alertId,
    event: 'Flash Flood Warning',
    severity: 'Extreme',
    onset: new Date().toISOString(),
    expires: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    areaDesc: `Area including ZIP ${zip}`,
    description:
      'FLASH FLOOD WARNING in effect. Rapid rise of water expected in low-lying areas. ' +
      'Move to higher ground immediately. Do not walk, swim, or drive through flood waters.',
    fipsCodes: [],
    fetchedAt: new Date().toISOString(),
  };

  console.log(`[dashboard] Simulating alert for ZIP ${zip} (id: ${alertId})`);

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
      message: `Alert dispatched to ${dispatch.users.length} user(s) in ZIP ${zip}.`,
      alertId,
      userCount: dispatch.users.length,
      languages: Object.keys(translations),
    });
  } catch (err: any) {
    console.error('[dashboard] Simulate error:', err);
    res.status(500).json({ ok: false, message: err.message ?? 'Internal error' });
  }
});

export default router;
