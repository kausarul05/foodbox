'use client';

import { useEffect, useState } from 'react';
import { subscriptionAPI } from '@/lib/api';
import { useSession } from '@/lib/useSession';

export interface MySubscription {
  _id: string;
  subscriptionId?: string;
  package: string;
  packageName?: string;
  amount: number;
  status: 'pending' | 'active' | 'expired' | 'cancelled' | string;
  paymentStatus?: string;
  paymentMethod?: string;
  startDate: string;
  endDate: string;
  approvedAt?: string;
  createdAt?: string;
  cancellationReason?: string;
}

/**
 * The logged-in customer's subscription, for screens that need to say "you are
 * already on X".
 *
 * A customer normally has one subscription document, but older accounts can
 * have several. The live one wins — active, then pending — and otherwise the
 * newest, so a past/cancelled one is still shown rather than nothing.
 *
 * `loading` is true only while a logged-in customer's request is in flight;
 * a visitor who is not logged in is never "loading".
 */
export function useMySubscription(): { subscription: MySubscription | null; loading: boolean } {
  const { user, hydrated } = useSession();
  // undefined until the request answers, null when there is nothing to show.
  const [result, setResult] = useState<MySubscription | null | undefined>(undefined);

  useEffect(() => {
    if (!hydrated || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await subscriptionAPI.getMySubscriptions();
        const rows: MySubscription[] = res.success ? (res.data ?? []) : [];
        const pick =
          rows.find((s) => s.status === 'active') ?? rows.find((s) => s.status === 'pending') ?? rows[0] ?? null;
        if (!cancelled) setResult(pick);
      } catch {
        // Not fatal: the page simply behaves as if there were no subscription.
        if (!cancelled) setResult(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, user]);

  if (!hydrated) return { subscription: null, loading: false };
  if (!user) return { subscription: null, loading: false };
  return { subscription: result ?? null, loading: result === undefined };
}
