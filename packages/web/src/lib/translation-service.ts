import type { TranslationEntry } from '@mls/core';

const SETTINGS_KEY = 'mls.translation-settings.v1';

const STRUCTURE_PRESERVATION_PROMPT = [
  'Mandatory output integrity rules:',
  '- Return the complete input. Never omit, summarize, shorten, reorder, or reconstruct any part.',
  '- Change only human-readable natural-language text that needs translation.',
  '- Preserve every command token, selector, score/objective name, number, coordinate, namespace ID, JSON/SNBT key, punctuation mark, quote, escape, formatting code, bullet, and whitespace unless it is inside the translated human-readable text.',
  '- If the complete input is enclosed in ASCII double quotes ("..."), the quotes are syntax only: preserve the exact outer ASCII quotes, but translate all natural-language content inside them. Do not copy the inner source-language text unchanged.',
  '- For Minecraft text components, translate only player-visible string values such as the value of "text". Keep keys, colors, events, selectors, and component structure exactly unchanged.',
  '- If a segment should not be translated, copy it exactly. Mixed translated and untranslated content must remain present.',
  '- The output must remain valid in the same format as the input and must contain no explanation or Markdown fence.',
].join('\n');

const MCFUNCTION_PRESERVATION_PROMPT = [
  'Minecraft command example:',
  'Input: score $theatreAct count matches 3 if block -121 61 31 minecraft:air run tellraw @a [{"text":"• "},{"color":"gold","text":"Position 4 "},{"color":"red","text":"Incorrect"}]',
  'Correct output: score $theatreAct count matches 3 if block -121 61 31 minecraft:air run tellraw @a [{"text":"• "},{"color":"gold","text":"位置 4 "},{"color":"red","text":"不正确"}]',
  'Incorrect output: tellraw @a [{"text":"• "},{"color":"gold","text":"位置 4 "},{"color":"red","text":"不正确"}]',
  'The incorrect output is forbidden because it drops the execute-condition prefix.',
].join('\n');

export interface GlossaryEntry {
  source: string;
  translation: string;
}

export interface TranslationSettings {
  sourceLanguage: string;
  targetLanguage: string;
  deepSeekApiKey: string;
  deepSeekModel: 'deepseek-v4-flash' | 'deepseek-v4-pro';
  prompt: string;
  glossary: GlossaryEntry[];
}

export const DEFAULT_TRANSLATION_SETTINGS: TranslationSettings = {
  sourceLanguage: 'en',
  targetLanguage: 'zh-CN',
  deepSeekApiKey: '',
  deepSeekModel: 'deepseek-v4-flash',
  prompt: [
    'Translate Minecraft localization text from {{sourceLanguage}} to {{targetLanguage}}.',
    'Translate only player-visible natural-language text.',
    'Use terminology natural to Simplified Chinese Minecraft players.',
    'Return the complete translated input without adding wrapping quotes or explanation.',
  ].join('\n'),
  glossary: [
    { source: 'Advancement', translation: '进度' },
    { source: 'Biome', translation: '生物群系' },
    { source: 'Block', translation: '方块' },
    { source: 'Enchantment', translation: '魔咒' },
    { source: 'Item', translation: '物品' },
    { source: 'Player', translation: '玩家' },
    { source: 'Quest', translation: '任务' },
    { source: 'Recipe', translation: '配方' },
    { source: 'World', translation: '世界' },
  ],
};

export function loadTranslationSettings(): TranslationSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return DEFAULT_TRANSLATION_SETTINGS;
    const parsed = JSON.parse(stored) as Partial<TranslationSettings>;
    return {
      ...DEFAULT_TRANSLATION_SETTINGS,
      ...parsed,
      glossary: Array.isArray(parsed.glossary)
        ? parsed.glossary.filter((entry): entry is GlossaryEntry =>
          typeof entry?.source === 'string' && typeof entry?.translation === 'string')
        : DEFAULT_TRANSLATION_SETTINGS.glossary,
    };
  } catch {
    return DEFAULT_TRANSLATION_SETTINGS;
  }
}

export function saveTranslationSettings(settings: TranslationSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function cleanTranslation(value: string): string {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:\w+)?\s*([\s\S]*?)\s*```$/);
  const result = fenced?.[1]?.trim() ?? trimmed;
  if (
    result.length >= 2 &&
    ((result.startsWith('"') && result.endsWith('"')) ||
      (result.startsWith('“') && result.endsWith('”')))
  ) {
    return result.slice(1, -1);
  }
  return result;
}

export async function translateWithFreeService(
  text: string,
  settings: TranslationSettings,
): Promise<string> {
  const params = new URLSearchParams({
    q: text,
    langpair: `${settings.sourceLanguage}|${settings.targetLanguage}`,
  });
  let response: Response;
  try {
    response = await fetch(`https://api.mymemory.translated.net/get?${params}`);
  } catch {
    throw new Error('Free translation was blocked by the network or browser CORS policy');
  }
  if (!response.ok) {
    throw new Error(`Free translation failed (${response.status})`);
  }

  const data = await response.json() as {
    responseStatus?: number | string;
    responseDetails?: string;
    responseData?: { translatedText?: string };
  };
  const translated = data.responseData?.translatedText;
  if (!translated || Number(data.responseStatus ?? 200) >= 400) {
    throw new Error(data.responseDetails || 'Free translation returned no text');
  }
  return cleanTranslation(translated);
}

