import { createClient } from '@supabase/supabase-js';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, getStorage as getFirebaseStorage, ref, uploadBytes } from 'firebase/storage';
import { db, storage, hasFirebaseConfig, firebaseApp } from './firebaseClient.js';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://byptxntjlrtegyywfqia.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  'sb_publishable_FhI5_9nGjHP2olHOB1d39A_nixsES1b';
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_SUPABASE_TIMEOUT_MS || 30000);

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

const DATA_MODE_STORAGE_KEY = 'bfm_data_mode';
const MOCK_PLAYERS_KEY = 'bfm_mock_players';
const MOCK_TOURNAMENTS_KEY = 'bfm_mock_tournaments';
const MOCK_SNAPSHOTS_KEY = 'bfm_mock_snapshots';
const MOCK_SKILL_SUGGESTIONS_KEY = 'bfm_mock_skill_suggestions';
const MOCK_PREDICTIONS_KEY = 'bfm_mock_predictions';
const ENV_DATA_MODE = String(import.meta.env.VITE_DATA_SOURCE || 'mock').toLowerCase();

function getStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function safeParseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function readStore(key, fallback) {
  const storage = getStorage();
  if (!storage) return fallback;
  return safeParseJson(storage.getItem(key), fallback);
}

function writeStore(key, value) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(key, JSON.stringify(value));
}

function stripUndefinedDeep(value) {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)).filter((item) => item !== undefined);
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const cleaned = stripUndefinedDeep(v);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return out;
  }
  return value;
}

function sanitizeForFirestore(value) {
  return stripUndefinedDeep(value);
}

function makeId(prefix) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const DUMMY_PLAYER_NAMES = [
  'Aarav Kumar',
  'Vivaan Sharma',
  'Aditya Nair',
  'Arjun Reddy',
  'Sai Prakash',
  'Rohan Verma',
  'Nikhil Rao',
  'Kiran Das',
  'Rahul Menon',
  'Dhruv Shah',
  'Priya Iyer',
  'Ananya Singh',
  'Sneha Patel',
  'Meera Joseph',
  'Kavya Rao',
  'Ishita Gupta',
  'Neha Ramesh',
  'Pooja Nair',
  'Aditi Kapoor',
  'Ritika Bansal',
];

function normalizePlayerRole(role) {
  return String(role || '').toLowerCase() === 'admin' ? 'admin' : 'player';
}

function buildDummyPlayers(count = 20) {
  const size = Math.max(1, Number(count) || 20);
  return Array.from({ length: size }, (_, idx) => {
    const name = DUMMY_PLAYER_NAMES[idx % DUMMY_PLAYER_NAMES.length];
    return {
      name,
      age: 18 + (idx % 18),
      mobile: `90000${String(10000 + idx)}`,
      skill: 3 + (idx % 8),
      role: 'player',
      created_at: new Date(Date.now() - idx * 3600000).toISOString(),
    };
  });
}

function seedMockPlayersIfNeeded() {
  const existing = readStore(MOCK_PLAYERS_KEY, []);
  if (Array.isArray(existing) && existing.length > 0) return existing;

  const seeded = buildDummyPlayers(20).map((p) => ({ id: makeId('P'), ...p }));
  writeStore(MOCK_PLAYERS_KEY, seeded);
  return seeded;
}

export async function seedDummyPlayersOnce(count = 20) {
  const size = Math.max(1, Number(count) || 20);
  const existing = await listPlayers();
  if (Array.isArray(existing) && existing.length > 0) {
    return { seeded: false, count: existing.length };
  }

  const rows = buildDummyPlayers(size);
  if (isMockMode()) {
    const withIds = rows.map((p) => ({ id: makeId('P'), ...p }));
    writeStore(MOCK_PLAYERS_KEY, withIds);
    return { seeded: true, count: withIds.length };
  }

  if (isFirebaseMode()) {
    const fdb = ensureFirebaseDb('seedDummyPlayersOnce');
    await Promise.all(
      rows.map((row) => addDoc(collection(fdb, 'players'), sanitizeForFirestore(row)))
    );
    return { seeded: true, count: rows.length };
  }

  const payload = rows.map((row) => ({
    name: row.name,
    age: row.age,
    mobile: row.mobile,
    skill: row.skill,
    role: row.role,
  }));
  const { error } = await supabase.from('players').insert(payload);
  if (error) throw new Error(normalizeDbError('seedDummyPlayersOnce', error));
  return { seeded: true, count: payload.length };
}

