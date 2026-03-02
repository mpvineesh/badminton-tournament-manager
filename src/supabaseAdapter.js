import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://byptxntjlrtegyywfqia.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_FhI5_9nGjHP2olHOB1d39A_nixsES1b';

const REQUEST_TIMEOUT_MS = 12000;

async function fetchWithTimeout(input, init = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { fetch: fetchWithTimeout },
});

function normalizeDbError(scope, err) {
  const msg = err?.message || 'Unknown database error';
  if (
    /Failed to fetch/i.test(msg) ||
    /NetworkError/i.test(msg) ||
    /Load failed/i.test(msg) ||
    /aborted/i.test(msg)
  ) {
    return `[${scope}] Cannot reach Supabase (timeout/network). Check internet, VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.`;
  }
  return `[${scope}] ${msg}`;
}

// ================================
// FILE: src/supabaseAdapter.js
// ================================
//
// Install:  npm i @supabase/supabase-js
//
// ENV (Vite):
//   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
//   VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
//
// Minimal schema (run in Supabase SQL editor):
//
// -- Players master
// create table if not exists public.players (
//   id uuid primary key default gen_random_uuid(),
//   name text not null,
//   age int,
//   mobile text,
//   skill int not null check (skill between 1 and 10),
//   created_at timestamp with time zone default now()
// );
// create unique index if not exists players_name_unique on public.players(lower(name));
//
// -- Tournaments
// create table if not exists public.tournaments (
//   id uuid primary key default gen_random_uuid(),
//   name text not null,
//   status text not null default 'Upcoming',
//   payload jsonb not null,          -- full tournament JSON
//   created_at timestamp with time zone default now(),
//   updated_at timestamp with time zone default now()
// );
// create index if not exists tournaments_created_at_idx on public.tournaments(created_at desc);
//
// -- Optional snapshots/history
// create table if not exists public.tournament_snapshots (
//   id uuid primary key default gen_random_uuid(),
//   tournament_id uuid not null references public.tournaments(id) on delete cascade,
//   payload jsonb not null,
//   created_at timestamp with time zone default now()
// );
// create index if not exists tournament_snapshots_tid_idx on public.tournament_snapshots(tournament_id, created_at desc);
//
// RLS: For a quick start, you can keep RLS off or add simple policies for anon read/write.
// ===============================================
/*

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Surface this early in dev
  // eslint-disable-next-line no-console
  console.warn(
    "[supabaseAdapter] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env variables."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});
*/
// -----------------------------
// Players master
// -----------------------------

/** Fetch all saved players (sorted by name asc). */
export async function listPlayers() {
  const preferred = await supabase
    .from('players')
    .select('id, name, age, mobile, skill')
    .order('name', { ascending: true });

  if (!preferred.error) return preferred.data ?? [];

  const fallback = await supabase
    .from('players')
    .select('id, name, skill')
    .order('name', { ascending: true });

  if (fallback.error) throw new Error(normalizeDbError('listPlayers', fallback.error));
  return (fallback.data ?? []).map((p) => ({
    ...p,
    age: null,
    mobile: '',
  }));
}

/**
 * Upsert many players into the master list.
 * @param {{name: string, skill: number}[]} players
 * Dedup by name (case-insensitive) via a unique index on lower(name).
 */
export async function upsertPlayers(players) {
  if (!Array.isArray(players) || players.length === 0) return [];

  // Sanitize and clamp skills 1..10
  const rows = players
    .filter((p) => p?.name)
    .map((p) => ({
      name: String(p.name).trim(),
      skill: Math.min(10, Math.max(1, Number(p.skill) || 5)),
    }));

  if (rows.length === 0) return [];

  // onConflict: the unique index is on lower(name), but Supabase upsert
  // needs the column name. We'll ensure a "name" unique constraint exists,
  // or you can create a generated column. If you only have the lower(name)
  // index, a simple strategy is: try insert; on conflict name (if exists),
  // otherwise you may need a RPC or replace rule. For simplicity, this
  // assumes you have a unique constraint on lower(name) named `players_name_unique`.
  const { data, error } = await supabase
    .from('players')
    .upsert(rows, { onConflict: 'name' })
    .select('id, name, skill');

  if (error) throw new Error(`[upsertPlayers] ${error.message}`);
  return data ?? [];
}

/**
 * Create one player in master players list.
 * Requires columns: name (text), age (int), mobile (text), skill (int).
 */
export async function createPlayer(player) {
  const row = {
    name: String(player?.name || '').trim(),
    age: Number(player?.age),
    mobile: String(player?.mobile || '').trim(),
    skill: Math.min(10, Math.max(1, Number(player?.skill) || 5)),
  };

  if (!row.name) throw new Error('[createPlayer] Name is required');
  if (!Number.isInteger(row.age) || row.age < 1) {
    throw new Error('[createPlayer] Valid age is required');
  }
  if (!row.mobile) throw new Error('[createPlayer] Mobile is required');

  const { data, error } = await supabase
    .from('players')
    .insert(row)
    .select('id, name, age, mobile, skill')
    .single();

  if (error) throw new Error(normalizeDbError('createPlayer', error));
  return data;
}