export function buildDeepSeekSystemPrompt(
  settings: TranslationSettings,
  entry: TranslationEntry,
): string {
  const customPrompt = settings.prompt
    .replaceAll('{{source}}', entry.original)
    .replaceAll('{{sourceLanguage}}', settings.sourceLanguage)
    .replaceAll('{{targetLanguage}}', settings.targetLanguage)
    .replaceAll('{{sourceType}}', entry.sourceType)
    .replaceAll('{{context}}', entry.context.join(', '));

  return [
    customPrompt,
    STRUCTURE_PRESERVATION_PROMPT,
    entry.sourceType === 'mcfunction' ? MCFUNCTION_PRESERVATION_PROMPT : '',
  ].filter(Boolean).join('\n\n');
}

export function findGlossaryMatches(
  sourceText: string,
  glossary: GlossaryEntry[],
): GlossaryEntry[] {
  const normalizedSource = sourceText.toLocaleLowerCase();
  const unique = new Map<string, GlossaryEntry>();

  for (const entry of glossary) {
    const source = entry.source.trim();
    const translation = entry.translation.trim();
    if (!source || !translation) continue;
    if (!normalizedSource.includes(source.toLocaleLowerCase())) continue;
    const key = source.toLocaleLowerCase();
    if (!unique.has(key)) unique.set(key, { source, translation });
  }

  return Array.from(unique.values()).sort(
    (a, b) => b.source.length - a.source.length || a.source.localeCompare(b.source),
  );
}

export function buildDeepSeekUserContent(
  entry: TranslationEntry,
  settings: TranslationSettings,
): string {
  let quotedStringContent: string | null = null;
  if (entry.original.startsWith('"') && entry.original.endsWith('"')) {
    try {
      const parsed = JSON.parse(entry.original) as unknown;
      if (typeof parsed === 'string') quotedStringContent = parsed;
    } catch {
      quotedStringContent = entry.original.slice(1, -1);
    }
  }
  const sourceForTranslation = quotedStringContent ?? entry.original;
  const glossaryMatches = findGlossaryMatches(sourceForTranslation, settings.glossary);
  const parts = [
    `Source type: ${entry.sourceType}`,
    `Context: ${entry.context.join(', ') || '(none)'}`,
    quotedStringContent === null
      ? 'Output contract: Return the entire source below with only translatable human-readable text changed.'
      : 'Output contract: Translate the complete plain-text source below. Return only the translated text, without wrapping quotes or explanation.',
  ];

  if (quotedStringContent !== null) {
    parts.push(
      'The original value was a JSON string. Its outer quotes have already been removed.',
      'Translate all source-language natural language below. Do not copy the English sentence unchanged.',
    );
    if (quotedStringContent?.trim()) {
      parts.push(
        `TEXT THAT MUST BE TRANSLATED: ${quotedStringContent}`,
        'Do not leave the text above in the source language.',
      );
    }
  }

  if (glossaryMatches.length > 0) {
    parts.push(
      'Terminology suggestions found in the source text:',
      ...glossaryMatches.map(({ source, translation }) =>
        `- ${JSON.stringify(source)} -> ${JSON.stringify(translation)}`),
      'Use these translations when they fit the meaning and grammar of the source.',
    );
  }

  parts.push(
    'BEGIN COMPLETE SOURCE',
    sourceForTranslation,
    'END COMPLETE SOURCE',
  );
  return parts.join('\n');
}

export async function translateWithDeepSeek(
  entry: TranslationEntry,
  settings: TranslationSettings,
  signal?: AbortSignal,
): Promise<string> {
  if (!settings.deepSeekApiKey.trim()) {
    throw new Error('Configure a DeepSeek API key first');
  }
  let promptEntry = entry;
  if (entry.original.startsWith('"') && entry.original.endsWith('"')) {
    try {
      const parsed = JSON.parse(entry.original) as unknown;
      if (typeof parsed === 'string') {
        promptEntry = { ...entry, original: parsed };
      }
    } catch {
      promptEntry = { ...entry, original: entry.original.slice(1, -1) };
    }
  }

  let response: Response;
  try {
    response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.deepSeekApiKey.trim()}`,
      },
      body: JSON.stringify({
        model: settings.deepSeekModel,
        messages: [
          { role: 'system', content: buildDeepSeekSystemPrompt(settings, promptEntry) },
          {
            role: 'user',
            content: buildDeepSeekUserContent(entry, settings),
          },
        ],
        stream: false,
        thinking: { type: 'disabled' },
      }),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('DeepSeek was blocked by the network or browser CORS policy');
  }

  const data = await response.json() as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };
  if (!response.ok) {
    throw new Error(data.error?.message || `DeepSeek translation failed (${response.status})`);
  }

  const translated = data.choices?.[0]?.message?.content;
  if (!translated) throw new Error('DeepSeek returned no translation');
  return cleanTranslation(translated);
}