export function getDataMode() {
  const storage = getStorage();
  const runtime = storage?.getItem(DATA_MODE_STORAGE_KEY)?.toLowerCase();
  if (runtime === 'mock' || runtime === 'supabase' || runtime === 'firebase') return runtime;
  if (ENV_DATA_MODE === 'mock') return 'mock';
  if (ENV_DATA_MODE === 'firebase') return 'firebase';
  return 'supabase';
}

export function setDataMode(mode) {
  const normalized = String(mode || '').toLowerCase();
  if (normalized !== 'mock' && normalized !== 'supabase' && normalized !== 'firebase') {
    throw new Error('[setDataMode] mode must be "mock", "supabase", or "firebase"');
  }
  const storage = getStorage();
  storage?.setItem(DATA_MODE_STORAGE_KEY, normalized);
}

export function isMockMode() {
  return getDataMode() === 'mock';
}

export function isFirebaseMode() {
  return getDataMode() === 'firebase';
}

function ensureFirebaseDb(scope) {
  if (!hasFirebaseConfig || !db) {
    throw new Error(
      `[${scope}] Firebase is not configured. Set VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID (and related Firebase env vars).`
    );
  }
  return db;
}

function ensureFirebaseStorage(scope) {
  if (!hasFirebaseConfig || !storage) {
    throw new Error(
      `[${scope}] Firebase Storage is not configured. Set VITE_FIREBASE_STORAGE_BUCKET (and related Firebase env vars).`
    );
  }
  return storage;
}

function profilePhotoStorageProvider() {
  const raw = String(import.meta.env.VITE_PROFILE_PHOTO_STORAGE || '').trim().toLowerCase();
  return raw === 'backblaze' ? 'backblaze' : 'firebase';
}

function buildProfilePhotoPath(playerId, fileName) {
  const safeName = String(fileName || 'photo')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(-80);
  return `profile_photos/${playerId}/${Date.now()}_${safeName}`;
}

async function uploadProfilePhotoToBackblaze(path, file) {
  const signEndpoint = String(import.meta.env.VITE_BACKBLAZE_SIGNED_UPLOAD_URL || '').trim();
  if (!signEndpoint) {
    throw new Error(
      '[uploadPlayerProfilePhoto] Backblaze is enabled, but VITE_BACKBLAZE_SIGNED_UPLOAD_URL is missing.'
    );
  }

  const signToken = String(import.meta.env.VITE_BACKBLAZE_SIGNED_UPLOAD_TOKEN || '').trim();
  const signHeaders = { 'Content-Type': 'application/json' };
  if (signToken) signHeaders.Authorization = `Bearer ${signToken}`;

  const signRes = await fetch(signEndpoint, {
    method: 'POST',
    headers: signHeaders,
    body: JSON.stringify({
      path,
      fileName: String(file.name || '').trim() || 'photo',
      contentType: String(file.type || 'application/octet-stream'),
    }),
  });
  if (!signRes.ok) {
    throw new Error(`[uploadPlayerProfilePhoto] Backblaze signing failed (${signRes.status}).`);
  }

  const signPayload = await signRes.json();
  const uploadUrl = String(signPayload?.uploadUrl || '').trim();
  if (!uploadUrl) {
    throw new Error('[uploadPlayerProfilePhoto] Backblaze signing response missing uploadUrl.');
  }

  const uploadMethod = String(signPayload?.method || 'PUT').toUpperCase();
  const uploadHeaders =
    signPayload?.headers && typeof signPayload.headers === 'object'
      ? { ...signPayload.headers }
      : {};
  if (
    uploadMethod === 'PUT' &&
    !Object.keys(uploadHeaders).some((k) => k.toLowerCase() === 'content-type')
  ) {
    uploadHeaders['Content-Type'] = String(file.type || 'application/octet-stream');
  }

  let uploadRes;
  const formFields =
    signPayload?.fields && typeof signPayload.fields === 'object' ? signPayload.fields : null;
  if (formFields && Object.keys(formFields).length > 0) {
    const form = new FormData();
    Object.entries(formFields).forEach(([k, v]) => {
      form.append(k, String(v ?? ''));
    });
    form.append('file', file);
    uploadRes = await fetch(uploadUrl, { method: 'POST', body: form });
  } else {
    uploadRes = await fetch(uploadUrl, {
      method: uploadMethod,
      headers: uploadHeaders,
      body: file,
    });
  }

  if (!uploadRes.ok) {
    throw new Error(`[uploadPlayerProfilePhoto] Backblaze upload failed (${uploadRes.status}).`);
  }

  const directUrl = String(signPayload?.publicUrl || '').trim();
  const publicBase = String(import.meta.env.VITE_BACKBLAZE_PUBLIC_BASE_URL || '').trim();
  const normalizedBase = publicBase.replace(/\/+$/, '');
  const normalizedPath = path.replace(/^\/+/, '');
  const fallbackUrl = normalizedBase ? `${normalizedBase}/${normalizedPath}` : '';
  const url = directUrl || fallbackUrl;
  if (!url) {
    throw new Error(
      '[uploadPlayerProfilePhoto] Backblaze upload succeeded, but public URL is missing.'
    );
  }

  return { url, path };
}

