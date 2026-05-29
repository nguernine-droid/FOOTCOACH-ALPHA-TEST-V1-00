'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

// Clé publique VAPID — à remplacer par la tienne (voir README ci-dessous)
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export function EventPushManager() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'subscribed' | 'denied' | 'unsupported'>('idle');

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') { setStatus('denied'); return; }
    if (Notification.permission === 'granted') checkSubscription();
  }, []);

  const checkSubscription = async () => {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    setStatus(sub ? 'subscribed' : 'idle');
  };

  const subscribe = async () => {
    if (!VAPID_PUBLIC_KEY) {
      alert('Clé VAPID non configurée — voir .env.local');
      return;
    }
    setStatus('loading');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setStatus('denied'); return; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('push_subscriptions').upsert({
          profile_id: user.id,
          endpoint:   sub.endpoint,
          p256dh:     btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')!))),
          auth:       btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')!))),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'profile_id' });
      }

      setStatus('subscribed');
    } catch {
      setStatus('idle');
    }
  };

  const unsubscribe = async () => {
    setStatus('loading');
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from('push_subscriptions').delete().eq('profile_id', user.id);
    }
    setStatus('idle');
  };

  if (status === 'unsupported') return null;

  return (
    <button
      onClick={status === 'subscribed' ? unsubscribe : subscribe}
      disabled={status === 'loading' || status === 'denied'}
      title={status === 'denied' ? 'Notifications bloquées par le navigateur' : undefined}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95
        ${status === 'subscribed' ? 'bg-neon-cyan/10 border-neon-cyan text-neon-cyan' : 'bg-white/5 border-white/10 text-gray-500'}
        ${status === 'denied' ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {status === 'loading' && <Loader2 size={14} className="animate-spin" />}
      {status === 'subscribed' && <Bell size={14} />}
      {(status === 'idle' || status === 'denied') && <BellOff size={14} />}
      {status === 'subscribed' ? 'Rappels ON' : status === 'denied' ? 'Bloqué' : 'Activer Rappels'}
    </button>
  );
}
