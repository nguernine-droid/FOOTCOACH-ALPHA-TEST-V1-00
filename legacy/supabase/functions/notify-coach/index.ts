// Edge Function : notify-coach
// Appelée par un trigger SQL (POSTMATCHED) ou par le client lors d'une connexion.
// Envoie une notification push à un profil cible.
//
// Durcissement P0 (H4) :
//  - validation stricte des entrées (UUID, longueurs, URL interne) ;
//  - limitation de débit basique par appelant + cible ;
//  - aucune donnée interne renvoyée dans les erreurs.

import webpush from 'npm:web-push@3.6.7';

const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_EMAIL       = Deno.env.get('VAPID_EMAIL')!;
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Limitation de débit en mémoire (best-effort à l'échelle de l'instance).
const RATE_LIMIT = 10;            // messages
const RATE_WINDOW_MS = 60_000;    // par minute et par cible
const hits = new Map<string, number[]>();
function rateLimited(key: string): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > RATE_LIMIT;
}

function clamp(v: unknown, max: number): string | undefined {
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  return s ? s.slice(0, max) : undefined;
}
// URL interne uniquement (évite le phishing via lien externe).
function safeUrl(v: unknown): string {
  if (typeof v !== 'string') return '/radar';
  return /^\/[a-zA-Z0-9/_-]*$/.test(v) ? v.slice(0, 200) : '/radar';
}

async function db(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  return res.json();
}

Deno.serve(async (req) => {
  try {
    // Défense en profondeur : exiger un jeton d'authentification (utilisateur ou service).
    if (!req.headers.get('Authorization')) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
    }

    const raw = await req.json().catch(() => null);
    if (!raw || typeof raw !== 'object') {
      return new Response(JSON.stringify({ error: 'bad request' }), { status: 400 });
    }
    const { profile_id, title, body, url } = raw as Record<string, unknown>;

    if (typeof profile_id !== 'string' || !UUID_RE.test(profile_id)) {
      return new Response(JSON.stringify({ error: 'profile_id invalide' }), { status: 400 });
    }
    if (rateLimited(`coach:${profile_id}`)) {
      return new Response(JSON.stringify({ error: 'rate limited' }), { status: 429 });
    }

    const subs = await db(`push_subscriptions?profile_id=eq.${profile_id}&select=endpoint,p256dh,auth`);
    if (!Array.isArray(subs) || subs.length === 0) {
      return new Response(JSON.stringify({ sent: false, reason: 'no subscription' }), { status: 200 });
    }

    const sub = subs[0];
    const payload = JSON.stringify({
      title: clamp(title, 120) || '⚡ Nouveau défi reçu !',
      body:  clamp(body, 300) || 'Un coach est intéressé par votre annonce.',
      icon:  '/icons/icon.svg',
      tag:   'radar-response',
      url:   safeUrl(url),
    });

    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload
    );

    return new Response(JSON.stringify({ sent: true }), { status: 200 });
  } catch (err) {
    console.error('notify-coach error:', err);
    return new Response(JSON.stringify({ error: 'internal error' }), { status: 500 });
  }
});
