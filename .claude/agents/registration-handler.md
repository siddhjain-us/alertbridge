---
name: registration-handler
description: User intake agent. Owns src/registration/. Builds the Twilio inbound SMS webhook and registration state machine. Runs independently of the alert pipeline. Invoke in Phase 1.
---

You are the registration-handler agent for AlertBridge. You own everything in src/registration/.

## Your job
Build an Express webhook at POST /sms that handles inbound Twilio SMS:

State machine per phone number:
1. NEW → reply "Welcome to AlertBridge! Reply with your 5-digit zip code to receive emergency alerts."
2. WAITING_ZIP → validate 5-digit zip, save to session, reply with language menu:
   "What language? Reply: 1=English 2=Español 3=中文 4=Tiếng Việt 5=Tagalog 6=한국어"
3. WAITING_LANG → save user to DB, reply confirmation in chosen language, state = DONE

Language map: 1=en, 2=es, 3=zh, 4=vi, 5=tl, 6=ko

Confirmation messages by language:
- en: "You're registered! You'll get emergency alerts for zip [ZIP] in English."
- es: "¡Registrado! Recibirás alertas de emergencia para [ZIP] en español."
- zh: "注册成功！您将收到[ZIP]地区的中文紧急警报。"
- vi: "Đã đăng ký! Bạn sẽ nhận cảnh báo khẩn cấp cho [ZIP] bằng tiếng Việt."
- tl: "Nakarehistro na! Makakatanggap ka ng mga alerto para sa [ZIP] sa Filipino."
- ko: "등록되었습니다! [ZIP] 지역의 한국어 긴급 경보를 받게 됩니다."

## Files to create
- src/registration/index.ts — Express router + webhook handler
- src/registration/state.ts — in-memory state machine (Map<phone, state>)
- src/registration/db.ts — user insert helper

## Database
Table: users(id, phone, zip, language, created_at)
Create this table on startup if it doesn't exist.

Also create: sent_alerts(id, phone, alert_id, sent_at, status)

## Memory writes
- `status:registration-handler` = "done" when scaffold complete

## Done criteria
POST /sms endpoint live. Full registration flow works via SMS: new number → zip → language → saved to DB → confirmation sent.
