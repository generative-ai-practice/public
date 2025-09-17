#!/usr/bin/env node

import { access, readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';

const repoRoot = process.cwd();
const csvPath = resolvePath(
  process.env.TRANSLATION_CSV ?? 'translations/targets.csv'
);
const metadataPath = resolvePath(
  process.env.TRANSLATION_METADATA ?? '.translations.json'
);
const allowedLanguages = new Set(
  (process.env.TRANSLATION_ALLOWED_LANGUAGES ?? 'en,ja')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);
const dryRun = process.argv.includes('--dry-run');
const defaultTranslationCommand = JSON.stringify([
  'bash',
  '-lc',
  'gemini text --model ${GEMINI_TRANSLATION_MODEL:-gemini-1.5-pro} --input-file {PROMPT_FILE} --output-file {OUTPUT_FILE}',
]);

(async () => {
  const csv = await readIfExists(csvPath);
  if (csv == null) {
    console.error(`[translate] CSV not found at ${relative(csvPath)}.`);
    process.exit(0);
  }

  const rows = parseCsv(csv);
  if (rows.length === 0) {
    console.log('[translate] No translation targets found in CSV.');
    process.exit(0);
  }

  const metadata = await loadMetadata(metadataPath);
  let metadataChanged = false;
  let translatedCount = 0;

  for (const row of rows) {
    const relativeSourcePath = row.relative_path;
    const sourceLang = row.src_lang;
    if (!relativeSourcePath || !sourceLang) {
      console.warn(
        `[translate] Skipping row with missing path or src_lang: ${JSON.stringify(row)}`
      );
      continue;
    }
    if (!allowedLanguages.has(sourceLang)) {
      console.warn(
        `[translate] Source language "${sourceLang}" is not allowed. Skipping ${relativeSourcePath}.`
      );
      continue;
    }

    const targetLangs = parseTargetLanguages(row.target_langs);
    if (targetLangs.length === 0) {
      console.warn(
        `[translate] No target languages specified for ${relativeSourcePath}.`
      );
      continue;
    }

    const sourceAbsolute = resolvePath(relativeSourcePath);
    const sourceContent = await readIfExists(sourceAbsolute);
    if (sourceContent == null) {
      console.warn(`[translate] Source file not found: ${relativeSourcePath}`);
      continue;
    }

    const sourceHash = hashOf(sourceContent);

    for (const targetLang of targetLangs) {
      if (!allowedLanguages.has(targetLang)) {
        console.warn(
          `[translate] Target language "${targetLang}" is not allowed for ${relativeSourcePath}.`
        );
        continue;
      }
      if (targetLang === sourceLang) {
        continue;
      }

      const targetRelativePath = deriveTargetPath(
        relativeSourcePath,
        sourceLang,
        targetLang
      );
      const targetAbsolutePath = resolvePath(targetRelativePath);
      const metaKey = `${relativeSourcePath}::${sourceLang}->${targetLang}`;
      const metaEntry = metadata[metaKey];

      if (metaEntry && metaEntry.sourceHash === sourceHash) {
        console.log(
          `[translate] Up-to-date: ${relativeSourcePath} (${sourceLang}→${targetLang}).`
        );
        continue;
      }

      const segments = splitContentIntoSegments(sourceContent);
      const previousSegmentTranslations = buildSegmentTranslationMap(
        metaEntry?.segments || []
      );
      const segmentResults = new Array(segments.length);
      const pendingSegments = [];

      segments.forEach((segment, index) => {
        const hash = hashOf(segment.body);

        if (segment.body.trim() === '') {
          segmentResults[index] = {
            hash,
            translation: '',
            separator: segment.separator,
          };
          return;
        }

        const reuseList = previousSegmentTranslations.get(hash);
        if (reuseList && reuseList.length > 0) {
          const reusedTranslation = reuseList.shift();
          segmentResults[index] = {
            hash,
            translation: sanitizeTranslation(reusedTranslation),
            separator: segment.separator,
          };
        } else {
          pendingSegments.push({
            index,
            hash,
            body: segment.body,
            separator: segment.separator,
          });
        }
      });

      if (pendingSegments.length === 0) {
        if (dryRun) {
          console.log(
            `[translate] (dry-run) No segment changes detected for ${relativeSourcePath} (${sourceLang}→${targetLang}).`
          );
          continue;
        }

        metadata[metaKey] = {
          source: relativeSourcePath,
          target: targetRelativePath,
          sourceLang,
          targetLang,
          sourceHash,
          translatedAt: new Date().toISOString(),
          segments: segmentResults.map((segment) => ({
            hash: segment.hash,
            translation: segment.translation,
          })),
        };
        metadataChanged = true;
        console.log(
          `[translate] Reused existing translations for ${relativeSourcePath} (${sourceLang}→${targetLang}).`
        );
        continue;
      }

      if (dryRun) {
        console.log(
          `[translate] (dry-run) Would translate ${pendingSegments.length} segment(s) for ${relativeSourcePath} (${sourceLang}→${targetLang}).`
        );
        continue;
      }

      await mkdir(path.dirname(targetAbsolutePath), { recursive: true });

      for (const pending of pendingSegments) {
        const rawTranslation = await runGeminiTranslation({
          sourceContent: pending.body,
          sourceLang,
          targetLang,
          relativeSourcePath: `${relativeSourcePath} (segment ${pending.index + 1}/${segments.length})`,
          relativeTargetPath: `${targetRelativePath} (segment ${pending.index + 1}/${segments.length})`,
        });
        const translation = sanitizeTranslation(rawTranslation);
        if (!translation || translation === 'ERROR') {
          throw new Error(
            `Gemini CLI returned an unusable result for ${relativeSourcePath} segment ${pending.index + 1}.`
          );
        }
        segmentResults[pending.index] = {
          hash: pending.hash,
          translation,
          separator: pending.separator,
        };
      }

      const translatedContent = reconstructContentFromSegments(segmentResults);
      await writeFile(
        targetAbsolutePath,
        ensureTrailingNewline(translatedContent),
        'utf8'
      );

      metadata[metaKey] = {
        source: relativeSourcePath,
        target: targetRelativePath,
        sourceLang,
        targetLang,
        sourceHash,
        translatedAt: new Date().toISOString(),
        segments: segmentResults.map((segment) => ({
          hash: segment.hash,
          translation: segment.translation,
        })),
      };
      translatedCount += 1;
      metadataChanged = true;
      console.log(
        `[translate] Updated ${targetRelativePath} (${sourceLang}→${targetLang}) with ${pendingSegments.length} new segment(s).`
      );
    }
  }

  if (metadataChanged && !dryRun) {
    await writeFile(
      metadataPath,
      `${JSON.stringify(metadata, null, 2)}\n`,
      'utf8'
    );
    console.log(`[translate] Updated metadata: ${relative(metadataPath)}`);
  }

  if (translatedCount === 0) {
    console.log(
      `[translate] No translations required${dryRun ? ' (dry-run)' : ''}.`
    );
  } else {
    console.log(`[translate] Completed ${translatedCount} translation(s).`);
  }
})().catch((error) => {
  console.error('[translate] Failed:', error);
  process.exit(1);
});

function resolvePath(relativePath) {
  return path.resolve(repoRoot, relativePath);
}

function relative(absolutePath) {
  return path.relative(repoRoot, absolutePath);
}

async function readIfExists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
  return readFile(filePath, 'utf8');
}

