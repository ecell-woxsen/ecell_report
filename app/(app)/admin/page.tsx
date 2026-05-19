"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Plus, Archive, Loader2 } from "lucide-react";
import {
  normalizeDepartmentDescription,
  normalizeDepartmentName,
} from "@/lib/departments";

export default function DepartmentsAdminPage() {
  const departments = useQuery(api.departments.listAll);
  const createDept = useMutation(api.departments.create);
  const archiveDept = useMutation(api.departments.archive);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", colorTag: "#1D9E75", description: "" });
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await createDept(form);
    setForm({ name: "", slug: "", colorTag: "#1D9E75", description: "" });
    setShowForm(false);
    setLoading(false);
  };

  if (!departments) return <div className="skeleton h-48 rounded-2xl" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white text-[13px] font-medium hover:bg-brand-mid transition-all shadow-sm">
          <Plus size={15} /> Add Department
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="p-6 rounded-2xl bg-white border border-border-light shadow-sm space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-text-tertiary mb-1.5 uppercase tracking-wider">Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "") })} className="w-full px-3.5 py-2 rounded-xl border border-border text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" required />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-tertiary mb-1.5 uppercase tracking-wider">Color</label>
              <input type="color" value={form.colorTag} onChange={e => setForm({ ...form, colorTag: e.target.value })} className="w-full h-10 rounded-xl border border-border cursor-pointer" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3.5 py-2 rounded-xl border border-border text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-border text-[13px] text-text-secondary hover:bg-bg-tertiary transition-all">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-xl bg-brand text-white text-[13px] font-medium hover:bg-brand-mid disabled:opacity-50 transition-all">
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Create"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {departments.map(dept => {
          const departmentName = normalizeDepartmentName(dept);
          const departmentDescription = normalizeDepartmentDescription(dept);

          return (
            <div key={dept._id} className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-border-light shadow-sm">
              <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: dept.colorTag }} />
              <div className="flex-1 min-w-0">
                <h3 className="text-[13px] font-semibold text-text-primary">{departmentName}</h3>
                {departmentDescription && <p className="text-[11px] text-text-tertiary mt-0.5">{departmentDescription}</p>}
              </div>
              <span className="text-[10px] text-text-tertiary px-2.5 py-1 rounded-lg bg-bg-tertiary font-medium">{dept.slug}</span>
              <button onClick={() => { if (confirm(`Archive "${departmentName}"?`)) archiveDept({ departmentId: dept._id }); }} className="p-2 rounded-lg hover:bg-danger-light text-text-tertiary hover:text-danger transition-colors" title="Archive">
                <Archive size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
