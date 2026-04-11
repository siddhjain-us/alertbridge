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
export function buildTranslationPrompt(alertText: string, lang: string): string {
  const langName = LANG_NAMES[lang] ?? lang;
  return (
    `Translate this emergency alert into ${langName}.\n\n` +
    `Rules:\n` +
    `- Output ONLY ${langName} text. No English words.\n` +
    `- One sentence or two short sentences. Under 160 characters total.\n` +
    `- Plain, clear language a non-expert can understand.\n` +
    `- No explanations, no labels, no quotes, no numbering.\n\n` +
    `Alert: ${alertText}\n\n` +
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