/** Update one player by id. */
export async function updatePlayer(id, player) {
  if (!id) throw new Error('[updatePlayer] Missing player id');
  const row = {
    name: String(player?.name || '').trim(),
    age: Number(player?.age),
    mobile: String(player?.mobile || '').trim(),
    skill: Math.min(10, Math.max(1, Number(player?.skill) || 5)),
  };

  if (!row.name) throw new Error('[updatePlayer] Name is required');
  if (!Number.isInteger(row.age) || row.age < 1) {
    throw new Error('[updatePlayer] Valid age is required');
  }
  if (!row.mobile) throw new Error('[updatePlayer] Mobile is required');

  const { data, error } = await supabase
    .from('players')
    .update(row)
    .eq('id', id)
    .select('id, name, age, mobile, skill')
    .single();

  if (error) throw new Error(normalizeDbError('updatePlayer', error));
  return data;
}

/** Delete one player by id. */
export async function deletePlayer(id) {
  if (!id) throw new Error('[deletePlayer] Missing player id');
  const { error } = await supabase.from('players').delete().eq('id', id);
  if (error) throw new Error(normalizeDbError('deletePlayer', error));
}

// -----------------------------
// Tournaments
// -----------------------------

/**
 * Save (insert) a tournament payload. Returns the new tournament id.
 * @param {object} payload - full tournament object with at least { name, ... }
 */
export async function saveTournament(payload) {
  const name = payload?.name || `Tournament ${new Date().toLocaleString()}`;
  const status = payload?.status || 'Upcoming';
  const row = {
    name,
    status,
    payload,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('tournaments')
    .insert(row)
    .select('id')
    .single();

  if (error) throw new Error(`[saveTournament] ${error.message}`);
  return data?.id;
}

/**
 * Optional: store a snapshot in history for a given tournament id.
 * @param {string} tournamentId
 * @param {object} payload
 */
export async function saveTournamentSnapshot(tournamentId, payload) {
  if (!tournamentId) return null;
  const row = {
    tournament_id: tournamentId,
    payload,
    created_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('tournament_snapshots')
    .insert(row)
    .select('id');
  if (error) throw new Error(`[saveTournamentSnapshot] ${error.message}`);
  return data?.[0]?.id ?? null;
}

/** List recent tournaments with light metadata for the browser modal. */
export async function listTournaments() {
  const { data, error } = await supabase
    .from('tournaments')
    .select('id, name, status, payload, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`[listTournaments] ${error.message}`);
  return (data ?? []).map((row) => ({
    ...row,
    eventDate: row?.payload?.eventDate || '',
  }));
}

/** Load full tournament JSON by id. */
export async function loadTournament(id) {
  if (!id) return null;
  const { data, error } = await supabase
    .from('tournaments')
    .select('id, name, status, payload, created_at, updated_at')
    .eq('id', id)
    .single();

  if (error) throw new Error(`[loadTournament] ${error.message}`);
  // Return the payload merged with name for convenience
  return { id: data.id, name: data.name, status: data.status, ...data.payload };
}

/** Delete tournament by id (snapshots are ON DELETE CASCADE). */
export async function deleteTournament(id) {
  if (!id) return;
  const { error } = await supabase.from('tournaments').delete().eq('id', id);
  if (error) throw new Error(`[deleteTournament] ${error.message}`);
}

// -----------------------------
// Optional helpers (not required by your UI, but handy)
// -----------------------------

/** Update an existing tournament’s payload (if you add an “Update” flow). */
export async function updateTournament(id, payload) {
  if (!id) throw new Error('[updateTournament] Missing id');
  const { error } = await supabase
    .from('tournaments')
    .update({
      payload,
      updated_at: new Date().toISOString(),
      name: payload?.name ?? undefined,
      status: payload?.status ?? undefined,
    })
    .eq('id', id);

  if (error) throw new Error(`[updateTournament] ${error.message}`);
}

/** Update only tournament status. */
export async function updateTournamentStatus(id, status) {
  if (!id) throw new Error('[updateTournamentStatus] Missing id');
  const { error } = await supabase
    .from('tournaments')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(`[updateTournamentStatus] ${error.message}`);
}

/** Get snapshots for a tournament (to build a History tab later). */
export async function listSnapshots(tournamentId) {
  const { data, error } = await supabase
    .from('tournament_snapshots')
    .select('id, created_at')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`[listSnapshots] ${error.message}`);
  return data ?? [];
}
