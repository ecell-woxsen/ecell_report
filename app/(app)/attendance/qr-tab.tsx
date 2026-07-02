"use client";

import { QRCodeSVG } from "qrcode.react";
import { useState, useEffect } from "react";
import { Copy, Check, Printer, RefreshCw } from "lucide-react";

const DEFAULT_BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

function buildCheckinUrl(base: string) {
  const clean = base.replace(/\/$/, "");
  return `${clean}/checkin`;
}

export function QRTab() {
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [editingUrl, setEditingUrl] = useState(false);
  const [draftUrl, setDraftUrl] = useState(DEFAULT_BASE_URL);
  const [copied, setCopied] = useState(false);

  const checkinUrl = buildCheckinUrl(baseUrl);

  // Initialise from env on mount
  useEffect(() => {
    setBaseUrl(DEFAULT_BASE_URL);
    setDraftUrl(DEFAULT_BASE_URL);
  }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(checkinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyUrl = () => {
    setBaseUrl(draftUrl.trim() || DEFAULT_BASE_URL);
    setEditingUrl(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-[15px] font-semibold text-text-primary tracking-tight">
          Office QR Code
        </h2>
        <p className="text-text-tertiary text-[13px] mt-0.5">
          Print or screenshot this QR code and stick it on the office door.
          Members and visitors scan it to log their visit.
        </p>
      </div>

      {/* QR card — large and print-optimised */}
      <div className="card p-10 flex flex-col items-center gap-6 print:shadow-none print:border-none bg-white border border-border-light rounded-2xl">
        <div className="bg-white p-6 rounded-2xl border border-border-light shadow-sm">
          <QRCodeSVG
            id="office-qr-code"
            value={checkinUrl}
            size={260}
            bgColor="#ffffff"
            fgColor="#1A1D21"
            level="H"
            includeMargin={false}
          />
        </div>

        <div className="text-center space-y-1">
          <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-widest">
            E-Cell Office · Woxsen University
          </p>
          <p className="text-text-primary font-semibold text-[15px]">
            Scan to log your visit
          </p>
          <p className="text-text-tertiary text-[12px] font-mono break-all">
            {checkinUrl}
          </p>
        </div>

        {/* Controls — hidden in print */}
        <div className="flex flex-wrap gap-3 justify-center print:hidden">
          <button
            onClick={handleCopy}
            id="qr-copy-link-btn"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-[13px] font-medium text-text-secondary hover:bg-bg-tertiary transition-all"
          >
            {copied ? (
              <>
                <Check size={14} className="text-brand" /> Copied!
              </>
            ) : (
              <>
                <Copy size={14} /> Copy link
              </>
            )}
          </button>

          <button
            onClick={() => window.print()}
            id="qr-print-btn"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white text-[13px] font-medium hover:bg-brand-mid transition-all shadow-sm"
          >
            <Printer size={14} /> Print QR
          </button>

          <button
            onClick={() => {
              setEditingUrl(true);
              setDraftUrl(baseUrl);
            }}
            id="qr-change-url-btn"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-[13px] font-medium text-text-secondary hover:bg-bg-tertiary transition-all"
          >
            <RefreshCw size={14} /> Change URL
          </button>
        </div>

        {/* Inline URL editor */}
        {editingUrl && (
          <div className="print:hidden w-full max-w-md space-y-2 animate-fade-in">
            <label className="block text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
              Production base URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={draftUrl}
                onChange={(e) => setDraftUrl(e.target.value)}
                placeholder="https://ecell.woxsen.edu.in"
                className="flex-1 px-3.5 py-2 rounded-xl border border-border text-[13px] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand font-mono"
              />
              <button
                onClick={handleApplyUrl}
                className="px-4 py-2 rounded-xl bg-brand text-white text-[13px] font-medium hover:bg-brand-mid transition-all"
              >
                Apply
              </button>
              <button
                onClick={() => setEditingUrl(false)}
                className="px-4 py-2 rounded-xl border border-border text-[13px] text-text-secondary hover:bg-bg-tertiary transition-all"
              >
                Cancel
              </button>
            </div>
            <p className="text-[11px] text-text-tertiary">
              The QR code will encode{" "}
              <span className="font-mono">{buildCheckinUrl(draftUrl)}</span>
            </p>
          </div>
        )}
      </div>

      {/* Usage note */}
      <div className="card p-5 space-y-2 print:hidden bg-white border border-border-light rounded-2xl">
        <h2 className="text-[13px] font-semibold text-text-primary">
          How to use
        </h2>
        <ul className="text-[13px] text-text-secondary space-y-1 list-disc list-inside">
          <li>
            Click <strong>Print QR</strong> or take a screenshot and stick it
            near the office door.
          </li>
          <li>
            Members scan it with their phone, are prompted to sign in if needed,
            and their visit is automatically logged.
          </li>
          <li>
            Visitors fill in their name (and optionally their course) without
            needing an account.
          </li>
          <li>
            If your production URL ever changes, click{" "}
            <strong>Change URL</strong>, update it, and re-print.
          </li>
        </ul>
      </div>
    </div>
  );
}
