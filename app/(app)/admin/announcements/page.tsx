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
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple text-white text-[13px] font-medium hover:bg-purple/80 transition-all shadow-sm">
          <Plus size={15} /> New Announcement
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="p-6 rounded-2xl bg-white border border-border-light shadow-sm space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-text-tertiary mb-1.5 uppercase tracking-wider">Title</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-3.5 py-2 rounded-xl border border-border text-[13px] focus:outline-none focus:ring-2 focus:ring-purple/20 focus:border-purple" required />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-text-tertiary mb-1.5 uppercase tracking-wider">Message</label>
            <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} rows={3} className="w-full px-3.5 py-2 rounded-xl border border-border text-[13px] resize-y focus:outline-none focus:ring-2 focus:ring-purple/20 focus:border-purple" required />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-border text-[13px] text-text-secondary hover:bg-bg-tertiary transition-all">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-xl bg-purple text-white text-[13px] font-medium hover:bg-purple/80 disabled:opacity-50 transition-all">
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Publish"}
            </button>
          </div>
        </form>
      )}

      {announcements.length === 0 ? (
        <div className="p-14 rounded-2xl bg-white border border-border-light text-center">
          <Megaphone size={36} className="text-text-tertiary mx-auto mb-3" />
          <p className="text-text-secondary text-[13px]">No announcements yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map(a => (
            <div key={a._id} className="flex items-start gap-3 p-5 rounded-2xl bg-white border border-border-light shadow-sm">
              <Megaphone size={18} className="text-purple shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-[13px] font-semibold text-text-primary">{a.title}</h3>
                <p className="text-[13px] text-text-secondary mt-1 leading-relaxed">{a.body}</p>
                <p className="text-[11px] text-text-tertiary mt-2">By {a.authorName} · {new Date(a.createdAt).toLocaleDateString()}</p>
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
