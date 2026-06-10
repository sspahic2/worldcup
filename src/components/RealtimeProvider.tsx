'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Subscribes to Supabase realtime changes on tables that affect the UI:
 *   - match_cache: live scores, status changes
 *   - pool_members: eliminations / status flips
 *   - picks: pick result updates
 *
 * On any event, calls `router.refresh()` to re-render the tree with
 * fresh server-side data. Refreshes are debounced so a burst of events
 * (e.g. simultaneous score + status updates) only triggers one refetch.
 */
export function RealtimeProvider({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();

    const scheduleRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => router.refresh(), 400);
    };

    const channel = supabase
      .channel('survive:app')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_cache' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pool_members' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'picks' }, scheduleRefresh)
      .subscribe();

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      supabase.removeChannel(channel);
    };
  }, [enabled, router]);

  return null;
}