/**
 * Upload a profile picture to configured storage and return a public URL.
 * @param {string} playerId
 * @param {File} file
 */
export async function uploadPlayerProfilePhoto(playerId, file) {
  const uid = String(playerId || '').trim();
  if (!uid) throw new Error('[uploadPlayerProfilePhoto] Missing player id');
  if (!file) throw new Error('[uploadPlayerProfilePhoto] File is required');
  if (!String(file.type || '').startsWith('image/')) {
    throw new Error('[uploadPlayerProfilePhoto] Please select an image file.');
  }

  const path = buildProfilePhotoPath(uid, file.name);
  if (profilePhotoStorageProvider() === 'backblaze') {
    return uploadProfilePhotoToBackblaze(path, file);
  }

  const fs = ensureFirebaseStorage('uploadPlayerProfilePhoto');
  const uploadTo = async (targetStorage) => {
    const fileRef = ref(targetStorage, path);
    await uploadBytes(fileRef, file, { contentType: file.type || 'application/octet-stream' });
    const url = await getDownloadURL(fileRef);
    return { url, path };
  };

  try {
    return await uploadTo(fs);
  } catch (firstErr) {
    const msg = String(firstErr?.message || '');
    const isCorsLike =
      /cors/i.test(msg) ||
      /networkerror/i.test(msg) ||
      /failed to fetch/i.test(msg) ||
      /load failed/i.test(msg);
    const projectId = String(import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim();
    if (!isCorsLike || !firebaseApp || !projectId) {
      throw firstErr;
    }
    // Some projects are configured with <project>.firebasestorage.app while
    // uploads only work against the gs://<project>.appspot.com bucket.
    const fallbackStorage = getFirebaseStorage(firebaseApp, `gs://${projectId}.appspot.com`);
    try {
      return await uploadTo(fallbackStorage);
    } catch {
      throw firstErr;
    }
  }
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
//   VITE_DATA_SOURCE=mock|supabase|firebase   (defaults to mock in this temporary setup)
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
  if (isMockMode()) {
    const rows = seedMockPlayersIfNeeded();
    return [...rows].sort((a, b) => a.name.localeCompare(b.name));
  }
  if (isFirebaseMode()) {
    const fdb = ensureFirebaseDb('listPlayers');
    const q = query(collection(fdb, 'players'), orderBy('name', 'asc'));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, role: 'player', ...d.data() }))
      .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
  }

  const preferred = await supabase
    .from('players')
    .select('id, name, age, mobile, skill, role')
    .order('name', { ascending: true });

  if (!preferred.error)
    return (preferred.data ?? [])
      .map((p) => ({ ...p, role: normalizePlayerRole(p?.role) }))
      .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));

  const fallback = await supabase
    .from('players')
    .select('id, name, skill')
    .order('name', { ascending: true });
  if (fallback.error) throw new Error(normalizeDbError('listPlayers', fallback.error));
  return (fallback.data ?? []).map((p) => ({
    ...p,
    age: null,
    mobile: '',
    role: 'player',
    avatarUrl: p?.avatarUrl || '',
  }));
}

/**
 * Upsert many players into the master list.
 * @param {{name: string, skill: number}[]} players
 * Dedup by name (case-insensitive) via a unique index on lower(name).
 */
