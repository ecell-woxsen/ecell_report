"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Users, Search, Building2, Mail, Phone, Shield } from "lucide-react";

export default function TeamPage() {
  const users = useQuery(api.users.listAll);
  const departments = useQuery(api.departments.listAll);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");

  if (!users || !departments) {
    return <div className="space-y-4">{[1,2,3,4].map(i=><div key={i} className="skeleton h-20 rounded-2xl"/>)}</div>;
  }

  const approvedUsers = users.filter(u => u.approved);
  const filtered = approvedUsers.filter(u => {
    if (deptFilter !== "all" && u.departmentId !== deptFilter) return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getDeptName = (id?: string) => departments.find(d => d._id === id)?.name || "Unassigned";
  const getDeptColor = (id?: string) => departments.find(d => d._id === id)?.colorTag || "#8B929A";

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
      <h1 className="text-[1.65rem] font-bold text-text-primary tracking-tight">Team Directory</h1>
        <p className="text-text-tertiary text-[13px] mt-0.5">{approvedUsers.length} members</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members..." className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
        </div>
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="px-3.5 py-2 rounded-xl border border-border bg-white text-[13px] text-text-secondary focus:outline-none">
          <option value="all">All Departments</option>
          {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="p-16 rounded-2xl bg-white border border-border-light text-center">
          <Users size={48} className="text-text-tertiary mx-auto mb-4" />
          <p className="text-text-secondary">No members found.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(user => (
            <div key={user._id} className="p-5 rounded-2xl bg-white border border-border-light shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center text-brand font-bold text-sm shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[13px] font-semibold text-text-primary truncate">{user.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getDeptColor(user.departmentId) }} />
                    <span className="text-xs text-text-tertiary truncate">{getDeptName(user.departmentId)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex items-center gap-2 text-[11px] text-text-tertiary"><Mail size={11} /><span className="truncate">{user.email}</span></div>
                {user.phone && <div className="flex items-center gap-2 text-[11px] text-text-tertiary"><Phone size={11} />{user.phone}</div>}
                <div className="flex items-center gap-2 text-[11px] text-text-tertiary"><Shield size={11} />{user.roles.map(r => r.replace("_", " ")).join(", ")}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
