'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Notification {
  id: string;
  wallet_address: string;
  type: 'payout_completed' | 'payout_failed' | 'match_result';
  title: string;
  message: string;
  match_id: string | null;
  read: boolean;
  created_at: string;
}

const POLL_INTERVAL = 30_000; // 30s

export function useNotifications(walletAddress: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const res = await fetch(`/api/notifications?wallet=${walletAddress}`);
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      setNotifications(json.notifications ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (!walletAddress) {
      setNotifications([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchNotifications();
    const interval = setInterval(() => {
      if (!cancelled) fetchNotifications();
    }, POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [walletAddress, fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // Silently fail — will be marked on next poll
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    await Promise.allSettled(
      notifications.map((n) => fetch(`/api/notifications/${n.id}/read`, { method: 'POST' })),
    );
    setNotifications([]);
  }, [notifications]);

  return {
    notifications,
    unreadCount: notifications.length,
    loading,
    error,
    markAsRead,
    markAllAsRead,
  };
}
