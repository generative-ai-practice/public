import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const claudePath = path.join(repoRoot, 'CLAUDE.md');
const agentsPath = path.join(repoRoot, 'AGENTS.md');

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

async function syncAgentGuides(): Promise<void> {
  await access(claudePath);
  const content = await readFile(claudePath, 'utf8');
  try {
    const existingContent = await readFile(agentsPath, 'utf8');
    if (existingContent === content) {
      console.log('[sync-agent-guides] AGENTS.md is already up to date');
      return;
    }
  } catch (error: unknown) {
    if (!isErrnoException(error) || error.code !== 'ENOENT') {
      throw error;
    }
  }

  await writeFile(agentsPath, content, 'utf8');
  console.log('[sync-agent-guides] Synchronized AGENTS.md with CLAUDE.md');
}

syncAgentGuides().catch((error: unknown) => {
  if (isErrnoException(error) && error.code === 'ENOENT') {
    console.error(`[sync-agent-guides] Source file not found: ${claudePath}`);
  } else if (error instanceof Error) {
    console.error(`[sync-agent-guides] Unexpected error: ${error.message}`);
  } else {
    console.error('[sync-agent-guides] Unexpected unknown error');
  }
  process.exitCode = 1;
});
