"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Bell, Check, CheckCheck, FileText, MessageSquare, UserCheck, AlertTriangle } from "lucide-react";

export default function NotificationsPage() {
  const { user } = useUser();
  const notifications = useQuery(api.notifications.listForUser, user?.id ? { clerkId: user.id } : "skip");
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);

  if (!notifications) {
    return <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="skeleton h-16 rounded-xl"/>)}</div>;
  }

  const unread = notifications.filter(n => !n.read);
  const iconMap: Record<string, typeof Bell> = {
    report_submitted: FileText, comment_added: MessageSquare, comment_reply: MessageSquare,
    report_overdue: AlertTriangle, account_approved: UserCheck, pending_user: UserCheck,
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[1.65rem] font-bold text-text-primary tracking-tight">Notifications</h1>
          <p className="text-text-tertiary text-[13px] mt-0.5">{unread.length} unread</p>
        </div>
        {unread.length > 0 && (
          <button onClick={() => user && markAllRead({ clerkId: user.id })} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-semibold text-brand hover:bg-brand-light transition-all">
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="p-16 rounded-2xl bg-white border border-border-light text-center">
          <Bell size={48} className="text-text-tertiary mx-auto mb-4" />
          <p className="text-text-secondary">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const Icon = iconMap[n.type] || Bell;
            return (
              <div key={n._id} className={`flex items-start gap-3 p-4 rounded-xl transition-all ${n.read ? "bg-white border border-border-light" : "bg-brand-light/30 border border-brand/10"}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${n.read ? "bg-bg-tertiary text-text-tertiary" : "bg-brand-light text-brand"}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] leading-relaxed ${n.read ? "text-text-secondary" : "text-text-primary font-medium"}`}>{n.message}</p>
                  <p className="text-[11px] text-text-tertiary mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                {!n.read && (
                  <button onClick={() => markRead({ notificationId: n._id })} className="p-1.5 rounded-lg hover:bg-brand-light text-text-tertiary hover:text-brand transition-colors shrink-0" title="Mark read">
                    <Check size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
