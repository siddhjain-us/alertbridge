import { Router, Request, Response } from 'express';
import { handleMessage } from './state';

// Ensure DB tables are created on import
import './db';

const router = Router();

function twiml(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`;
}

router.post('/sms', (req: Request, res: Response) => {
  const from: string = req.body?.From ?? '';
  const body: string = req.body?.Body ?? '';

  if (!from) {
    res.status(400).send('Missing From');
    return;
  }

  const reply = handleMessage(from, body);
  res.set('Content-Type', 'text/xml');
  res.send(twiml(reply));
});

export default router;
