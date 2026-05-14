"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { use, useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import {
  CheckCircle2, Calendar, User, MessageSquare, Send,
  ArrowLeft, Download, ChevronDown, ChevronUp, FileSpreadsheet
} from "lucide-react";
import * as XLSX from "xlsx-js-style";

/* eslint-disable @typescript-eslint/no-explicit-any */

const TABLE_SECTION_TYPES = new Set(["dynamic_table", "budget_table", "campaign_table"]);

const workbookStyles = {
  title: {
    font: { bold: true, sz: 18, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "1D9E75" } },
    alignment: { vertical: "center" },
  },
  sectionHeading: {
    font: { bold: true, color: { rgb: "1D9E75" } },
    fill: { fgColor: { rgb: "E8F6F1" } },
  },
  tableHeader: {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "146B52" } },
    alignment: { vertical: "center", wrapText: true },
  },
  label: { font: { bold: true, color: { rgb: "425466" } } },
  muted: { font: { color: { rgb: "6B7280" } } },
  wrap: { alignment: { vertical: "top", wrapText: true } },
  total: { font: { bold: true }, fill: { fgColor: { rgb: "F3F7F5" } } },
};

type SheetSummary = {
  order: number;
  title: string;
  type: string;
  status: string;
  records: number | string;
  sheetName: string;
};

type PdfContext = {
  doc: any;
  pageWidth: number;
  pageHeight: number;
  margin: number;
  cursorY: number;
};

