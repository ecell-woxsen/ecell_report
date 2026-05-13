"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { use, useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import {
  CheckCircle2, Calendar, User, MessageSquare, Send, Tag,
  ArrowLeft, Download, ChevronDown, ChevronUp,
} from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ReportViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useUser();
  const report = useQuery(api.reports.getById, { reportId: id as Id<"reports"> });
  const template = useQuery(api.templates.getByDepartment, report?.departmentId ? { departmentId: report.departmentId } : "skip");
  const comments = useQuery(api.comments.listByReport, report?._id ? { reportId: report._id } : "skip");
  const convexUser = useQuery(api.users.getByClerkId, user?.id ? { clerkId: user.id } : "skip");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  if (!report || !template) {
    return <div className="space-y-4">{[1,2,3].map(i=><div key={i} className="skeleton h-32 rounded-2xl" />)}</div>;
  }

  const sections = (report.sections || {}) as Record<string, any>;
  const enabledSections = template.sections.filter(s => s.enabled).sort((a, b) => a.order - b.order);
  const isCoreTeam = convexUser?.roles?.some(r => ["core_team", "president", "admin"].includes(r));
  const sectionComments = (key: string) => comments?.filter(c => c.sectionKey === key && !c.parentId) || [];

  return (
    <div className="max-w-[900px] mx-auto animate-fade-in">
      {/* Back */}
      <Link href="/reports" className="inline-flex items-center gap-1.5 text-sm text-text-tertiary hover:text-text-primary mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to Reports
      </Link>

      {/* Report Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-brand to-brand-mid text-white mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">{report.departmentName} – Weekly Report</h1>
            <p className="text-white/80 text-sm mt-1">{report.weekLabel}</p>
          </div>
          <div className="flex items-center gap-3">
            {report.status === "submitted" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 text-white text-xs font-medium">
                <CheckCircle2 size={13} /> Submitted
              </span>
            )}
          </div>
        </div>
        {report.submittedAt && (
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-white/70">
            <span className="flex items-center gap-1"><User size={12} /> {report.departmentHeadName}</span>
            <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(report.submittedAt).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {enabledSections.map((section, idx) => {
          const val = sections[section.key];
          const secComments = sectionComments(section.key);
          return (
            <div key={section.key} className="rounded-2xl bg-white border border-border-light shadow-sm overflow-hidden">
              <button onClick={() => setCollapsed(p => ({ ...p, [section.key]: !p[section.key] }))} className="w-full flex items-center gap-3 p-5 text-left hover:bg-bg-tertiary/50 transition-colors">
                <span className="w-7 h-7 rounded-lg bg-brand-light text-brand-mid flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                <span className="flex-1 text-sm font-semibold text-text-primary">{section.title}</span>
                {secComments.length > 0 && <span className="flex items-center gap-1 text-xs text-purple"><MessageSquare size={12} />{secComments.length}</span>}
                {collapsed[section.key] ? <ChevronDown size={16} className="text-text-tertiary" /> : <ChevronUp size={16} className="text-text-tertiary" />}
              </button>
              {!collapsed[section.key] && (
                <div className="px-5 pb-5">
                  <SectionViewer section={section} value={val} />
                  {/* Comments */}
                  {secComments.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border-light space-y-3">
                      {secComments.map(c => (
                        <CommentThread key={c._id} comment={c} replies={comments?.filter(r => r.parentId === c._id) || []} reportId={report._id} sectionKey={section.key} />
                      ))}
                    </div>
                  )}
                  {isCoreTeam && <AddComment reportId={report._id} sectionKey={section.key} />}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionViewer({ section, value }: { section: any; value: any }) {
  if (!value || (typeof value === "string" && !value.trim()) || (Array.isArray(value) && value.length === 0)) {
    return <p className="text-sm text-text-tertiary italic">No data provided.</p>;
  }
  if (section.type === "textarea") return <p className="text-sm text-text-secondary whitespace-pre-wrap">{value}</p>;
  if (section.type === "textarea_multi") {
    return (
      <div className="space-y-3">
        {Object.entries(value as Record<string,string>).filter(([,v])=>v).map(([k, v]) => (
          <div key={k}><span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">{k}</span><p className="text-sm text-text-secondary mt-1 whitespace-pre-wrap">{v as string}</p></div>
        ))}
      </div>
    );
  }
  if (section.type === "metrics_grid") {
    const metrics = Object.entries(value as Record<string,any>).filter(([k]) => k !== "_analysis");
    return (
      <div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {metrics.map(([k, v]) => (
            <div key={k} className="p-4 rounded-xl border border-border-light bg-bg-primary">
              <div className="text-xs text-text-tertiary uppercase tracking-wide mb-1">{k}</div>
              <div className="text-xl font-semibold text-text-primary">{v || 0}</div>
            </div>
          ))}
        </div>
        {value._analysis && <div className="mt-4 p-4 rounded-xl bg-brand-light/30 border border-brand/10"><p className="text-sm text-brand-mid">{value._analysis}</p></div>}
      </div>
    );
  }
  if (section.type === "dynamic_table" || section.type === "budget_table" || section.type === "campaign_table") {
    const rows = value as any[];
    if (rows.length === 0) return <p className="text-sm text-text-tertiary italic">No entries.</p>;
    const cols = Object.keys(rows[0]).filter(k => k !== "id");
    return (
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead><tr className="bg-bg-tertiary">{cols.map(c => <th key={c} className="px-3 py-2.5 text-left font-medium text-text-secondary">{c}</th>)}</tr></thead>
          <tbody>{rows.map((row, i) => (
            <tr key={i} className="border-t border-border-light">
              {cols.map(c => <td key={c} className="px-3 py-2.5 text-text-secondary">{renderCellValue(c, row[c])}</td>)}
            </tr>
          ))}</tbody>
        </table>
      </div>
    );
  }
  if (section.type === "performance_quadrant") {
    return (
      <div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          {Object.entries(value as Record<string,string>).filter(([k])=>!k.startsWith("_")&&value[k]).map(([k,v])=>(
            <div key={k} className="p-4 rounded-xl border border-border-light bg-bg-primary">
              <span className="text-xs font-medium text-text-tertiary">{k}</span>
              <p className="text-sm text-text-secondary mt-1">{v as string}</p>
            </div>
          ))}
        </div>
        {value._communication && <div><span className="text-xs font-medium text-text-tertiary">Communication Effectiveness</span><p className="text-sm text-text-secondary mt-1">{value._communication}</p></div>}
      </div>
    );
  }
  if (section.type === "header") {
    return (
      <div className="grid sm:grid-cols-2 gap-3">
        {Object.entries(value as Record<string,string>).filter(([,v])=>v).map(([k,v])=>(
          <div key={k}><span className="text-xs text-text-tertiary capitalize">{k.replace(/([A-Z])/g,' $1')}</span><p className="text-sm font-medium text-text-primary">{v as string}</p></div>
        ))}
      </div>
    );
  }
  return <p className="text-sm text-text-secondary">{JSON.stringify(value)}</p>;
}

