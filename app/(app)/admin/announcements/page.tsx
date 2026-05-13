"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Plus, Trash2, Megaphone, Loader2 } from "lucide-react";

export default function AnnouncementsAdminPage() {
  const { user } = useUser();
  const convexUser = useQuery(api.users.getByClerkId, user?.id ? { clerkId: user.id } : "skip");
  const announcements = useQuery(api.announcements.listAll);
  const createAnnouncement = useMutation(api.announcements.create);
  const removeAnnouncement = useMutation(api.announcements.remove);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", body: "" });
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !convexUser) return;
    setLoading(true);
    await createAnnouncement({
      authorClerkId: user.id,
      authorName: convexUser.name,
      title: form.title,
      body: form.body,
      targetRoles: ["all"],
    });
    setForm({ title: "", body: "" });
    setShowForm(false);
    setLoading(false);
  };

  if (!announcements) return <div className="skeleton h-48 rounded-2xl" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple text-white text-sm font-medium hover:bg-purple/80 transition-all">
          <Plus size={16} /> New Announcement
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="p-6 rounded-2xl bg-white border border-border-light shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Title</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-purple/20 focus:border-purple" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Message</label>
            <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} rows={3} className="w-full px-3 py-2.5 rounded-xl border border-border text-sm resize-y focus:outline-none focus:ring-2 focus:ring-purple/20 focus:border-purple" required />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-border text-sm text-text-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-xl bg-purple text-white text-sm font-medium hover:bg-purple/80 disabled:opacity-50">
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Publish"}
            </button>
          </div>
        </form>
      )}

      {announcements.length === 0 ? (
        <div className="p-16 rounded-2xl bg-white border border-border-light text-center">
          <Megaphone size={48} className="text-text-tertiary mx-auto mb-4" />
          <p className="text-text-secondary">No announcements yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map(a => (
            <div key={a._id} className="flex items-start gap-3 p-5 rounded-2xl bg-white border border-border-light shadow-sm">
              <Megaphone size={18} className="text-purple shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-text-primary">{a.title}</h3>
                <p className="text-sm text-text-secondary mt-1">{a.body}</p>
                <p className="text-xs text-text-tertiary mt-2">By {a.authorName} · {new Date(a.createdAt).toLocaleDateString()}</p>
              </div>
              <button onClick={() => { if (confirm("Delete this announcement?")) removeAnnouncement({ announcementId: a._id }); }}
                className="p-2 rounded-lg hover:bg-danger-light text-text-tertiary hover:text-danger transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
