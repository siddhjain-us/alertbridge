import type { DispatchList } from '../matcher/types';

/** Row shown in dashboard SMS log / API — keep fields stable for clients */
export interface MockSmsEntry {
  phone: string;
  language: string;
  message: string;
  alertType: string;
  sentAt: string;
  alertId?: string;
}

export interface MockSmsMemoryPayload {
  phoneLast4: string;
  language: string;
  message: string;
  alertId: string;
  alertType: string;
  sentAt: string;
}

export function keyDispatch(alertId: string): string {
  return `dispatch:${alertId}`;
}

export function keyTranslated(alertId: string, lang: string): string {
  return `translated:${alertId}:${lang}`;
}

export function keyMockSms(timestamp: string): string {
  return `mock_sms:${timestamp}`;
}

/** Serialize dispatch for memory key dispatch:<alertId> */
export function serializeDispatch(dispatch: DispatchList): string {
  return JSON.stringify(dispatch);
}
