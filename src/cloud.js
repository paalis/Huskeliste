import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';
import { toRow, mergeTasks } from './sync.js';

const PENDING = 'huskeliste-slettet', OWNER = 'huskeliste-eier';
export const cloudConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

function pending() { try { return JSON.parse(localStorage.getItem(PENDING)) || []; } catch { return []; } }
function setPending(list) { try { localStorage.setItem(PENDING, JSON.stringify(list)); } catch {} }
function owner() { try { return localStorage.getItem(OWNER); } catch { return null; } }
function setOwner(id) { try { id ? localStorage.setItem(OWNER, id) : localStorage.removeItem(OWNER); } catch {} }

// Slettingen køes uavhengig av om Supabase-klienten er klar, og sendes ved neste synkronisering.
export function queueDelete(id) {
  if (cloudConfigured) setPending([...pending().filter(p => p.id !== id), { id, at:new Date().toISOString() }]);
}

export async function openCloud(store, onAuthChange) {
  if (!cloudConfigured) return null;
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  let user = (await client.auth.getSession()).data.session?.user ?? null;
  // Supabase anbefaler å ikke kalle klienten direkte inne i onAuthStateChange.
  client.auth.onAuthStateChange((_event, session) => { user = session?.user ?? null; setTimeout(() => onAuthChange(user)); });
  const redirect = location.origin + location.pathname;

  async function flushDeletes() {
    const left = [];
    for (const item of pending()) {
      const { error } = await client.from('tasks').update({ deleted_at:item.at, updated_at:item.at }).eq('id', item.id);
      if (error) left.push(item);
    }
    setPending(left);
    if (left.length) throw Error('Slettinger kunne ikke synkroniseres');
  }

  return {
    get user() { return user; },
    signIn: email => client.auth.signInWithOtp({ email, options:{ emailRedirectTo:redirect } }).then(({ error }) => { if (error) throw error; }),
    verify: (email, token) => client.auth.verifyOtp({ email, token, type:'email' }).then(({ error }) => { if (error) throw error; }),
    async signOut() {
      try { await this.sync(); } catch {}
      await client.auth.signOut();
      await store.clear(); setPending([]); setOwner(null);
    },
    async push(task) {
      if (!user) return;
      const { error } = await client.from('tasks').upsert(toRow(task));
      if (error) throw error;
    },
    async remove() { if (user) await flushDeletes(); },
    async sync() {
      if (!user) return false;
      // Lokale data fra en annen konto skal aldri lastes opp til denne kontoen.
      const id = user.id;
      if (owner() && owner() !== id) { await store.clear(); setPending([]); }
      setOwner(id);
      await flushDeletes();
      const { data, error } = await client.from('tasks').select('*');
      if (error) throw error;
      const { toLocal, toRemove, toRemote } = mergeTasks(await store.all(), data);
      for (const task of toLocal) await store.put(task);
      for (const id of toRemove) await store.remove(id);
      if (toRemote.length) { const { error } = await client.from('tasks').upsert(toRemote); if (error) throw error; }
      return true;
    }
  };
}