async function loadMetadata(filePath) {
  const content = await readIfExists(filePath);
  if (!content) {
    return {};
  }
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Failed to parse metadata JSON (${relative(filePath)}): ${error.message}`
    );
  }
}

function parseCsv(text) {
  const rows = [];
  let headers = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const cells = splitCsvLine(rawLine);
    if (!headers) {
      headers = cells.map((header) => header.trim());
      continue;
    }
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ? cells[index].trim() : '';
    });
    rows.push(row);
  }
  return rows;
}

function splitCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  result.push(current);
  return result;
}

function parseTargetLanguages(raw) {
  if (!raw) {
    return [];
  }
  return raw
    .split(/[;,]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function splitContentIntoSegments(content) {
  const normalized = normalizeLineEndings(content);
  if (normalized === '') {
    return [];
  }

  const parts = normalized.split(/(\n{2,})/);
  const segments = [];

  for (let index = 0; index < parts.length; index += 2) {
    const body = parts[index] ?? '';
    const separator = parts[index + 1] ?? '';

    if (body === '' && separator === '' && index > 0) {
      continue;
    }

    segments.push({ body, separator });
  }

  return segments;
}

function buildSegmentTranslationMap(segmentMetadata) {
  const map = new Map();
  for (const segment of segmentMetadata) {
    if (!segment || !segment.hash) {
      continue;
    }
    if (!map.has(segment.hash)) {
      map.set(segment.hash, []);
    }
    const cleaned = sanitizeTranslation(segment.translation ?? '');
    if (cleaned) {
      map.get(segment.hash).push(cleaned);
    }
  }
  return map;
}

function reconstructContentFromSegments(segmentResults) {
  let combined = '';
  segmentResults.forEach((segment) => {
    if (!segment) {
      return;
    }
    const translation = normalizeLineEndings(
      segment.translation ?? ''
    ).trimEnd();
    combined += translation;
    combined += segment.separator ?? '';
  });
  return combined;
}

function sanitizeTranslation(rawText) {
  let text = normalizeLineEndings(rawText ?? '').trim();

  if (text === '') {
    return '';
  }

  const outerFenceMatch = text.match(/^```[\w-]*\n([\s\S]*?)\n```$/);
  if (outerFenceMatch) {
    text = outerFenceMatch[1].trim();
  }

  const disclaimerPatterns = [
    /^ok\.\s.*$/i,
    /^i\s+apologize.*$/i,
    /^my\s+apologies.*$/i,
    /^i\s+cannot.*$/i,
    /^please\s+manually.*$/i,
  ];

  const cleanedLines = text
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (trimmed === '') {
        return true;
      }
      return !disclaimerPatterns.some((pattern) => pattern.test(trimmed));
    });

  text = cleanedLines.join('\n').trim();

  if (text === '') {
    return '';
  }

  const deduped = deduplicateParagraphs(text);
  return deduped.trim();
}

function deduplicateParagraphs(text) {
  const parts = text.split(/\n{2,}/);
  const seen = new Set();
  const kept = [];

  parts.forEach((part) => {
    const key = part.trim();
    if (!key) {
      return;
    }
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    kept.push(part);
  });

  return kept.join('\n\n');
}

function deriveTargetPath(relativePath, sourceLang, targetLang) {
  const parsed = path.parse(relativePath);
  let baseName = parsed.name;

  if (baseName.endsWith('_original')) {
    baseName = baseName.slice(0, -'_original'.length);
  } else {
    const suffix = `_${sourceLang}`;
    if (baseName.endsWith(suffix)) {
      baseName = baseName.slice(0, -suffix.length);
    }
  }

  return path.join(parsed.dir, `${baseName}_${targetLang}${parsed.ext}`);
}

function hashOf(content) {
  return createHash('sha256').update(content).digest('hex');
}

function ensureTrailingNewline(text) {
  return text.endsWith('\n') ? text : `${text}\n`;
}

async function runGeminiTranslation(options) {
  const commandSpec =
    process.env.GEMINI_TRANSLATION_CLI ?? defaultTranslationCommand;

  let commandParts;
  try {
    commandParts = JSON.parse(commandSpec);
  } catch (error) {
    throw new Error(`Failed to parse GEMINI_TRANSLATION_CLI: ${error.message}`);
  }

  if (!Array.isArray(commandParts) || commandParts.length === 0) {
    throw new Error(
      'GEMINI_TRANSLATION_CLI must be a JSON array with at least one element.'
    );
  }

  const prompt = buildPrompt(options);
  const promptPath = path.join(
    os.tmpdir(),
    `gemini-translate-${randomUUID()}.prompt`
  );
  const outputPath = path.join(
    os.tmpdir(),
    `gemini-translate-${randomUUID()}.out`
  );

  await writeFile(promptPath, prompt, 'utf8');

  const args = commandParts
    .slice(1)
    .map((arg) =>
      arg
        .replace('{PROMPT_FILE}', promptPath)
        .replace('{OUTPUT_FILE}', outputPath)
        .replace('{SOURCE_LANG}', options.sourceLang)
        .replace('{TARGET_LANG}', options.targetLang)
        .replace('{SOURCE_PATH}', options.relativeSourcePath)
        .replace('{TARGET_PATH}', options.relativeTargetPath)
    );

  await execute(commandParts[0], args);

  const translation = await readFile(outputPath, 'utf8');
  await safeRemove(promptPath);
  await safeRemove(outputPath);

  if (!translation.trim()) {
    throw new Error(
      `Gemini CLI returned an empty result for ${options.relativeSourcePath} (${options.sourceLang}→${options.targetLang}).`
    );
  }

  return normalizeLineEndings(translation.trimEnd());
}

function buildPrompt({
  sourceContent,
  sourceLang,
  targetLang,
  relativeSourcePath,
}) {
  return [
    `You are a professional technical translator. Convert the following ${sourceLang.toUpperCase()} Markdown content into ${targetLang.toUpperCase()}.`,
    '',
    'Guidelines:',
    '- Preserve Markdown structure, lists, tables, code blocks, inline formatting, and URLs.',
    '- Keep existing front matter or raw HTML untouched unless translation is required inside.',
    '- Do not add commentary, apologies, explanations, or diff markers.',
    '- Do not wrap the entire response in a code fence unless the source segment is already fully enclosed in a code fence with the same language tag.',
    '- Output the translation only. Do not reference tools, editing limitations, or the translation process.',
    '- Maintain existing spacing and blank lines where possible.',
    '',
    'If you cannot comply, respond with the single word "ERROR".',
    '',
    `Source file: ${relativeSourcePath}`,
    '',
    '----- BEGIN SOURCE -----',
    sourceContent,
    '----- END SOURCE -----',
  ].join('\n');
}

async function execute(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'inherit', 'inherit'],
      env: process.env,
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `Command "${command} ${args.join(' ')}" exited with code ${code}.`
          )
        );
      }
    });
  });
}

async function safeRemove(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    await unlink(filePath);
  } catch {
    // ignore missing temp files
  }
}

function normalizeLineEndings(text) {
  return text.replace(/\r\n/g, '\n');
}