export async function upsertPlayers(players) {
  if (isMockMode()) {
    if (!Array.isArray(players) || players.length === 0) return [];
    const current = seedMockPlayersIfNeeded();
    const byName = new Map(current.map((p) => [p.name.trim().toLowerCase(), p]));
    const touched = [];

    for (const p of players) {
      const name = String(p?.name || '').trim();
      if (!name) continue;
      const skill = Math.min(10, Math.max(1, Number(p?.skill) || 5));
      const key = name.toLowerCase();
      const existing = byName.get(key);
      if (existing) {
        existing.skill = skill;
        touched.push(existing);
      } else {
        const row = {
          id: makeId('P'),
          name,
          age: null,
          mobile: '',
          skill,
          role: 'player',
          avatarUrl: '',
          created_at: new Date().toISOString(),
        };
        current.push(row);
        byName.set(key, row);
        touched.push(row);
      }
    }

    writeStore(MOCK_PLAYERS_KEY, current);
    return touched;
  }
  if (isFirebaseMode()) {
    const fdb = ensureFirebaseDb('upsertPlayers');
    if (!Array.isArray(players) || players.length === 0) return [];
    const existing = await listPlayers();
    const byName = new Map(existing.map((p) => [String(p.name || '').trim().toLowerCase(), p]));
    const touched = [];
    for (const p of players) {
      const name = String(p?.name || '').trim();
      if (!name) continue;
      const skill = Math.min(10, Math.max(1, Number(p?.skill) || 5));
      const key = name.toLowerCase();
      const ex = byName.get(key);
      if (ex?.id) {
        await updateDoc(doc(fdb, 'players', ex.id), sanitizeForFirestore({ name, skill }));
        touched.push({ ...ex, name, skill, role: normalizePlayerRole(ex?.role) });
      } else {
        const created = await addDoc(
          collection(fdb, 'players'),
          sanitizeForFirestore({
            name,
            skill,
            age: null,
            mobile: '',
            role: 'player',
            avatarUrl: '',
            created_at: new Date().toISOString(),
          })
        );
        touched.push({
          id: created.id,
          name,
          skill,
          age: null,
          mobile: '',
          role: 'player',
          avatarUrl: '',
          created_at: new Date().toISOString(),
        });
      }
    }
    return touched;
  }

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
    role: normalizePlayerRole(player?.role),
    avatarUrl: String(player?.avatarUrl || '').trim(),
  };

  if (!row.name) throw new Error('[createPlayer] Name is required');
  if (!Number.isInteger(row.age) || row.age < 1) {
    throw new Error('[createPlayer] Valid age is required');
  }
  if (!row.mobile) throw new Error('[createPlayer] Mobile is required');

  if (isMockMode()) {
    const current = seedMockPlayersIfNeeded();
    const created = {
      id: makeId('P'),
      ...row,
      created_at: new Date().toISOString(),
    };
    current.push(created);
    writeStore(MOCK_PLAYERS_KEY, current);
    return created;
  }
  if (isFirebaseMode()) {
    const fdb = ensureFirebaseDb('createPlayer');
    const createdAt = new Date().toISOString();
    const ref = await addDoc(
      collection(fdb, 'players'),
      sanitizeForFirestore({
        ...row,
        created_at: createdAt,
      })
    );
    return { id: ref.id, ...row, created_at: createdAt };
  }

  const { data, error } = await supabase
    .from('players')
    .insert({
      name: row.name,
      age: row.age,
      mobile: row.mobile,
      skill: row.skill,
      role: row.role,
    })
    .select('id, name, age, mobile, skill, role')
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
    role: normalizePlayerRole(player?.role),
    avatarUrl: String(player?.avatarUrl || '').trim(),
  };

  if (!row.name) throw new Error('[updatePlayer] Name is required');
  if (!Number.isInteger(row.age) || row.age < 1) {
    throw new Error('[updatePlayer] Valid age is required');
  }
  if (!row.mobile) throw new Error('[updatePlayer] Mobile is required');

  if (isMockMode()) {
    const current = seedMockPlayersIfNeeded();
    const idx = current.findIndex((p) => p.id === id);
    if (idx < 0) throw new Error('[updatePlayer] Player not found');
    current[idx] = { ...current[idx], ...row };
    writeStore(MOCK_PLAYERS_KEY, current);
    return current[idx];
  }
  if (isFirebaseMode()) {
    const fdb = ensureFirebaseDb('updatePlayer');
    await updateDoc(doc(fdb, 'players', id), sanitizeForFirestore(row));
    return { id, ...row };
  }

  const { data, error } = await supabase
    .from('players')
    .update({
      name: row.name,
      age: row.age,
      mobile: row.mobile,
      skill: row.skill,
      role: row.role,
    })
    .eq('id', id)
    .select('id, name, age, mobile, skill, role')
    .single();

  if (error) throw new Error(normalizeDbError('updatePlayer', error));
  return data;
}

