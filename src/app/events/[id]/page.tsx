"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  FileText,
  CheckCircle,
  Copy,
  QrCode,
  Download,
  Lock,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  FileDown,
  Printer,
} from "lucide-react";
import { CSIEvent } from "@/lib/types";
import { getStoredEvents } from "@/lib/eventsStorage";

export default function EventContainerPage() {
  const params = useParams();
  const eventId = params?.id as string;

  const [event, setEvent] = useState<CSIEvent | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Easter Egg State
  const [isEasterEggOpen, setIsEasterEggOpen] = useState(false);
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [easterEggError, setEasterEggError] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    const all = getStoredEvents();
    const found = all.find((e) => e.id === eventId);
    if (found) {
      setEvent(found);
    }
  }, [eventId]);

  if (!event) {
    return (
      <div className="p-12 text-center space-y-4">
        <p className="text-slate-400 text-base">Event not found or still loading...</p>
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-sm font-bold text-purple-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Events Archive
        </Link>
      </div>
    );
  }

  const copyToClipboard = (text: string, sectionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const branchesString =
    event.target_branches && event.target_branches.length > 0
      ? event.target_branches.join(", ")
      : "All Branches";

  const mockRegUrl = `https://forms.gle/csi-${event.id}`;
  const mockBitlyUrl = `https://bit.ly/csi-${event.event_name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8)}`;
  const mockFeedbackUrl = `https://forms.gle/csi-feedback-${event.id}`;

  // Generated RSMS Notice text
  const rsmsNoticeText = `*COMPUTER SOCIETY OF INDIA (CSI)*
Student Branch Chapter

*NOTICE - ${event.event_name.toUpperCase()}*

Dear Students,
CSI Student Branch is organizing "${event.event_name}" on ${event.event_date}.

📍 *Venue:* ${event.venue} (${event.mode})
⏰ *Time:* ${event.time_start || "01:30 PM"} - ${event.time_end || "04:30 PM"}
🎯 *Eligible Branches:* ${branchesString}

*Brief Overview:*
${event.brief_description || "Join us for an exciting technical challenge and interactive session."}

🔗 *Register Here:* ${mockBitlyUrl}

*Student Coordinators:*
${event.assigned_coordinators.length > 0 ? event.assigned_coordinators.map((c) => `• ${c}`).join("\n") : "• CSI Core Team"}

Faculty In-Charge: ${event.faculty_in_charge || "Dr. Binu A (Faculty Advisor)"}`;

  // Generated Permission Letter text
  const permissionLetterText = `To,
The Head of the Department / Principal
Subject: Request for permission to conduct "${event.event_name}"

Respected Sir/Madam,

The Computer Society of India (CSI) Student Branch requests official permission to organize "${event.event_name}" on ${event.event_date}.

Event Details:
- Date: ${event.event_date}
- Time: ${event.time_start || "01:30 PM"} to ${event.time_end || "04:30 PM"}
- Mode / Venue: ${event.mode} - ${event.venue}
- Target Branches: ${branchesString}
- Expected Attendees: 60-80 students
- Student Coordinators: ${event.assigned_coordinators.join(", ") || "CSI Executive Committee"}

We request your kind approval for the venue and audio-visual arrangements.

Sincerely,
${event.faculty_in_charge || "Dr. Binu A (Faculty Advisor, CSI Student Branch)"}`;

  // Download as Word (.doc)
  const downloadWordDoc = (title: string, content: string) => {
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>${title}</title>
    <style>
      body { font-family: 'Calibri', sans-serif; font-size: 12pt; line-height: 1.6; color: #000; margin: 40px; }
      h1 { font-size: 16pt; font-weight: bold; text-align: center; margin-bottom: 20px; }
      pre { font-family: 'Calibri', sans-serif; white-space: pre-wrap; font-size: 11pt; }
    </style></head><body>`;
    const footer = `</body></html>`;
    const sourceHTML = header + `<h1>${title}</h1><pre>${content}</pre>` + footer;

    const blob = new Blob(["\ufeff", sourceHTML], {
      type: "application/msword",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download as PDF (Printable View)
  const downloadPDF = (title: string, content: string) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to download/print PDF.");
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body {
              font-family: Arial, Helvetica, sans-serif;
              padding: 40px;
              color: #111;
              line-height: 1.6;
              font-size: 14px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #2563EB;
              padding-bottom: 15px;
              margin-bottom: 25px;
            }
            .header h2 { margin: 0; color: #1E3A8A; font-size: 20px; text-transform: uppercase; }
            .header p { margin: 5px 0 0 0; color: #555; font-size: 13px; }
            pre {
              white-space: pre-wrap;
              font-family: inherit;
              font-size: 13px;
              line-height: 1.7;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>COMPUTER SOCIETY OF INDIA (CSI)</h2>
            <p>Student Branch Chapter • Official Document</p>
          </div>
          <pre>${content}</pre>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleEasterEggUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (securityAnswer.trim().toLowerCase() === "bayern munich") {
      setIsUnlocked(true);
      setEasterEggError(false);
    } else {
      setEasterEggError(true);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-csi-border pb-6">
        <div className="flex items-center space-x-4">
          <Link
            href="/events"
            className="w-10 h-10 rounded-xl bg-black border border-purple-500/30 flex items-center justify-center text-slate-300 hover:text-white hover:border-purple-400 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-extrabold text-white tracking-tight">{event.event_name}</h1>
              <span className="text-xs px-3 py-1 rounded-full font-bold bg-green-500/20 text-green-300 border border-green-500/40 capitalize">
                {event.status}
              </span>
              <span className="text-xs px-3 py-1 rounded-full font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                {event.mode}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Event Container ID: <span className="font-mono text-purple-300 font-semibold">{event.id}</span>
            </p>
          </div>
        </div>

        {/* Easter Egg Trigger */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEasterEggOpen(true)}
            title="System Diagnostics (Secret)"
            className="p-2 text-slate-700 hover:text-slate-400 transition rounded-lg opacity-40 hover:opacity-100"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Event Overview Card with Larger Fonts */}
      <div className="bg-[#12101C] rounded-2xl border border-purple-500/30 p-6 space-y-5 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-black border border-purple-500/30 flex items-center justify-center text-purple-300">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Event Date</p>
              <p className="text-sm font-bold text-white mt-0.5">{event.event_date}</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-black border border-purple-500/30 flex items-center justify-center text-cyan-300">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Time</p>
              <p className="text-sm font-bold text-white mt-0.5">{event.time_start || "01:30 PM"} - {event.time_end || "04:30 PM"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-black border border-purple-500/30 flex items-center justify-center text-amber-300">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Venue</p>
              <p className="text-sm font-bold text-white mt-0.5">{event.venue}</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-black border border-purple-500/30 flex items-center justify-center text-emerald-300">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Coordinators</p>
              <p className="text-sm font-bold text-white mt-0.5">
                {event.assigned_coordinators.length} of {event.required_coordinators} assigned
              </p>
            </div>
          </div>
        </div>

        {/* Assigned Coordinators */}
        <div className="pt-4 border-t border-purple-500/20 flex flex-wrap items-center gap-2.5">
          <span className="text-sm font-semibold text-slate-300">Assigned Team:</span>
          {event.assigned_coordinators.length > 0 ? (
            event.assigned_coordinators.map((name) => (
              <span
                key={name}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-900/40 text-purple-200 border border-purple-500/40"
              >
                {name}
              </span>
            ))
          ) : (
            <span className="text-sm text-amber-400 italic">No coordinators assigned yet</span>
          )}
        </div>

        {/* Target Branches */}
        <div className="pt-2 flex flex-wrap items-center gap-2.5">
          <span className="text-sm font-semibold text-slate-300">Eligible Branches:</span>
          {event.target_branches && event.target_branches.length > 0 ? (
            event.target_branches.map((b) => (
              <span
                key={b}
                className="px-2.5 py-1 rounded-md text-xs font-bold bg-cyan-950/70 text-cyan-300 border border-cyan-500/40 font-mono"
              >
                {b}
              </span>
            ))
          ) : (
            <span className="text-sm text-slate-400 italic">All Branches</span>
          )}
        </div>
      </div>

      {/* Auto-Generated Documents Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <Sparkles className="w-6 h-6 text-purple-400" />
          Auto-Generated Documents &amp; Operations Pipeline
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LINE 4: RSMS Notice */}
          <div className="bg-[#12101C] rounded-2xl border border-purple-500/30 p-6 space-y-4 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <span className="text-sm font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-400" />
                  Line 4: RSMS Notice (With Bitly Link)
                </span>

                {/* Document Actions */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => copyToClipboard(rsmsNoticeText, "rsms")}
                    className="px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-xs font-bold flex items-center gap-1.5 transition border border-purple-500/30"
                  >
                    {copiedSection === "rsms" ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSection === "rsms" ? "Copied!" : "Copy RSMS"}</span>
                  </button>
                  <button
                    onClick={() => downloadPDF(`RSMS_Notice_${event.event_name}`, rsmsNoticeText)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 transition"
                    title="Print or Save as PDF"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>
                  <button
                    onClick={() => downloadWordDoc(`RSMS_Notice_${event.event_name}`, rsmsNoticeText)}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-900/40 hover:bg-blue-800/60 text-blue-200 border border-blue-500/40 text-xs font-bold flex items-center gap-1 transition"
                    title="Download as Microsoft Word"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Word</span>
                  </button>
                </div>
              </div>

              <p className="text-sm text-slate-400 mb-3 leading-relaxed">
                Pre-formatted notice with coordinator contacts and shortened Bitly registration link.
              </p>

              {/* Large 18px font preview in Inter */}
              <pre className="bg-black p-5 rounded-xl border border-purple-500/40 text-[18px] text-white whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed shadow-inner">
                {rsmsNoticeText}
              </pre>
            </div>

            <div className="pt-3 border-t border-purple-500/20 text-xs text-slate-400">
              Bitly shortlink embedded: <strong className="text-cyan-300 font-mono">{mockBitlyUrl}</strong>
            </div>
          </div>

          {/* LINE 3: Permission Letter */}
          <div className="bg-[#12101C] rounded-2xl border border-purple-500/30 p-6 space-y-4 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <span className="text-sm font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  Line 3: Permission Letter to HOD / Principal
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => copyToClipboard(permissionLetterText, "perm")}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 text-xs font-bold flex items-center gap-1.5 transition border border-cyan-500/30"
                  >
                    {copiedSection === "perm" ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSection === "perm" ? "Copied!" : "Copy Letter"}</span>
                  </button>
                  <button
                    onClick={() => downloadPDF(`Permission_Letter_${event.event_name}`, permissionLetterText)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 transition"
                    title="Print or Save as PDF"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>
                  <button
                    onClick={() => downloadWordDoc(`Permission_Letter_${event.event_name}`, permissionLetterText)}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-900/40 hover:bg-blue-800/60 text-blue-200 border border-blue-500/40 text-xs font-bold flex items-center gap-1 transition"
                    title="Download as Microsoft Word"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Word</span>
                  </button>
                </div>
              </div>

              <p className="text-sm text-slate-400 mb-3 leading-relaxed">
                Official formal permission letter dynamically citing dates, venue, and designated coordinators.
              </p>

              {/* Large 18px font preview in Inter */}
              <pre className="bg-black p-5 rounded-xl border border-purple-500/40 text-[18px] text-white whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed shadow-inner">
                {permissionLetterText}
              </pre>
            </div>

            <div className="pt-3 border-t border-purple-500/20 text-xs text-slate-400">
              Official KTU / College Management Compliant Letter
            </div>
          </div>

          {/* LINE 1: Registration Form */}
          <div className="bg-[#12101C] rounded-2xl border border-purple-500/30 p-6 space-y-4 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-amber-400" />
                  Line 1: Registration Form
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  Ready
                </span>
              </div>
              <p className="text-sm text-slate-400 mb-3 leading-relaxed">
                Standardized form schema with mandatory fields (Name, Roll No, Branch, Year, Phone, CSI Membership).
              </p>
              <div className="bg-black p-4 rounded-xl border border-purple-500/30 space-y-3 text-sm">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Standard College Fields:</span>
                  <span className="text-white font-mono font-bold">6 Required Questions</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Target Branches:</span>
                  <span className="text-cyan-300 font-bold font-mono">{branchesString}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Public Form Link:</span>
                  <span className="text-cyan-400 font-mono truncate max-w-[200px]">{mockRegUrl}</span>
                </div>
              </div>
            </div>
            <div className="pt-3 border-t border-purple-500/20 flex items-center justify-between">
              <button
                onClick={() => copyToClipboard(mockRegUrl, "regUrl")}
                className="text-sm text-purple-300 hover:text-white font-bold underline"
              >
                {copiedSection === "regUrl" ? "Copied Link!" : "Copy Public Link"}
              </button>
            </div>
          </div>

          {/* LINE 2: Feedback Form & QR Code */}
          <div className="bg-[#12101C] rounded-2xl border border-purple-500/30 p-6 space-y-4 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-pink-300 uppercase tracking-wider flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-pink-400" />
                  Line 2: Feedback Form &amp; QR Code
                </span>
              </div>
              <p className="text-sm text-slate-400 mb-3 leading-relaxed">
                QR Code redirecting to the feedback form (ready to display on a projector screen or print).
              </p>
              <div className="flex items-center gap-5 bg-black p-4 rounded-xl border border-purple-500/30">
                <div className="w-24 h-24 bg-white p-2 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
                  <QrCode className="w-20 h-20 text-black" />
                </div>
                <div className="space-y-1.5 text-sm">
                  <p className="font-bold text-white text-base">Projector Display Ready</p>
                  <p className="text-slate-400 text-xs">Directs attendees to official feedback survey.</p>
                  <p className="text-cyan-300 font-mono text-xs truncate max-w-[200px]">{mockFeedbackUrl}</p>
                </div>
              </div>
            </div>
            <div className="pt-3 border-t border-purple-500/20 flex items-center justify-between">
              <button
                onClick={() => copyToClipboard(mockFeedbackUrl, "feedUrl")}
                className="text-sm text-pink-300 hover:text-white font-bold underline"
              >
                {copiedSection === "feedUrl" ? "Copied URL!" : "Copy Feedback URL"}
              </button>
            </div>
          </div>
        </div>

        {/* LINE 5: Offline Attendance Sheet */}
        {event.mode === "Offline" && (
          <div className="bg-[#12101C] rounded-2xl border border-purple-500/30 p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Line 5: Offline Attendance Sheet (Printable)
                </h3>
                <p className="text-sm text-slate-400 mt-0.5">
                  Pre-formatted attendance roster with Event Title, Venue ({event.venue}), Date, and signature columns.
                </p>
              </div>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 text-xs font-bold flex items-center gap-2 transition border border-emerald-500/30 self-start sm:self-auto"
              >
                <Printer className="w-4 h-4" />
                <span>Print Attendance Sheet</span>
              </button>
            </div>

            <div className="bg-black p-4 rounded-xl border border-purple-500/30 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="py-2.5 px-3">Sl No</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Roll No</th>
                    <th className="py-2.5 px-3">Branch</th>
                    <th className="py-2.5 px-3">Forenoon (FN) Sign</th>
                    <th className="py-2.5 px-3">Afternoon (AN) Sign</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300 divide-y divide-slate-800/60 font-mono">
                  {[1, 2, 3, 4, 5].map((row) => (
                    <tr key={row}>
                      <td className="py-3 px-3">{row}</td>
                      <td className="py-3 px-3">................................................</td>
                      <td className="py-3 px-3">....................</td>
                      <td className="py-3 px-3">....................</td>
                      <td className="py-3 px-3">__________</td>
                      <td className="py-3 px-3">__________</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ADMIN EASTER EGG MODAL */}
      {isEasterEggOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#12101C] border border-purple-500/40 w-full max-w-md rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
              <div className="flex items-center gap-2.5 text-white font-bold text-base">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                <span>Admin Privileged Gate</span>
              </div>
              <button
                onClick={() => {
                  setIsEasterEggOpen(false);
                  setIsUnlocked(false);
                  setSecurityAnswer("");
                  setEasterEggError(false);
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {!isUnlocked ? (
              <form onSubmit={handleEasterEggUnlock} className="space-y-4">
                <p className="text-sm text-slate-300 leading-relaxed">
                  Security verification required to unlock Coordinator Appreciation Certificate generation.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide">
                    Security Question: Favorite club?
                  </label>
                  <input
                    type="password"
                    placeholder="Enter secret answer..."
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-black border border-purple-500/50 text-sm text-white focus:outline-none focus:border-purple-400 font-medium"
                  />
                  {easterEggError && (
                    <p className="text-xs text-red-400 mt-1.5 font-semibold">Incorrect answer. Access restricted.</p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-purple-600/30 transition"
                >
                  Verify Admin Identity
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-medium">
                  ✓ Identity verified: Welcome, Admin! Official Coordinator Certificate module unlocked.
                </div>

                <div className="space-y-2.5 text-sm">
                  <p className="font-bold text-white">Assigned Coordinators for this event:</p>
                  {event.assigned_coordinators.map((name) => (
                    <div
                      key={name}
                      className="p-3 rounded-lg bg-black border border-purple-500/30 flex items-center justify-between"
                    >
                      <span className="text-white font-semibold">{name}</span>
                      <button
                        onClick={() => alert(`Generating Coordinator Appreciation Certificate for ${name} - ${event.event_name}`)}
                        className="px-3 py-1.5 rounded-md bg-purple-600/40 hover:bg-purple-600 text-purple-200 hover:text-white text-xs font-bold transition"
                      >
                        Generate Certificate
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
