"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  Trash2,
} from "lucide-react";
import { CSIEvent } from "@/lib/types";
import { members } from "@/lib/data";
import { getStoredEvents, deleteEvent } from "@/lib/eventsStorage";
import {
  exportRsmsPdf,
  exportRsmsWord,
  exportPermissionPdf,
  exportPermissionWord,
  exportAttendancePdf,
  exportAttendanceWord,
  formatFullDateWithDay,
  formatShortSlashDate,
} from "@/lib/documentExport";

export default function EventContainerPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.id as string;

  const [event, setEvent] = useState<CSIEvent | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Easter Egg State
  const [isEasterEggOpen, setIsEasterEggOpen] = useState(false);
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [easterEggError, setEasterEggError] = useState(false);

  const handleDeleteEvent = () => {
    if (!event) return;
    if (window.confirm(`Are you sure you want to delete event "${event.event_name}"? This action cannot be undone.`)) {
      deleteEvent(event.id);
      router.push("/events");
    }
  };

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
      : "all";

  const mockRegUrl = `https://forms.gle/csi-${event.id}`;
  const mockBitlyUrl = `https://bit.ly/csi-${event.event_name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8)}`;
  const mockFeedbackUrl = `https://forms.gle/csi-feedback-${event.id}`;

  const facultyCoordinator = "Dr. Tripti C";
  const formattedDateFull = formatFullDateWithDay(event.event_date);
  const timeFormatted = `${event.time_start || "11:35 AM"} – ${event.time_end || "12:30 PM"}`;
  const venueLabel = event.mode === "Online" ? "Platform" : "Venue";

  // Map coordinators with class from member database
  const getCoordinatorWithClass = (name: string) => {
    const mem = members.find((m) => m.name.toLowerCase() === name.toLowerCase());
    if (mem && mem.class_batch) {
      return `${mem.name} (${mem.class_batch})`;
    }
    return name;
  };

  const coordinatorListWithClass =
    event.assigned_coordinators.length > 0
      ? event.assigned_coordinators.map(getCoordinatorWithClass)
      : ["CSI Student Coordinators"];

  // RSMS Notice description (Standard format from approved template without brief description/impromptu)
  const rsmsDescription = `The Computer Society of India SB RSET, is conducting ${event.mode === "Online" ? "an online competition" : "a technical event"}, ${event.event_name}, for students of all years.`;

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

        {/* Actions & Easter Egg Trigger */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleDeleteEvent}
            className="px-3.5 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 text-xs font-bold flex items-center gap-1.5 transition"
            title="Delete this event container"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            <span>Delete Event</span>
          </button>

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
                <span className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-300" />
                  Line 4: RSMS Notice (Official Black &amp; White)
                </span>

                {/* Document Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() =>
                      exportRsmsPdf(
                        `RSMS_Notice_${event.event_name}`,
                        event.event_name,
                        formattedDateFull,
                        timeFormatted,
                        event.venue,
                        venueLabel,
                        rsmsDescription,
                        coordinatorListWithClass,
                        facultyCoordinator,
                        mockBitlyUrl
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 text-xs font-bold flex items-center gap-1.5 transition shadow"
                    title="Direct Download as PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                  <button
                    onClick={() =>
                      exportRsmsWord(
                        `RSMS_Notice_${event.event_name}`,
                        event.event_name,
                        formattedDateFull,
                        timeFormatted,
                        event.venue,
                        venueLabel,
                        rsmsDescription,
                        coordinatorListWithClass,
                        facultyCoordinator,
                        mockBitlyUrl
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-blue-900/50 hover:bg-blue-800 text-blue-200 border border-blue-500/40 text-xs font-bold flex items-center gap-1.5 transition shadow"
                    title="Direct Download as Word (.doc)"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Download Word</span>
                  </button>
                </div>
              </div>

              <p className="text-sm text-slate-400 mb-3 leading-relaxed">
                Official clean notification format without colored lines or graphics.
              </p>

              {/* Exact RSMS Notice Preview (Pure Black/White with Clickable Blue Link) */}
              <div className="bg-black p-6 rounded-xl border border-white/20 text-white font-serif text-[17px] leading-relaxed shadow-inner space-y-4 max-h-96 overflow-y-auto">
                <p className="font-bold underline text-lg tracking-wide">{event.event_name}</p>

                <p className="text-justify leading-relaxed">{rsmsDescription}</p>

                <div className="space-y-1 font-bold">
                  <p>Date: {formattedDateFull}</p>
                  <p>Time: {timeFormatted}</p>
                  <p>{venueLabel}: {event.venue}</p>
                </div>

                <div className="space-y-1.5">
                  <p>Student Coordinators:</p>
                  <div className="space-y-1 pl-1">
                    {coordinatorListWithClass.map((c) => (
                      <p key={c}>{c}</p>
                    ))}
                  </div>
                </div>

                <p>Faculty Coordinator: {facultyCoordinator}</p>

                <p>
                  Registration Link:{" "}
                  <a
                    href={mockBitlyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline font-sans font-medium"
                  >
                    {mockBitlyUrl}
                  </a>
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-purple-500/20 text-xs text-slate-400">
              Only clickable link is highlighted in blue • Strict College RSMS Format
            </div>
          </div>

          {/* LINE 3: Permission Letter */}
          <div className="bg-[#12101C] rounded-2xl border border-purple-500/30 p-6 space-y-4 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <span className="text-sm font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  Line 3: Permission Letter to Principal
                </span>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() =>
                      exportPermissionPdf(
                        `Permission_Letter_${event.event_name}`,
                        event.event_name,
                        formattedDateFull,
                        timeFormatted,
                        event.venue,
                        event.brief_description,
                        branchesString,
                        facultyCoordinator
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-cyan-900/50 hover:bg-cyan-800 text-cyan-200 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 transition shadow"
                    title="Direct Download as PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                  <button
                    onClick={() =>
                      exportPermissionWord(
                        `Permission_Letter_${event.event_name}`,
                        event.event_name,
                        formattedDateFull,
                        timeFormatted,
                        event.venue,
                        event.brief_description,
                        branchesString,
                        facultyCoordinator
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-blue-900/50 hover:bg-blue-800 text-blue-200 border border-blue-500/40 text-xs font-bold flex items-center gap-1.5 transition shadow"
                    title="Direct Download as Word (.doc)"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Download Word</span>
                  </button>
                </div>
              </div>

              <p className="text-sm text-slate-400 mb-3 leading-relaxed">
                Formal institutional permission request addressed to The Principal, RSET Kakkanad.
              </p>

              {/* Exact Permission Letter Preview */}
              <div className="bg-black p-6 rounded-xl border border-white/20 text-white font-serif text-[16px] leading-relaxed shadow-inner space-y-3.5 max-h-96 overflow-y-auto">
                <div className="space-y-0.5">
                  <p>To</p>
                  <p>The Principal,</p>
                  <p>Rajagiri School of Engineering and Technology,</p>
                  <p>Kakkanad.</p>
                </div>

                <p className="font-bold pt-1">
                  Subject: Request for Conducting Technical Event &quot;{event.event_name}&quot;
                </p>

                <p>Respected Sir,</p>

                <p className="text-justify">
                  The Computer Society of India (CSI) Student Branch, RSET, is planning to organize a technical event titled <strong>{event.event_name}</strong>. {event.brief_description || "The event is designed to introduce participants to core Computer Science concepts and technical skills through interactive sessions and challenges."}
                </p>

                <p className="text-justify">
                  The event is open to students from the <strong>{branchesString}</strong> departments and will be conducted in the <strong>{event.venue}</strong> using a software-based platform developed by the CSI Student Branch.
                </p>

                <p>We kindly request your permission to conduct this event as per the details given below:</p>

                <div className="space-y-1 font-bold text-left">
                  <p>Event: {event.event_name}</p>
                  <p>Date: {formattedDateFull}</p>
                  <p>Time: {timeFormatted}</p>
                  <p>Venue: {event.venue}</p>
                </div>

                <p>We hope for your kind support and approval for the successful conduct of the event.</p>

                <div className="pt-2 space-y-0.5">
                  <p>Yours faithfully,</p>
                  <p className="font-bold pt-3">{facultyCoordinator}</p>
                  <p>Faculty Coordinator</p>
                  <p>CSI Student Branch, RSET</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-purple-500/20 text-xs text-slate-400">
              Strict Official Letterhead Template (Addressed to The Principal)
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

        {/* LINE 5: Attendance Sheet with Official Header Logos */}
        <div className="bg-[#12101C] rounded-2xl border border-purple-500/30 p-6 space-y-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Line 5: Attendance Sheet (With RSET &amp; CSI Official Logos)
              </h3>
              <p className="text-sm text-slate-400 mt-0.5">
                Pre-formatted official attendance sheet matching college audit requirements with editable logos.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() =>
                  exportAttendancePdf(
                    `Attendance_Sheet_${event.event_name}`,
                    event.event_name,
                    event.event_date,
                    event.venue,
                    event.assigned_coordinators
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-emerald-900/50 hover:bg-emerald-800 text-emerald-200 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition shadow"
                title="Direct Download Attendance Sheet as PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
              <button
                onClick={() =>
                  exportAttendanceWord(
                    `Attendance_Sheet_${event.event_name}`,
                    event.event_name,
                    event.event_date,
                    event.venue,
                    event.assigned_coordinators
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-blue-900/50 hover:bg-blue-800 text-blue-200 border border-blue-500/40 text-xs font-bold flex items-center gap-1.5 transition shadow"
                title="Direct Download Attendance Sheet as Word (.doc)"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Download Word</span>
              </button>
            </div>
          </div>

          {/* Official Document Sheet Preview (Matches Exact Scanned Format) */}
          <div
            className="bg-white text-black p-6 sm:p-9 rounded-xl border border-slate-300 shadow-2xl overflow-x-auto"
            style={{ fontFamily: "'Calibri', 'Segoe UI', Arial, sans-serif" }}
          >
            {/* Header with Logos */}
            <div className="flex items-center justify-between pb-3 mb-6 gap-4">
              <div className="w-24 shrink-0 flex items-center justify-start">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logos/rset_logo.png"
                  alt="RSET Silver Jubilee Logo"
                  className="h-20 w-auto object-contain"
                />
              </div>

              <div className="text-center flex-1 space-y-1.5">
                <h4 className="text-base sm:text-[18px] font-bold tracking-normal uppercase text-black">
                  COMPUTER SOCIETY OF INDIA SB RSET
                </h4>
                <p className="text-sm sm:text-[16px] font-bold tracking-wide text-black">
                  ATTENDANCE SHEET
                </p>
              </div>

              <div className="w-24 shrink-0 flex items-center justify-end">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logos/csi_logo.png"
                  alt="CSI Official Logo"
                  className="h-16 w-16 object-contain"
                />
              </div>
            </div>

            {/* Metadata Grid in Calibri */}
            <div className="space-y-1.5 text-[15px] text-black mb-6 pl-0.5 leading-relaxed">
              <div className="flex items-start">
                <span className="w-48 font-bold shrink-0">EVENT NAME</span>
                <span className="font-bold">: {event.event_name.toUpperCase()}</span>
              </div>
              <div className="flex items-start">
                <span className="w-48 font-bold shrink-0">DATE</span>
                <span className="font-bold">: {formatShortSlashDate(event.event_date)}</span>
              </div>
              <div className="flex items-start">
                <span className="w-48 font-bold shrink-0">VENUE</span>
                <span className="font-bold">: {event.venue}</span>
              </div>
              <div className="flex items-start">
                <span className="w-48 font-bold shrink-0">COORDINATORS</span>
                <span className="font-bold">: {event.assigned_coordinators.join(", ") || "CSI Coordinators"}</span>
              </div>
              <div className="flex items-start">
                <span className="w-48 font-bold shrink-0">No. of participants</span>
                <span className="font-bold">: __________________</span>
              </div>
            </div>

            {/* Attendance Roster Table with Proportional Column Widths */}
            <table className="w-full text-sm text-left border-collapse border border-black table-fixed">
              <thead>
                <tr className="border-b border-black text-black font-bold uppercase text-center bg-white">
                  <th className="border border-black py-2 px-2 w-[10%] text-center">SL NO</th>
                  <th className="border border-black py-2 px-3 w-[34%] text-left">NAME</th>
                  <th className="border border-black py-2 px-2 w-[16%] text-center">GENDER</th>
                  <th className="border border-black py-2 px-2 w-[16%] text-center">CLASS</th>
                  <th className="border border-black py-2 px-2 w-[24%] text-center">SIGNATURE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black text-black">
                {[1, 2, 3, 4, 5, 6, 7].map((row) => (
                  <tr key={row} className="h-9">
                    <td className="border border-black text-center py-2 px-2 font-bold">{row}</td>
                    <td className="border border-black py-2 px-3">&nbsp;</td>
                    <td className="border border-black py-2 px-2">&nbsp;</td>
                    <td className="border border-black py-2 px-2">&nbsp;</td>
                    <td className="border border-black py-2 px-2">&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
