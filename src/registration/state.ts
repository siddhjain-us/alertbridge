import { insertUser, getUserByPhone, deleteUser } from './db';

type RegistrationState = 'WAITING_ZIP' | 'WAITING_LANG';

interface Session {
  state: RegistrationState;
  zip?: string;
}

const sessions = new Map<string, Session>();

const STOP_KEYWORDS = new Set(['stop', 'unsubscribe', 'deregister', 'cancel', 'quit']);

const LANGUAGE_MAP: Record<string, string> = {
  '1': 'en',
  '2': 'es',
  '3': 'zh',
  '4': 'vi',
  '5': 'tl',
  '6': 'ko',
};

const LANGUAGE_MENU =
  'What language? Reply: 1=English 2=Español 3=中文 4=Tiếng Việt 5=Tagalog 6=한국어';

const CONFIRMATIONS: Record<string, (zip: string) => string> = {
  en: (zip) => `You're registered! You'll get emergency alerts for zip ${zip} in English. Text STOP to unsubscribe.`,
  es: (zip) => `¡Registrado! Recibirás alertas de emergencia para ${zip} en español. Envía STOP para cancelar.`,
  zh: (zip) => `注册成功！您将收到${zip}地区的中文紧急警报。发送STOP取消订阅。`,
  vi: (zip) => `Đã đăng ký! Bạn sẽ nhận cảnh báo khẩn cấp cho ${zip} bằng tiếng Việt. Nhắn STOP để hủy.`,
  tl: (zip) => `Nakarehistro na! Makakatanggap ka ng mga alerto para sa ${zip} sa Filipino. I-text ang STOP para mag-unsubscribe.`,
  ko: (zip) => `등록되었습니다! ${zip} 지역의 한국어 긴급 경보를 받게 됩니다. STOP을 보내면 구독 취소됩니다.`,
};

export function handleMessage(phone: string, body: string): string {
  const text = body.trim();
  const lower = text.toLowerCase();

  // Handle deregistration from any state
  if (STOP_KEYWORDS.has(lower)) {
    const deleted = deleteUser(phone);
    sessions.delete(phone);
    return deleted
      ? 'You have been unsubscribed from AlertBridge. Text anything to re-register.'
      : 'You were not registered. Text anything to sign up for emergency alerts.';
  }

  // Check if already registered in DB
  const existing = getUserByPhone(phone);
  const session = sessions.get(phone);

  if (!session) {
    if (existing) {
      return `You're already registered for ZIP ${existing.zip}. Text STOP to unsubscribe or text your ZIP code to update.`;
    }
    sessions.set(phone, { state: 'WAITING_ZIP' });
    return 'Welcome to AlertBridge! Reply with your 5-digit ZIP code to receive emergency alerts.';
  }

  if (session.state === 'WAITING_ZIP') {
    if (/^\d{5}$/.test(text)) {
      sessions.set(phone, { state: 'WAITING_LANG', zip: text });
      return LANGUAGE_MENU;
    }
    return 'Please reply with a valid 5-digit ZIP code.';
  }

  if (session.state === 'WAITING_LANG') {
    const lang = LANGUAGE_MAP[text];
    if (lang && session.zip) {
      insertUser({ phone, zip: session.zip, language: lang });
      sessions.delete(phone);
      return CONFIRMATIONS[lang](session.zip);
    }
    return `Please reply with a number 1-6.\n${LANGUAGE_MENU}`;
  }

  return 'Text STOP to unsubscribe or send your ZIP code to update your registration.';
}