export default function ReportViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useUser();
  const report = useQuery(api.reports.getById, { reportId: id as Id<"reports"> });
  const template = useQuery(api.templates.getByDepartment, report?.departmentId ? { departmentId: report.departmentId } : "skip");
  const comments = useQuery(api.comments.listByReport, report?._id ? { reportId: report._id } : "skip");
  const convexUser = useQuery(api.users.getByClerkId, user?.id ? { clerkId: user.id } : "skip");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [exportingPdf, setExportingPdf] = useState(false);

  if (!report || !template) {
    return <div className="space-y-4">{[1,2,3].map(i=><div key={i} className="skeleton h-32 rounded-2xl" />)}</div>;
  }

  const sections = (report.sections || {}) as Record<string, any>;
  const enabledSections = template.sections.filter(s => s.enabled).sort((a, b) => a.order - b.order);
  const isCoreTeam = convexUser?.roles?.some(r => ["core_team", "president", "admin"].includes(r));
  const sectionComments = (key: string) => comments?.filter(c => c.sectionKey === key && !c.parentId) || [];

  const exportToExcel = () => {
    if (!report || !template) return;
    const wb = XLSX.utils.book_new();
    const existingSheetNames = new Set<string>(["Overview"]);
    const allComments = comments || [];
    const sheetBySection = new Map<string, string>();
    const sheetSummaries: SheetSummary[] = [];
    const narrativeRows: any[][] = [];
    const metricRows: any[][] = [];

    enabledSections.forEach((section) => {
      const val = sections[section.key];
      let sheetName = "Narrative";
      if (TABLE_SECTION_TYPES.has(section.type)) {
        sheetName = makeUniqueSheetName(section.title, existingSheetNames);
      } else if (section.type === "metrics_grid") {
        sheetName = "Metrics";
      }
      sheetBySection.set(section.key, sheetName);

      const status = getSectionStatus(section, val);
      const records = getSectionRecordCount(section, val);
      sheetSummaries.push({
        order: section.order,
        title: section.title,
        type: labelize(section.type),
        status,
        records,
        sheetName,
      });

      if (section.type === "metrics_grid") {
        metricRows.push(...buildMetricRows(section, val));
      } else if (!TABLE_SECTION_TYPES.has(section.type)) {
        narrativeRows.push(...buildNarrativeRows(section, val));
      }
    });

    wb.Props = {
      Title: `${report.departmentName} Weekly Report - ${report.weekLabel}`,
      Subject: "E-Cell weekly accountability report",
      Author: report.departmentHeadName,
      Company: "E-Cell",
      Category: "Weekly Report",
      Keywords: "E-Cell, weekly report, accountability, department",
      Comments: "Generated from the E-Cell reporting dashboard.",
      CreatedDate: new Date(),
    };

    XLSX.utils.book_append_sheet(
      wb,
      buildOverviewSheet({
        report,
        sheetSummaries,
        comments: allComments,
        metricRows,
        narrativeRows,
      }),
      "Overview"
    );

    if (metricRows.length > 0) {
      XLSX.utils.book_append_sheet(wb, buildMetricsSheet(report, metricRows), "Metrics");
    }

    if (narrativeRows.length > 0) {
      XLSX.utils.book_append_sheet(wb, buildNarrativeSheet(report, narrativeRows), "Narrative");
    }

    enabledSections.forEach((section) => {
      if (!TABLE_SECTION_TYPES.has(section.type)) return;
      const sheetName = sheetBySection.get(section.key);
      if (!sheetName) return;
      XLSX.utils.book_append_sheet(
        wb,
        buildTableSectionSheet(report, section, sections[section.key]),
        sheetName
      );
    });

    if (allComments.length > 0) {
      XLSX.utils.book_append_sheet(
        wb,
        buildFeedbackSheet(report, enabledSections, allComments),
        "Feedback"
      );
    }

    XLSX.writeFile(wb, `${toFileSlug(report.departmentName)}_${toFileSlug(report.weekLabel)}_weekly_report.xlsx`, {
      bookType: "xlsx",
      cellDates: true,
      compression: true,
    });
  };

  const exportToPdf = async () => {
    if (!report || !template || exportingPdf) return;
    setExportingPdf(true);
    try {
      await exportReportToPdf({
        report,
        enabledSections,
        sections,
        comments: comments || [],
      });
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="max-w-[900px] mx-auto animate-fade-in print:max-w-none print:m-0 print:p-0">
      {/* Back */}
      <Link href="/reports" className="print:hidden inline-flex items-center gap-1.5 text-sm text-text-tertiary hover:text-text-primary mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to Reports
      </Link>

      {/* Report Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-brand to-brand-mid text-white mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">{report.departmentName} – Weekly Report</h1>
            <p className="text-white/80 text-sm mt-1">{report.weekLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={exportToExcel} className="print:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-soft/20 hover:bg-brand-soft/40 text-brand-light text-xs font-medium transition-colors border border-brand-soft/20">
              <FileSpreadsheet size={13} /> Excel
            </button>
            <button onClick={exportToPdf} disabled={exportingPdf} className="print:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
              <Download size={13} /> {exportingPdf ? "Preparing..." : "PDF"}
            </button>
            {report.status === "submitted" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 text-white text-xs font-medium">
                <CheckCircle2 size={13} /> Submitted
              </span>
            )}
          </div>
        </div>
        {report.submittedAt && (
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-white/70">
            <span className="flex items-center gap-1"><User size={12} /> {report.departmentHeadName}</span>
            <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(report.submittedAt).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {enabledSections.map((section, idx) => {
          const val = sections[section.key];
          const secComments = sectionComments(section.key);
          return (
            <div key={section.key} className="rounded-2xl bg-white border border-border-light shadow-sm overflow-hidden">
              <button onClick={() => setCollapsed(p => ({ ...p, [section.key]: !p[section.key] }))} className="w-full flex items-center gap-3 p-5 text-left hover:bg-bg-tertiary/50 transition-colors print:pointer-events-none">
                <span className="w-7 h-7 rounded-lg bg-brand-light text-brand-mid flex items-center justify-center text-xs font-bold print:border print:border-brand-mid/20">{idx + 1}</span>
                <span className="flex-1 text-sm font-semibold text-text-primary">{section.title}</span>
                {secComments.length > 0 && <span className="print:hidden flex items-center gap-1 text-xs text-purple"><MessageSquare size={12} />{secComments.length}</span>}
                {collapsed[section.key] ? <ChevronDown size={16} className="text-text-tertiary print:hidden" /> : <ChevronUp size={16} className="text-text-tertiary print:hidden" />}
              </button>
              {!collapsed[section.key] && (
                <div className="px-5 pb-5">
                  <SectionViewer section={section} value={val} />
                  {/* Comments */}
                  {secComments.length > 0 && (
                    <div className="print:hidden mt-4 pt-4 border-t border-border-light space-y-3">
                      {secComments.map(c => (
                        <CommentThread key={c._id} comment={c} replies={comments?.filter(r => r.parentId === c._id) || []} />
                      ))}
                    </div>
                  )}
                  {isCoreTeam && (
                    <div className="print:hidden">
                      <AddComment reportId={report._id} sectionKey={section.key} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

async function exportReportToPdf({
  report,
  enabledSections,
  sections,
  comments,
}: {
  report: any;
  enabledSections: any[];
  sections: Record<string, any>;
  comments: any[];
}) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const ctx: PdfContext = {
    doc,
    pageWidth: doc.internal.pageSize.getWidth(),
    pageHeight: doc.internal.pageSize.getHeight(),
    margin: 44,
    cursorY: 0,
  };
  const sectionSummaries = enabledSections.map((section) => ({
    order: section.order,
    title: section.title,
    type: labelize(section.type),
    status: getSectionStatus(section, sections[section.key]),
    records: getSectionRecordCount(section, sections[section.key]),
  }));

  addPdfCover(ctx, report, sectionSummaries, comments);
  addPdfSectionIndex(ctx, autoTable, sectionSummaries);

  const metricSections = enabledSections.filter((section) => section.type === "metrics_grid");
  if (metricSections.length > 0) {
    addPdfPage(ctx);
    addPdfSectionHeader(ctx, "Performance Metrics", "Key performance indicators submitted for this reporting week.");
    metricSections.forEach((section) => {
      const rows = buildMetricRows(section, sections[section.key]).map((row) => [
        row[1],
        formatPdfCellValue(row[1], row[2]),
        row[3] || "",
      ]);
      addPdfSubheading(ctx, section.title);
      addPdfTable(ctx, autoTable, ["Metric", "Value", "Notes"], rows.length ? rows : [["No metrics submitted", "", ""]]);
    });
  }

  const narrativeSections = enabledSections.filter((section) => !TABLE_SECTION_TYPES.has(section.type) && section.type !== "metrics_grid");
  if (narrativeSections.length > 0) {
    addPdfPage(ctx);
    addPdfSectionHeader(ctx, "Narrative Review", "Written updates, qualitative notes, and leadership review fields.");
    narrativeSections.forEach((section) => {
      const rows = buildNarrativeRows(section, sections[section.key]).map((row) => [row[1], row[2]]);
      addPdfSubheading(ctx, section.title, section.description);
      addPdfTable(ctx, autoTable, ["Field", "Details"], rows, { minCellHeight: 24 });
    });
  }

  enabledSections
    .filter((section) => TABLE_SECTION_TYPES.has(section.type))
    .forEach((section) => {
      addPdfPage(ctx);
      addPdfSectionHeader(ctx, section.title, section.description || "Structured tracking table submitted with the report.");
      const rows: any[] = Array.isArray(sections[section.key]) ? sections[section.key] : [];
      const columns = getTableColumns(section, rows);
      const body = rows.length
        ? rows.map((row) => columns.map((column) => formatPdfCellValue(column, normalizeCellValue(column, row[column]))))
        : [columns.map((_, idx) => (idx === 0 ? "No entries submitted" : ""))];
      const totalRow = buildPdfTotalRow(columns, rows);
      addPdfTable(ctx, autoTable, columns, totalRow ? [...body, totalRow] : body, {
        fontSize: columns.length > 5 ? 7 : 8,
      });
    });

  if (comments.length > 0) {
    addPdfPage(ctx);
    addPdfSectionHeader(ctx, "Feedback & Review Notes", "Core-team comments and follow-up notes attached to this report.");
    addPdfTable(
      ctx,
      autoTable,
      ["Section", "Tag", "Status", "Author", "Comment"],
      comments
        .slice()
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
        .map((comment) => {
          const section = enabledSections.find((item) => item.key === comment.sectionKey);
          return [
            section?.title || labelize(comment.sectionKey),
            comment.tag || "Note",
            comment.resolved ? "Resolved" : "Open",
            comment.authorName,
            comment.text,
          ];
        }),
      { fontSize: 7.5 }
    );
  }

  stampPdfPages(ctx, report);
  doc.save(`${toFileSlug(report.departmentName)}_${toFileSlug(report.weekLabel)}_weekly_report.pdf`);
}

const pdfColors = {
  brand: [29, 158, 117],
  brandDark: [20, 107, 82],
  brandLight: [232, 246, 241],
  text: [31, 41, 55],
  muted: [92, 105, 120],
  border: [214, 221, 227],
  danger: [185, 28, 28],
  white: [255, 255, 255],
};

function addPdfCover(ctx: PdfContext, report: any, sectionSummaries: any[], comments: any[]) {
  const { doc, pageWidth, margin } = ctx;
  const completedSections = sectionSummaries.filter((section) => section.status === "Complete").length;
  const tableRows = sectionSummaries.reduce((total, section) => total + (typeof section.records === "number" ? section.records : 0), 0);
  const actionRequired = comments.filter((comment) => comment.tag === "Action Required" && !comment.resolved).length;

  doc.setFillColor(...pdfColors.brand);
  doc.rect(0, 0, pageWidth, 154, "F");
  doc.setFillColor(...pdfColors.brandDark);
  doc.rect(0, 0, 12, 154, "F");
  doc.setTextColor(...pdfColors.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("E-CELL WEEKLY REPORT", margin, 42);
  doc.setFontSize(25);
  doc.text(report.departmentName, margin, 78);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.text(report.weekLabel, margin, 104);
  doc.text(`Submitted by ${report.departmentHeadName}`, margin, 126);

  ctx.cursorY = 190;
  addPdfMetaGrid(ctx, [
    ["Status", labelize(report.status)],
    ["Submitted At", report.submittedAt ? formatPdfDate(new Date(report.submittedAt), true) : "Not submitted"],
    ["Active Members", report.activeMembersCount ?? "Not provided"],
    ["Generated", formatPdfDate(new Date(), true)],
  ]);

  ctx.cursorY += 24;
  addPdfSectionHeader(ctx, "Executive Snapshot");
  const cardWidth = (pageWidth - margin * 2 - 18) / 4;
  [
    ["Sections Complete", `${completedSections}/${sectionSummaries.length}`],
    ["Table Rows", tableRows],
    ["Feedback Notes", comments.length],
    ["Action Required", actionRequired],
  ].forEach(([label, value], idx) => {
    const x = margin + idx * (cardWidth + 6);
    doc.setDrawColor(...pdfColors.border);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, ctx.cursorY, cardWidth, 70, 8, 8, "FD");
    doc.setTextColor(...pdfColors.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(String(label).toUpperCase(), x + 12, ctx.cursorY + 21);
    doc.setTextColor(idx === 3 && Number(value) > 0 ? pdfColors.danger[0] : pdfColors.brandDark[0], idx === 3 && Number(value) > 0 ? pdfColors.danger[1] : pdfColors.brandDark[1], idx === 3 && Number(value) > 0 ? pdfColors.danger[2] : pdfColors.brandDark[2]);
    doc.setFontSize(20);
    doc.text(String(value), x + 12, ctx.cursorY + 50);
  });
  ctx.cursorY += 100;
}

function addPdfSectionIndex(ctx: PdfContext, autoTable: any, sectionSummaries: any[]) {
  addPdfSectionHeader(ctx, "Report Index", "A quick map of the submitted sections and where the report has missing data.");
  addPdfTable(
    ctx,
    autoTable,
    ["#", "Section", "Type", "Status", "Records"],
    sectionSummaries.map((section, idx) => [
      idx + 1,
      section.title,
      section.type,
      section.status,
      section.records,
    ])
  );
}

function addPdfMetaGrid(ctx: PdfContext, rows: any[][]) {
  const { doc, pageWidth, margin } = ctx;
  const colWidth = (pageWidth - margin * 2) / 2;
  rows.forEach((row, idx) => {
    const x = margin + (idx % 2) * colWidth;
    const y = ctx.cursorY + Math.floor(idx / 2) * 42;
    doc.setTextColor(...pdfColors.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(String(row[0]).toUpperCase(), x, y);
    doc.setTextColor(...pdfColors.text);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(String(row[1]), x, y + 17);
  });
  ctx.cursorY += Math.ceil(rows.length / 2) * 42;
}

function addPdfSectionHeader(ctx: PdfContext, title: string, description?: string) {
  ensurePdfSpace(ctx, description ? 58 : 34);
  const { doc, margin } = ctx;
  doc.setDrawColor(...pdfColors.brand);
  doc.setLineWidth(2);
  doc.line(margin, ctx.cursorY, margin + 34, ctx.cursorY);
  ctx.cursorY += 18;
  doc.setTextColor(...pdfColors.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(title, margin, ctx.cursorY);
  if (description) {
    ctx.cursorY += 16;
    doc.setTextColor(...pdfColors.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(description, ctx.pageWidth - margin * 2);
    doc.text(lines, margin, ctx.cursorY);
    ctx.cursorY += lines.length * 11;
  }
  ctx.cursorY += 14;
}

function addPdfSubheading(ctx: PdfContext, title: string, description?: string) {
  ensurePdfSpace(ctx, description ? 48 : 28);
  const { doc, margin } = ctx;
  doc.setTextColor(...pdfColors.brandDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(title, margin, ctx.cursorY);
  ctx.cursorY += 14;
  if (description) {
    doc.setTextColor(...pdfColors.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const lines = doc.splitTextToSize(description, ctx.pageWidth - margin * 2);
    doc.text(lines, margin, ctx.cursorY);
    ctx.cursorY += lines.length * 10 + 4;
  }
}

function addPdfTable(ctx: PdfContext, autoTable: any, columns: string[], rows: any[][], options: any = {}) {
  ensurePdfSpace(ctx, 80);
  autoTable(ctx.doc, {
    startY: ctx.cursorY,
    head: [columns],
    body: rows,
    theme: "grid",
    margin: { left: ctx.margin, right: ctx.margin, top: 76, bottom: 54 },
    styles: {
      font: "helvetica",
      fontSize: options.fontSize || 8,
      cellPadding: 5,
      overflow: "linebreak",
      valign: "top",
      textColor: pdfColors.text,
      lineColor: pdfColors.border,
      lineWidth: 0.4,
      minCellHeight: options.minCellHeight,
    },
    headStyles: {
      fillColor: pdfColors.brandDark,
      textColor: pdfColors.white,
      fontStyle: "bold",
      lineColor: pdfColors.brandDark,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell: (data: any) => {
      if (data.section === "body" && data.row.index === rows.length - 1 && String(rows[data.row.index]?.[0]).toLowerCase() === "total") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = pdfColors.brandLight;
      }
      if (data.section === "body" && String(data.cell.raw).toLowerCase() === "action required") {
        data.cell.styles.textColor = pdfColors.danger;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });
  ctx.cursorY = (ctx.doc as any).lastAutoTable.finalY + 22;
}

function addPdfPage(ctx: PdfContext) {
  ctx.doc.addPage();
  ctx.cursorY = 84;
}

function ensurePdfSpace(ctx: PdfContext, needed: number) {
  if (ctx.cursorY + needed > ctx.pageHeight - 62) addPdfPage(ctx);
}

function stampPdfPages(ctx: PdfContext, report: any) {
  const { doc, pageWidth, pageHeight, margin } = ctx;
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    if (page > 1) {
      doc.setFillColor(...pdfColors.white);
      doc.rect(0, 0, pageWidth, 58, "F");
      doc.setDrawColor(...pdfColors.border);
      doc.line(margin, 58, pageWidth - margin, 58);
      doc.setTextColor(...pdfColors.brandDark);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(`${report.departmentName} Weekly Report`, margin, 36);
      doc.setTextColor(...pdfColors.muted);
      doc.setFont("helvetica", "normal");
      doc.text(report.weekLabel, pageWidth - margin, 36, { align: "right" });
    }
    doc.setDrawColor(...pdfColors.border);
    doc.line(margin, pageHeight - 38, pageWidth - margin, pageHeight - 38);
    doc.setTextColor(...pdfColors.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("E-Cell Reporting Dashboard", margin, pageHeight - 20);
    doc.text(`Page ${page} of ${totalPages}`, pageWidth - margin, pageHeight - 20, { align: "right" });
  }
}

function buildPdfTotalRow(columns: string[], rows: any[]) {
  const amountColumns = columns
    .map((column, idx) => (isAmountColumn(column) ? idx : -1))
    .filter((idx) => idx >= 0);
  if (amountColumns.length === 0 || rows.length === 0) return null;
  const totals = amountColumns.reduce<Record<number, number>>((acc, columnIndex) => {
    const column = columns[columnIndex];
    acc[columnIndex] = rows.reduce((sum, row) => {
      const parsed = parseNumberLike(row[column]);
      return sum + (parsed || 0);
    }, 0);
    return acc;
  }, {});
  return columns.map((column, idx) => {
    if (idx === 0) return "Total";
    if (!amountColumns.includes(idx)) return "";
    return formatPdfCurrency(totals[idx]);
  });
}

function formatPdfValue(value: any) {
  if (value instanceof Date) return formatPdfDate(value);
  if (typeof value === "number") return Number.isInteger(value) ? value.toLocaleString("en-IN") : value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  return cleanText(value) || "-";
}

function formatPdfCellValue(label: string, value: any) {
  if (value instanceof Date) return formatPdfDate(value);
  if (typeof value === "number") {
    if (isPercentColumn(label)) return `${(value * 100).toLocaleString("en-IN", { maximumFractionDigits: 1 })}%`;
    if (isAmountColumn(label)) return formatPdfCurrency(value);
  }
  return formatPdfValue(value);
}

function formatPdfCurrency(value: number) {
  return `Rs. ${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatPdfDate(value: Date, includeTime = false) {
  return includeTime ? value.toLocaleString("en-IN") : value.toLocaleDateString("en-IN");
}

function buildOverviewSheet({
  report,
  sheetSummaries,
  comments,
  metricRows,
  narrativeRows,
}: {
  report: any;
  sheetSummaries: SheetSummary[];
  comments: any[];
  metricRows: any[][];
  narrativeRows: any[][];
}) {
  const completedSections = sheetSummaries.filter((s) => s.status === "Complete").length;
  const submittedRows = sheetSummaries.reduce((total, s) => total + (typeof s.records === "number" ? s.records : 0), 0);
  const actionRequired = comments.filter((c) => c.tag === "Action Required" && !c.resolved).length;
  const submittedAt = report.submittedAt ? new Date(report.submittedAt) : "Not submitted";
  const workbookSheetCount = new Set(sheetSummaries.map((summary) => summary.sheetName)).size + 1 + (comments.length > 0 ? 1 : 0);
  const navigationStartRow = 15;
  const data = [
    [`${report.departmentName} Weekly Report`],
    [],
    ["Report Details"],
    ["Department", report.departmentName, "Week", report.weekLabel],
    ["Submitted By", report.departmentHeadName, "Submitted At", submittedAt],
    ["Status", labelize(report.status), "Active Members", report.activeMembersCount ?? ""],
    [],
    ["Executive Snapshot"],
    ["Sections Complete", completedSections, "Total Sections", sheetSummaries.length],
    ["Table Rows Submitted", submittedRows, "Metrics Captured", metricRows.filter((row) => row[2] !== "").length],
    ["Narrative Entries", narrativeRows.length, "Feedback Comments", comments.length],
    ["Action Required", actionRequired, "Workbook Sheets", workbookSheetCount],
    [],
    ["Workbook Navigation"],
    ["#", "Section", "Type", "Status", "Records", "Sheet"],
    ...sheetSummaries.map((summary, idx) => [
      idx + 1,
      summary.title,
      summary.type,
      summary.status,
      summary.records,
      summary.sheetName,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(data, { cellDates: true });
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
    { s: { r: 7, c: 0 }, e: { r: 7, c: 5 } },
    { s: { r: 13, c: 0 }, e: { r: 13, c: 5 } },
  ];
  ws["!cols"] = [
    { wch: 8 },
    { wch: 34 },
    { wch: 22 },
    { wch: 18 },
    { wch: 16 },
    { wch: 22 },
  ];
  ws["!rows"] = [{ hpt: 28 }];
  styleRow(ws, 1, 5, workbookStyles.title);
  [3, 8, 14].forEach((row) => styleRow(ws, row, 5, workbookStyles.sectionHeading));
  [4, 5, 6, 9, 10, 11, 12].forEach((row) => {
    styleCell(ws, `A${row}`, workbookStyles.label);
    styleCell(ws, `C${row}`, workbookStyles.label);
  });
  styleRow(ws, navigationStartRow, 5, workbookStyles.tableHeader);
  sheetSummaries.forEach((summary, idx) => {
    const cell = ws[`F${navigationStartRow + idx + 1}`] as any;
    if (cell) {
      cell.l = {
        Target: `#'${summary.sheetName.replace(/'/g, "''")}'!A1`,
        Tooltip: `Open ${summary.sheetName}`,
      };
      cell.s = { ...workbookStyles.muted };
    }
  });
  return ws;
}

function buildMetricsSheet(report: any, metricRows: any[][]) {
  const data = [
    ["Performance Metrics"],
    ["Department", report.departmentName, "Week", report.weekLabel],
    ["Submitted By", report.departmentHeadName, "Generated", new Date()],
    [],
    ["Section", "Metric", "Value", "Notes"],
    ...metricRows,
  ];
  const ws = XLSX.utils.aoa_to_sheet(data, { cellDates: true });
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
  ws["!cols"] = [{ wch: 26 }, { wch: 34 }, { wch: 18 }, { wch: 60 }];
  ws["!autofilter"] = { ref: `A5:D${Math.max(5, data.length)}` };
  styleRow(ws, 1, 3, workbookStyles.title);
  styleRow(ws, 5, 3, workbookStyles.tableHeader);
  styleMetadataRows(ws, [2, 3]);
  for (let row = 6; row <= data.length; row += 1) {
    const label = String(ws[`B${row}`]?.v || "");
    const valueCell = ws[`C${row}`] as any;
    if (!valueCell) continue;
    if (isPercentColumn(label)) valueCell.z = "0.0%";
    else if (typeof valueCell.v === "number") valueCell.z = "#,##0.##";
  }
  return ws;
}

function buildNarrativeSheet(report: any, narrativeRows: any[][]) {
  const data = [
    ["Narrative Sections"],
    ["Department", report.departmentName, "Week", report.weekLabel],
    ["Submitted By", report.departmentHeadName, "Generated", new Date()],
    [],
    ["Section", "Field", "Details"],
    ...narrativeRows,
  ];
  const ws = XLSX.utils.aoa_to_sheet(data, { cellDates: true });
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
  ws["!cols"] = [{ wch: 30 }, { wch: 26 }, { wch: 90 }];
  ws["!rows"] = [{ hpt: 28 }, {}, {}, {}, { hpt: 22 }];
  ws["!autofilter"] = { ref: `A5:C${Math.max(5, data.length)}` };
  styleRow(ws, 1, 2, workbookStyles.title);
  styleRow(ws, 5, 2, workbookStyles.tableHeader);
  styleMetadataRows(ws, [2, 3]);
  for (let row = 6; row <= data.length; row += 1) {
    styleCell(ws, `C${row}`, workbookStyles.wrap);
  }
  return ws;
}

function buildTableSectionSheet(report: any, section: any, value: any) {
  const rows = Array.isArray(value) ? value : [];
  const columns = getTableColumns(section, rows);
  const headerRowNumber = 5;
  const firstDataRowNumber = headerRowNumber + 1;
  const hasRows = rows.length > 0;
  const bodyRows = hasRows
    ? rows.map((row) => columns.map((column) => normalizeCellValue(column, row[column])))
    : [columns.map((_, idx) => (idx === 0 ? "No entries submitted" : ""))];
  const lastDataRowNumber = firstDataRowNumber + bodyRows.length - 1;
  const amountColumnIndexes = columns
    .map((column, idx) => (isAmountColumn(column) ? idx : -1))
    .filter((idx) => idx >= 0);

  const data: any[][] = [
    [section.title],
    ["Report", `${report.departmentName} - ${report.weekLabel}`, "Submitted By", report.departmentHeadName],
    ["Section Notes", section.description || ""],
    [],
    columns,
    ...bodyRows,
  ];

  if (hasRows && amountColumnIndexes.length > 0) {
    const totalRow = columns.map((_, idx) => {
      if (idx === 0) return "Total";
      if (!amountColumnIndexes.includes(idx)) return "";
      const col = XLSX.utils.encode_col(idx);
      return { f: `SUM(${col}${firstDataRowNumber}:${col}${lastDataRowNumber})`, t: "n" };
    });
    data.push(totalRow);
  }

  const ws = XLSX.utils.aoa_to_sheet(data, { cellDates: true });
  const lastCol = Math.max(0, columns.length - 1);
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 2, c: 1 }, e: { r: 2, c: lastCol } },
  ];
  ws["!cols"] = calculateColumnWidths([columns, ...bodyRows], columns);
  ws["!rows"] = [{ hpt: 28 }, {}, { hpt: 30 }, {}, { hpt: 24 }];
  ws["!autofilter"] = {
    ref: `A${headerRowNumber}:${XLSX.utils.encode_col(lastCol)}${lastDataRowNumber}`,
  };

  const titleCell = ws["A1"] as any;
  if (titleCell && section.description) {
    titleCell.c = [{ a: "E-Cell", t: section.description }];
  }
  styleRow(ws, 1, lastCol, workbookStyles.title);
  styleMetadataRows(ws, [2, 3]);
  styleRow(ws, headerRowNumber, lastCol, workbookStyles.tableHeader);
  for (let row = firstDataRowNumber; row <= lastDataRowNumber; row += 1) {
    for (let col = 0; col <= lastCol; col += 1) {
      styleCell(ws, XLSX.utils.encode_cell({ r: row - 1, c: col }), workbookStyles.wrap);
    }
  }
  if (data.length > lastDataRowNumber) {
    styleRow(ws, data.length, lastCol, workbookStyles.total);
  }
  applyColumnNumberFormats(ws, columns, firstDataRowNumber, hasRows ? lastDataRowNumber : firstDataRowNumber);
  return ws;
}

function buildFeedbackSheet(report: any, enabledSections: any[], comments: any[]) {
  const sectionTitles = new Map(enabledSections.map((section) => [section.key, section.title]));
  const sortedComments = [...comments].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const data = [
    ["Feedback & Review Notes"],
    ["Department", report.departmentName, "Week", report.weekLabel],
    ["Submitted By", report.departmentHeadName, "Generated", new Date()],
    [],
    ["Section", "Thread", "Tag", "Status", "Author", "Created", "Comment"],
    ...sortedComments.map((comment) => [
      sectionTitles.get(comment.sectionKey) || labelize(comment.sectionKey),
      comment.parentId ? "Reply" : "Comment",
      comment.tag || "Note",
      comment.resolved ? "Resolved" : "Open",
      comment.authorName,
      comment.createdAt ? new Date(comment.createdAt) : "",
      comment.text,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(data, { cellDates: true });
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];
  ws["!cols"] = [
    { wch: 30 },
    { wch: 12 },
    { wch: 18 },
    { wch: 12 },
    { wch: 24 },
    { wch: 20 },
    { wch: 80 },
  ];
  ws["!autofilter"] = { ref: `A5:G${Math.max(5, data.length)}` };
  styleRow(ws, 1, 6, workbookStyles.title);
  styleRow(ws, 5, 6, workbookStyles.tableHeader);
  styleMetadataRows(ws, [2, 3]);
  for (let row = 6; row <= data.length; row += 1) {
    const createdCell = ws[`F${row}`] as any;
    if (createdCell) createdCell.z = "yyyy-mm-dd hh:mm";
    styleCell(ws, `G${row}`, workbookStyles.wrap);
  }
  return ws;
}

function buildMetricRows(section: any, value: any) {
  if (!value || typeof value !== "object") return [];
  const rows = Object.entries(value as Record<string, any>)
    .filter(([key]) => key !== "_analysis")
    .map(([key, rawValue]) => [section.title, key, normalizeMetricValue(key, rawValue), ""]);
  if (value._analysis) rows.push([section.title, "Analysis", "", cleanText(value._analysis)]);
  return rows;
}

function buildNarrativeRows(section: any, value: any) {
  if (isEmptyValue(value)) return [[section.title, "Status", "No data provided"]];
  if (section.type === "textarea") return [[section.title, "Details", cleanText(value)]];
  if (section.type === "textarea_multi" || section.type === "header") {
    return Object.entries(value as Record<string, any>)
      .filter(([, entryValue]) => !isEmptyValue(entryValue))
      .map(([key, entryValue]) => [section.title, labelize(key), cleanText(entryValue)]);
  }
  if (section.type === "performance_quadrant") {
    const rows = Object.entries(value as Record<string, any>)
      .filter(([key, entryValue]) => !key.startsWith("_") && !isEmptyValue(entryValue))
      .map(([key, entryValue]) => [section.title, labelize(key), cleanText(entryValue)]);
    if (!isEmptyValue(value._communication)) {
      rows.push([section.title, "Communication Effectiveness", cleanText(value._communication)]);
    }
    return rows.length > 0 ? rows : [[section.title, "Status", "No data provided"]];
  }
  return [[section.title, "Details", cleanText(value)]];
}

function getTableColumns(section: any, rows: any[]) {
  const configuredColumns = Array.isArray(section.config?.columns)
    ? section.config.columns.filter(Boolean)
    : [];
  const rowColumns = rows.flatMap((row) => Object.keys(row || {}).filter((key) => key !== "id"));
  const uniqueColumns = [...configuredColumns, ...rowColumns].reduce<string[]>((columns, column) => {
    if (!columns.includes(column)) columns.push(column);
    return columns;
  }, []);
  if (uniqueColumns.length > 0) return uniqueColumns;
  return section.type === "dynamic_table" ? ["Item", "Owner", "Status", "Notes"] : ["Item", "Amount", "Status", "Notes"];
}

function getSectionStatus(section: any, value: any) {
  if (TABLE_SECTION_TYPES.has(section.type)) return Array.isArray(value) && value.length > 0 ? "Complete" : "No rows";
  return isEmptyValue(value) ? "No data" : "Complete";
}

function getSectionRecordCount(section: any, value: any) {
  if (TABLE_SECTION_TYPES.has(section.type)) return Array.isArray(value) ? value.length : 0;
  if (section.type === "metrics_grid" && value && typeof value === "object") {
    return Object.keys(value).filter((key) => key !== "_analysis" && !isEmptyValue(value[key])).length;
  }
  if (typeof value === "object" && value !== null) {
    return Object.values(value).filter((entry) => !isEmptyValue(entry)).length;
  }
  return isEmptyValue(value) ? 0 : 1;
}

function normalizeCellValue(column: string, value: any) {
  if (isEmptyValue(value)) return "";
  if (value instanceof Date) return value;
  if (isDateColumn(column)) {
    const date = parseDateLike(value);
    if (date) return date;
  }
  if (isAmountColumn(column) || isNumericColumn(column) || isPercentColumn(column)) {
    const parsed = parseNumberLike(value);
    if (parsed !== null) return isPercentColumn(column) ? normalizePercent(value, parsed) : parsed;
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function normalizeMetricValue(label: string, value: any) {
  if (isEmptyValue(value)) return "";
  const parsed = parseNumberLike(value);
  if (parsed === null) return cleanText(value);
  return isPercentColumn(label) ? normalizePercent(value, parsed) : parsed;
}

function normalizePercent(rawValue: any, parsed: number) {
  if (typeof rawValue === "string" && rawValue.trim().endsWith("%")) return parsed / 100;
  return parsed > 1 ? parsed / 100 : parsed;
}

function applyColumnNumberFormats(ws: XLSX.WorkSheet, columns: string[], startRow: number, endRow: number) {
  columns.forEach((column, columnIndex) => {
    for (let row = startRow; row <= endRow; row += 1) {
      const cell = ws[XLSX.utils.encode_cell({ r: row - 1, c: columnIndex })] as any;
      if (!cell) continue;
      if (isDateColumn(column) && cell.v instanceof Date) cell.z = "yyyy-mm-dd";
      else if (isPercentColumn(column) && typeof cell.v === "number") cell.z = "0.0%";
      else if (isAmountColumn(column) && typeof cell.v === "number") cell.z = '"₹"#,##0;[Red]-"₹"#,##0';
      else if (typeof cell.v === "number") cell.z = "#,##0.##";
    }
  });
}

function calculateColumnWidths(rows: any[][], columns: string[]) {
  return columns.map((column, idx) => {
    const maxLength = rows.reduce((max, row) => {
      const value = row[idx];
      const displayValue = typeof value === "object" && value?.f ? value.f : value;
      return Math.max(max, longestLineLength(displayValue));
    }, longestLineLength(column));
    return { wch: Math.min(Math.max(maxLength + 3, 14), 48) };
  });
}

function styleMetadataRows(ws: XLSX.WorkSheet, rows: number[]) {
  rows.forEach((row) => {
    styleCell(ws, `A${row}`, workbookStyles.label);
    styleCell(ws, `C${row}`, workbookStyles.label);
  });
}

function styleRow(ws: XLSX.WorkSheet, row: number, lastCol: number, style: any) {
  for (let col = 0; col <= lastCol; col += 1) {
    styleCell(ws, XLSX.utils.encode_cell({ r: row - 1, c: col }), style);
  }
}

function styleCell(ws: XLSX.WorkSheet, address: string, style: any) {
  const cell = ws[address] as any;
  if (!cell) return;
  cell.s = { ...(cell.s || {}), ...style };
}

function makeUniqueSheetName(title: string, existing: Set<string>) {
  const cleaned = (title || "Sheet").replace(/[\\/?*\[\]:]/g, " ").replace(/\s+/g, " ").trim() || "Sheet";
  let base = cleaned.slice(0, 31);
  let candidate = base;
  let index = 2;
  while (existing.has(candidate)) {
    const suffix = ` ${index}`;
    base = cleaned.slice(0, 31 - suffix.length);
    candidate = `${base}${suffix}`;
    index += 1;
  }
  existing.add(candidate);
  return candidate;
}

function toFileSlug(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function labelize(value: string) {
  return String(value || "")
    .replace(/^_+/, "")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function cleanText(value: any) {
  if (isEmptyValue(value)) return "";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value).trim();
}

function isEmptyValue(value: any) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

function longestLineLength(value: any) {
  if (isEmptyValue(value)) return 0;
  return String(value)
    .split(/\r?\n/)
    .reduce((max, line) => Math.max(max, line.length), 0);
}

function parseNumberLike(value: any) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[₹,%\s]/g, "").replace(/,/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
}

function parseDateLike(value: any) {
  if (value instanceof Date) return value;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isAmountColumn(column: string) {
  return /amount|budget|expense|cost|price|revenue|invoice|reimbursement/i.test(column);
}

function isDateColumn(column: string) {
  return /date|deadline|week/i.test(column);
}

function isPercentColumn(column: string) {
  return /%|percent|percentage|rate/i.test(column);
}

function isNumericColumn(column: string) {
  return /count|total|number|qty|quantity|hours|sent|calls|meetings|closed|fixed|merged|logged|opened|published|reach|followers|registrations|volunteers/i.test(column);
}

function SectionViewer({ section, value }: { section: any; value: any }) {
  if (!value || (typeof value === "string" && !value.trim()) || (Array.isArray(value) && value.length === 0)) {
    return <p className="text-sm text-text-tertiary italic">No data provided.</p>;
  }
  if (section.type === "textarea") return <p className="text-sm text-text-secondary whitespace-pre-wrap">{value}</p>;
  if (section.type === "textarea_multi") {
    return (
      <div className="space-y-3">
        {Object.entries(value as Record<string,string>).filter(([,v])=>v).map(([k, v]) => (
          <div key={k}><span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">{k}</span><p className="text-sm text-text-secondary mt-1 whitespace-pre-wrap">{v as string}</p></div>
        ))}
      </div>
    );
  }
  if (section.type === "metrics_grid") {
    const metrics = Object.entries(value as Record<string,any>).filter(([k]) => k !== "_analysis");
    return (
      <div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {metrics.map(([k, v]) => (
            <div key={k} className="p-4 rounded-xl border border-border-light bg-bg-primary">
              <div className="text-xs text-text-tertiary uppercase tracking-wide mb-1">{k}</div>
              <div className="text-xl font-semibold text-text-primary">{v || 0}</div>
            </div>
          ))}
        </div>
        {value._analysis && <div className="mt-4 p-4 rounded-xl bg-brand-light/30 border border-brand/10"><p className="text-sm text-brand-mid">{value._analysis}</p></div>}
      </div>
    );
  }
  if (section.type === "dynamic_table" || section.type === "budget_table" || section.type === "campaign_table") {
    const rows = value as any[];
    if (rows.length === 0) return <p className="text-sm text-text-tertiary italic">No entries.</p>;
    const cols = Object.keys(rows[0]).filter(k => k !== "id");
    return (
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead><tr className="bg-bg-tertiary">{cols.map(c => <th key={c} className="px-3 py-2.5 text-left font-medium text-text-secondary">{c}</th>)}</tr></thead>
          <tbody>{rows.map((row, i) => (
            <tr key={i} className="border-t border-border-light">
              {cols.map(c => <td key={c} className="px-3 py-2.5 text-text-secondary">{renderCellValue(c, row[c])}</td>)}
            </tr>
          ))}</tbody>
        </table>
      </div>
    );
  }
  if (section.type === "performance_quadrant") {
    return (
      <div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          {Object.entries(value as Record<string,string>).filter(([k])=>!k.startsWith("_")&&value[k]).map(([k,v])=>(
            <div key={k} className="p-4 rounded-xl border border-border-light bg-bg-primary">
              <span className="text-xs font-medium text-text-tertiary">{k}</span>
              <p className="text-sm text-text-secondary mt-1">{v as string}</p>
            </div>
          ))}
        </div>
        {value._communication && <div><span className="text-xs font-medium text-text-tertiary">Communication Effectiveness</span><p className="text-sm text-text-secondary mt-1">{value._communication}</p></div>}
      </div>
    );
  }
  if (section.type === "header") {
    return (
      <div className="grid sm:grid-cols-2 gap-3">
        {Object.entries(value as Record<string,string>).filter(([,v])=>v).map(([k,v])=>(
          <div key={k}><span className="text-xs text-text-tertiary capitalize">{k.replace(/([A-Z])/g,' $1')}</span><p className="text-sm font-medium text-text-primary">{v as string}</p></div>
        ))}
      </div>
    );
  }
  return <p className="text-sm text-text-secondary">{JSON.stringify(value)}</p>;
}

function renderCellValue(col: string, val: string) {
  const statusColors: Record<string,string> = { Completed:"bg-success-bg text-success-text", "In Progress":"bg-info-light text-info", Pending:"bg-warn-light text-warn", Delayed:"bg-danger-light text-danger", Excellent:"bg-success-bg text-success-text", Good:"bg-info-light text-info", Moderate:"bg-warn-light text-warn", Low:"bg-danger-light text-danger" };
  if ((col.toLowerCase()==="status"||col.toLowerCase().includes("participation")) && statusColors[val]) {
    return <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${statusColors[val]}`}>{val}</span>;
  }
  return val || "—";
}

function CommentThread({ comment, replies }: { comment: any; replies: any[] }) {
  const tagColors: Record<string,string> = { "Action Required":"bg-danger-light text-danger", "Good Work":"bg-success-bg text-success-text", "Follow Up":"bg-warn-light text-warn", Note:"bg-info-light text-info" };
  return (
    <div className="space-y-2">
      <div className="p-3 rounded-xl bg-bg-tertiary">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-text-primary">{comment.authorName}</span>
          {comment.tag && <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${tagColors[comment.tag]||""}`}>{comment.tag}</span>}
          <span className="text-[10px] text-text-tertiary">{new Date(comment.createdAt).toLocaleString()}</span>
        </div>
        <p className="text-sm text-text-secondary">{comment.text}</p>
      </div>
      {replies.map(r => (
        <div key={r._id} className="ml-6 p-3 rounded-xl bg-purple-light/50">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-text-primary">{r.authorName}</span>
            <span className="text-[10px] text-text-tertiary">{new Date(r.createdAt).toLocaleString()}</span>
          </div>
          <p className="text-sm text-text-secondary">{r.text}</p>
        </div>
      ))}
    </div>
  );
}

function AddComment({ reportId, sectionKey }: { reportId: Id<"reports">; sectionKey: string }) {
  const { user } = useUser();
  const convexUser = useQuery(api.users.getByClerkId, user?.id ? { clerkId: user.id } : "skip");
  const addComment = useMutation(api.comments.add);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [tag, setTag] = useState<string>("");

  const handleSubmit = async () => {
    if (!text.trim() || !user || !convexUser) return;
    await addComment({
      reportId, sectionKey,
      authorClerkId: user.id,
      authorName: convexUser.name,
      text: text.trim(),
      tag: tag ? tag as any : undefined,
    });
    setText(""); setTag(""); setOpen(false);
  };

  if (!open) return <button onClick={() => setOpen(true)} className="mt-3 text-xs text-purple font-medium hover:underline flex items-center gap-1"><MessageSquare size={12} /> Add Feedback</button>;
  return (
    <div className="mt-3 p-4 rounded-xl border border-purple/20 bg-purple-light/30">
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Write feedback..." rows={2} className="w-full px-3 py-2 rounded-lg border border-border-light bg-white text-sm focus:outline-none focus:border-purple mb-2" />
      <div className="flex items-center gap-2">
        <select value={tag} onChange={e => setTag(e.target.value)} className="px-2 py-1.5 rounded-lg border border-border-light text-xs">
          <option value="">No tag</option>
          <option>Action Required</option><option>Good Work</option><option>Follow Up</option><option>Note</option>
        </select>
        <div className="flex-1" />
        <button onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-lg text-xs text-text-tertiary hover:bg-bg-tertiary">Cancel</button>
        <button onClick={handleSubmit} disabled={!text.trim()} className="px-3 py-1.5 rounded-lg bg-purple text-white text-xs font-medium hover:bg-purple/80 disabled:opacity-50"><Send size={11} className="inline mr-1" />Send</button>
      </div>
    </div>
  );
}
