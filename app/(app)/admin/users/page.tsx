"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { CheckCircle2, UserCheck, UserX, ChevronDown, X } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { normalizeDepartmentName } from "@/lib/departments";

const roles = [
  "member",
  "department_head",
  "team_lead",
  "core_team",
  "president",
  "vice_president",
  "advisor",
  "admin",
] as const;
type Role = (typeof roles)[number];

const roleLabels: Record<Role, string> = {
  member: "Member",
  department_head: "Department Head",
  team_lead: "Team Lead",
  core_team: "Core Team",
  president: "President",
  vice_president: "Vice President",
  advisor: "Advisor",
  admin: "Admin",
};

function formatRoles(userRoles: readonly string[]) {
  return userRoles
    .map((role) => roleLabels[role as Role] ?? role.replace(/_/g, " "))
    .join(", ");
}

export default function UsersAdminPage() {
  const users = useQuery(api.users.listAll);
  const departments = useQuery(api.departments.listAll);
  const approveUser = useMutation(api.users.approve);
  const updateRole = useMutation(api.users.updateRole);
  const updateDepartment = useMutation(api.users.updateDepartment);
  const approveRoleRequest = useMutation(api.users.approveRoleRequest);
  const rejectRoleRequest = useMutation(api.users.rejectRoleRequest);
  const deactivate = useMutation(api.users.deactivate);
  const [roleEdit, setRoleEdit] = useState<string | null>(null);

  if (!users || !departments) return <div className="skeleton h-48 rounded-2xl" />;

  const pendingUsers = users.filter(u => !u.approved);
  const approvedUsers = users.filter(u => u.approved);
  const roleRequests = approvedUsers.filter((u) => u.requestedRoles?.length);
  const getDeptName = (id?: Id<"departments">) =>
    normalizeDepartmentName(departments.find(d => d._id === id));

  const departmentSelectClass = "min-w-[150px] rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-medium text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand";
  const handleDepartmentChange = (userId: Id<"users">, departmentId: string) => {
    if (!departmentId) return;
    updateDepartment({
      userId,
      departmentId: departmentId as Id<"departments">,
    });
  };

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
              <div key={u._id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-warn-light/30 border border-warn/10">
                <div className="w-10 h-10 rounded-xl bg-warn-light flex items-center justify-center text-warn font-bold text-sm">{u.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[13px] font-semibold text-text-primary">{u.name}</h3>
                  <p className="text-[11px] text-text-tertiary">{u.email} · {getDeptName(u.departmentId)} · {u.roles.join(", ")}</p>
                </div>
                <select
                  value={u.departmentId || ""}
                  onChange={(e) => handleDepartmentChange(u._id, e.target.value)}
                  className={departmentSelectClass}
                >
                  <option value="" disabled>
                    Select department
                  </option>
                  {departments.map((department) => (
                    <option key={department._id} value={department._id}>
                      {normalizeDepartmentName(department)}
                    </option>
                  ))}
                </select>
                <button onClick={() => approveUser({ userId: u._id })} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand text-white text-[11px] font-semibold hover:bg-brand-mid transition-all shadow-sm">
                  <UserCheck size={12} /> Approve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role Change Requests */}
      {roleRequests.length > 0 && (
        <div>
          <h2 className="text-[15px] font-semibold text-text-primary mb-4 flex items-center gap-2 tracking-tight">
            <span className="w-6 h-6 rounded-full bg-purple-light text-purple flex items-center justify-center text-[10px] font-bold">{roleRequests.length}</span>
            Role Change Requests
          </h2>
          <div className="space-y-3">
            {roleRequests.map((u) => (
              <div key={u._id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-purple-light/40 border border-purple/10">
                <div className="w-10 h-10 rounded-xl bg-purple-light flex items-center justify-center text-purple font-bold text-sm">
                  {u.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[13px] font-semibold text-text-primary">{u.name}</h3>
                  <p className="text-[11px] text-text-tertiary">
                    Current: {formatRoles(u.roles)} · Requested: {formatRoles(u.requestedRoles || [])}
                  </p>
                </div>
                <button
                  onClick={() => approveRoleRequest({ userId: u._id })}
                  className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-brand text-white text-[11px] font-semibold hover:bg-brand-mid transition-all shadow-sm"
                >
                  <CheckCircle2 size={12} /> Approve
                </button>
                <button
                  onClick={() => rejectRoleRequest({ userId: u._id })}
                  className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-white text-text-secondary text-[11px] font-semibold hover:bg-danger-light hover:text-danger transition-all"
                >
                  <X size={12} /> Reject
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
                  <td className="px-4 py-3">
                    <select
                      value={u.departmentId || ""}
                      onChange={(e) => handleDepartmentChange(u._id, e.target.value)}
                      className={departmentSelectClass}
                    >
                      <option value="" disabled>
                        Select department
                      </option>
                      {departments.map((department) => (
                        <option key={department._id} value={department._id}>
                          {normalizeDepartmentName(department)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {roleEdit === u._id ? (
                      <div className="flex flex-wrap gap-1">
                        {roles.map(r => (
                          <button key={r} onClick={() => { updateRole({ userId: u._id, roles: [r] }); setRoleEdit(null); }}
                            className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${u.roles.includes(r) ? "bg-brand-light text-brand" : "bg-bg-tertiary text-text-tertiary hover:bg-brand-light/50"}`}>
                            {roleLabels[r]}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button onClick={() => setRoleEdit(u._id)} className="text-[11px] text-text-secondary hover:text-brand transition-colors flex items-center gap-1 capitalize">
                        {formatRoles(u.roles)} <ChevronDown size={11} />
                      </button>
                    )}
                    {u.requestedRoles && (
                      <p className="text-[10px] text-purple font-semibold mt-1">
                        Pending: {formatRoles(u.requestedRoles)}
                      </p>
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
