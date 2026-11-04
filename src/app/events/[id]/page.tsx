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
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Loader2,
  RefreshCw,
  FolderPlus,
  Check,
} from "lucide-react";
import { CSIEvent, RegisteredAttendee } from "@/lib/types";
import { members } from "@/lib/data";
import { getStoredEvents, deleteEvent, updateEvent } from "@/lib/eventsStorage";
import {
  generateEventGoogleAppsScript,
  getDepartmentChoices,
  mapGoogleFormResponsesToAttendance,
} from "@/lib/formScriptGenerator";
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

  // Google Apps Script Modal State
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [scriptCopied, setScriptCopied] = useState(false);

  // Google Drive Automated Integration State
  const [isCreatingFormInDrive, setIsCreatingFormInDrive] = useState(false);
  const [isTogglingRegistration, setIsTogglingRegistration] = useState(false);
  const [isSyncingFromDrive, setIsSyncingFromDrive] = useState(false);
  const [driveActionNotice, setDriveActionNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Google Sheet / Registrations Sync State
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [sheetInput, setSheetInput] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  const eventScriptCode = event ? generateEventGoogleAppsScript(event) : "";
  const eventDepartments = event ? getDepartmentChoices(event.target_branches) : [];

  const handleCopyScript = () => {
    navigator.clipboard.writeText(eventScriptCode);
    setScriptCopied(true);
    setTimeout(() => setScriptCopied(false), 2500);
  };

  const handleCreateFormInDrive = async () => {
    if (!event) return;
    setIsCreatingFormInDrive(true);
    setDriveActionNotice(null);

    try {
      const res = await fetch("/api/google-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_form",
          eventName: event.event_name,
          targetDepartments: eventDepartments,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to create form in Google Drive.");
      }

      const updated: CSIEvent = {
        ...event,
        google_form_url: data.formUrl,
        google_form_edit_url: data.editUrl,
        google_form_id: data.formId,
        google_sheet_url: data.sheetUrl,
        google_sheet_id: data.sheetId,
        registration_url: data.formUrl,
        is_registration_closed: false,
      };

      setEvent(updated);
      updateEvent(updated);
      setDriveActionNotice({
        type: "success",
        text: "Google Form & Responses Sheet created directly in your CSI Google Drive!",
      });
    } catch (err: any) {
      setDriveActionNotice({
        type: "error",
        text: err.message || "Failed to connect to Google Drive Webhook.",
      });
    } finally {
      setIsCreatingFormInDrive(false);
    }
  };

  const handleToggleRegistrationStatus = async () => {
    if (!event) return;
    const willClose = !event.is_registration_closed;
    setIsTogglingRegistration(true);
    setDriveActionNotice(null);

    try {
      if (willClose && event.google_form_id) {
        await fetch("/api/google-form", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "close_form",
            formId: event.google_form_id,
          }),
        });
      }

      const updated: CSIEvent = {
        ...event,
        is_registration_closed: willClose,
      };
      setEvent(updated);
      updateEvent(updated);
      setDriveActionNotice({
        type: "success",
        text: willClose
          ? "Registration closed! You can now sync the final roster into the Attendance Sheet."
          : "Registration is re-opened.",
      });
    } catch (err: any) {
      setDriveActionNotice({
        type: "error",
        text: err.message || "Failed to update registration status.",
      });
    } finally {
      setIsTogglingRegistration(false);
    }
  };

  const handleSyncFinalRosterFromDrive = async () => {
    if (!event) return;
    setIsSyncingFromDrive(true);
    setDriveActionNotice(null);

    try {
      let sheetId = event.google_sheet_id;
      if (!sheetId && event.google_sheet_url) {
        const match = event.google_sheet_url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match) sheetId = match[1];
      }

      if (!sheetId) {
        throw new Error("No Google Sheet ID linked to this event yet. Create the form first or connect your sheet.");
      }

      const res = await fetch("/api/google-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get_responses",
          sheetId: sheetId,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Could not fetch responses from Google Sheet.");
      }

      const attendees = mapGoogleFormResponsesToAttendance(data.headers || [], data.rows || []);
      if (attendees.length === 0) {
        throw new Error("No responses found in the Google Sheet yet.");
      }

      const updated: CSIEvent = {
        ...event,
        registered_attendees: attendees,
      };

      setEvent(updated);
      updateEvent(updated);
      setDriveActionNotice({
        type: "success",
        text: `Successfully mapped ${attendees.length} registered students to the Attendance Sheet!`,
      });
    } catch (err: any) {
      setDriveActionNotice({
        type: "error",
        text: err.message || "Failed to fetch registrations from Google Sheet.",
      });
    } finally {
      setIsSyncingFromDrive(false);
    }
  };

  const sampleAttendees: RegisteredAttendee[] = [
    { sl_no: 1, name: "LEYAH MARY THOMAS", gender: "Female", class_batch: "S7 CS A" },
    { sl_no: 2, name: "Safa Nazar", gender: "Female", class_batch: "S7 CSBS" },
    { sl_no: 3, name: "Neha R Jacob", gender: "Female", class_batch: "S5 CS C" },
    { sl_no: 4, name: "Naveena Joy", gender: "Female", class_batch: "S5 IT" },
    { sl_no: 5, name: "Nikitha Rajeev", gender: "Female", class_batch: "S5 AD" },
    { sl_no: 6, name: "Sarah Elsa Laji", gender: "Female", class_batch: "S3 CS D" },
    { sl_no: 7, name: "Tessa j kudakassery", gender: "Female", class_batch: "S3 AD" },
  ];

  const handleApplySampleAttendees = () => {
    if (!event) return;
    const updated = {
      ...event,
      registered_attendees: sampleAttendees,
    };
    setEvent(updated);
    updateEvent(updated);
    setSyncStatus({ success: true, message: `Loaded ${sampleAttendees.length} sample attendees from reference scan!` });
    setTimeout(() => {
      setIsSyncModalOpen(false);
      setSyncStatus(null);
    }, 1200);
  };

  const handleSyncData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !sheetInput.trim()) return;
    setIsSyncing(true);
    setSyncStatus(null);

    try {
      let rawText = sheetInput.trim();

      // If user pasted a Google Sheet URL, convert to CSV export URL and fetch
      if (rawText.startsWith("http://") || rawText.startsWith("https://")) {
        const match = rawText.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1]) {
          const sheetId = match[1];
          const csvExportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
          try {
            const res = await fetch(csvExportUrl);
            if (!res.ok) throw new Error("Could not fetch Google Sheet CSV. Ensure Sheet Sharing is set to 'Anyone with the link can view'.");
            rawText = await res.text();
          } catch (fetchErr: any) {
            throw new Error(fetchErr.message || "Could not access Google Sheet online. Alternatively, copy and paste the sheet rows directly here.");
          }
        }
      }

      // Parse lines
      const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        throw new Error("Pasted data must include a header row and at least one student row.");
      }

      const delimiter = lines[0].includes("\t") ? "\t" : ",";
      const headers = lines[0].split(delimiter);
      const rows = lines.slice(1).map((l) => l.split(delimiter));

      const attendees = mapGoogleFormResponsesToAttendance(headers, rows);

      if (attendees.length === 0) {
        throw new Error("No student names could be extracted.");
      }

      const updated = {
        ...event,
        google_sheet_url: sheetInput.startsWith("http") ? sheetInput : event.google_sheet_url,
        registered_attendees: attendees,
      };
      setEvent(updated);
      updateEvent(updated);
      setSyncStatus({ success: true, message: `Successfully mapped ${attendees.length} registered students to the Attendance Sheet!` });
      setTimeout(() => {
        setIsSyncModalOpen(false);
        setSyncStatus(null);
        setSheetInput("");
      }, 1500);
    } catch (err: any) {
      setSyncStatus({ success: false, message: err.message || "Failed to parse registration sheet." });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearAttendees = () => {
    if (!event) return;
    if (window.confirm("Clear mapped attendees from this attendance sheet?")) {
      const updated = {
        ...event,
        registered_attendees: undefined,
      };
      setEvent(updated);
      updateEvent(updated);
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

  const mockRegUrl = event.google_form_url || `https://forms.gle/csi-${event.id}`;
  const mockBitlyUrl = event.google_form_url || `https://bit.ly/csi-${event.event_name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8)}`;
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

        <div className="space-y-6">
          {/* RSMS Notice */}
          <div className="bg-[#12101C] rounded-2xl border border-purple-500/30 p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-lg font-bold text-slate-200 tracking-wide flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-300" />
                RSMS Notice (Official Black &amp; White)
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
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 text-[16px] font-bold flex items-center gap-2 transition shadow"
                  title="Direct Download as PDF"
                >
                  <Download className="w-4 h-4" />
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
                  className="px-4 py-2 rounded-lg bg-blue-900/50 hover:bg-blue-800 text-blue-200 border border-blue-500/40 text-[16px] font-bold flex items-center gap-2 transition shadow"
                  title="Direct Download as Word (.doc)"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Download Word</span>
                </button>
              </div>
            </div>

            {/* Exact RSMS Notice Preview (Pure Black/White with Clickable Blue Link) */}
            <div className="bg-black p-6 rounded-xl border border-white/20 text-white font-serif text-[17px] leading-relaxed shadow-inner space-y-4">
              <p className="font-bold underline text-xl tracking-wide">{event.event_name}</p>

              <p className="text-justify leading-relaxed">{rsmsDescription}</p>

              <div className="space-y-1.5 font-bold">
                <p>Date: {formattedDateFull}</p>
                <p>Time: {timeFormatted}</p>
                <p>{venueLabel}: {event.venue}</p>
              </div>

              <div className="space-y-1">
                <p className="font-semibold">Student Coordinators:</p>
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

          {/* Permission Letter */}
          <div className="bg-[#12101C] rounded-2xl border border-purple-500/30 p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-lg font-bold text-cyan-300 tracking-wide flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                Permission Letter to Principal
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
                  className="px-4 py-2 rounded-lg bg-cyan-900/50 hover:bg-cyan-800 text-cyan-200 border border-cyan-500/40 text-[16px] font-bold flex items-center gap-2 transition shadow"
                  title="Direct Download as PDF"
                >
                  <Download className="w-4 h-4" />
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
                  className="px-4 py-2 rounded-lg bg-blue-900/50 hover:bg-blue-800 text-blue-200 border border-blue-500/40 text-[16px] font-bold flex items-center gap-2 transition shadow"
                  title="Direct Download as Word (.doc)"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Download Word</span>
                </button>
              </div>
            </div>

            {/* Exact Permission Letter Preview */}
            <div className="bg-black p-6 rounded-xl border border-white/20 text-white font-serif text-[17px] leading-relaxed shadow-inner space-y-4">
              <div className="space-y-1">
                <p>To</p>
                <p>The Principal,</p>
                <p>Rajagiri School of Engineering and Technology,</p>
                <p>Kakkanad.</p>
              </div>

              <p className="font-bold pt-1 text-lg">
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

              <div className="pt-2 space-y-1">
                <p>Yours faithfully,</p>
                <p className="font-bold pt-2">{facultyCoordinator}</p>
                <p>Faculty Coordinator</p>
                <p>CSI Student Branch, RSET</p>
              </div>
            </div>
          </div>

          {/* Registration Form */}
          <div className="bg-[#12101C] rounded-2xl border border-purple-500/30 p-6 space-y-4 shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <span className="text-lg font-bold text-amber-300 tracking-wide flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-amber-400" />
                  Registration Form
                </span>
                <div className="flex items-center gap-2">
                  {event.google_form_url && (
                    <span className="text-[14px] px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-cyan-400" />
                      Live in CSI Drive
                    </span>
                  )}
                  {event.is_registration_closed ? (
                    <span className="text-[14px] px-3 py-1 rounded-full bg-red-500/20 text-red-300 font-bold border border-red-500/30">
                      Registration Closed
                    </span>
                  ) : event.google_form_url ? (
                    <span className="text-[14px] px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      Registration Open
                    </span>
                  ) : null}
                  {event.registered_attendees && event.registered_attendees.length > 0 ? (
                    <span className="text-[14px] px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      {event.registered_attendees.length} Synced
                    </span>
                  ) : (
                    <span className="text-[14px] px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                      Awaiting Sheet Sync
                    </span>
                  )}
                </div>
              </div>

              {/* Status / Drive feedback notice */}
              {driveActionNotice && (
                <div
                  className={`p-3.5 mb-3 rounded-xl text-[15px] font-semibold flex items-center gap-2.5 border ${
                    driveActionNotice.type === "success"
                      ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
                      : "bg-red-950/60 border-red-500/50 text-red-300"
                  }`}
                >
                  {driveActionNotice.type === "success" ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 shrink-0" />
                  )}
                  <span>{driveActionNotice.text}</span>
                </div>
              )}

              {/* Active Drive Links when Form is Created */}
              {event.google_form_url && (
                <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/40 space-y-3 mb-3 text-[15px]">
                  <span className="font-bold text-white block">Connected CSI Drive Assets:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <a
                      href={event.google_form_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-lg bg-black/60 hover:bg-black border border-purple-500/30 text-cyan-300 hover:text-cyan-200 flex items-center gap-2 transition font-semibold"
                    >
                      <ExternalLink className="w-4 h-4 text-cyan-400" />
                      <span className="truncate">Live Student Form</span>
                    </a>
                    {event.google_form_edit_url && (
                      <a
                        href={event.google_form_edit_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-lg bg-black/60 hover:bg-black border border-purple-500/30 text-purple-300 hover:text-purple-200 flex items-center gap-2 transition font-semibold"
                      >
                        <FileCode className="w-4 h-4 text-purple-400" />
                        <span className="truncate">Edit in Forms</span>
                      </a>
                    )}
                    {event.google_sheet_url && (
                      <a
                        href={event.google_sheet_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-lg bg-black/60 hover:bg-black border border-purple-500/30 text-emerald-300 hover:text-emerald-200 flex items-center gap-2 transition font-semibold"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        <span className="truncate">Responses Sheet</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Form Questions Overview matching user screenshots */}
              <div className="bg-black p-5 rounded-xl border border-purple-500/30 space-y-4">
                <div className="flex items-center justify-between pb-2.5 border-b border-purple-500/20">
                  <span className="font-bold text-slate-200 text-[17px]">Official Form Questions (10 Fields):</span>
                  <span className="text-[14px] px-3 py-1 rounded bg-amber-500/20 text-amber-300 font-mono font-semibold">
                    All Required except CSI ID
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-[17px]">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold font-mono">1.</span>
                    <span className="font-bold text-white">Email</span>
                    <span className="text-red-400 font-bold">*</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold font-mono">2.</span>
                    <span className="font-bold text-white">Title</span>
                    <span className="text-red-400 font-bold">*</span>
                    <span className="text-slate-400 text-[15px] font-normal">(Mr / Ms)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold font-mono">3.</span>
                    <span className="font-bold text-white">Name</span>
                    <span className="text-red-400 font-bold">*</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold font-mono">4.</span>
                    <span className="font-bold text-white">Rajagiri Email ID</span>
                    <span className="text-red-400 font-bold">*</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold font-mono">5.</span>
                    <span className="font-bold text-white">Contact No.(Preferably WhatsApp)</span>
                    <span className="text-red-400 font-bold">*</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold font-mono">6.</span>
                    <span className="font-bold text-white">Year of study</span>
                    <span className="text-red-400 font-bold">*</span>
                    <span className="text-slate-400 text-[15px] font-normal">(1st – 4th yr)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold font-mono">7.</span>
                    <span className="font-bold text-white">Department</span>
                    <span className="text-red-400 font-bold">*</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold font-mono">8.</span>
                    <span className="font-bold text-white">Division</span>
                    <span className="text-red-400 font-bold">*</span>
                    <span className="text-slate-400 text-[15px] font-normal">(Alpha - Nil)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold font-mono">9.</span>
                    <span className="font-bold text-white">Are you a CSI member?</span>
                    <span className="text-red-400 font-bold">*</span>
                  </div>
                  <div className="flex items-center gap-2 col-span-1 md:col-span-2">
                    <span className="text-slate-500 font-bold font-mono">10.</span>
                    <span className="font-bold text-white">If yes, enter CSI membership id</span>
                    <span className="text-slate-400 text-[15px] font-normal">(Optional)</span>
                  </div>
                </div>

                {/* Dynamic Departments based on event container */}
                <div className="pt-3 border-t border-purple-500/20 space-y-2">
                  <span className="text-[17px] text-slate-300 font-semibold block">
                    Dynamic Department Options (injected from event branches):
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    {eventDepartments.map((dept) => (
                      <span
                        key={dept}
                        className="px-3.5 py-1.5 rounded-md bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-bold font-mono text-[15px]"
                      >
                        {dept}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="pt-3 border-t border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* 1-Click Create Form in Drive */}
                {!event.google_form_url ? (
                  <button
                    onClick={handleCreateFormInDrive}
                    disabled={isCreatingFormInDrive}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-purple-600 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white text-[16px] font-extrabold flex items-center gap-2 transition shadow-lg shadow-purple-600/30 disabled:opacity-50"
                  >
                    {isCreatingFormInDrive ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                        <span>Creating Form in CSI Drive...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 text-amber-300" />
                        <span>Create Form in Drive</span>
                      </>
                    )}
                  </button>
                ) : (
                  <>
                    {/* Sync Final Roster after Form Closes */}
                    <button
                      onClick={handleSyncFinalRosterFromDrive}
                      disabled={isSyncingFromDrive}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[16px] font-extrabold flex items-center gap-2 transition shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                      title="Fetch final responses from Google Sheet into Attendance Sheet"
                    >
                      {isSyncingFromDrive ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Fetching Final Roster...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-5 h-5" />
                          <span>Sync Final Roster to Attendance</span>
                        </>
                      )}
                    </button>

                    {/* Toggle Registration Closed / Open */}
                    <button
                      onClick={handleToggleRegistrationStatus}
                      disabled={isTogglingRegistration}
                      className={`px-4 py-2.5 rounded-xl text-[16px] font-bold border transition flex items-center gap-2 ${
                        event.is_registration_closed
                          ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600"
                          : "bg-red-950/60 hover:bg-red-900/80 text-red-200 border-red-500/40"
                      }`}
                    >
                      {isTogglingRegistration ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : null}
                      <span>{event.is_registration_closed ? "Re-open Form" : "Close Registration"}</span>
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={() => copyToClipboard(event.google_form_url || mockRegUrl, "regUrl")}
                className="text-[16px] text-amber-300 hover:text-white font-bold underline"
              >
                {copiedSection === "regUrl" ? "Copied Link!" : "Copy Public Link"}
              </button>
            </div>
          </div>

          {/* Feedback Form & QR Code */}
          <div className="bg-[#12101C] rounded-2xl border border-purple-500/30 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-bold text-pink-300 tracking-wide flex items-center gap-2">
                <QrCode className="w-5 h-5 text-pink-400" />
                Feedback Form &amp; QR Code
              </span>
              <button
                onClick={() => copyToClipboard(mockFeedbackUrl, "feedUrl")}
                className="text-[16px] text-pink-300 hover:text-white font-bold underline"
              >
                {copiedSection === "feedUrl" ? "Copied URL!" : "Copy Feedback URL"}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 bg-black p-5 rounded-xl border border-purple-500/30">
              <div className="w-28 h-28 bg-white p-2 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
                <QrCode className="w-24 h-24 text-black" />
              </div>
              <div className="space-y-2 text-center sm:text-left">
                <p className="font-bold text-white text-xl">Projector Display Ready</p>
                <p className="text-slate-300 text-[17px]">Directs attendees to official feedback survey at the end of the event.</p>
                <p className="text-cyan-300 font-mono text-[17px] break-all">{mockFeedbackUrl}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Sheet */}
        <div className="bg-[#12101C] rounded-2xl border border-purple-500/30 p-6 space-y-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-emerald-400 tracking-wide flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Attendance Sheet (With RSET &amp; CSI Official Logos)
              </h3>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              {event.registered_attendees && event.registered_attendees.length > 0 && (
                <button
                  onClick={handleClearAttendees}
                  className="px-4 py-2 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-500/30 text-[16px] font-bold transition"
                  title="Clear attendees and revert to blank roster"
                >
                  Reset Roster
                </button>
              )}
              <button
                onClick={() =>
                  exportAttendancePdf(
                    `Attendance_Sheet_${event.event_name}`,
                    event.event_name,
                    event.event_date,
                    event.venue,
                    event.assigned_coordinators,
                    event.registered_attendees
                  )
                }
                className="px-4 py-2 rounded-lg bg-emerald-900/50 hover:bg-emerald-800 text-emerald-200 border border-emerald-500/40 text-[16px] font-bold flex items-center gap-2 transition shadow"
                title="Direct Download Attendance Sheet as PDF"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
              <button
                onClick={() =>
                  exportAttendanceWord(
                    `Attendance_Sheet_${event.event_name}`,
                    event.event_name,
                    event.event_date,
                    event.venue,
                    event.assigned_coordinators,
                    event.registered_attendees
                  )
                }
                className="px-4 py-2 rounded-lg bg-blue-900/50 hover:bg-blue-800 text-blue-200 border border-blue-500/40 text-[16px] font-bold flex items-center gap-2 transition shadow"
                title="Direct Download Attendance Sheet as Word (.doc)"
              >
                <FileDown className="w-4 h-4" />
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
                <h4 className="text-lg sm:text-[20px] font-bold tracking-normal uppercase text-black">
                  COMPUTER SOCIETY OF INDIA SB RSET
                </h4>
                <p className="text-base sm:text-[18px] font-bold tracking-wide text-black">
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
            <div
              className="space-y-1.5 text-[17px] text-black mb-5 pl-0.5 leading-snug"
              style={{ fontFamily: "'Calibri', 'Segoe UI', Arial, sans-serif" }}
            >
              <div className="flex items-start py-0.5">
                <span className="w-52 font-bold shrink-0 text-[17px]">EVENT NAME</span>
                <span className="font-bold text-[17px]">: {event.event_name.toUpperCase()}</span>
              </div>
              <div className="flex items-start py-0.5">
                <span className="w-52 font-bold shrink-0 text-[17px]">DATE</span>
                <span className="font-bold text-[17px]">: {formatShortSlashDate(event.event_date)}</span>
              </div>
              <div className="flex items-start py-0.5">
                <span className="w-52 font-bold shrink-0 text-[17px]">VENUE</span>
                <span className="font-bold text-[17px]">: {event.venue}</span>
              </div>
              <div className="flex items-start py-0.5">
                <span className="w-52 font-bold shrink-0 text-[17px]">COORDINATORS</span>
                <span className="font-bold text-[17px]">: {event.assigned_coordinators.join(", ") || "CSI Coordinators"}</span>
              </div>
              <div className="flex items-start py-0.5">
                <span className="w-52 font-bold shrink-0 text-[17px]">No. of participants</span>
                <span className="font-bold text-[17px]">: {event.registered_attendees && event.registered_attendees.length > 0 ? event.registered_attendees.length : "__________________"}</span>
              </div>
            </div>

            {/* Attendance Roster Table with Proportional Column Widths */}
            <table className="w-full text-[17px] text-left border-collapse border border-black table-fixed">
              <thead>
                <tr className="border-b border-black text-black font-bold uppercase text-center bg-white text-[17px]">
                  <th className="border border-black py-2.5 px-2 w-[10%] text-center text-[17px]">SL NO</th>
                  <th className="border border-black py-2.5 px-3 w-[34%] text-left text-[17px]">NAME</th>
                  <th className="border border-black py-2.5 px-2 w-[16%] text-center text-[17px]">GENDER</th>
                  <th className="border border-black py-2.5 px-2 w-[16%] text-center text-[17px]">CLASS</th>
                  <th className="border border-black py-2.5 px-2 w-[24%] text-center text-[17px]">SIGNATURE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black text-black text-[17px]">
                {(event.registered_attendees && event.registered_attendees.length > 0
                  ? event.registered_attendees
                  : [1, 2, 3, 4, 5, 6, 7]
                ).map((item, idx) => {
                  const isAttendee = typeof item === "object";
                  return (
                    <tr key={idx} className="h-10 text-[17px]">
                      <td className="border border-black text-center py-2 px-2 font-bold text-[17px]">{idx + 1}</td>
                      <td className="border border-black py-2 px-3 text-left text-[17px]">{isAttendee ? item.name : "\u00A0"}</td>
                      <td className="border border-black text-center py-2 px-2 text-[17px]">{isAttendee ? item.gender || "" : "\u00A0"}</td>
                      <td className="border border-black text-center py-2 px-2 text-[17px]">{isAttendee ? item.class_batch || "" : "\u00A0"}</td>
                      <td className="border border-black py-2 px-2 text-[17px]">&nbsp;</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* GOOGLE APPS SCRIPT GENERATOR MODAL */}
      {isScriptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#12101C] border border-purple-500/40 w-full max-w-3xl rounded-2xl p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-3 shrink-0">
              <div className="flex items-center gap-2.5 text-white font-bold text-base">
                <FileCode className="w-5 h-5 text-purple-400" />
                <span>Google Apps Script — 1-Click Form &amp; Sheet Generator</span>
              </div>
              <button
                onClick={() => setIsScriptModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300 overflow-y-auto pr-1">
              <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 space-y-1.5">
                <p className="font-bold text-purple-200 text-sm">
                  Run directly inside your CSI Gmail Drive (script.google.com)
                </p>
                <p className="text-slate-300 leading-relaxed">
                  This custom script builds the exact 10-question registration form in your CSI Drive, injects only the eligible departments (<strong>{eventDepartments.join(", ")}</strong>), creates the responses Google Sheet, and automatically links them together!
                </p>
              </div>

              {/* Step by Step Instructions */}
              <div className="bg-black/60 p-4 rounded-xl border border-white/10 space-y-2">
                <p className="font-bold text-white uppercase tracking-wider text-[11px]">How to Run in 4 Steps:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 leading-relaxed">
                  <li>
                    Open Google Drive in your CSI Gmail account, then visit{" "}
                    <a
                      href="https://script.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 underline font-semibold"
                    >
                      script.google.com
                    </a>{" "}
                    and click <strong>+ New project</strong>.
                  </li>
                  <li>
                    In the code editor, delete any existing text, paste the script below, and click <strong>Save</strong> (💾).
                  </li>
                  <li>
                    Click <strong>Run</strong>. When prompted for authorization, click <em>Review permissions</em> &gt; <em>Advanced</em> &gt; <em>Go to Untitled project (unsafe)</em> &gt; <em>Allow</em>.
                  </li>
                  <li>
                    Check the <strong>Execution log</strong> at the bottom of the screen: It outputs your <strong>Live Form Link</strong>, <strong>Form Edit Link</strong>, and <strong>Responses Google Sheet Link</strong>.
                  </li>
                </ol>
              </div>

              {/* Code Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-mono text-slate-300">Code.gs (Auto-Tailored for {event.event_name})</span>
                  <button
                    onClick={handleCopyScript}
                    className="px-3 py-1 rounded bg-purple-600/40 hover:bg-purple-600 text-purple-200 hover:text-white font-bold flex items-center gap-1.5 transition"
                  >
                    {scriptCopied ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Script</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="p-4 rounded-xl bg-black border border-purple-500/30 text-[11px] text-emerald-300 font-mono overflow-x-auto max-h-64 leading-relaxed select-all">
                  {eventScriptCode}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-purple-500/20 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500">
                Department options: {eventDepartments.join(", ")}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyScript}
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{scriptCopied ? "Copied!" : "Copy Full Script"}</span>
                </button>
                <button
                  onClick={() => setIsScriptModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GOOGLE SHEET REGISTRATIONS IMPORT MODAL */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#12101C] border border-purple-500/40 w-full max-w-lg rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
              <div className="flex items-center gap-2.5 text-white font-bold text-base">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <span>Connect Google Sheet / Import Registrations</span>
              </div>
              <button
                onClick={() => {
                  setIsSyncModalOpen(false);
                  setSyncStatus(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-300">
              <p className="leading-relaxed text-xs text-slate-400">
                Paste your CSI Drive Google Sheet share link or paste copied table rows (from your CSI Gmail Drive).
                The system maps <strong>Name</strong>, <strong>Gender</strong>, and <strong>Class</strong> into the Attendance Sheet.
              </p>

              <form onSubmit={handleSyncData} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wide">
                    Google Sheet Share Link OR Pasted CSV / TSV Rows
                  </label>
                  <textarea
                    rows={4}
                    value={sheetInput}
                    onChange={(e) => setSheetInput(e.target.value)}
                    placeholder="e.g. https://docs.google.com/spreadsheets/d/.../edit or paste Name, Gender, Class rows..."
                    className="w-full bg-black border border-purple-500/40 rounded-xl p-3 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-purple-400"
                  />
                </div>

                {syncStatus && (
                  <div
                    className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 border ${
                      syncStatus.success
                        ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
                        : "bg-red-950/60 border-red-500/50 text-red-300"
                    }`}
                  >
                    {syncStatus.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <span>{syncStatus.message}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleApplySampleAttendees}
                    className="px-3 py-1.5 rounded-lg bg-purple-900/40 hover:bg-purple-900/70 border border-purple-500/40 text-purple-200 text-xs font-bold transition"
                  >
                    Quick Test (Load 7 Scan Attendees)
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSyncModalOpen(false);
                        setSyncStatus(null);
                      }}
                      className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSyncing || !sheetInput.trim()}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow"
                    >
                      {isSyncing ? "Mapping..." : "Sync Attendees"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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
