// Edge Function : notify-sos
// Envoie une push notification prioritaire à tous les coachs
// avec statut 'toujours_pret' dans la même catégorie.

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
      apikey: SUPABASE_URL,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  return res.json();
}

Deno.serve(async (req) => {
  try {
    const { match_request_id, category, exclude_coach_id } = await req.json();

    // 1. Coachs "toujours_pret" dans cette catégorie (sauf celui qui forfait)
    const coaches = await db(
      `profiles?coach_status=eq.toujours_pret&coach_category=eq.${encodeURIComponent(category)}&id=neq.${exclude_coach_id}&select=id`
    );

    if (!Array.isArray(coaches) || coaches.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no toujours_pret coaches' }), { status: 200 });
    }

    let sent = 0;
    for (const coach of coaches) {
      const subs = await db(
        `push_subscriptions?profile_id=eq.${coach.id}&select=endpoint,p256dh,auth`
      );
      if (!Array.isArray(subs) || subs.length === 0) continue;

      const payload = JSON.stringify({
        title: '🚨 SOS — Match urgent !',
        body:  `Un match de ${category} a besoin de vous ! Répondez pour gagner des points XP.`,
        icon:  '/icons/icon-192x192.png',
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
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
