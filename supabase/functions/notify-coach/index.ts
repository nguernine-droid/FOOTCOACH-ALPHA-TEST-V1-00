// Edge Function : notify-coach
// Appelée par un trigger SQL dès qu'une match_request passe en POSTMATCHED.
// Envoie une notification push au Coach A (propriétaire de l'annonce).

import webpush from 'npm:web-push@3.6.7';

const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_EMAIL       = Deno.env.get('VAPID_EMAIL')!;
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

async function db(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  return res.json();
}

Deno.serve(async (req) => {
  try {
    const { profile_id, title, body, url } = await req.json();

    if (!profile_id) {
      return new Response(JSON.stringify({ error: 'profile_id requis' }), { status: 400 });
    }

    // Récupérer l'abonnement push du coach cible
    const subs = await db(`push_subscriptions?profile_id=eq.${profile_id}&select=endpoint,p256dh,auth`);

    if (!Array.isArray(subs) || subs.length === 0) {
      return new Response(JSON.stringify({ sent: false, reason: 'no subscription' }), { status: 200 });
    }

    const sub = subs[0];
    const payload = JSON.stringify({
      title: title || '⚡ Nouveau défi reçu !',
      body:  body  || 'Un coach est intéressé par votre annonce.',
      icon:  '/icons/icon-192x192.png',
      tag:   'radar-response',
      url:   url || '/radar',
    });

    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload
    );

    return new Response(JSON.stringify({ sent: true }), { status: 200 });

  } catch (err) {
    console.error('notify-coach error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
