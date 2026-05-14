"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { UserCheck, UserX, Shield, ChevronDown } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

export default function UsersAdminPage() {
  const users = useQuery(api.users.listAll);
  const departments = useQuery(api.departments.listAll);
  const approveUser = useMutation(api.users.approve);
  const updateRole = useMutation(api.users.updateRole);
  const deactivate = useMutation(api.users.deactivate);
  const [roleEdit, setRoleEdit] = useState<string | null>(null);

  if (!users || !departments) return <div className="skeleton h-48 rounded-2xl" />;

  const pendingUsers = users.filter(u => !u.approved);
  const approvedUsers = users.filter(u => u.approved);
  const getDeptName = (id?: Id<"departments">) => departments.find(d => d._id === id)?.name || "Unassigned";

  const roles = ["member", "department_head", "core_team", "president", "admin"] as const;

  return (
    <div className="space-y-8">
      {/* Pending Approvals */}
      {pendingUsers.length > 0 && (
        <div>
          <h2 className="text-[15px] font-semibold text-text-primary mb-4 flex items-center gap-2 tracking-tight">
            <span className="w-6 h-6 rounded-full bg-warn-light text-warn flex items-center justify-center text-[10px] font-bold">{pendingUsers.length}</span>
            Pending Approvals
          </h2>
          <div className="space-y-3">
            {pendingUsers.map(u => (
              <div key={u._id} className="flex items-center gap-4 p-4 rounded-xl bg-warn-light/30 border border-warn/10">
                <div className="w-10 h-10 rounded-xl bg-warn-light flex items-center justify-center text-warn font-bold text-sm">{u.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[13px] font-semibold text-text-primary">{u.name}</h3>
                  <p className="text-[11px] text-text-tertiary">{u.email} · {getDeptName(u.departmentId)} · {u.roles.join(", ")}</p>
                </div>
                <button onClick={() => approveUser({ userId: u._id })} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand text-white text-[11px] font-semibold hover:bg-brand-mid transition-all shadow-sm">
                  <UserCheck size={12} /> Approve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved Users */}
      <div>
        <h2 className="text-[15px] font-semibold text-text-primary mb-4 tracking-tight">All Users ({approvedUsers.length})</h2>
        <div className="overflow-x-auto rounded-2xl border border-border-light bg-white shadow-sm">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border-light bg-bg-tertiary">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Department</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Roles</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {approvedUsers.map(u => (
                <tr key={u._id} className="border-b border-border-light last:border-0 hover:bg-bg-tertiary/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-light text-brand flex items-center justify-center text-xs font-bold">{u.name.charAt(0)}</div>
                      <div>
                        <p className="font-medium text-text-primary text-[13px]">{u.name}</p>
                        <p className="text-[11px] text-text-tertiary">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-[13px]">{getDeptName(u.departmentId)}</td>
                  <td className="px-4 py-3">
                    {roleEdit === u._id ? (
                      <div className="flex flex-wrap gap-1">
                        {roles.map(r => (
                          <button key={r} onClick={() => { updateRole({ userId: u._id, roles: [r] }); setRoleEdit(null); }}
                            className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${u.roles.includes(r) ? "bg-brand-light text-brand" : "bg-bg-tertiary text-text-tertiary hover:bg-brand-light/50"}`}>
                            {r.replace("_", " ")}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button onClick={() => setRoleEdit(u._id)} className="text-[11px] text-text-secondary hover:text-brand transition-colors flex items-center gap-1 capitalize">
                        {u.roles.map(r => r.replace("_", " ")).join(", ")} <ChevronDown size={11} />
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { if (confirm(`Deactivate ${u.name}?`)) deactivate({ userId: u._id }); }}
                      className="p-2 rounded-lg hover:bg-danger-light text-text-tertiary hover:text-danger transition-colors" title="Deactivate">
                      <UserX size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