/** Delete one player by id. */
export async function deletePlayer(id) {
  if (!id) throw new Error('[deletePlayer] Missing player id');
  if (isMockMode()) {
    const current = seedMockPlayersIfNeeded();
    writeStore(
      MOCK_PLAYERS_KEY,
      current.filter((p) => p.id !== id)
    );
    return;
  }
  if (isFirebaseMode()) {
    const fdb = ensureFirebaseDb('deletePlayer');
    await deleteDoc(doc(fdb, 'players', id));
    return;
  }
  const { error } = await supabase.from('players').delete().eq('id', id);
  if (error) throw new Error(normalizeDbError('deletePlayer', error));
}

// -----------------------------
// Skill suggestions
// -----------------------------

function normalizeSkillSuggestionRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    id: row.id,
    suggesterPlayerId: row.suggester_player_id,
    suggesterMobile: row.suggester_mobile || '',
    suggestedPlayerId: row.suggested_player_id,
    skill: Math.min(10, Math.max(1, Number(row.skill) || 5)),
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  }));
}

/**
 * List skill suggestions made by one user.
 * @param {string} suggesterPlayerId
 */
export async function listSkillSuggestionsBySuggester(suggesterPlayerId) {
  if (!suggesterPlayerId) return [];

  if (isMockMode()) {
    const rows = readStore(MOCK_SKILL_SUGGESTIONS_KEY, []);
    return normalizeSkillSuggestionRows(
      rows.filter((row) => row.suggester_player_id === suggesterPlayerId)
    );
  }

  if (isFirebaseMode()) {
    const fdb = ensureFirebaseDb('listSkillSuggestionsBySuggester');
    const q = query(
      collection(fdb, 'skill_suggestions'),
      where('suggester_player_id', '==', suggesterPlayerId)
    );
    const snap = await getDocs(q);
    return normalizeSkillSuggestionRows(
      snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    );
  }

  const { data, error } = await supabase
    .from('skill_suggestions')
    .select('id, suggester_player_id, suggester_mobile, suggested_player_id, skill, created_at, updated_at')
    .eq('suggester_player_id', suggesterPlayerId);

  if (error) throw new Error(normalizeDbError('listSkillSuggestionsBySuggester', error));
  return normalizeSkillSuggestionRows(data);
}

/**
 * Replace all skill suggestions for one user in bulk.
 * @param {{suggesterPlayerId: string, suggesterMobile?: string, suggestions: Array<{playerId: string, skill: number}>}} input
 */
export async function saveSkillSuggestionsBySuggester(input) {
  const suggesterPlayerId = String(input?.suggesterPlayerId || '').trim();
  const suggesterMobile = String(input?.suggesterMobile || '').trim();
  const rawSuggestions = Array.isArray(input?.suggestions) ? input.suggestions : [];
  if (!suggesterPlayerId) {
    throw new Error('[saveSkillSuggestionsBySuggester] Missing suggester player id');
  }

  const deduped = new Map();
  for (const row of rawSuggestions) {
    const playerId = String(row?.playerId || '').trim();
    const skill = Math.min(10, Math.max(1, Number(row?.skill) || 0));
    if (!playerId) continue;
    if (!Number.isFinite(skill) || skill < 1 || skill > 10) continue;
    if (playerId === suggesterPlayerId) continue;
    deduped.set(playerId, skill);
  }
  const cleaned = [...deduped.entries()].map(([playerId, skill]) => ({
    suggester_player_id: suggesterPlayerId,
    suggester_mobile: suggesterMobile,
    suggested_player_id: playerId,
    skill,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  }));

  if (isMockMode()) {
    const current = readStore(MOCK_SKILL_SUGGESTIONS_KEY, []);
    const remaining = current.filter((row) => row.suggester_player_id !== suggesterPlayerId);
    const next = [
      ...remaining,
      ...cleaned.map((row) => ({
        id: makeId('SS'),
        ...row,
      })),
    ];
    writeStore(MOCK_SKILL_SUGGESTIONS_KEY, next);
    return { saved: cleaned.length };
  }

  if (isFirebaseMode()) {
    const fdb = ensureFirebaseDb('saveSkillSuggestionsBySuggester');
    const existingQ = query(
      collection(fdb, 'skill_suggestions'),
      where('suggester_player_id', '==', suggesterPlayerId)
    );
    const existingSnap = await getDocs(existingQ);
    await Promise.all(existingSnap.docs.map((d) => deleteDoc(doc(fdb, 'skill_suggestions', d.id))));
    if (cleaned.length > 0) {
      await Promise.all(
        cleaned.map((row) =>
          addDoc(collection(fdb, 'skill_suggestions'), sanitizeForFirestore(row))
        )
      );
    }
    return { saved: cleaned.length };
  }

  const deleteRes = await supabase
    .from('skill_suggestions')
    .delete()
    .eq('suggester_player_id', suggesterPlayerId);
  if (deleteRes.error) {
    throw new Error(normalizeDbError('saveSkillSuggestionsBySuggester.delete', deleteRes.error));
  }
  if (cleaned.length > 0) {
    const insertRes = await supabase.from('skill_suggestions').insert(cleaned);
    if (insertRes.error) {
      throw new Error(normalizeDbError('saveSkillSuggestionsBySuggester.insert', insertRes.error));
    }
  }
  return { saved: cleaned.length };
}

