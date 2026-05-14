"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { Building2, Users, Megaphone } from "lucide-react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/admin", icon: Building2, label: "Departments" },
    { href: "/admin/users", icon: Users, label: "Users" },
    { href: "/admin/announcements", icon: Megaphone, label: "Announcements" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-[1.65rem] font-bold text-text-primary tracking-tight">Admin</h1>
        <p className="text-text-tertiary text-[13px] mt-0.5">Manage departments, users, and settings</p>
      </div>
      <div className="flex gap-2 border-b border-border-light pb-1">
        {tabs.map(t => (
          <Link key={t.href} href={t.href} className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-[13px] font-medium transition-all ${pathname === t.href ? "bg-white border border-border-light border-b-white text-brand -mb-[1px]" : "text-text-tertiary hover:text-text-primary"}`}>
            <t.icon size={15} />{t.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
