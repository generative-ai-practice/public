import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const claudePath = path.join(repoRoot, 'CLAUDE.md');
const agentsPath = path.join(repoRoot, 'AGENTS.md');

void (async () => {
  try {
    const content = await readFile(claudePath, 'utf8');
    await writeFile(agentsPath, content, 'utf8');
    console.log('[sync-agent-guides] Synchronized AGENTS.md with CLAUDE.md');
  } catch (error) {
    console.error('[sync-agent-guides] Failed to synchronize guides.');
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exitCode = 1;
  }
})();
