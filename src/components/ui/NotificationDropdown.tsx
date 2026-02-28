'use client';

import { Check, AlertTriangle, Swords } from 'lucide-react';
import type { Notification } from '@/hooks/useNotifications';

interface NotificationDropdownProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClose: () => void;
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'payout_completed':
      return <Check size={12} className="text-emerald-400" />;
    case 'payout_failed':
      return <AlertTriangle size={12} className="text-red-400" />;
    case 'match_result':
      return <Swords size={12} className="text-[#D4A843]" />;
    default:
      return <Swords size={12} className="text-neutral-500" />;
  }
}

function getNotificationBorder(type: Notification['type']) {
  switch (type) {
    case 'payout_completed':
      return 'border-l-emerald-500/50';
    case 'payout_failed':
      return 'border-l-red-500/50';
    case 'match_result':
      return 'border-l-[#D4A843]/50';
    default:
      return 'border-l-neutral-600';
  }
}

export default function NotificationDropdown({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose,
}: NotificationDropdownProps) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Dropdown */}
      <div className="absolute right-0 top-full mt-2 w-80 bg-[#111] border border-[#1a1a1a] z-50 shadow-xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a1a1a]">
          <span className="font-mono text-[10px] text-neutral-400 tracking-widest uppercase">
            Notifications
          </span>
          {notifications.length > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="font-mono text-[9px] text-neutral-500 hover:text-[#D4A843] tracking-widest uppercase transition-colors"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Notification list */}
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <p className="font-mono text-[10px] text-neutral-600">No notifications</p>
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => onMarkAsRead(n.id)}
                className={`w-full text-left px-3 py-2 border-l-2 ${getNotificationBorder(n.type)} hover:bg-[#1a1a1a]/50 transition-colors`}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 flex-shrink-0">{getNotificationIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[10px] text-neutral-300 leading-relaxed">
                      {n.message}
                    </div>
                    <div className="font-mono text-[9px] text-neutral-600 mt-0.5">
                      {getTimeAgo(n.created_at)}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
