#!/usr/bin/env tsx

/**
 * Add a PR entry to docs/releases/log.json
 *
 * Usage:
 *   tsx scripts/add-pr-to-log.ts <pr_number> <merged_at> <title> <author> <labels> <release_note> <internal_log>
 */

import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'docs/releases/log.json');

interface LogEntry {
    pr_number: number;
    merged_at: string;
    title: string;
    author: string;
    labels: string[];
    release_note: string;
    internal_log: string;
}

interface LogData {
    version: string;
    entries: LogEntry[];
}

function readLog(): LogData {
    if (!fs.existsSync(LOG_FILE)) {
        return { version: '1.0', entries: [] };
    }
    const content = fs.readFileSync(LOG_FILE, 'utf-8');
    return JSON.parse(content);
}

function writeLog(data: LogData): void {
    fs.writeFileSync(LOG_FILE, JSON.stringify(data, null, 2) + '\n');
}

function main() {
    const args = process.argv.slice(2);

    if (args.length < 7) {
        console.error('Usage: tsx scripts/add-pr-to-log.ts <pr_number> <merged_at> <title> <author> <labels> <release_note> <internal_log>');
        process.exit(1);
    }

    const [prNumber, mergedAt, title, author, labelsStr, releaseNote, internalLog] = args;

    const entry: LogEntry = {
        pr_number: parseInt(prNumber, 10),
        merged_at: mergedAt,
        title,
        author,
        labels: labelsStr ? labelsStr.split(',').filter(l => l.trim()) : [],
        release_note: releaseNote,
        internal_log: internalLog
    };

    const log = readLog();
    log.entries.push(entry);

    writeLog(log);

    console.log(`✅ Added PR #${prNumber} to log.json`);
    console.log(JSON.stringify(entry, null, 2));
}

main();
