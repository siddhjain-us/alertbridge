import { Twilio } from 'twilio';

export function twilioEnabled(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
}

function toWhatsApp(phone: string): string {
  return phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`;
}

export async function sendSms(to: string, body: string): Promise<void> {
  const client = new Twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!,
  );
  await client.messages.create({
    to: toWhatsApp(to),
    from: toWhatsApp(process.env.TWILIO_PHONE_NUMBER!),
    body,
  });
}