/** List average suggested skill per player across all submitted suggestions. */
export async function listSkillSuggestionAverages() {
  let rows = [];

  if (isMockMode()) {
    rows = readStore(MOCK_SKILL_SUGGESTIONS_KEY, []);
  } else if (isFirebaseMode()) {
    const fdb = ensureFirebaseDb('listSkillSuggestionAverages');
    const snap = await getDocs(collection(fdb, 'skill_suggestions'));
    rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } else {
    const { data, error } = await supabase
      .from('skill_suggestions')
      .select('suggested_player_id, skill');
    if (error) throw new Error(normalizeDbError('listSkillSuggestionAverages', error));
    rows = data || [];
  }

  const grouped = new Map();
  for (const row of rows) {
    const playerId = String(row?.suggested_player_id || '').trim();
    const skill = Number(row?.skill);
    if (!playerId || !Number.isFinite(skill)) continue;
    const prev = grouped.get(playerId) || { total: 0, votes: 0 };
    prev.total += skill;
    prev.votes += 1;
    grouped.set(playerId, prev);
  }

  return [...grouped.entries()].map(([playerId, stats]) => ({
    playerId,
    votes: stats.votes,
    averageSkill: stats.votes > 0 ? Number((stats.total / stats.votes).toFixed(2)) : 0,
  }));
}

// -----------------------------
// Predictions
// -----------------------------

/**
 * Fetch a user's saved prediction for a tournament.
 * @param {string} tournamentId
 * @param {string} predictorMobile
 */
export async function getPredictionByTournamentAndUser(tournamentId, predictorMobile) {
  const tid = String(tournamentId || '').trim();
  const mobile = String(predictorMobile || '').trim();
  if (!tid || !mobile) return null;

  if (isMockMode()) {
    const rows = readStore(MOCK_PREDICTIONS_KEY, []);
    return (
      rows.find(
        (row) => row?.tournament_id === tid && String(row?.predictor_mobile || '') === mobile
      ) || null
    );
  }

  if (isFirebaseMode()) {
    const fdb = ensureFirebaseDb('getPredictionByTournamentAndUser');
    const q = query(
      collection(fdb, 'predictions'),
      where('tournament_id', '==', tid),
      where('predictor_mobile', '==', mobile)
    );
    const snap = await getDocs(q);
    const first = snap.docs[0];
    if (!first) return null;
    return { id: first.id, ...first.data() };
  }

  const { data, error } = await supabase
    .from('predictions')
    .select('id, tournament_id, predictor_mobile, payload, created_at, updated_at')
    .eq('tournament_id', tid)
    .eq('predictor_mobile', mobile)
    .order('updated_at', { ascending: false })
    .limit(1);
  if (error) throw new Error(normalizeDbError('getPredictionByTournamentAndUser', error));
  return data?.[0] || null;
}

/**
 * Save (replace) one user's prediction for a tournament.
 * @param {{tournamentId:string, predictorMobile:string, payload:object}} input
 */
