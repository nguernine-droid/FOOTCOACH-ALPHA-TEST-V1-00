// Edge Function : send-event-reminders
// Déclenchée par un cron Supabase toutes les 15 minutes.
// Envoie une notification push aux coachs 2h avant chaque événement.

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
      'Content-Type': 'application/json',
    },
  });
  return res.json();
}

Deno.serve(async () => {
  try {
    const now       = new Date();
    const from      = new Date(now.getTime() + 110 * 60 * 1000); // +1h50
    const to        = new Date(now.getTime() + 130 * 60 * 1000); // +2h10

    const fromDate  = from.toISOString().slice(0, 10);
    const toDate    = to.toISOString().slice(0, 10);
    const fromTime  = from.toTimeString().slice(0, 5);
    const toTime    = to.toTimeString().slice(0, 5);

    // Événements dans la fenêtre ~2h
    const events = await db(
      `events?select=id,title,type,date,time,location,created_by&date=gte.${fromDate}&date=lte.${toDate}&time=gte.${fromTime}&time=lte.${toTime}&deleted_at=is.null&status=eq.scheduled`
    );

    if (!Array.isArray(events) || events.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no events in window' }), { status: 200 });
    }

    let sent = 0;
    let errors = 0;

    for (const event of events) {
      // Récupérer l'abonnement push du créateur
      if (!event.created_by) continue;

      const subs = await db(
        `push_subscriptions?profile_id=eq.${event.created_by}&select=endpoint,p256dh,auth`
      );

      if (!Array.isArray(subs) || subs.length === 0) continue;

      const sub = subs[0];
      const timeLabel = event.time?.slice(0, 5) || '';
      const typeLabel: Record<string, string> = {
        match: 'Match', training: 'Entraînement', tournament: 'Tournoi',
        plateau: 'Plateau', convocation: 'Convocation',
      };

      const payload = JSON.stringify({
        title: `⏰ Rappel — ${typeLabel[event.type] || event.type}`,
        body:  `${event.title} à ${timeLabel} • ${event.location || ''}`.trim(),
        icon:  '/icons/icon-192x192.png',
        tag:   `event-${event.id}`,
        url:   `/events/${event.id}`,
      });

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (err) {
        console.error(`Push failed for event ${event.id}:`, err);
        errors++;
      }
    }

    return new Response(JSON.stringify({ sent, errors, events: events.length }), { status: 200 });

  } catch (err) {
    console.error('send-event-reminders error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
