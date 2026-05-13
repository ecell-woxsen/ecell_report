"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { Building2, ChevronRight, Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const { user } = useUser();
  const router = useRouter();
  const departments = useQuery(api.departments.listAll);
  const completeOnboarding = useMutation(api.users.completeOnboarding);

  const [form, setForm] = useState({
    name: user?.fullName || "",
    phone: "",
    yearOfStudy: "",
    departmentId: "" as string,
    requestedRole: "member" as "member" | "department_head",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.departmentId) return;

    setLoading(true);
    try {
      await completeOnboarding({
        clerkId: user.id,
        name: form.name,
        phone: form.phone,
        yearOfStudy: form.yearOfStudy,
        departmentId: form.departmentId as Id<"departments">,
        requestedRole: form.requestedRole,
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
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand to-brand-mid flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">EC</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Complete Your Profile</h1>
          <p className="text-text-secondary mt-1">Tell us about yourself to get started</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-border-light shadow-lg p-8 space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-border bg-bg-primary text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 XXXXX XXXXX"
              className="w-full px-4 py-3 rounded-xl border border-border bg-bg-primary text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Year of Study
            </label>
            <select
              value={form.yearOfStudy}
              onChange={(e) => setForm({ ...form, yearOfStudy: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-border bg-bg-primary text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
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
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Department
            </label>
            <div className="grid grid-cols-2 gap-2">
              {departments?.map((dept) => (
                <button
                  key={dept._id}
                  type="button"
                  onClick={() => setForm({ ...form, departmentId: dept._id })}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    form.departmentId === dept._id
                      ? "border-brand bg-brand-light text-brand-mid"
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
            <label className="block text-sm font-medium text-text-primary mb-1.5">
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
                  className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    form.requestedRole === role.value
                      ? "border-brand bg-brand-light text-brand-mid"
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
            disabled={loading || !form.departmentId}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-brand text-white font-semibold text-sm hover:bg-brand-mid transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
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
