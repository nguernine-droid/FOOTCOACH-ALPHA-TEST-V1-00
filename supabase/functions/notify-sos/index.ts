// Edge Function : notify-sos
// Envoie une push prioritaire aux coachs 'toujours_pret' d'une catégorie.
//
// Durcissement P0 (H4/M1/L1) :
//  - jeton d'authentification exigé ;
//  - validation UUID de exclude_coach_id (corrige l'injection de filtre PostgREST) ;
//  - catégorie plafonnée + encodée ; limitation de débit ;
//  - correction du bug apikey (utilisait SUPABASE_URL).

import webpush from 'npm:web-push@3.6.7';

const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_EMAIL       = Deno.env.get('VAPID_EMAIL')!;
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RATE_LIMIT = 3;             // vagues SOS
const RATE_WINDOW_MS = 60_000;    // par minute et par appelant (annonce)
const hits = new Map<string, number[]>();
function rateLimited(key: string): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > RATE_LIMIT;
}

async function db(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,                 // corrigé (était SUPABASE_URL)
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  return res.json();
}

Deno.serve(async (req) => {
  try {
    if (!req.headers.get('Authorization')) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
    }

    const raw = await req.json().catch(() => null);
    if (!raw || typeof raw !== 'object') {
      return new Response(JSON.stringify({ error: 'bad request' }), { status: 400 });
    }
    const { match_request_id, category, exclude_coach_id } = raw as Record<string, unknown>;

    if (typeof category !== 'string' || category.length === 0 || category.length > 60) {
      return new Response(JSON.stringify({ error: 'category invalide' }), { status: 400 });
    }
    // exclude_coach_id optionnel mais, s'il est fourni, doit être un UUID (M1).
    if (exclude_coach_id !== undefined &&
        (typeof exclude_coach_id !== 'string' || !UUID_RE.test(exclude_coach_id))) {
      return new Response(JSON.stringify({ error: 'exclude_coach_id invalide' }), { status: 400 });
    }
    if (typeof match_request_id !== 'string' || !UUID_RE.test(match_request_id)) {
      return new Response(JSON.stringify({ error: 'match_request_id invalide' }), { status: 400 });
    }
    if (rateLimited(`sos:${match_request_id}`)) {
      return new Response(JSON.stringify({ error: 'rate limited' }), { status: 429 });
    }

    let query = `profiles?coach_status=eq.toujours_pret&coach_category=eq.${encodeURIComponent(category)}&select=id`;
    if (exclude_coach_id) query += `&id=neq.${exclude_coach_id}`;
    const coaches = await db(query);

    if (!Array.isArray(coaches) || coaches.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no toujours_pret coaches' }), { status: 200 });
    }

    let sent = 0;
    for (const coach of coaches) {
      const subs = await db(`push_subscriptions?profile_id=eq.${coach.id}&select=endpoint,p256dh,auth`);
      if (!Array.isArray(subs) || subs.length === 0) continue;

      const payload = JSON.stringify({
        title: '🚨 SOS — Match urgent !',
        body:  `Un match de ${category} a besoin de vous ! Répondez pour gagner des points XP.`,
        icon:  '/icons/icon.svg',
        tag:   `sos-${match_request_id}`,
        url:   '/radar',
      });

      try {
        await webpush.sendNotification(
          { endpoint: subs[0].endpoint, keys: { p256dh: subs[0].p256dh, auth: subs[0].auth } },
          payload
        );
        sent++;
      } catch (err) {
        console.error(`Push SOS failed for coach ${coach.id}:`, err);
      }
    }

    return new Response(JSON.stringify({ sent, coaches: coaches.length }), { status: 200 });
  } catch (err) {
    console.error('notify-sos error:', err);
    return new Response(JSON.stringify({ error: 'internal error' }), { status: 500 });
  }
});
