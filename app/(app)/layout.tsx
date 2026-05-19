"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { ECellLogo } from "@/components/ecell-logo";
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Users,
  Bell,
  Settings,
  Shield,
  Building2,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

const roleLabels: Record<string, string> = {
  member: "Member",
  department_head: "Department Head",
  team_lead: "Team Lead",
  core_team: "Core Team",
  president: "President",
  vice_president: "Vice President",
  advisor: "Advisor",
  admin: "Admin",
};

function formatRole(role?: string) {
  if (!role) return "Member";
  return roleLabels[role] ?? role.replace(/_/g, " ");
}

function NavItem({
  href,
  icon: Icon,
  label,
  active,
  badge,
  onClick,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  active: boolean;
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
        active
          ? "bg-brand-light text-brand-mid shadow-sm"
          : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
      }`}
    >
      <Icon size={18} strokeWidth={1.8} />
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full bg-danger text-white text-[10px] font-bold">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const convexUser = useQuery(
    api.users.getByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );
  const unreadCount = useQuery(
    api.notifications.getUnreadCount,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const isAdmin = convexUser?.roles?.some((r) =>
    ["admin", "president", "vice_president", "advisor"].includes(r)
  );
  const isCoreTeam = convexUser?.roles?.some((r) =>
    ["core_team", "president", "vice_president", "advisor", "admin"].includes(r)
  );

  const needsOnboarding =
    convexUser === null ||
    Boolean(convexUser && !convexUser.approved && !convexUser.departmentId);
  const isPending = convexUser && !convexUser.approved;

  useEffect(() => {
    if (user?.id && needsOnboarding) {
      router.replace("/onboarding");
    }
  }, [needsOnboarding, router, user?.id]);

  if (needsOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary p-6">
        <div className="text-center max-w-sm animate-fade-in">
          <ECellLogo size={88} className="mx-auto mb-6 rounded-3xl shadow-sm" priority />
          <h1 className="text-2xl font-bold text-text-primary mb-3 tracking-tight">
            Profile Setup
          </h1>
          <p className="text-text-secondary text-[15px] leading-relaxed">
            Taking you to complete your profile.
          </p>
        </div>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary p-6">
        <div className="text-center max-w-sm animate-fade-in">
          <ECellLogo size={88} className="mx-auto mb-6 rounded-3xl shadow-sm" priority />
          <h1 className="text-2xl font-bold text-text-primary mb-3 tracking-tight">
            Pending Approval
          </h1>
          <p className="text-text-secondary text-[15px] leading-relaxed mb-6">
            Your account is awaiting approval from the admin team. You&apos;ll
            receive access once approved.
          </p>
          <div className="flex justify-center">
            <UserButton />
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/reports", icon: FileText, label: "Reports" },
    ...(isCoreTeam
      ? [{ href: "/analytics", icon: BarChart3, label: "Analytics" }]
      : []),
    { href: "/team", icon: Users, label: "Team" },
    {
      href: "/notifications",
      icon: Bell,
      label: "Notifications",
      badge: unreadCount || 0,
    },
    ...(isAdmin
      ? [{ href: "/admin", icon: Shield, label: "Admin" }]
      : []),
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="min-h-screen flex bg-bg-primary">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[256px] bg-white border-r border-border-light flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-border-light">
          <Link href="/dashboard" className="flex items-center gap-3">
            <ECellLogo size={38} className="shadow-sm" priority />
            <div>
              <span className="font-semibold text-[15px] text-text-primary tracking-tight block leading-tight">
                E-Cell
              </span>
              <span className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider">
                Reports
              </span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-bg-tertiary transition-colors"
          >
            <X size={18} className="text-text-tertiary" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1">
          <p className="px-4 text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">
            Menu
          </p>
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href)
              }
              badge={"badge" in item ? (item.badge as number) : undefined}
              onClick={() => setSidebarOpen(false)}
            />
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-border-light">
          <div className="flex items-center gap-3">
            <UserButton />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-text-primary truncate leading-tight">
                {convexUser?.name || user?.fullName || "User"}
              </p>
              <p className="text-[11px] text-text-tertiary truncate">
                {formatRole(convexUser?.roles?.[0])}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 glass border-b border-border-light px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-bg-tertiary transition-colors"
            >
              <Menu size={20} className="text-text-secondary" />
            </button>

            {/* Breadcrumb */}
            <div className="hidden sm:flex items-center gap-1.5 text-[13px]">
              <Link
                href="/dashboard"
                className="text-text-tertiary hover:text-text-primary transition-colors"
              >
                E-Cell
              </Link>
              <ChevronRight size={12} className="text-text-tertiary" />
              <span className="text-text-primary font-medium capitalize">
                {pathname.split("/").filter(Boolean).pop() || "Dashboard"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {convexUser?.departmentId && (
              <DeptBadge departmentId={convexUser.departmentId} />
            )}
            <Link
              href="/notifications"
              className="relative p-2 rounded-xl hover:bg-bg-tertiary transition-colors"
            >
              <Bell size={18} className="text-text-secondary" />
              {unreadCount !== undefined && unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center px-1 rounded-full bg-danger text-white text-[9px] font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 lg:p-8 max-w-[1200px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function DeptBadge({ departmentId }: { departmentId: string }) {
  const dept = useQuery(api.departments.getById, {
    departmentId:
      departmentId as import("@/convex/_generated/dataModel").Id<"departments">,
  });
  if (!dept) return null;

  return (
    <div
      className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold"
      style={{
        backgroundColor: dept.colorTag + "12",
        color: dept.colorTag,
      }}
    >
      <Building2 size={11} />
      {dept.name}
    </div>
  );
}
