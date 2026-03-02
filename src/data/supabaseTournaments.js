// You manage src/supabaseAdapter.js which must export a configured `supabase` client.
import { supabase } from '../supabaseAdapter';

// Suggested schema:
//
// create table if not exists public.tournaments (
//   id uuid primary key default gen_random_uuid(),
//   name text not null,
//   created_at timestamptz default now(),
//   data jsonb not null
// );

export async function saveTournament(snapshot) {
  const row = { name: snapshot.name || 'Untitled', data: snapshot };
  const { data, error } = await supabase
    .from('tournaments')
    .insert(row)
    .select('id')
    .single();
  if (error) throw error;
  return { id: data.id };
}

export async function listTournaments() {
  const { data, error } = await supabase
    .from('tournaments')
    .select('id, name, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function loadTournament(id) {
  const { data, error } = await supabase
    .from('tournaments')
    .select('id, name, created_at, data')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTournament(id) {
  const { error } = await supabase.from('tournaments').delete().eq('id', id);
  if (error) throw error;
  return true;
}
