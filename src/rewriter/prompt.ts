export const LANG_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  zh: 'Chinese (Simplified)',
  vi: 'Vietnamese',
  tl: 'Tagalog',
  ko: 'Korean',
};

/**
 * Prompt for non-English languages: rewrite + translate.
 *
 * Key design decisions:
 * - No numbered steps in the prompt — llama3.2 mirrors the format it sees,
 *   so numbered instructions produce numbered output.
 * - Repeat the target language name multiple times to reinforce the constraint.
 * - Provide a concrete one-line output example to anchor the format.
 * - Forbid English explicitly and early.
 */
export function buildTranslationPrompt(alertText: string, lang: string, strict = false): string {
  const langName = LANG_NAMES[lang] ?? lang;

  if (lang === 'zh') {
    const extra = strict
      ? `\n上次输出不是中文。下面请只写简体中文，必须出现汉字，不要写英文。\n`
      : '';
    return (
      `将以下紧急警报改写为一条简体中文手机短信（面向普通市民，通俗易懂）。\n\n` +
      `硬性要求：\n` +
      `- 全文必须使用简体中文（必须有汉字）。禁止输出英文句子。\n` +
      `- 一至两句，总长度不超过160个字符。\n` +
      `- 不要标题、不要编号、不要引号、不要解释。\n` +
      extra +
      `\n警报原文：\n${alertText}\n\n` +
      `简体中文短信正文：`
    );
  }

  const strictNote = strict
    ? `\nYour previous answer was wrong. Output ONLY in ${langName} now — zero English.\n`
    : '';

  return (
    `Translate this emergency alert into ${langName}.\n\n` +
    `Rules:\n` +
    `- Output ONLY ${langName} text. No English words.\n` +
    `- One sentence or two short sentences. Under 160 characters total.\n` +
    `- Plain, clear language a non-expert can understand.\n` +
    `- No explanations, no labels, no quotes, no numbering.\n` +
    strictNote +
    `\nAlert: ${alertText}\n\n` +
    `${langName} translation:`
  );
}

/**
 * Prompt for English: plain-language rewrite only.
 */
export function buildEnglishPrompt(alertText: string): string {
  return (
    `Rewrite this emergency alert as a plain-language SMS.\n\n` +
    `Rules:\n` +
    `- One or two short sentences. Under 160 characters total.\n` +
    `- Say what is happening and what to do right now.\n` +
    `- No jargon, no explanations, no quotes, no numbering.\n\n` +
    `Alert: ${alertText}\n\n` +
    `SMS:`
  );
}

/** Minimal retry when primary translation fails (zh, vi, ko). */
export function buildSimpleRetryPrompt(alertText: string, lang: string): string {
  const langName = LANG_NAMES[lang] ?? lang;
  return `Translate this emergency alert to ${langName}. Reply with ONLY the translation, nothing else: ${alertText}`;
}
