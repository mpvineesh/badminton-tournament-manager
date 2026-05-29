#!/usr/bin/env node
// One-time migration: copy all data from Supabase -> Firestore.
//
// Reads from Supabase using the public anon key (same access the live app has)
// and writes to Firestore using the firebase-admin SDK (bypasses security
// rules). Document IDs are preserved so existing references stay valid.
//
// Prerequisites:
//   1. npm i -D firebase-admin            (already added to devDependencies)
//   2. Firebase Console -> Project Settings -> Service accounts ->
//      "Generate new private key" -> save as scripts/serviceAccountKey.json
//   3. A Firestore database must exist (Native mode) in the project.
//
// Run:   node scripts/migrate-supabase-to-firestore.mjs
// It is idempotent: re-running overwrites the same docs (set with merge:false).

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// --- Minimal .env parser (no dotenv dependency) ---------------------------
function loadEnv() {
  const envPath = resolve(ROOT, '.env');
  const out = {};
  if (!existsSync(envPath)) return out;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in out)) out[key] = val; // first definition wins
  }
  return out;
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  env.VITE_SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const SERVICE_ACCOUNT_PATH = resolve(__dirname, 'serviceAccountKey.json');
if (!existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(
    `Missing service account key at ${SERVICE_ACCOUNT_PATH}\n` +
      'Generate it in Firebase Console -> Project Settings -> Service accounts.'
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const fs = admin.firestore();
fs.settings({ ignoreUndefinedProperties: true });

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Helpers --------------------------------------------------------------
async function fetchAll(table) {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`[${table}] ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

async function writeAll(collection, rows, transform) {
  let written = 0;
  const chunkSize = 400; // Firestore batch limit is 500
  for (let i = 0; i < rows.length; i += chunkSize) {
    const batch = fs.batch();
    for (const row of rows.slice(i, i + chunkSize)) {
      const { id, doc } = transform(row);
      if (!id) continue;
      batch.set(fs.collection(collection).doc(String(id)), doc);
      written += 1;
    }
    await batch.commit();
  }
  return written;
}

// --- Per-collection transforms (match the field names the firebase-mode
//     adapter branches expect) ------------------------------------------
const TABLES = [
  {
    table: 'players',
    collection: 'players',
    transform: (r) => {
      const { id, avatar_url, ...rest } = r;
      return { id, doc: { ...rest, avatarUrl: String(avatar_url || '').trim() } };
    },
  },
  {
    table: 'skill_suggestions',
    collection: 'skill_suggestions',
    transform: (r) => {
      const { id, ...rest } = r;
      return { id, doc: rest }; // snake_case fields preserved (adapter reads snake)
    },
  },
  {
    table: 'predictions',
    collection: 'predictions',
    transform: (r) => {
      const { id, ...rest } = r;
      return { id, doc: rest };
    },
  },
  {
    table: 'tournaments',
    collection: 'tournaments',
    transform: (r) => {
      const { id, ...rest } = r;
      return { id, doc: rest };
    },
  },
  {
    table: 'tournament_snapshots',
    collection: 'tournament_snapshots',
    transform: (r) => {
      const { id, ...rest } = r;
      return { id, doc: rest };
    },
  },
];

async function main() {
  console.log(`Migrating Supabase (${SUPABASE_URL}) -> Firestore\n`);
  for (const { table, collection, transform } of TABLES) {
    try {
      const rows = await fetchAll(table);
      const written = await writeAll(collection, rows, transform);
      console.log(`  ${table.padEnd(22)} read ${String(rows.length).padStart(4)}  ->  wrote ${written} to ${collection}`);
    } catch (err) {
      console.error(`  ${table.padEnd(22)} FAILED: ${err.message}`);
    }
  }
  console.log('\nDone.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
