"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Settings, User, Mail, Phone, Building2, Shield, GraduationCap } from "lucide-react";

export default function SettingsPage() {
  const { user } = useUser();
  const convexUser = useQuery(api.users.getByClerkId, user?.id ? { clerkId: user.id } : "skip");
  const departments = useQuery(api.departments.listAll);

  if (!convexUser) {
    return <div className="skeleton h-64 rounded-2xl" />;
  }

  const dept = departments?.find(d => d._id === convexUser.departmentId);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary text-sm mt-1">Your profile information</p>
      </div>

      <div className="p-6 rounded-2xl bg-white border border-border-light shadow-sm space-y-5">
        <div className="flex items-center gap-4 pb-5 border-b border-border-light">
          <div className="w-16 h-16 rounded-2xl bg-brand-light flex items-center justify-center text-brand font-bold text-2xl">
            {convexUser.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{convexUser.name}</h2>
            <p className="text-sm text-text-tertiary">{convexUser.roles.map(r => r.replace("_", " ")).join(", ")}</p>
          </div>
        </div>

        {[
          { icon: Mail, label: "Email", value: convexUser.email },
          { icon: Phone, label: "Phone", value: convexUser.phone || "Not set" },
          { icon: GraduationCap, label: "Year of Study", value: convexUser.yearOfStudy || "Not set" },
          { icon: Building2, label: "Department", value: dept?.name || "Unassigned" },
          { icon: Shield, label: "Roles", value: convexUser.roles.map(r => r.replace("_", " ")).join(", ") },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-3 py-3">
            <div className="w-9 h-9 rounded-xl bg-bg-tertiary flex items-center justify-center shrink-0">
              <item.icon size={16} className="text-text-tertiary" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary">{item.label}</p>
              <p className="text-sm font-medium text-text-primary">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
