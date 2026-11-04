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
  Award,
  Download,
  Lock,
  ExternalLink,
  ShieldCheck,
  Sparkles,
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
      <div className="p-8 text-center space-y-4">
        <p className="text-csi-textMuted text-sm">Event not found or still loading...</p>
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-xs font-semibold text-csi-purpleLight hover:underline"
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

  // Mock auto-generated bitly link
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
🎯 *Target:* ${event.target_class || "All Students"}

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
- Target Audience: ${event.target_class}
- Expected Attendees: 60-80 students
- Student Coordinators: ${event.assigned_coordinators.join(", ") || "CSI Executive Committee"}

We request your kind approval for the venue and audio-visual arrangements.

Sincerely,
${event.faculty_in_charge || "Faculty Advisor, CSI Student Branch"}`;

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
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-csi-border pb-5">
        <div className="flex items-center space-x-3">
          <Link
            href="/events"
            className="w-9 h-9 rounded-lg bg-csi-surface border border-csi-border flex items-center justify-center text-csi-textDim hover:text-white hover:bg-csi-surfaceLight transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">{event.event_name}</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-green-500/20 text-green-400 border border-green-500/30 capitalize">
                {event.status}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {event.mode}
              </span>
            </div>
            <p className="text-xs text-csi-textDim mt-0.5">
              Event Container ID: <span className="font-mono text-csi-purpleLight">{event.id}</span>
            </p>
          </div>
        </div>

        {/* Secret Easter Egg Target */}
        <div className="flex items-center gap-2">
          {/* Invisible Admin Trigger (Easter Egg) */}
          <button
            onClick={() => setIsEasterEggOpen(true)}
            title="System Diagnostics (Secret)"
            className="p-1.5 text-csi-dark hover:text-csi-textDim/40 transition rounded opacity-30 hover:opacity-100"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Event Overview Card */}
      <div className="bg-csi-surface rounded-xl border border-csi-border p-5 space-y-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-csi-dark border border-csi-border flex items-center justify-center text-csi-purpleLight">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-csi-textDim uppercase tracking-wider font-semibold">Date</p>
              <p className="text-xs font-semibold text-white">{event.event_date}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-csi-dark border border-csi-border flex items-center justify-center text-cyan-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-csi-textDim uppercase tracking-wider font-semibold">Time</p>
              <p className="text-xs font-semibold text-white">{event.time_start || "01:30 PM"} - {event.time_end || "04:30 PM"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-csi-dark border border-csi-border flex items-center justify-center text-amber-400">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-csi-textDim uppercase tracking-wider font-semibold">Venue</p>
              <p className="text-xs font-semibold text-white">{event.venue}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-csi-dark border border-csi-border flex items-center justify-center text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-csi-textDim uppercase tracking-wider font-semibold">Coordinators</p>
              <p className="text-xs font-semibold text-white">
                {event.assigned_coordinators.length} of {event.required_coordinators} assigned
              </p>
            </div>
          </div>
        </div>

        {/* Assigned Coordinators Pills */}
        <div className="pt-3 border-t border-csi-border/70 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-csi-textMuted">Assigned Team:</span>
          {event.assigned_coordinators.length > 0 ? (
            event.assigned_coordinators.map((name) => (
              <span
                key={name}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-csi-purple/20 text-csi-purpleLight border border-csi-purple/30"
              >
                {name}
              </span>
            ))
          ) : (
            <span className="text-xs text-amber-400 italic">No coordinators assigned yet</span>
          )}
        </div>
      </div>

      {/* The 4-in-1 Generated Document Containers */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-csi-purpleLight" />
          Auto-Generated Documents &amp; Operations Pipeline
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LINE 1 & 4: RSMS Notice with Bitly link */}
          <div className="bg-csi-surface rounded-xl border border-csi-border p-5 space-y-3 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-csi-purpleLight uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  Line 4: RSMS Notice (With Bitly Link)
                </span>
                <button
                  onClick={() => copyToClipboard(rsmsNoticeText, "rsms")}
                  className="px-2.5 py-1 rounded bg-csi-purple/20 hover:bg-csi-purple/30 text-csi-purpleLight text-xs font-medium flex items-center gap-1.5 transition"
                >
                  {copiedSection === "rsms" ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSection === "rsms" ? "Copied!" : "Copy RSMS"}</span>
                </button>
              </div>
              <p className="text-xs text-csi-textDim mb-3">
                Pre-formatted circular text with coordinator names and Bitly link ready for college SMS/portal broadcast.
              </p>
              <pre className="bg-csi-dark p-3.5 rounded-lg border border-csi-border text-[11px] text-csi-text font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                {rsmsNoticeText}
              </pre>
            </div>
            <div className="pt-3 border-t border-csi-border/70 flex items-center justify-between text-xs text-csi-textDim">
              <span>Bitly shortlink embedded: <strong className="text-cyan-400">{mockBitlyUrl}</strong></span>
            </div>
          </div>

          {/* LINE 3: Permission Letter */}
          <div className="bg-csi-surface rounded-xl border border-csi-border p-5 space-y-3 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  Line 3: Permission Letter to HOD / Principal
                </span>
                <button
                  onClick={() => copyToClipboard(permissionLetterText, "perm")}
                  className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-medium flex items-center gap-1.5 transition"
                >
                  {copiedSection === "perm" ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSection === "perm" ? "Copied!" : "Copy Letter"}</span>
                </button>
              </div>
              <p className="text-xs text-csi-textDim mb-3">
                Official formal permission letter dynamically citing dates, venue, and designated coordinators.
              </p>
              <pre className="bg-csi-dark p-3.5 rounded-lg border border-csi-border text-[11px] text-csi-text font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                {permissionLetterText}
              </pre>
            </div>
            <div className="pt-3 border-t border-csi-border/70 flex items-center justify-between text-xs text-csi-textDim">
              <span>Official Letter Format (KTU / College Compliant)</span>
            </div>
          </div>

          {/* LINE 1: Registration Form Details */}
          <div className="bg-csi-surface rounded-xl border border-csi-border p-5 space-y-3 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ExternalLink className="w-4 h-4" />
                  Line 1: Registration Form
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">
                  Active
                </span>
              </div>
              <p className="text-xs text-csi-textDim mb-3">
                Pre-configured form with mandatory fields (Name, Roll No, Branch, Year, Phone, CSI Membership).
              </p>
              <div className="bg-csi-dark p-3 rounded-lg border border-csi-border space-y-2 text-xs">
                <div className="flex items-center justify-between text-csi-textMuted">
                  <span>Standard College Fields:</span>
                  <span className="text-white font-mono">6 Required Questions</span>
                </div>
                <div className="flex items-center justify-between text-csi-textMuted">
                  <span>Public Registration Link:</span>
                  <span className="text-cyan-400 font-mono truncate max-w-[200px]">{mockRegUrl}</span>
                </div>
              </div>
            </div>
            <div className="pt-3 border-t border-csi-border/70 flex items-center justify-between">
              <button
                onClick={() => copyToClipboard(mockRegUrl, "regUrl")}
                className="text-xs text-csi-purpleLight hover:underline font-medium"
              >
                {copiedSection === "regUrl" ? "Copied Link!" : "Copy Public Link"}
              </button>
            </div>
          </div>

          {/* LINE 2: Feedback Form & QR Code */}
          <div className="bg-csi-surface rounded-xl border border-csi-border p-5 space-y-3 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
                  <QrCode className="w-4 h-4" />
                  Line 2: Feedback Form &amp; QR Code
                </span>
              </div>
              <p className="text-xs text-csi-textDim mb-3">
                QR Code redirecting to the feedback form (for projector display or printing at the venue).
              </p>
              <div className="flex items-center gap-4 bg-csi-dark p-3 rounded-lg border border-csi-border">
                {/* Visual QR placeholder */}
                <div className="w-20 h-20 bg-white p-1 rounded-lg flex items-center justify-center shrink-0">
                  <QrCode className="w-16 h-16 text-black" />
                </div>
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-white">Projector Display Ready</p>
                  <p className="text-csi-textDim text-[11px]">Directs attendees to feedback survey.</p>
                  <p className="text-cyan-400 font-mono text-[10px] truncate max-w-[180px]">{mockFeedbackUrl}</p>
                </div>
              </div>
            </div>
            <div className="pt-3 border-t border-csi-border/70 flex items-center justify-between">
              <button
                onClick={() => copyToClipboard(mockFeedbackUrl, "feedUrl")}
                className="text-xs text-pink-400 hover:underline font-medium"
              >
                {copiedSection === "feedUrl" ? "Copied!" : "Copy Feedback URL"}
              </button>
            </div>
          </div>
        </div>

        {/* LINE 5: Offline Attendance Sheet (Conditional) */}
        {event.mode === "Offline" && (
          <div className="bg-csi-surface rounded-xl border border-csi-border p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  Line 5: Offline Attendance Sheet (Printable)
                </h3>
                <p className="text-xs text-csi-textDim">
                  Pre-formatted attendance roster with Event Title, Venue ({event.venue}), Date, and signature columns.
                </p>
              </div>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Print Attendance Sheet</span>
              </button>
            </div>

            <div className="bg-csi-dark p-3.5 rounded-lg border border-csi-border overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-csi-border text-csi-textMuted">
                    <th className="py-2 px-3">Sl No</th>
                    <th className="py-2 px-3">Student Name</th>
                    <th className="py-2 px-3">Roll No</th>
                    <th className="py-2 px-3">Branch &amp; Batch</th>
                    <th className="py-2 px-3">Forenoon (FN) Sign</th>
                    <th className="py-2 px-3">Afternoon (AN) Sign</th>
                  </tr>
                </thead>
                <tbody className="text-csi-textDim">
                  {[1, 2, 3, 4, 5].map((row) => (
                    <tr key={row} className="border-b border-csi-border/40">
                      <td className="py-2.5 px-3">{row}</td>
                      <td className="py-2.5 px-3">................................................</td>
                      <td className="py-2.5 px-3">....................</td>
                      <td className="py-2.5 px-3">....................</td>
                      <td className="py-2.5 px-3">__________</td>
                      <td className="py-2.5 px-3">__________</td>
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
          <div className="bg-csi-surface border border-csi-border w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
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
                className="text-csi-textDim hover:text-white"
              >
                ✕
              </button>
            </div>

            {!isUnlocked ? (
              <form onSubmit={handleEasterEggUnlock} className="space-y-4">
                <p className="text-xs text-csi-textDim">
                  Security verification required to unlock Coordinator Appreciation Certificate generation.
                </p>

                <div>
                  <label className="block text-xs font-medium text-csi-textMuted mb-1.5">
                    Security Question: Favorite club?
                  </label>
                  <input
                    type="password"
                    placeholder="Enter secret answer..."
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg bg-csi-dark border border-csi-border text-xs text-white focus:outline-none focus:border-csi-purple"
                  />
                  {easterEggError && (
                    <p className="text-[11px] text-red-400 mt-1">Incorrect answer. Access restricted.</p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-csi-purple hover:bg-csi-purple/90 text-white rounded-lg text-xs font-semibold shadow-lg shadow-csi-purple/20 transition"
                >
                  Verify Admin Identity
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs">
                  ✓ Identity verified: Welcome, Admin! Official Coordinator Certificate module unlocked.
                </div>

                <div className="space-y-2 text-xs">
                  <p className="font-semibold text-white">Assigned Coordinators for this event:</p>
                  {event.assigned_coordinators.map((name) => (
                    <div
                      key={name}
                      className="p-2.5 rounded-lg bg-csi-dark border border-csi-border flex items-center justify-between"
                    >
                      <span className="text-white font-medium">{name}</span>
                      <button
                        onClick={() => alert(`Generating Coordinator Appreciation Certificate for ${name} - ${event.event_name}`)}
                        className="px-2 py-1 rounded bg-csi-purple/30 hover:bg-csi-purple/50 text-csi-purpleLight text-[10px] font-semibold"
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

