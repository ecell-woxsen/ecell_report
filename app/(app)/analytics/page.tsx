"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { BarChart3, TrendingUp, Users, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

export default function AnalyticsPage() {
  const departments = useQuery(api.departments.listAll);
  const allReports = useQuery(api.reports.listAll);
  const [selectedDept, setSelectedDept] = useState<string>("all");

  if (!departments || !allReports) {
    return <div className="space-y-4">{[1,2,3].map(i=><div key={i} className="skeleton h-64 rounded-2xl"/>)}</div>;
  }

  const submittedReports = allReports.filter(r => r.status === "submitted");

  // Submission stats per department
  const deptSubmissions = departments.map(d => {
    const deptReports = submittedReports.filter(r => r.departmentId === d._id);
    return { name: d.name, reports: deptReports.length, color: d.colorTag };
  });

  // Status distribution
  const statusData = [
    { name: "Submitted", value: allReports.filter(r => r.status === "submitted").length, color: "#1D9E75" },
    { name: "Draft", value: allReports.filter(r => r.status === "draft").length, color: "#BA7517" },
  ].filter(d => d.value > 0);

  // Task completion from all reports
  let totalTasks = 0, completedTasks = 0, pendingTasks = 0, delayedTasks = 0;
  submittedReports.forEach(r => {
    const tasks = (r.sections as Record<string, unknown>)?.task_tracker;
    if (Array.isArray(tasks)) {
      totalTasks += tasks.length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tasks.forEach((t: any) => {
        if (t.Status === "Completed" || t.status === "Completed") completedTasks++;
        else if (t.Status === "Pending" || t.status === "Pending") pendingTasks++;
        else if (t.Status === "Delayed" || t.status === "Delayed") delayedTasks++;
      });
    }
  });

  const taskData = [
    { name: "Completed", value: completedTasks, color: "#3B6D11" },
    { name: "In Progress", value: totalTasks - completedTasks - pendingTasks - delayedTasks, color: "#185FA5" },
    { name: "Pending", value: pendingTasks, color: "#BA7517" },
    { name: "Delayed", value: delayedTasks, color: "#A32D2D" },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-[1.65rem] font-bold text-text-primary tracking-tight">Analytics</h1>
        <p className="text-text-tertiary text-[13px] mt-0.5">Organization-wide performance insights</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Reports", value: allReports.length, icon: BarChart3, color: "brand" },
          { label: "Submitted", value: submittedReports.length, icon: TrendingUp, color: "success-text" },
          { label: "Departments", value: departments.length, icon: Users, color: "info" },
          { label: "Total Tasks", value: totalTasks, icon: Calendar, color: "purple" },
        ].map(s => (
          <div key={s.label} className="p-5 rounded-2xl bg-white border border-border-light shadow-sm">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `var(--${s.color}-light, var(--brand-light))`, color: `var(--${s.color}, var(--brand))` }}>
              <s.icon size={20} />
            </div>
            <div className="text-2xl font-bold text-text-primary tracking-tight">{s.value}</div>
            <div className="text-[11px] text-text-tertiary font-medium mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Submissions by Department */}
        <div className="p-6 rounded-2xl bg-white border border-border-light shadow-sm">
          <h3 className="text-[13px] font-semibold text-text-primary mb-4 tracking-tight">Reports by Department</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptSubmissions} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E8EB" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E5E8EB", fontSize: 12 }} />
                <Bar dataKey="reports" radius={[6, 6, 0, 0]}>
                  {deptSubmissions.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Report Status Distribution */}
        <div className="p-6 rounded-2xl bg-white border border-border-light shadow-sm">
          <h3 className="text-[13px] font-semibold text-text-primary mb-4 tracking-tight">Report Status Distribution</h3>
          <div className="h-64 flex items-center justify-center">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E5E8EB", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-text-tertiary text-sm">No data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Task Completion */}
      <div className="p-6 rounded-2xl bg-white border border-border-light shadow-sm">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Task Status Overview</h3>
        <div className="h-64">
          {taskData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={taskData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {taskData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center"><p className="text-text-tertiary text-sm">No tasks tracked yet</p></div>
          )}
        </div>
      </div>

      {/* Department Leaderboard */}
      <div className="p-6 rounded-2xl bg-white border border-border-light shadow-sm">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Department Leaderboard</h3>
        <div className="space-y-3">
          {deptSubmissions.sort((a, b) => b.reports - a.reports).map((d, i) => (
            <div key={d.name} className="flex items-center gap-4">
              <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold" style={{ backgroundColor: d.color + "20", color: d.color }}>
                {i + 1}
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-medium text-text-primary">{d.name}</span>
                  <span className="text-[11px] text-text-tertiary font-medium">{d.reports} reports</span>
                </div>
                <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(5, (d.reports / Math.max(...deptSubmissions.map(x => x.reports), 1)) * 100)}%`, backgroundColor: d.color }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
