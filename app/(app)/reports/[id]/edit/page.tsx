"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { use, useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { canEditReportForDepartment } from "@/lib/permissions";
import {
  AttachmentTooLargeError,
  MAX_ATTACHMENT_BYTES,
  formatAttachmentType,
  formatFileSize,
  prepareAttachmentForUpload,
} from "@/lib/attachments";
import {
  Send, ChevronDown, ChevronUp, Plus, Trash2,
  CheckCircle2, Loader2, AlertCircle, X, Eye,
  Paperclip, Upload, FileText,
} from "lucide-react";

type Sections = Record<string, unknown>;
type ReportAttachment = {
  storageId: Id<"_storage">;
  name: string;
  contentType?: string;
  size: number;
  description?: string;
  uploadedAt: number;
  uploadedByName: string;
  url: string | null;
};

export default function ReportEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useUser();
  const clerkId = user?.id;
  const router = useRouter();
  const report = useQuery(
    api.reports.getById,
    clerkId ? { reportId: id as Id<"reports">, clerkId } : "skip"
  );
  const convexUser = useQuery(api.users.getByClerkId, clerkId ? { clerkId } : "skip");
  const template = useQuery(api.templates.getByDepartment, report?.departmentId ? { departmentId: report.departmentId } : "skip");
  const attachments = useQuery(
    api.reports.listAttachments,
    report?._id && clerkId ? { reportId: report._id, clerkId } : "skip"
  ) as ReportAttachment[] | undefined;
  const autosave = useMutation(api.reports.autosave);
  const submitReport = useMutation(api.reports.submit);
  const generateAttachmentUploadUrl = useMutation(api.reports.generateAttachmentUploadUrl);
  const attachFile = useMutation(api.reports.attachFile);
  const removeAttachment = useMutation(api.reports.removeAttachment);
  const canEditReport = canEditReportForDepartment(convexUser, report?.departmentId);

  const [sections, setSections] = useState<Sections>({});
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [attachmentDescription, setAttachmentDescription] = useState("");
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [attachmentStage, setAttachmentStage] = useState<"idle" | "compressing" | "uploading">("idle");
  const [removingAttachmentId, setRemovingAttachmentId] = useState<Id<"_storage"> | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (report?.sections && !initialized.current) {
      setSections(report.sections as Sections);
      initialized.current = true;
    }
  }, [report]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    };
  }, []);

  const clearPendingSave = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
  }, []);

  const doSave = useCallback(async (data: Sections) => {
    if (!report || !clerkId) return;
    setSaveStatus("saving");
    try {
      await autosave({ reportId: report._id, sections: data, clerkId });
      setSaveStatus("saved");
    } catch { setSaveStatus("unsaved"); }
  }, [report, autosave, clerkId]);

  const updateSection = useCallback((key: string, value: unknown) => {
    setSections((prev) => {
      const next = { ...prev, [key]: value };
      setSaveStatus("unsaved");
      clearPendingSave();
      saveTimer.current = setTimeout(() => {
        saveTimer.current = null;
        void doSave(next);
      }, 2000);
      return next;
    });
  }, [clearPendingSave, doSave]);

  const saveNow = useCallback(async () => {
    clearPendingSave();
    await doSave(sections);
  }, [clearPendingSave, doSave, sections]);

  const handleSubmit = async () => {
    if (!report || !clerkId) return;
    setSubmitting(true);
    try {
      await saveNow();
      await submitReport({ reportId: report._id, clerkId });
      router.push(`/reports/${report._id}`);
    } catch (e) { console.error(e); }
    setSubmitting(false);
  };

  const handleDone = async () => {
    if (!report) return;
    await saveNow();
    router.push(`/reports/${report._id}`);
  };

  const handleAttachmentUpload = async (selectedFile: File | undefined) => {
    if (!selectedFile || !report || !clerkId || attachmentStage !== "idle") return;
    setAttachmentStage("compressing");
    setAttachmentError(null);

    try {
      const preparedAttachment = await prepareAttachmentForUpload(selectedFile);
      const file = preparedAttachment.file;
      setAttachmentStage("uploading");

      const uploadUrl = await generateAttachmentUploadUrl({
        reportId: report._id,
        clerkId,
      });
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: file.type ? { "Content-Type": file.type } : undefined,
        body: file,
      });
      if (!uploadResult.ok) throw new Error("Upload failed");

      const { storageId } = (await uploadResult.json()) as {
        storageId: Id<"_storage">;
      };
      const description = attachmentDescription.trim();
      const compressionNote = preparedAttachment.compressed
        ? `Compressed in browser from ${selectedFile.name} (${formatFileSize(preparedAttachment.originalSize)}).`
        : "";
      const attachmentNote = [description, compressionNote].filter(Boolean).join("\n");
      await attachFile({
        reportId: report._id,
        storageId,
        name: file.name,
        size: file.size,
        clerkId,
        ...(file.type ? { contentType: file.type } : {}),
        ...(attachmentNote ? { description: attachmentNote } : {}),
      });

      setAttachmentDescription("");
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
    } catch (error) {
      console.error(error);
      setAttachmentError(
        error instanceof AttachmentTooLargeError
          ? error.message
          : `Could not upload this attachment. Files must be ${formatFileSize(MAX_ATTACHMENT_BYTES)} or smaller after compression.`
      );
    } finally {
      setAttachmentStage("idle");
    }
  };

  const handleRemoveAttachment = async (storageId: Id<"_storage">) => {
    if (!report || !clerkId || removingAttachmentId) return;
    setRemovingAttachmentId(storageId);
    setAttachmentError(null);

    try {
      await removeAttachment({ reportId: report._id, storageId, clerkId });
    } catch (error) {
      console.error(error);
      setAttachmentError("Could not remove this attachment.");
    } finally {
      setRemovingAttachmentId(null);
    }
  };

  if (
    report === undefined ||
    convexUser === undefined ||
    (report && template === undefined)
  ) {
    return <div className="space-y-4">{[1,2,3].map(i=><div key={i} className="skeleton h-32 rounded-2xl"/>)}</div>;
  }

  if (!report || !template || !canEditReport) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="max-w-sm text-center animate-fade-in">
          <AlertCircle size={34} className="text-warn mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-text-primary mb-2">
            Editing is restricted
          </h1>
          <p className="text-sm text-text-secondary mb-5">
            Approved department heads, core team, presidents, and admins can edit and submit reports.
          </p>
          <Link
            href={report ? `/reports/${report._id}` : "/reports"}
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-border text-[13px] font-medium text-text-secondary hover:bg-bg-tertiary transition-all"
          >
            View Report
          </Link>
        </div>
      </div>
    );
  }

  const enabledSections = template.sections.filter((s) => s.enabled).sort((a, b) => a.order - b.order);
  const isSubmitted = report.status === "submitted";
  const filledCount = enabledSections.filter((s) => {
    const val = sections[s.key];
    if (!val) return false;
    if (typeof val === "string") return val.trim().length > 0;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === "object") return Object.values(val as Record<string,unknown>).some((v) => v && String(v).trim().length > 0);
    return true;
  }).length;

  return (
    <div className="max-w-[900px] mx-auto animate-fade-in">
      {/* Sticky Header */}
      <div className="sticky top-16 z-20 bg-bg-primary/95 backdrop-blur-sm pb-4 mb-6 -mx-2 px-2 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-border-light shadow-sm">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">{report.departmentName}</h1>
            <p className="text-xs text-text-tertiary">
              {report.weekLabel} - {isSubmitted ? "Submitted report" : "Draft report"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`text-xs font-medium flex items-center gap-1.5 ${saveStatus==="saved"?"text-success-text":saveStatus==="saving"?"text-warn":"text-danger"}`}>
              {saveStatus==="saved"&&<CheckCircle2 size={13}/>}
              {saveStatus==="saving"&&<Loader2 size={13} className="animate-spin"/>}
              {saveStatus==="unsaved"&&<AlertCircle size={13}/>}
              {saveStatus==="saved"?"All changes saved":saveStatus==="saving"?"Saving...":"Unsaved changes"}
            </span>
            <span className="text-xs text-text-tertiary">{filledCount}/{enabledSections.length} sections</span>
            {isSubmitted ? (
              <>
                <button onClick={saveNow} disabled={saveStatus === "saved" || saveStatus === "saving"} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-text-secondary text-sm font-semibold hover:bg-bg-tertiary transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {saveStatus === "saving" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Save Now
                </button>
                <button onClick={handleDone} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-mid transition-all">
                  <Eye size={14}/> Done
                </button>
              </>
            ) : (
              <button onClick={()=>setShowSubmitModal(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-mid transition-all">
                <Send size={14}/> Submit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {enabledSections.map((section, idx) => (
          <div key={section.key} className="rounded-2xl bg-white border border-border-light shadow-sm overflow-hidden">
            <button onClick={()=>setCollapsed(p=>({...p,[section.key]:!p[section.key]}))} className="w-full flex items-center gap-3 p-5 text-left hover:bg-bg-tertiary/50 transition-colors">
              <span className="w-7 h-7 rounded-lg bg-brand-light text-brand-mid flex items-center justify-center text-xs font-bold">{idx+1}</span>
              <span className="flex-1 text-sm font-semibold text-text-primary">{section.title}</span>
              {collapsed[section.key]?<ChevronDown size={16} className="text-text-tertiary"/>:<ChevronUp size={16} className="text-text-tertiary"/>}
            </button>
            {!collapsed[section.key] && (
              <div className="px-5 pb-5">
                {section.description && <p className="text-xs text-text-tertiary mb-3">{section.description}</p>}
                <SectionEditor section={section} value={sections[section.key]} onChange={(v)=>updateSection(section.key,v)} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Attachments */}
      <div className="mt-4 rounded-2xl bg-white border border-border-light shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-5 border-b border-border-light">
          <div className="flex items-start gap-3">
            <span className="w-8 h-8 rounded-lg bg-info-light text-info flex items-center justify-center">
              <Paperclip size={15} />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Attachments</h2>
              <p className="text-xs text-text-tertiary mt-0.5">
                {(attachments ?? []).length} {(attachments ?? []).length === 1 ? "file" : "files"}
              </p>
            </div>
          </div>
          <div className="w-full sm:w-[340px] space-y-2">
            <textarea
              value={attachmentDescription}
              onChange={(event) => setAttachmentDescription(event.target.value)}
              placeholder="Optional note"
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-border bg-bg-primary text-xs resize-y min-h-[48px] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
            />
            <input
              ref={attachmentInputRef}
              type="file"
              className="hidden"
              onChange={(event) => void handleAttachmentUpload(event.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => attachmentInputRef.current?.click()}
              disabled={attachmentStage !== "idle"}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-mid transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {attachmentStage !== "idle" ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              {attachmentStage === "compressing"
                ? "Compressing..."
                : attachmentStage === "uploading"
                  ? "Uploading..."
                  : "Attach File"}
            </button>
            <p className="text-[11px] text-text-tertiary">
              Max stored size: {formatFileSize(MAX_ATTACHMENT_BYTES)}
            </p>
            {attachmentError && (
              <p className="flex items-center gap-1.5 text-xs text-danger">
                <AlertCircle size={13} />
                {attachmentError}
              </p>
            )}
          </div>
        </div>
        {attachments === undefined ? (
          <div className="p-5 space-y-2">
            <div className="skeleton h-10 rounded-xl" />
            <div className="skeleton h-10 rounded-xl" />
          </div>
        ) : attachments.length === 0 ? (
          <div className="p-5 text-sm text-text-tertiary italic">No attachments.</div>
        ) : (
          <div className="divide-y divide-border-light">
            {attachments.map((attachment) => (
              <div key={attachment.storageId} className="flex items-center gap-3 p-4">
                <span className="w-9 h-9 rounded-xl bg-bg-tertiary text-text-tertiary flex items-center justify-center shrink-0">
                  <FileText size={16} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{attachment.name}</p>
                  {attachment.description && (
                    <p className="text-xs text-text-secondary mt-0.5 break-words">{attachment.description}</p>
                  )}
                  <p className="text-[11px] text-text-tertiary mt-1">
                    {formatAttachmentType(attachment.contentType)} / {formatFileSize(attachment.size)} / {attachment.uploadedByName}
                  </p>
                </div>
                {attachment.url && (
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-text-secondary hover:bg-bg-tertiary transition-all"
                  >
                    Open
                  </a>
                )}
                <button
                  type="button"
                  aria-label={`Remove ${attachment.name}`}
                  onClick={() => void handleRemoveAttachment(attachment.storageId)}
                  disabled={removingAttachmentId === attachment.storageId}
                  className="p-2 rounded-lg text-text-tertiary hover:text-danger hover:bg-danger-light transition-colors disabled:opacity-50"
                >
                  {removingAttachmentId === attachment.storageId ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Modal */}
      {showSubmitModal && !isSubmitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-text-primary">Submit Report</h2>
              <button onClick={()=>setShowSubmitModal(false)} className="p-1 rounded-lg hover:bg-bg-tertiary"><X size={18}/></button>
            </div>
            <p className="text-sm text-text-secondary mb-2">{filledCount} of {enabledSections.length} sections filled.</p>
            {enabledSections.filter(s=>s.required&&!sections[s.key]).length>0 && (
              <div className="p-3 rounded-xl bg-warn-light text-warn text-xs mb-4">
                <AlertCircle size={14} className="inline mr-1"/> Some required sections are empty.
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button onClick={()=>setShowSubmitModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-text-secondary hover:bg-bg-tertiary transition-all">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="flex-1 px-4 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-mid transition-all disabled:opacity-50">
                {submitting?<Loader2 size={16} className="animate-spin mx-auto"/>:"Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function SectionEditor({ section, value, onChange }: { section: any; value: any; onChange: (v: any) => void }) {
  if (section.type === "header") return <HeaderEditor value={value} onChange={onChange} />;
  if (section.type === "textarea") return <TextareaEditor value={value||""} onChange={onChange} placeholder={section.placeholder} />;
  if (section.type === "textarea_multi") return <MultiTextarea config={section.config} value={value||{}} onChange={onChange} />;
  if (section.type === "dynamic_table") return <DynamicTableEditor config={section.config} value={value||[]} onChange={onChange} sectionKey={section.key} />;
  if (section.type === "metrics_grid") return <MetricsGrid config={section.config} value={value||{}} onChange={onChange} />;
  if (section.type === "performance_quadrant") return <PerformanceQuadrant config={section.config} value={value||{}} onChange={onChange} />;
  if (section.type === "budget_table" || section.type === "campaign_table") return <DynamicTableEditor config={section.config} value={value||[]} onChange={onChange} sectionKey={section.key} />;
  return <TextareaEditor value={value||""} onChange={onChange} placeholder={section.placeholder} />;
}

function HeaderEditor({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const data = value || {};
  const update = (k: string, v: string) => onChange({ ...data, [k]: v });
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {[{k:"activeMembersCount",l:"Active Members",t:"number"},{k:"submissionDate",l:"Submission Date",t:"date"}].map(f=>(
        <div key={f.k}>
          <label className="block text-xs font-medium text-text-secondary mb-1">{f.l}</label>
          <input type={f.t} value={data[f.k]||""} onChange={e=>update(f.k,e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"/>
        </div>
      ))}
    </div>
  );
}

function TextareaEditor({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={4} className="w-full px-4 py-3 rounded-xl border border-border bg-bg-primary text-sm resize-y min-h-[80px] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all" />;
}

function MultiTextarea({ config, value, onChange }: { config: any; value: any; onChange: (v: any) => void }) {
  const subs = config?.subSections || [];
  return (
    <div className="space-y-4">
      {subs.map((label: string) => (
        <div key={label}>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">{label}</label>
          <textarea value={value[label]||""} onChange={e=>onChange({...value,[label]:e.target.value})} rows={3} className="w-full px-4 py-3 rounded-xl border border-border bg-bg-primary text-sm resize-y min-h-[60px] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all" />
        </div>
      ))}
    </div>
  );
}

function DynamicTableEditor({ config, value, onChange, sectionKey }: { config: any; value: any[]; onChange: (v: any[]) => void; sectionKey: string }) {
  const cols = config?.columns || ["Item"];
  const statusCol = cols.findIndex((c: string) => c.toLowerCase() === "status");
  const levelCol = cols.findIndex((c: string) => c.toLowerCase().includes("participation"));

  const addRow = () => {
    const row: any = { id: crypto.randomUUID() };
    cols.forEach((c: string) => { row[c] = ""; });
    onChange([...value, row]);
  };
  const updateRow = (idx: number, col: string, val: string) => {
    const next = [...value];
    next[idx] = { ...next[idx], [col]: val };
    onChange(next);
  };
  const removeRow = (idx: number) => onChange(value.filter((_, i) => i !== idx));

  const statusOptions = sectionKey === "task_tracker" ? ["Completed","In Progress","Pending","Delayed"] : ["Approved","Pending","Rejected","Active","Completed","Planned"];
  const levelOptions = ["Excellent","Good","Moderate","Low"];

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-bg-tertiary">
              {cols.map((c: string) => <th key={c} className="px-3 py-2.5 text-left font-medium text-text-secondary whitespace-nowrap">{c}</th>)}
              <th className="w-10"/>
            </tr>
          </thead>
          <tbody>
            {value.map((row: any, idx: number) => (
              <tr key={row.id||idx} className="border-t border-border-light hover:bg-bg-tertiary/30">
                {cols.map((col: string, ci: number) => (
                  <td key={col} className="px-2 py-1.5">
                    {ci === statusCol ? (
                      <select value={row[col]||""} onChange={e=>updateRow(idx,col,e.target.value)} className={`w-full px-2 py-1.5 rounded-lg border border-border-light text-xs focus:outline-none ${getStatusColor(row[col])}`}>
                        <option value="">Select</option>
                        {statusOptions.map(s=><option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : ci === levelCol ? (
                      <select value={row[col]||""} onChange={e=>updateRow(idx,col,e.target.value)} className={`w-full px-2 py-1.5 rounded-lg border border-border-light text-xs focus:outline-none ${getLevelColor(row[col])}`}>
                        <option value="">Select</option>
                        {levelOptions.map(l=><option key={l} value={l}>{l}</option>)}
                      </select>
                    ) : (
                      <input type={col.toLowerCase().includes("deadline")||col.toLowerCase().includes("date")?"date":"text"} value={row[col]||""} onChange={e=>updateRow(idx,col,e.target.value)} className="w-full px-2 py-1.5 rounded-lg border border-border-light text-xs focus:outline-none focus:border-brand bg-transparent"/>
                    )}
                  </td>
                ))}
                <td className="px-2">
                  <button onClick={()=>removeRow(idx)} className="p-1 rounded hover:bg-danger-light text-text-tertiary hover:text-danger transition-colors"><Trash2 size={13}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={addRow} className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-xl border border-dashed border-border text-xs font-medium text-text-tertiary hover:text-brand hover:border-brand transition-all">
        <Plus size={13}/> Add Row
      </button>
    </div>
  );
}

function MetricsGrid({ config, value, onChange }: { config: any; value: any; onChange: (v: any) => void }) {
  const metrics = config?.metrics || [];
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {metrics.map((m: any) => (
          <div key={m.label} className="p-4 rounded-xl border border-border-light bg-bg-primary">
            <label className="block text-xs text-text-tertiary mb-2 uppercase tracking-wide">{m.label}</label>
            <input type="number" value={value[m.label]??""} onChange={e=>onChange({...value,[m.label]:e.target.value?Number(e.target.value):""})} placeholder="0" className="w-full text-xl font-semibold text-text-primary bg-transparent border-none outline-none placeholder:text-text-tertiary"/>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <label className="block text-xs font-medium text-text-secondary mb-1.5">Performance Analysis</label>
        <textarea value={value._analysis||""} onChange={e=>onChange({...value,_analysis:e.target.value})} rows={3} placeholder="Provide analysis of the metrics above..." className="w-full px-4 py-3 rounded-xl border border-border bg-brand-light/30 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"/>
      </div>
    </div>
  );
}

function PerformanceQuadrant({ config, value, onChange }: { config: any; value: any; onChange: (v: any) => void }) {
  const quads = config?.quadrants || [];
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        {quads.map((q: string) => (
          <div key={q} className="p-4 rounded-xl border border-border-light bg-bg-primary">
            <label className="block text-xs font-medium text-text-secondary mb-2">{q}</label>
            <textarea value={value[q]||""} onChange={e=>onChange({...value,[q]:e.target.value})} rows={2} className="w-full px-3 py-2 rounded-lg border border-border-light bg-white text-sm resize-y focus:outline-none focus:border-brand"/>
          </div>
        ))}
      </div>
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1.5">Communication Effectiveness</label>
        <textarea value={value._communication||""} onChange={e=>onChange({...value,_communication:e.target.value})} rows={2} className="w-full px-4 py-3 rounded-xl border border-border bg-bg-primary text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/20"/>
      </div>
    </div>
  );
}

function getStatusColor(status: string): string {
  const map: Record<string,string> = { Completed:"bg-success-bg text-success-text", "In Progress":"bg-info-light text-info", Pending:"bg-warn-light text-warn", Delayed:"bg-danger-light text-danger", Approved:"bg-success-bg text-success-text", Rejected:"bg-danger-light text-danger" };
  return map[status] || "";
}
function getLevelColor(level: string): string {
  const map: Record<string,string> = { Excellent:"bg-success-bg text-success-text", Good:"bg-info-light text-info", Moderate:"bg-warn-light text-warn", Low:"bg-danger-light text-danger" };
  return map[level] || "";
}
