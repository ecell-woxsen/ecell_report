"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { AlertCircle, Building2, CheckCircle2, GraduationCap, Loader2, Mail, Phone, Shield } from "lucide-react";
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

const roleRank: Record<Role, number> = {
  member: 0,
  department_head: 1,
  team_lead: 1,
  core_team: 2,
  president: 3,
  vice_president: 3,
  advisor: 3,
  admin: 3,
};

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

function getHighestRole(userRoles: string[]): Role {
  return roles.reduce<Role>((highest, role) => {
    if (!userRoles.includes(role)) return highest;
    return roleRank[role] > roleRank[highest] ? role : highest;
  }, "member");
}

function formatRoles(userRoles: readonly string[]) {
  return userRoles
    .map((role) => roleLabels[role as Role] ?? role.replace(/_/g, " "))
    .join(", ");
}

export default function SettingsPage() {
  const { user } = useUser();
  const convexUser = useQuery(api.users.getByClerkId, user?.id ? { clerkId: user.id } : "skip");
  const departments = useQuery(api.departments.listAll);
  const requestRoleChange = useMutation(api.users.requestRoleChange);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [savingRole, setSavingRole] = useState(false);
  const [roleMessage, setRoleMessage] = useState<string | null>(null);

  const currentRole = convexUser ? getHighestRole(convexUser.roles) : "member";
  const pendingRole = convexUser?.requestedRoles?.[0] as Role | undefined;
  const requestedRole = selectedRole || pendingRole || currentRole;

  const handleRoleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    setSavingRole(true);
    setRoleMessage(null);
    try {
      const result = await requestRoleChange({
        clerkId: user.id,
        roles: [requestedRole],
      });

      if (result.status === "pending") {
        setRoleMessage("Role change requested. An admin, president, vice president, or advisor needs to approve this promotion.");
      } else if (result.status === "updated") {
        setRoleMessage("Role updated.");
      } else {
        setRoleMessage("No role change needed.");
      }
    } finally {
      setSavingRole(false);
    }
  };

  if (!convexUser) {
    return <div className="skeleton h-64 rounded-2xl" />;
  }

  const dept = departments?.find(d => d._id === convexUser.departmentId);
  const isPromotion = roleRank[requestedRole] > roleRank[currentRole];
  const selectedCurrentRole = requestedRole === currentRole;
  const submitLabel = pendingRole && selectedCurrentRole
    ? "Cancel Request"
    : isPromotion
      ? "Request Admin Approval"
      : "Update Role";

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-[1.65rem] font-bold text-text-primary tracking-tight">Settings</h1>
        <p className="text-text-tertiary text-[13px] mt-0.5">Your profile information</p>
      </div>

      <div className="p-6 rounded-2xl bg-white border border-border-light shadow-sm space-y-5">
        <div className="flex items-center gap-4 pb-5 border-b border-border-light">
          <div className="w-16 h-16 rounded-2xl bg-brand-light flex items-center justify-center text-brand font-bold text-2xl">
            {convexUser.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-text-primary tracking-tight">{convexUser.name}</h2>
            <p className="text-[11px] text-text-tertiary mt-0.5">{formatRoles(convexUser.roles)}</p>
          </div>
        </div>

        {[
          { icon: Mail, label: "Email", value: convexUser.email },
          { icon: Phone, label: "Phone", value: convexUser.phone || "Not set" },
          { icon: GraduationCap, label: "Year of Study", value: convexUser.yearOfStudy || "Not set" },
          { icon: Building2, label: "Department", value: normalizeDepartmentName(dept) },
          { icon: Shield, label: "Roles", value: formatRoles(convexUser.roles) },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-3 py-3">
            <div className="w-9 h-9 rounded-xl bg-bg-tertiary flex items-center justify-center shrink-0">
              <item.icon size={16} className="text-text-tertiary" />
            </div>
            <div>
              <p className="text-[11px] text-text-tertiary font-medium">{item.label}</p>
              <p className="text-[13px] font-medium text-text-primary mt-0.5">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleRoleSubmit} className="p-6 rounded-2xl bg-white border border-border-light shadow-sm space-y-5">
        <div>
          <h2 className="text-[15px] font-semibold text-text-primary tracking-tight">Role</h2>
          <p className="text-text-tertiary text-[13px] mt-0.5">
            Promotions need admin, president, vice president, or advisor approval. Moving to a lower access role updates immediately.
          </p>
        </div>

        {pendingRole && (
          <div className="flex items-start gap-3 rounded-xl border border-warn/15 bg-warn-light/50 p-4">
            <AlertCircle size={16} className="text-warn mt-0.5 shrink-0" />
            <div>
              <p className="text-[13px] font-semibold text-text-primary">
                Pending request: {roleLabels[pendingRole]}
              </p>
              <p className="text-[12px] text-text-secondary mt-0.5">
                Select your current role and save to cancel this request.
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-[11px] font-semibold text-text-tertiary mb-2 uppercase tracking-wider">
            Requested Role
          </label>
          <select
            value={requestedRole}
            onChange={(event) => setSelectedRole(event.target.value as Role)}
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-bg-primary text-text-primary text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {roleLabels[role]}
              </option>
            ))}
          </select>
        </div>

        {roleMessage && (
          <div className="flex items-center gap-2 text-[13px] text-success-text">
            <CheckCircle2 size={14} />
            {roleMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={savingRole || (!pendingRole && selectedCurrentRole)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white text-[13px] font-semibold hover:bg-brand-mid transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {savingRole && <Loader2 size={15} className="animate-spin" />}
          {submitLabel}
        </button>
      </form>
    </div>
  );
}