export async function savePrediction(input) {
  const tid = String(input?.tournamentId || '').trim();
  const mobile = String(input?.predictorMobile || '').trim();
  const payload = input?.payload || {};
  if (!tid) throw new Error('[savePrediction] Missing tournament id');
  if (!mobile) throw new Error('[savePrediction] Missing predictor mobile');

  const nowIso = new Date().toISOString();
  const row = {
    tournament_id: tid,
    predictor_mobile: mobile,
    payload,
    updated_at: nowIso,
  };

  if (isMockMode()) {
    const rows = readStore(MOCK_PREDICTIONS_KEY, []);
    const idx = rows.findIndex(
      (r) => r?.tournament_id === tid && String(r?.predictor_mobile || '') === mobile
    );
    if (idx >= 0) {
      rows[idx] = {
        ...rows[idx],
        ...row,
      };
      writeStore(MOCK_PREDICTIONS_KEY, rows);
      return rows[idx];
    }
    const created = {
      id: makeId('PR'),
      ...row,
      created_at: nowIso,
    };
    rows.unshift(created);
    writeStore(MOCK_PREDICTIONS_KEY, rows);
    return created;
  }

  if (isFirebaseMode()) {
    const fdb = ensureFirebaseDb('savePrediction');
    const q = query(
      collection(fdb, 'predictions'),
      where('tournament_id', '==', tid),
      where('predictor_mobile', '==', mobile)
    );
    const snap = await getDocs(q);
    if (snap.docs.length > 0) {
      const primary = snap.docs[0];
      await updateDoc(
        doc(fdb, 'predictions', primary.id),
        sanitizeForFirestore({
          ...row,
        })
      );
      if (snap.docs.length > 1) {
        await Promise.all(
          snap.docs.slice(1).map((d) => deleteDoc(doc(fdb, 'predictions', d.id)))
        );
      }
      return { id: primary.id, ...(primary.data() || {}), ...row };
    }
    const created = await addDoc(
      collection(fdb, 'predictions'),
      sanitizeForFirestore({
        ...row,
        created_at: nowIso,
      })
    );
    return { id: created.id, ...row, created_at: nowIso };
  }

  const deleteExisting = await supabase
    .from('predictions')
    .delete()
    .eq('tournament_id', tid)
    .eq('predictor_mobile', mobile);
  if (deleteExisting.error) {
    throw new Error(normalizeDbError('savePrediction.delete', deleteExisting.error));
  }

  const { data, error } = await supabase
    .from('predictions')
    .insert({
      ...row,
      created_at: nowIso,
    })
    .select('id, tournament_id, predictor_mobile, payload, created_at, updated_at')
    .single();

  if (error) throw new Error(normalizeDbError('savePrediction.insert', error));
  return data;
}

// -----------------------------
// Tournaments
// -----------------------------

/**
 * Save (insert) a tournament payload. Returns the new tournament id.
 * @param {object} payload - full tournament object with at least { name, ... }
 */
export async function saveTournament(payload) {
  if (payload?.id) {
    await updateTournament(payload.id, payload);
    return payload.id;
  }

  const name = payload?.name || `Tournament ${new Date().toLocaleString()}`;
  const status = payload?.status || 'Upcoming';
  const row = {
    name,
    status,
    payload,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isMockMode()) {
    const current = readStore(MOCK_TOURNAMENTS_KEY, []);
    const id = makeId('T');
    current.unshift({ id, ...row });
    writeStore(MOCK_TOURNAMENTS_KEY, current);
    return id;
  }
  if (isFirebaseMode()) {
    const fdb = ensureFirebaseDb('saveTournament');
    const ref = await addDoc(collection(fdb, 'tournaments'), sanitizeForFirestore(row));
    return ref.id;
  }

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

  if (isMockMode()) {
    const current = readStore(MOCK_SNAPSHOTS_KEY, []);
    const id = makeId('TS');
    current.unshift({ id, ...row });
    writeStore(MOCK_SNAPSHOTS_KEY, current);
    return id;
  }
  if (isFirebaseMode()) {
    const fdb = ensureFirebaseDb('saveTournamentSnapshot');
    const ref = await addDoc(
      collection(fdb, 'tournament_snapshots'),
      sanitizeForFirestore(row)
    );
    return ref.id;
  }

  const { data, error } = await supabase
    .from('tournament_snapshots')
    .insert(row)
    .select('id');
  if (error) throw new Error(`[saveTournamentSnapshot] ${error.message}`);
  return data?.[0]?.id ?? null;
}