function renderCellValue(col: string, val: string) {
  const statusColors: Record<string,string> = { Completed:"bg-success-bg text-success-text", "In Progress":"bg-info-light text-info", Pending:"bg-warn-light text-warn", Delayed:"bg-danger-light text-danger", Excellent:"bg-success-bg text-success-text", Good:"bg-info-light text-info", Moderate:"bg-warn-light text-warn", Low:"bg-danger-light text-danger" };
  if ((col.toLowerCase()==="status"||col.toLowerCase().includes("participation")) && statusColors[val]) {
    return <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${statusColors[val]}`}>{val}</span>;
  }
  return val || "—";
}

function CommentThread({ comment, replies, reportId, sectionKey }: { comment: any; replies: any[]; reportId: Id<"reports">; sectionKey: string }) {
  const tagColors: Record<string,string> = { "Action Required":"bg-danger-light text-danger", "Good Work":"bg-success-bg text-success-text", "Follow Up":"bg-warn-light text-warn", Note:"bg-info-light text-info" };
  return (
    <div className="space-y-2">
      <div className="p-3 rounded-xl bg-bg-tertiary">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-text-primary">{comment.authorName}</span>
          {comment.tag && <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${tagColors[comment.tag]||""}`}>{comment.tag}</span>}
          <span className="text-[10px] text-text-tertiary">{new Date(comment.createdAt).toLocaleString()}</span>
        </div>
        <p className="text-sm text-text-secondary">{comment.text}</p>
      </div>
      {replies.map(r => (
        <div key={r._id} className="ml-6 p-3 rounded-xl bg-purple-light/50">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-text-primary">{r.authorName}</span>
            <span className="text-[10px] text-text-tertiary">{new Date(r.createdAt).toLocaleString()}</span>
          </div>
          <p className="text-sm text-text-secondary">{r.text}</p>
        </div>
      ))}
    </div>
  );
}

function AddComment({ reportId, sectionKey }: { reportId: Id<"reports">; sectionKey: string }) {
  const { user } = useUser();
  const convexUser = useQuery(api.users.getByClerkId, user?.id ? { clerkId: user.id } : "skip");
  const addComment = useMutation(api.comments.add);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [tag, setTag] = useState<string>("");

  const handleSubmit = async () => {
    if (!text.trim() || !user || !convexUser) return;
    await addComment({
      reportId, sectionKey,
      authorClerkId: user.id,
      authorName: convexUser.name,
      text: text.trim(),
      tag: tag ? tag as any : undefined,
    });
    setText(""); setTag(""); setOpen(false);
  };

  if (!open) return <button onClick={() => setOpen(true)} className="mt-3 text-xs text-purple font-medium hover:underline flex items-center gap-1"><MessageSquare size={12} /> Add Feedback</button>;
  return (
    <div className="mt-3 p-4 rounded-xl border border-purple/20 bg-purple-light/30">
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Write feedback..." rows={2} className="w-full px-3 py-2 rounded-lg border border-border-light bg-white text-sm focus:outline-none focus:border-purple mb-2" />
      <div className="flex items-center gap-2">
        <select value={tag} onChange={e => setTag(e.target.value)} className="px-2 py-1.5 rounded-lg border border-border-light text-xs">
          <option value="">No tag</option>
          <option>Action Required</option><option>Good Work</option><option>Follow Up</option><option>Note</option>
        </select>
        <div className="flex-1" />
        <button onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-lg text-xs text-text-tertiary hover:bg-bg-tertiary">Cancel</button>
        <button onClick={handleSubmit} disabled={!text.trim()} className="px-3 py-1.5 rounded-lg bg-purple text-white text-xs font-medium hover:bg-purple/80 disabled:opacity-50"><Send size={11} className="inline mr-1" />Send</button>
      </div>
    </div>
  );
}
