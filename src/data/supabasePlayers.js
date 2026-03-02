// ================================
// FILE: src/data/supabasePlayers.js
// ================================
// You manage src/supabaseAdapter.js that exports an initialized `supabase` client.
// Example:
//   import { createClient } from '@supabase/supabase-js';
//   export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

import { supabase } from '../supabaseAdapter';

/**
 * Shape: { id: string, name: string, skill: number }
 * Table: players (id TEXT PRIMARY KEY, name TEXT NOT NULL, skill INT NOT NULL, created_at TIMESTAMP DEFAULT NOW())
 */

export async function loadPlayersFromSupabase() {
  const { data, error } = await supabase
    .from('players')
    .select('id, name, skill')
    .order('name', { ascending: true });

  if (error) throw error;
  // Normalize types (skill as number)
  return (data || []).map((p) => ({
    id: String(p.id),
    name: String(p.name),
    skill: Number(p.skill) || 1,
  }));
}

export async function upsertPlayersToSupabase(players) {
  // Upsert array of players by primary key id
  const clean = players.map((p) => ({
    id: String(p.id),
    name: String(p.name),
    skill: Number(p.skill) || 1,
  }));

  const { error } = await supabase.from('players').upsert(clean, {
    onConflict: 'id',
    ignoreDuplicates: false,
  });

  if (error) throw error;
  return true;
}

export async function insertPlayerToSupabase(player) {
  const row = {
    id: String(player.id),
    name: String(player.name),
    skill: Number(player.skill) || 1,
  };
  const { error } = await supabase.from('players').upsert(row, {
    onConflict: 'id',
    ignoreDuplicates: false,
  });
  if (error) throw error;
  return true;
}

/*

create table if not exists public.players (
  id text primary key,
  name text not null,
  skill int not null check (skill between 1 and 10),
  created_at timestamp with time zone default now()
);
*/
