"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { Building2, ChevronRight, Loader2 } from "lucide-react";
import { ECellLogo } from "@/components/ecell-logo";

export default function OnboardingPage() {
  const { user } = useUser();
  const router = useRouter();
  const departments = useQuery(api.departments.listAll);
  const convexUser = useQuery(
    api.users.getByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );
  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const upsertFromClerk = useMutation(api.users.upsertFromClerk);
  const seedDepts = useMutation(api.departments.seed);
  const seedTemplates = useMutation(api.templates.seedTemplates);

  const [form, setForm] = useState<{
    name?: string;
    phone?: string;
    yearOfStudy?: string;
    departmentId?: string;
    requestedRole?: "member" | "department_head";
  }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (departments !== undefined && departments.length === 0) {
      seedDepts().then(() => seedTemplates()).catch(console.error);
    }
  }, [departments, seedDepts, seedTemplates]);

  useEffect(() => {
    if (!convexUser) return;

    if (convexUser.departmentId && convexUser.phone && convexUser.yearOfStudy) {
      router.replace("/dashboard");
    }
  }, [convexUser, router]);

  const formName =
    form.name ??
    convexUser?.name ??
    user?.fullName ??
    user?.primaryEmailAddress?.emailAddress ??
    "";
  const formPhone = form.phone ?? convexUser?.phone ?? "";
  const formYearOfStudy = form.yearOfStudy ?? convexUser?.yearOfStudy ?? "";
  const formDepartmentId = form.departmentId ?? convexUser?.departmentId ?? "";
  const formRequestedRole =
    form.requestedRole ??
    (convexUser?.roles.includes("department_head")
      ? "department_head"
      : "member");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formDepartmentId) return;

    setLoading(true);
    try {
      const email =
        user.primaryEmailAddress?.emailAddress ||
        user.emailAddresses[0]?.emailAddress ||
        "";

      await upsertFromClerk({
        clerkId: user.id,
        name: formName,
        email,
        avatarUrl: user.imageUrl,
      });

      await completeOnboarding({
        clerkId: user.id,
        name: formName,
        phone: formPhone,
        yearOfStudy: formYearOfStudy,
        departmentId: formDepartmentId as Id<"departments">,
        requestedRole: formRequestedRole,
      });
      router.push("/dashboard");
    } catch (error) {
      console.error("Onboarding error:", error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-light/30 via-bg-primary to-bg-primary p-6">
      <div className="w-full max-w-lg animate-fade-in">
        <div className="text-center mb-8">
          <ECellLogo size={72} className="mx-auto mb-4 rounded-2xl shadow-sm" priority />
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Complete Your Profile</h1>
          <p className="text-text-tertiary text-[15px] mt-1">Tell us about yourself to get started</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-border-light shadow-lg p-8 space-y-5"
        >
          <div>
            <label className="block text-[11px] font-semibold text-text-tertiary mb-2 uppercase tracking-wider">
              Full Name
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-bg-primary text-text-primary text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-text-tertiary mb-2 uppercase tracking-wider">
              Phone Number
            </label>
            <input
              type="tel"
              value={formPhone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 XXXXX XXXXX"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-bg-primary text-text-primary text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-text-tertiary mb-2 uppercase tracking-wider">
              Year of Study
            </label>
            <select
              value={formYearOfStudy}
              onChange={(e) => setForm({ ...form, yearOfStudy: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-bg-primary text-text-primary text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              required
            >
              <option value="">Select year</option>
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
              <option value="5th Year">5th Year</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-text-tertiary mb-2 uppercase tracking-wider">
              Department
            </label>
            <div className="grid grid-cols-2 gap-2">
              {departments === undefined || departments.length === 0 ? (
                <div className="col-span-2 rounded-xl border border-border bg-bg-primary px-4 py-3 text-[13px] text-text-tertiary">
                  Preparing departments...
                </div>
              ) : departments.map((dept) => (
                <button
                  key={dept._id}
                  type="button"
                  onClick={() => setForm({ ...form, departmentId: dept._id })}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-[13px] font-medium transition-all ${
                    formDepartmentId === dept._id
                      ? "border-brand bg-brand-light text-brand-mid shadow-sm"
                      : "border-border bg-white text-text-secondary hover:border-brand/30"
                  }`}
                >
                  <Building2 size={14} />
                  {dept.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-text-tertiary mb-2 uppercase tracking-wider">
              Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "member", label: "Member" },
                { value: "department_head", label: "Department Head" },
              ].map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      requestedRole: role.value as "member" | "department_head",
                    })
                  }
                  className={`px-3.5 py-2.5 rounded-xl border text-[13px] font-medium transition-all ${
                    formRequestedRole === role.value
                      ? "border-brand bg-brand-light text-brand-mid shadow-sm"
                      : "border-border bg-white text-text-secondary hover:border-brand/30"
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !formDepartmentId || !departments?.length}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand text-white font-semibold text-[15px] hover:bg-brand-mid transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-sm"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                Complete Setup
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