/** List recent tournaments with light metadata for the browser modal. */
export async function listTournaments() {
  if (isMockMode()) {
    const data = readStore(MOCK_TOURNAMENTS_KEY, []);
    return [...data]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .map((row) => ({
        ...row,
        eventDate: row?.payload?.eventDate || '',
      }));
  }
  if (isFirebaseMode()) {
    const fdb = ensureFirebaseDb('listTournaments');
    const q = query(collection(fdb, 'tournaments'), orderBy('created_at', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const row = { id: d.id, ...d.data() };
      return {
        ...row,
        eventDate: row?.payload?.eventDate || '',
      };
    });
  }

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
  if (isMockMode()) {
    const data = readStore(MOCK_TOURNAMENTS_KEY, []);
    const row = data.find((t) => t.id === id);
    if (!row) throw new Error('[loadTournament] Tournament not found');
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      ...(row.payload || {}),
    };
  }
  if (isFirebaseMode()) {
    const fdb = ensureFirebaseDb('loadTournament');
    const snap = await getDoc(doc(fdb, 'tournaments', id));
    if (!snap.exists()) throw new Error('[loadTournament] Tournament not found');
    const row = snap.data();
    return {
      id: snap.id,
      name: row.name,
      status: row.status,
      ...(row.payload || {}),
    };
  }

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
  if (isMockMode()) {
    const tournaments = readStore(MOCK_TOURNAMENTS_KEY, []);
    const snapshots = readStore(MOCK_SNAPSHOTS_KEY, []);
    writeStore(
      MOCK_TOURNAMENTS_KEY,
      tournaments.filter((t) => t.id !== id)
    );
    writeStore(
      MOCK_SNAPSHOTS_KEY,
      snapshots.filter((s) => s.tournament_id !== id)
    );
    return;
  }
  if (isFirebaseMode()) {
    const fdb = ensureFirebaseDb('deleteTournament');
    await deleteDoc(doc(fdb, 'tournaments', id));
    const snapQ = query(
      collection(fdb, 'tournament_snapshots'),
      where('tournament_id', '==', id)
    );
    const snapDocs = await getDocs(snapQ);
    await Promise.all(snapDocs.docs.map((d) => deleteDoc(doc(fdb, 'tournament_snapshots', d.id))));
    return;
  }
  const { error } = await supabase.from('tournaments').delete().eq('id', id);
  if (error) throw new Error(`[deleteTournament] ${error.message}`);
}

// -----------------------------
// Optional helpers (not required by your UI, but handy)
// -----------------------------

/** Update an existing tournament’s payload (if you add an “Update” flow). */
export async function updateTournament(id, payload) {
  if (!id) throw new Error('[updateTournament] Missing id');
  if (isMockMode()) {
    const tournaments = readStore(MOCK_TOURNAMENTS_KEY, []);
    const idx = tournaments.findIndex((t) => t.id === id);
    if (idx < 0) throw new Error('[updateTournament] Tournament not found');
    tournaments[idx] = {
      ...tournaments[idx],
      payload,
      name: payload?.name ?? tournaments[idx].name,
      status: payload?.status ?? tournaments[idx].status,
      updated_at: new Date().toISOString(),
    };
    writeStore(MOCK_TOURNAMENTS_KEY, tournaments);
    return;
  }
  if (isFirebaseMode()) {
    const fdb = ensureFirebaseDb('updateTournament');
    await updateDoc(
      doc(fdb, 'tournaments', id),
      sanitizeForFirestore({
        payload,
        updated_at: new Date().toISOString(),
        name: payload?.name ?? null,
        status: payload?.status ?? null,
      })
    );
    return;
  }

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
  if (isMockMode()) {
    const tournaments = readStore(MOCK_TOURNAMENTS_KEY, []);
    const idx = tournaments.findIndex((t) => t.id === id);
    if (idx < 0) throw new Error('[updateTournamentStatus] Tournament not found');
    tournaments[idx] = {
      ...tournaments[idx],
      status,
      payload: {
        ...(tournaments[idx].payload || {}),
        status,
      },
      updated_at: new Date().toISOString(),
    };
    writeStore(MOCK_TOURNAMENTS_KEY, tournaments);
    return;
  }
  if (isFirebaseMode()) {
    const fdb = ensureFirebaseDb('updateTournamentStatus');
    const currentSnap = await getDoc(doc(fdb, 'tournaments', id));
    if (!currentSnap.exists()) throw new Error('[updateTournamentStatus] Tournament not found');
    const current = currentSnap.data();
    await updateDoc(
      doc(fdb, 'tournaments', id),
      sanitizeForFirestore({
        status,
        payload: {
          ...(current?.payload || {}),
          status,
        },
        updated_at: new Date().toISOString(),
      })
    );
    return;
  }

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
  if (isMockMode()) {
    const data = readStore(MOCK_SNAPSHOTS_KEY, []);
    return data
      .filter((row) => row.tournament_id === tournamentId)
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .map((row) => ({ id: row.id, created_at: row.created_at }));
  }
  if (isFirebaseMode()) {
    const fdb = ensureFirebaseDb('listSnapshots');
    const q = query(
      collection(fdb, 'tournament_snapshots'),
      where('tournament_id', '==', tournamentId),
      orderBy('created_at', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, created_at: d.data().created_at }));
  }

  const { data, error } = await supabase
    .from('tournament_snapshots')
    .select('id, created_at')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`[listSnapshots] ${error.message}`);
  return data ?? [];
}
