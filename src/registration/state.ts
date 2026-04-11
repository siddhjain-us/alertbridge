import { insertUser } from './db';

type RegistrationState = 'NEW' | 'WAITING_ZIP' | 'WAITING_LANG' | 'DONE';

interface Session {
  state: RegistrationState;
  zip?: string;
}

const sessions = new Map<string, Session>();

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
  en: (zip) => `You're registered! You'll get emergency alerts for zip ${zip} in English.`,
  es: (zip) => `¡Registrado! Recibirás alertas de emergencia para ${zip} en español.`,
  zh: (zip) => `注册成功！您将收到${zip}地区的中文紧急警报。`,
  vi: (zip) => `Đã đăng ký! Bạn sẽ nhận cảnh báo khẩn cấp cho ${zip} bằng tiếng Việt.`,
  tl: (zip) => `Nakarehistro na! Makakatanggap ka ng mga alerto para sa ${zip} sa Filipino.`,
  ko: (zip) => `등록되었습니다! ${zip} 지역의 한국어 긴급 경보를 받게 됩니다.`,
};

export function handleMessage(phone: string, body: string): string {
  const text = body.trim();
  const session = sessions.get(phone) ?? { state: 'NEW' as RegistrationState };

  if (session.state === 'NEW' || session.state === 'DONE') {
    sessions.set(phone, { state: 'WAITING_ZIP' });
    return 'Welcome to AlertBridge! Reply with your 5-digit zip code to receive emergency alerts.';
  }

  if (session.state === 'WAITING_ZIP') {
    if (/^\d{5}$/.test(text)) {
      sessions.set(phone, { state: 'WAITING_LANG', zip: text });
      return LANGUAGE_MENU;
    }
    return 'Please reply with a valid 5-digit zip code.';
  }

  if (session.state === 'WAITING_LANG') {
    const lang = LANGUAGE_MAP[text];
    if (lang && session.zip) {
      insertUser({ phone, zip: session.zip, language: lang });
      sessions.set(phone, { state: 'DONE', zip: session.zip });
      return CONFIRMATIONS[lang](session.zip);
    }
    return `Please reply with a number 1-6.\n${LANGUAGE_MENU}`;
  }

  return 'You are already registered. Text START to re-register.';
}
