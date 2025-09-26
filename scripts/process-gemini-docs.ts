import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';

interface FileAction {
  type: 'create' | 'update';
  file: string;
  content: string;
  reason: string;
}

interface TargetsCsvAddition {
  relative_path: string;
  src_lang: string;
  target_langs: string;
}

interface ParsedResponse {
  actions: FileAction[];
  targets_csv_additions: TargetsCsvAddition[];
}

async function parseGeminiResponse(
  responseText: string
): Promise<ParsedResponse> {
  /**
   * Parse Gemini response and extract file operations.
   *
   * Expected format:
   * ```json
   * {
   *   "actions": [
   *     {
   *       "type": "create|update",
   *       "file": "docs/api_original.md",
   *       "content": "# API Documentation\n\n...",
   *       "reason": "New API endpoints added"
   *     }
   *   ],
   *   "targets_csv_additions": [
   *     {
   *       "relative_path": "docs/api_original.md",
   *       "src_lang": "en",
   *       "target_langs": "ja"
   *     }
   *   ]
   * }
   * ```
   */

  // Try to extract JSON from markdown code blocks or direct JSON
  const jsonMatch = responseText.match(/```(?:json)?\s*\n(.*?)\n```/s);
  let jsonText: string;

  if (jsonMatch) {
    jsonText = jsonMatch[1];
  } else {
    jsonText = responseText;
  }

  try {
    return JSON.parse(jsonText);
  } catch (error) {
    // Fallback: try to extract simple file operations from text
    return parseTextResponse(responseText);
  }
}

function parseTextResponse(responseText: string): ParsedResponse {
  /**
   * Fallback parser for non-JSON responses.
   * Extract file operations from natural language.
   */
  const actions: FileAction[] = [];
  const targets_additions: TargetsCsvAddition[] = [];

  const lines = responseText.split('\n');
  let currentFile: string | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    // Look for file creation/update indicators
    const createMatch = line.match(/(?:CREATE|Create)\s+(.+\.md)/);
    const updateMatch = line.match(/(?:UPDATE|Update)\s+(.+\.md)/);

    if (createMatch) {
      if (currentFile && currentContent.length > 0) {
        actions.push({
          type: 'create',
          file: currentFile,
          content: currentContent.join('\n'),
          reason: 'Parsed from Gemini response',
        });
      }
      currentFile = createMatch[1];
      currentContent = [];
    } else if (updateMatch) {
      if (currentFile && currentContent.length > 0) {
        actions.push({
          type: 'update',
          file: currentFile,
          content: currentContent.join('\n'),
          reason: 'Parsed from Gemini response',
        });
      }
      currentFile = updateMatch[1];
      currentContent = [];
    } else if (currentFile && line.trim()) {
      currentContent.push(line);
    }
  }

  // Add the last file if any
  if (currentFile && currentContent.length > 0) {
    actions.push({
      type: 'create',
      file: currentFile,
      content: currentContent.join('\n'),
      reason: 'Parsed from Gemini response',
    });

    // If it's a new _original.md file, add to targets.csv
    if (currentFile.endsWith('_original.md')) {
      targets_additions.push({
        relative_path: currentFile,
        src_lang: 'en',
        target_langs: 'ja',
      });
    }
  }

  return {
    actions,
    targets_csv_additions: targets_additions,
  };
}

async function executeFileOperations(
  parsedResponse: ParsedResponse
): Promise<string[]> {
  /**
   * Execute file operations based on parsed response.
   * Returns list of files that were created/modified.
   */
  const modifiedFiles: string[] = [];

  for (const action of parsedResponse.actions) {
    const filePath = action.file;
    const actionType = action.type;
    const content = action.content;

    // Ensure directory exists
    const dir = path.dirname(filePath);
    await mkdir(dir, { recursive: true });

    if (actionType === 'create') {
      // Create new file
      try {
        await access(filePath, fsConstants.F_OK);
        console.log(`File already exists, skipping: ${filePath}`);
      } catch {
        // File doesn't exist, create it
        await writeFile(filePath, content, 'utf-8');
        modifiedFiles.push(filePath);
        console.log(`Created: ${filePath}`);
      }
    } else if (actionType === 'update') {
      // Update existing file
      await writeFile(filePath, content, 'utf-8');
      modifiedFiles.push(filePath);
      console.log(`Updated: ${filePath}`);
    }
  }

  return modifiedFiles;
}

async function updateTargetsCsv(
  parsedResponse: ParsedResponse
): Promise<boolean> {
  /**
   * Update translations/targets.csv with new files.
   * Returns True if file was modified.
   */
  const targetsFile = 'translations/targets.csv';
  const additions = parsedResponse.targets_csv_additions;

  if (additions.length === 0) {
    return false;
  }

  // Read existing targets
  const existingEntries = new Set<string>();
  try {
    const content = await readFile(targetsFile, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const relativePath = trimmed.split(',')[0];
        existingEntries.add(relativePath);
      }
    }
  } catch {
    // File doesn't exist yet, that's ok
  }

  // Add new entries
  const newEntries: string[] = [];
  for (const addition of additions) {
    const relPath = addition.relative_path;
    if (!existingEntries.has(relPath)) {
      const srcLang = addition.src_lang || 'en';
      const targetLangs = addition.target_langs || 'ja';
      newEntries.push(`${relPath},${srcLang},${targetLangs}`);
    }
  }

  if (newEntries.length > 0) {
    // Append to targets.csv
    const newContent = newEntries.join('\n') + '\n';

    // Read existing content and append
    let existingContent = '';
    try {
      existingContent = await readFile(targetsFile, 'utf-8');
    } catch {
      // File doesn't exist, create header
      existingContent = 'relative_path,src_lang,target_langs\n';
    }

    await writeFile(targetsFile, existingContent + newContent, 'utf-8');
    console.log(
      `Updated translations/targets.csv with ${newEntries.length} entries`
    );
    return true;
  }

  return false;
}

async function main() {
  if (process.argv.length !== 3) {
    console.log('Usage: tsx process-gemini-docs.ts <gemini_response_file>');
    process.exit(1);
  }

  const responseFile = process.argv[2];

  // Read Gemini response
  const responseText = await readFile(responseFile, 'utf-8');
  console.log(`Processing Gemini response from: ${responseFile}`);

  // Parse response
  const parsedResponse = await parseGeminiResponse(responseText);

  // Execute file operations
  const modifiedFiles = await executeFileOperations(parsedResponse);

  // Update targets.csv
  const targetsUpdated = await updateTargetsCsv(parsedResponse);

  // Output summary
  if (modifiedFiles.length > 0 || targetsUpdated) {
    console.log(`\nSummary:`);
    console.log(`- Files created/updated: ${modifiedFiles.length}`);
    if (targetsUpdated) {
      console.log(`- translations/targets.csv updated`);
    }

    // Write list of modified files for the workflow
    const fileList = [...modifiedFiles];
    if (targetsUpdated) {
      fileList.push('translations/targets.csv');
    }
    await writeFile('modified_files.txt', fileList.join('\n'), 'utf-8');
  } else {
    console.log('No file operations required.');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    console.error('Error:', error);
    process.exit(1);
  });
}
