"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Award,
  Trophy,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Users,
  Eye,
  Sliders,
  Sparkles,
  FileText,
  Search,
  Check,
  X,
  Printer,
  ChevronDown,
  Info,
  ShieldCheck,
  FolderArchive,
  Image as ImageIcon,
  RotateCcw,
} from "lucide-react";
import { CSIEvent, FeedbackAttendee } from "@/lib/types";
import { getEventById, updateEvent } from "@/lib/eventsStorage";
import {
  exportSingleCertificatePdf,
  exportBatchCertificatesPdf,
  exportCertificatesZip,
  getWinnerPosition,
} from "@/lib/certificateExport";
import {
  mapGoogleSheetToFeedbackAttendees,
  generateMockFeedbackResponses,
} from "@/lib/feedbackFormGenerator";
import { formatFullDateWithDay } from "@/lib/documentExport";

export default function CertificateStudioPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<CSIEvent | null>(null);
  const [loading, setLoading] = useState(true);

  // Attendees & Sync State
  const [attendees, setAttendees] = useState<FeedbackAttendee[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Winners Multi-Select State (lists of attendee names or UIDs)
  const [firstPlaceWinners, setFirstPlaceWinners] = useState<string[]>([]);
  const [secondPlaceWinners, setSecondPlaceWinners] = useState<string[]>([]);
  const [thirdPlaceWinners, setThirdPlaceWinners] = useState<string[]>([]);

  // Template Uploads (Base64 data URLs)
  const [appreciationTemplate, setAppreciationTemplate] = useState<string>("");
  const [participationTemplate, setParticipationTemplate] = useState<string>("");

  // Write-ups
  const defaultAppreciationWriteup =
    'for securing {POSITION} Place in the technical event "{EVENT}" organized by the Computer Society of India (CSI) Student Branch, RSET on {DATE}.';
  const defaultParticipationWriteup =
    'for active and successful participation in the technical event "{EVENT}" organized by the Computer Society of India (CSI) Student Branch, RSET on {DATE}.';

  const [appreciationWriteup, setAppreciationWriteup] = useState(defaultAppreciationWriteup);
  const [participationWriteup, setParticipationWriteup] = useState(defaultParticipationWriteup);

  // Live Preview Controls
  const [previewTab, setPreviewTab] = useState<"appreciation" | "participation">("appreciation");
  const [selectedPreviewUid, setSelectedPreviewUid] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Batch Export Progress / Loading
  const [isExportingWinnersZip, setIsExportingWinnersZip] = useState(false);
  const [isExportingParticipationZip, setIsExportingParticipationZip] = useState(false);
  const [isExportingMasterPdf, setIsExportingMasterPdf] = useState(false);

  // Load event
  useEffect(() => {
    if (!eventId) return;
    const found = getEventById(eventId);
    if (found) {
      setEvent(found);
      const existingAttendees = found.feedback_attendees || [];
      setAttendees(existingAttendees);

      // Initialize winners if stored
      if (found.winners) {
        const toArr = (val?: string | string[]) =>
          Array.isArray(val) ? val : val ? [val] : [];
        setFirstPlaceWinners(toArr(found.winners.first_place));
        setSecondPlaceWinners(toArr(found.winners.second_place));
        setThirdPlaceWinners(toArr(found.winners.third_place));
      }

      // Initialize templates
      if (found.certificate_templates) {
        setAppreciationTemplate(found.certificate_templates.appreciation_template_data || "");
        setParticipationTemplate(found.certificate_templates.participation_template_data || "");
      }

      // Initialize writeups
      if (found.certificate_writeups) {
        if (found.certificate_writeups.appreciation_writeup) {
          setAppreciationWriteup(found.certificate_writeups.appreciation_writeup);
        }
        if (found.certificate_writeups.participation_writeup) {
          setParticipationWriteup(found.certificate_writeups.participation_writeup);
        }
      }

      if (existingAttendees.length > 0) {
        setSelectedPreviewUid(existingAttendees[0].uid || existingAttendees[0].name);
      }
    }
    setLoading(false);
  }, [eventId]);

  // Persist winner & template changes back to event storage
  const saveEventChanges = (
    newFirst: string[],
    newSecond: string[],
    newThird: string[],
    newAppTemplate = appreciationTemplate,
    newPartTemplate = participationTemplate,
    newAppWriteup = appreciationWriteup,
    newPartWriteup = participationWriteup,
    updatedAttendees = attendees
  ) => {
    if (!event) return;
    const updated: CSIEvent = {
      ...event,
      feedback_attendees: updatedAttendees,
      winners: {
        first_place: newFirst,
        second_place: newSecond,
        third_place: newThird,
      },
      certificate_templates: {
        appreciation_template_data: newAppTemplate,
        participation_template_data: newPartTemplate,
      },
      certificate_writeups: {
        appreciation_writeup: newAppWriteup,
        participation_writeup: newPartWriteup,
      },
    };
    setEvent(updated);
    updateEvent(updated);
  };

  // Sync latest feedback responses from CSI Google Drive Sheet
  const handleSyncFromDriveSheet = async () => {
    if (!event) return;
    setIsSyncing(true);
    setStatusNotice(null);

    try {
      let sheetId = event.feedback_google_sheet_id;
      if (!sheetId && event.feedback_google_sheet_url) {
        const match = event.feedback_google_sheet_url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match) sheetId = match[1];
      }

      if (!sheetId) {
        throw new Error(
          "No Feedback Google Sheet is linked to this event yet. Please ensure the feedback form has been created in Drive."
        );
      }

      const res = await fetch("/api/google-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get_feedback_responses",
          sheetId: sheetId,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to fetch responses from Google Sheet.");
      }

      const mapped = mapGoogleSheetToFeedbackAttendees(data.headers || [], data.rows || []);
      if (mapped.length === 0) {
        throw new Error("The Feedback Google Sheet has no attendee responses yet.");
      }

      setAttendees(mapped);
      saveEventChanges(
        firstPlaceWinners,
        secondPlaceWinners,
        thirdPlaceWinners,
        appreciationTemplate,
        participationTemplate,
        appreciationWriteup,
        participationWriteup,
        mapped
      );

      setStatusNotice({
        type: "success",
        text: `Successfully synced ${mapped.length} verified participant(s) from your Google Sheet!`,
      });
      if (!selectedPreviewUid && mapped.length > 0) {
        setSelectedPreviewUid(mapped[0].uid || mapped[0].name);
      }
    } catch (err: any) {
      setStatusNotice({
        type: "error",
        text: err.message || "Failed to sync responses.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Load sample feedback responses for testing
  const handleLoadSampleAttendees = () => {
    if (!event) return;
    const sample = generateMockFeedbackResponses(event);
    setAttendees(sample);
    saveEventChanges(
      firstPlaceWinners,
      secondPlaceWinners,
      thirdPlaceWinners,
      appreciationTemplate,
      participationTemplate,
      appreciationWriteup,
      participationWriteup,
      sample
    );
    setStatusNotice({
      type: "success",
      text: `Loaded ${sample.length} reference submissions with verified college attendee profiles!`,
    });
    if (sample.length > 0) {
      setSelectedPreviewUid(sample[0].uid || sample[0].name);
      // Auto-assign sample winners for quick demonstration
      if (firstPlaceWinners.length === 0 && sample[0]) {
        const f = [sample[0].uid || sample[0].name];
        const s = sample[1] ? [sample[1].uid || sample[1].name] : [];
        const t = sample[2] ? [sample[2].uid || sample[2].name] : [];
        setFirstPlaceWinners(f);
        setSecondPlaceWinners(s);
        setThirdPlaceWinners(t);
        saveEventChanges(f, s, t, appreciationTemplate, participationTemplate, appreciationWriteup, participationWriteup, sample);
      }
    }
  };

  // Template Upload Handler
  const handleTemplateUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "appreciation" | "participation"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (PNG, JPG, or JPEG).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (type === "appreciation") {
        setAppreciationTemplate(result);
        saveEventChanges(
          firstPlaceWinners,
          secondPlaceWinners,
          thirdPlaceWinners,
          result,
          participationTemplate
        );
      } else {
        setParticipationTemplate(result);
        saveEventChanges(
          firstPlaceWinners,
          secondPlaceWinners,
          thirdPlaceWinners,
          appreciationTemplate,
          result
        );
      }
      setStatusNotice({
        type: "success",
        text: `Custom ${type === "appreciation" ? "Appreciation" : "Participation"} Certificate template applied successfully!`,
      });
    };
    reader.readAsDataURL(file);
  };

  // Winner Toggle Logic (Ensuring mutually exclusive placement)
  const toggleWinner = (idOrName: string, place: "1st" | "2nd" | "3rd") => {
    let newFirst = [...firstPlaceWinners];
    let newSecond = [...secondPlaceWinners];
    let newThird = [...thirdPlaceWinners];

    // Remove from other tiers
    newFirst = newFirst.filter((x) => x !== idOrName);
    newSecond = newSecond.filter((x) => x !== idOrName);
    newThird = newThird.filter((x) => x !== idOrName);

    if (place === "1st") {
      if (firstPlaceWinners.includes(idOrName)) {
        // Toggle off
      } else {
        newFirst.push(idOrName);
      }
    } else if (place === "2nd") {
      if (secondPlaceWinners.includes(idOrName)) {
        // Toggle off
      } else {
        newSecond.push(idOrName);
      }
    } else if (place === "3rd") {
      if (thirdPlaceWinners.includes(idOrName)) {
        // Toggle off
      } else {
        newThird.push(idOrName);
      }
    }

    setFirstPlaceWinners(newFirst);
    setSecondPlaceWinners(newSecond);
    setThirdPlaceWinners(newThird);
    saveEventChanges(newFirst, newSecond, newThird);
  };

  // Derived winners object
  const winnersObject = useMemo(() => {
    return {
      first_place: firstPlaceWinners,
      second_place: secondPlaceWinners,
      third_place: thirdPlaceWinners,
    };
  }, [firstPlaceWinners, secondPlaceWinners, thirdPlaceWinners]);

  // Filtered Attendees for Search
  const filteredAttendees = useMemo(() => {
    if (!searchQuery.trim()) return attendees;
    const q = searchQuery.toLowerCase();
    return attendees.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.uid && a.uid.toLowerCase().includes(q)) ||
        (a.branch && a.branch.toLowerCase().includes(q)) ||
        (a.email && a.email.toLowerCase().includes(q))
    );
  }, [attendees, searchQuery]);

  // Currently Previewed Attendee
  const currentPreviewAttendee = useMemo(() => {
    if (!attendees || attendees.length === 0) return null;
    const found = attendees.find(
      (a) => (a.uid && a.uid === selectedPreviewUid) || a.name === selectedPreviewUid
    );
    return found || attendees[0];
  }, [attendees, selectedPreviewUid]);

  const currentPreviewPosition = useMemo(() => {
    if (!currentPreviewAttendee) return "participant";
    return getWinnerPosition(currentPreviewAttendee, winnersObject);
  }, [currentPreviewAttendee, winnersObject]);

  // Export 1: Winners Appreciation ZIP
  const handleDownloadWinnersZip = async () => {
    if (!event) return;
    setIsExportingWinnersZip(true);
    setStatusNotice(null);

    try {
      const count = await exportCertificatesZip(
        "winners",
        attendees,
        event.event_name,
        event.event_date,
        event.venue,
        winnersObject,
        appreciationTemplate || undefined,
        appreciationWriteup,
        event.faculty_in_charge
      );
      setStatusNotice({
        type: "success",
        text: `Downloaded ${count} Certificate of Appreciation winner document(s) in "Winners_Appreciation_Certificates_${event.event_name}.zip"!`,
      });
    } catch (err: any) {
      setStatusNotice({
        type: "error",
        text: err.message || "Failed to generate Winners zip archive.",
      });
    } finally {
      setIsExportingWinnersZip(false);
    }
  };

  // Export 2: Participation ZIP
  const handleDownloadParticipationZip = async () => {
    if (!event) return;
    setIsExportingParticipationZip(true);
    setStatusNotice(null);

    try {
      const count = await exportCertificatesZip(
        "participation",
        attendees,
        event.event_name,
        event.event_date,
        event.venue,
        winnersObject,
        participationTemplate || undefined,
        participationWriteup,
        event.faculty_in_charge
      );
      setStatusNotice({
        type: "success",
        text: `Downloaded ${count} Certificate of Participation document(s) in "Participation_Certificates_${event.event_name}.zip"!`,
      });
    } catch (err: any) {
      setStatusNotice({
        type: "error",
        text: err.message || "Failed to generate Participation zip archive.",
      });
    } finally {
      setIsExportingParticipationZip(false);
    }
  };

  // Export 3: Master Consolidated PDF
  const handleDownloadMasterPdf = () => {
    if (!event || attendees.length === 0) return;
    setIsExportingMasterPdf(true);
    try {
      exportBatchCertificatesPdf(
        attendees,
        event.event_name,
        event.event_date,
        event.venue,
        winnersObject,
        previewTab === "appreciation" ? appreciationTemplate : participationTemplate,
        previewTab === "appreciation" ? appreciationWriteup : participationWriteup,
        event.faculty_in_charge
      );
      setStatusNotice({
        type: "success",
        text: `Exported all ${attendees.length} certificate(s) in a single consolidated PDF for printing!`,
      });
    } catch (err: any) {
      setStatusNotice({
        type: "error",
        text: err.message || "Failed to generate batch PDF.",
      });
    } finally {
      setIsExportingMasterPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-300">
        <RefreshCw className="w-6 h-6 animate-spin text-purple-400 mr-3" />
        <span>Loading Certificate Studio...</span>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-8 text-center text-slate-300 space-y-4">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Event Not Found</h2>
        <Link
          href="/events"
          className="inline-block px-4 py-2 bg-purple-600 rounded-lg text-white font-bold"
        >
          Back to Events
        </Link>
      </div>
    );
  }

  const totalWinnersCount =
    firstPlaceWinners.length + secondPlaceWinners.length + thirdPlaceWinners.length;
  const totalParticipantsCount = Math.max(0, attendees.length - totalWinnersCount);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-csi-border pb-6">
        <div className="flex items-center space-x-4">
          <Link
            href={`/events/${event.id}`}
            className="w-10 h-10 rounded-xl bg-black border border-purple-500/30 flex items-center justify-center text-slate-300 hover:text-white hover:border-purple-400 transition"
            title="Back to Event Details"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                Phase 5 • Official Certificate Studio
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Sheet Sync Connected
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Certificate Studio: {event.event_name}
            </h1>
          </div>
        </div>

        {/* Quick Sync Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleSyncFromDriveSheet}
            disabled={isSyncing}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[15px] font-bold flex items-center gap-2 transition shadow-lg shadow-emerald-600/30 disabled:opacity-50"
            title="Pull latest feedback submissions directly from Google Drive Sheet"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Syncing Drive Sheet..." : "Sync Latest Feedback"}</span>
          </button>
          {attendees.length === 0 && (
            <button
              onClick={handleLoadSampleAttendees}
              className="px-3.5 py-2.5 rounded-xl bg-purple-900/40 hover:bg-purple-900/70 border border-purple-500/40 text-purple-200 text-[14px] font-bold transition"
            >
              Load Sample Attendees
            </button>
          )}
        </div>
      </div>

      {/* Status Notice Banner */}
      {statusNotice && (
        <div
          className={`p-4 rounded-xl text-[15px] font-semibold flex items-center justify-between border ${
            statusNotice.type === "success"
              ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
              : "bg-red-950/60 border-red-500/50 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusNotice.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <span>{statusNotice.text}</span>
          </div>
          <button onClick={() => setStatusNotice(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#12101C] p-5 rounded-2xl border border-purple-500/30 space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Verified Responses</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-3xl font-extrabold text-white">{attendees.length}</p>
          <p className="text-xs text-slate-400 truncate">
            {event.feedback_google_sheet_url ? (
              <a
                href={event.feedback_google_sheet_url}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:underline flex items-center gap-1"
              >
                Connected Sheet <FileSpreadsheet className="w-3 h-3" />
              </a>
            ) : (
              "Connected via Local Storage"
            )}
          </p>
        </div>

        <div className="bg-[#12101C] p-5 rounded-2xl border border-purple-500/30 space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Appreciation (Winners)</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-3xl font-extrabold text-amber-300">{totalWinnersCount}</p>
          <p className="text-xs text-slate-400">
            🥇 {firstPlaceWinners.length} • 🥈 {secondPlaceWinners.length} • 🥉 {thirdPlaceWinners.length}
          </p>
        </div>

        <div className="bg-[#12101C] p-5 rounded-2xl border border-purple-500/30 space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Participation Certs</span>
            <Award className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-3xl font-extrabold text-cyan-300">{totalParticipantsCount}</p>
          <p className="text-xs text-slate-400">Verified Attendees</p>
        </div>

        <div className="bg-[#12101C] p-5 rounded-2xl border border-purple-500/30 space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Templates</span>
            <ImageIcon className="w-4 h-4 text-pink-400" />
          </div>
          <p className="text-3xl font-extrabold text-pink-300">
            {appreciationTemplate || participationTemplate ? "Custom" : "Official RSET"}
          </p>
          <p className="text-xs text-slate-400">
            {appreciationTemplate ? "Appreciation: Custom" : "Appreciation: CSI Standard"}
          </p>
        </div>
      </div>

      {/* TWO DOWNLOAD FOLDERS (ZIP PACKAGES) ACTION CENTER */}
      <div className="bg-gradient-to-r from-purple-950/70 via-indigo-950/60 to-purple-950/70 rounded-2xl border border-purple-500/40 p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5">
              <FolderArchive className="w-6 h-6 text-amber-400" />
              Download Generated Certificate Folders (2 Separate Packages)
            </h2>
            <p className="text-slate-300 text-[15px] mt-1">
              Download the two organized folders: <strong>Winners (Appreciation)</strong> and <strong>Participation Certificates</strong>, ready for distribution.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* FOLDER 1: Winners ZIP */}
          <button
            onClick={handleDownloadWinnersZip}
            disabled={isExportingWinnersZip || totalWinnersCount === 0}
            className="p-5 rounded-xl bg-gradient-to-br from-amber-900/60 via-amber-950/80 to-black border border-amber-500/50 hover:border-amber-400 text-left transition space-y-3 group disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            <div className="flex items-center justify-between">
              <span className="p-2.5 rounded-lg bg-amber-500/20 text-amber-300">
                <Trophy className="w-6 h-6" />
              </span>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {totalWinnersCount} Winners
              </span>
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-amber-200 group-hover:text-amber-100 flex items-center gap-1.5">
                <span>Download Winners Folder</span>
                <Download className="w-4 h-4" />
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Certificate of Appreciation ZIP (1st, 2nd, and 3rd place winners).
              </p>
            </div>
          </button>

          {/* FOLDER 2: Participation ZIP */}
          <button
            onClick={handleDownloadParticipationZip}
            disabled={isExportingParticipationZip || totalParticipantsCount === 0}
            className="p-5 rounded-xl bg-gradient-to-br from-cyan-900/60 via-cyan-950/80 to-black border border-cyan-500/50 hover:border-cyan-400 text-left transition space-y-3 group disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            <div className="flex items-center justify-between">
              <span className="p-2.5 rounded-lg bg-cyan-500/20 text-cyan-300">
                <Award className="w-6 h-6" />
              </span>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {totalParticipantsCount} Attendees
              </span>
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-cyan-200 group-hover:text-cyan-100 flex items-center gap-1.5">
                <span>Download Participation Folder</span>
                <Download className="w-4 h-4" />
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Certificate of Participation ZIP for all verified attendees.
              </p>
            </div>
          </button>

          {/* FOLDER 3: Combined Master PDF */}
          <button
            onClick={handleDownloadMasterPdf}
            disabled={isExportingMasterPdf || attendees.length === 0}
            className="p-5 rounded-xl bg-gradient-to-br from-purple-900/60 via-purple-950/80 to-black border border-purple-500/50 hover:border-purple-400 text-left transition space-y-3 group disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            <div className="flex items-center justify-between">
              <span className="p-2.5 rounded-lg bg-purple-500/20 text-purple-300">
                <Printer className="w-6 h-6" />
              </span>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {attendees.length} Total
              </span>
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-purple-200 group-hover:text-purple-100 flex items-center gap-1.5">
                <span>Consolidated Master PDF</span>
                <Download className="w-4 h-4" />
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Single PDF with all certificates for high-speed college printing.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* MULTI-SELECT WINNERS ASSIGNMENT CARD */}
      <div className="bg-[#12101C] rounded-2xl border border-purple-500/30 p-6 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-500/20 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              Winner Placement Multi-Select (1st, 2nd, 3rd Place)
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Select one or multiple winners for each rank. Selected attendees automatically receive the <strong>Certificate of Appreciation</strong> with their position writeup.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">
              Total Winners: <strong className="text-amber-300">{totalWinnersCount}</strong>
            </span>
          </div>
        </div>

        {/* 3 Winner Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 1st Place */}
          <div className="bg-black/60 rounded-xl border border-amber-500/40 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-amber-500/30">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <span className="text-lg">🥇</span>
                <span>1st Place Winners</span>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                {firstPlaceWinners.length} selected
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {attendees.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">No attendees synced yet</p>
              ) : (
                attendees.map((att) => {
                  const key = att.uid || att.name;
                  const isChecked = firstPlaceWinners.includes(key);
                  return (
                    <label
                      key={key}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition border ${
                        isChecked
                          ? "bg-amber-950/60 border-amber-500/60 text-amber-200 font-bold"
                          : "hover:bg-slate-900 border-white/5 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleWinner(key, "1st")}
                          className="rounded border-amber-500 text-amber-500 focus:ring-0"
                        />
                        <span className="truncate">{att.name}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono ml-1 shrink-0">
                        {att.branch || ""}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* 2nd Place */}
          <div className="bg-black/60 rounded-xl border border-slate-400/40 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-400/30">
              <div className="flex items-center gap-2 font-bold text-slate-200">
                <span className="text-lg">🥈</span>
                <span>2nd Place Winners</span>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-500/20 text-slate-300 font-bold">
                {secondPlaceWinners.length} selected
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {attendees.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">No attendees synced yet</p>
              ) : (
                attendees.map((att) => {
                  const key = att.uid || att.name;
                  const isChecked = secondPlaceWinners.includes(key);
                  return (
                    <label
                      key={key}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition border ${
                        isChecked
                          ? "bg-slate-800/80 border-slate-400/60 text-white font-bold"
                          : "hover:bg-slate-900 border-white/5 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleWinner(key, "2nd")}
                          className="rounded border-slate-400 text-slate-400 focus:ring-0"
                        />
                        <span className="truncate">{att.name}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono ml-1 shrink-0">
                        {att.branch || ""}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* 3rd Place */}
          <div className="bg-black/60 rounded-xl border border-amber-700/40 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-amber-700/30">
              <div className="flex items-center gap-2 font-bold text-amber-500">
                <span className="text-lg">🥉</span>
                <span>3rd Place Winners</span>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-700/20 text-amber-400 font-bold">
                {thirdPlaceWinners.length} selected
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {attendees.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">No attendees synced yet</p>
              ) : (
                attendees.map((att) => {
                  const key = att.uid || att.name;
                  const isChecked = thirdPlaceWinners.includes(key);
                  return (
                    <label
                      key={key}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition border ${
                        isChecked
                          ? "bg-amber-950/50 border-amber-700/60 text-amber-300 font-bold"
                          : "hover:bg-slate-900 border-white/5 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleWinner(key, "3rd")}
                          className="rounded border-amber-700 text-amber-700 focus:ring-0"
                        />
                        <span className="truncate">{att.name}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono ml-1 shrink-0">
                        {att.branch || ""}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TEMPLATE UPLOADS & WRITE-UP CUSTOMIZATION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Certificate of Appreciation */}
        <div className="bg-[#12101C] rounded-2xl border border-amber-500/30 p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-bold text-amber-200">
                1. Certificate of Appreciation (Winners)
              </h3>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
              For 1st, 2nd, 3rd Place
            </span>
          </div>

          {/* Template Upload */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide">
              Upload Custom Template (PNG / JPG)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-amber-500/40 hover:border-amber-400 bg-black/40 text-amber-200 text-xs font-bold cursor-pointer transition">
                <Upload className="w-4 h-4 text-amber-400" />
                <span>{appreciationTemplate ? "Replace Appreciation Template" : "Upload Appreciation Template Image"}</span>
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  className="hidden"
                  onChange={(e) => handleTemplateUpload(e, "appreciation")}
                />
              </label>
              {appreciationTemplate && (
                <button
                  onClick={() => {
                    setAppreciationTemplate("");
                    saveEventChanges(firstPlaceWinners, secondPlaceWinners, thirdPlaceWinners, "");
                  }}
                  className="p-3 rounded-xl bg-red-950/60 text-red-300 hover:text-white border border-red-500/30 text-xs font-bold transition"
                  title="Revert to Official CSI Standard Template"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {appreciationTemplate
                ? "Custom high-resolution template loaded. Overlays will align dynamically."
                : "Using official CSI SB RSET gold double-framed border template."}
            </p>
          </div>

          {/* Write-up Override */}
          <div className="space-y-1.5 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide">
                Certificate Write-up Text:
              </label>
              <button
                type="button"
                onClick={() => setAppreciationWriteup(defaultAppreciationWriteup)}
                className="text-[11px] text-amber-400 hover:underline"
              >
                Reset Default
              </button>
            </div>
            <textarea
              rows={3}
              value={appreciationWriteup}
              onChange={(e) => {
                setAppreciationWriteup(e.target.value);
                saveEventChanges(
                  firstPlaceWinners,
                  secondPlaceWinners,
                  thirdPlaceWinners,
                  appreciationTemplate,
                  participationTemplate,
                  e.target.value
                );
              }}
              className="w-full bg-black border border-amber-500/40 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 leading-relaxed font-sans"
            />
            <p className="text-[11px] text-slate-400">
              Tokens supported: <code className="text-amber-300">{"{NAME}"}</code>, <code className="text-amber-300">{"{EVENT}"}</code>, <code className="text-amber-300">{"{POSITION}"}</code>, <code className="text-amber-300">{"{DATE}"}</code>.
            </p>
          </div>
        </div>

        {/* Card 2: Certificate of Participation */}
        <div className="bg-[#12101C] rounded-2xl border border-cyan-500/30 p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-bold text-cyan-200">
                2. Certificate of Participation
              </h3>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
              For All Attendees
            </span>
          </div>

          {/* Template Upload */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide">
              Upload Custom Template (PNG / JPG)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-cyan-500/40 hover:border-cyan-400 bg-black/40 text-cyan-200 text-xs font-bold cursor-pointer transition">
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>{participationTemplate ? "Replace Participation Template" : "Upload Participation Template Image"}</span>
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  className="hidden"
                  onChange={(e) => handleTemplateUpload(e, "participation")}
                />
              </label>
              {participationTemplate && (
                <button
                  onClick={() => {
                    setParticipationTemplate("");
                    saveEventChanges(firstPlaceWinners, secondPlaceWinners, thirdPlaceWinners, appreciationTemplate, "");
                  }}
                  className="p-3 rounded-xl bg-red-950/60 text-red-300 hover:text-white border border-red-500/30 text-xs font-bold transition"
                  title="Revert to Official CSI Standard Template"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {participationTemplate
                ? "Custom high-resolution template loaded. Overlays will align dynamically."
                : "Using official CSI SB RSET standard certificate template."}
            </p>
          </div>

          {/* Write-up Override */}
          <div className="space-y-1.5 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide">
                Certificate Write-up Text:
              </label>
              <button
                type="button"
                onClick={() => setParticipationWriteup(defaultParticipationWriteup)}
                className="text-[11px] text-cyan-400 hover:underline"
              >
                Reset Default
              </button>
            </div>
            <textarea
              rows={3}
              value={participationWriteup}
              onChange={(e) => {
                setParticipationWriteup(e.target.value);
                saveEventChanges(
                  firstPlaceWinners,
                  secondPlaceWinners,
                  thirdPlaceWinners,
                  appreciationTemplate,
                  participationTemplate,
                  appreciationWriteup,
                  e.target.value
                );
              }}
              className="w-full bg-black border border-cyan-500/40 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 leading-relaxed font-sans"
            />
            <p className="text-[11px] text-slate-400">
              Tokens supported: <code className="text-cyan-300">{"{NAME}"}</code>, <code className="text-cyan-300">{"{EVENT}"}</code>, <code className="text-cyan-300">{"{DATE}"}</code>.
            </p>
          </div>
        </div>
      </div>

      {/* LIVE VISUAL CERTIFICATE PREVIEW */}
      <div className="bg-[#12101C] rounded-2xl border border-purple-500/30 p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-500/20 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-400" />
              Live Interactive Certificate Preview
            </h2>
            <p className="text-slate-400 text-sm mt-0.5">
              Switch between templates or select any attendee to inspect the exact typography and text write-up.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Template Switcher */}
            <div className="flex rounded-xl bg-black p-1 border border-purple-500/30 text-xs font-bold">
              <button
                onClick={() => setPreviewTab("appreciation")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  previewTab === "appreciation"
                    ? "bg-amber-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Appreciation (Winner)
              </button>
              <button
                onClick={() => setPreviewTab("participation")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  previewTab === "participation"
                    ? "bg-cyan-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Participation
              </button>
            </div>

            {/* Attendee Select */}
            {attendees.length > 0 && (
              <select
                value={selectedPreviewUid}
                onChange={(e) => setSelectedPreviewUid(e.target.value)}
                className="bg-black border border-purple-500/40 text-xs text-white rounded-xl px-3 py-2 font-medium focus:outline-none"
              >
                {attendees.map((a) => (
                  <option key={a.uid || a.name} value={a.uid || a.name}>
                    {a.name} ({getWinnerPosition(a, winnersObject).toUpperCase()})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Visual Certificate Canvas */}
        <div className="bg-slate-950 p-4 sm:p-8 rounded-2xl border border-purple-500/30 flex items-center justify-center overflow-x-auto shadow-inner">
          <div
            className="w-[850px] h-[600px] shrink-0 bg-white text-black p-10 rounded-lg shadow-2xl relative flex flex-col justify-between overflow-hidden"
            style={{
              fontFamily: "'Times New Roman', Times, serif",
              backgroundImage:
                previewTab === "appreciation"
                  ? appreciationTemplate
                    ? `url(${appreciationTemplate})`
                    : undefined
                  : participationTemplate
                  ? `url(${participationTemplate})`
                  : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* If no custom template background, show official double border */}
            {!(
              (previewTab === "appreciation" && appreciationTemplate) ||
              (previewTab === "participation" && participationTemplate)
            ) && (
              <div className="absolute inset-3 border-[3px] border-[#18122B] pointer-events-none">
                <div className="absolute inset-1.5 border border-[#D97706]" />
              </div>
            )}

            {/* Header Logos & Institution Details (Only if default template) */}
            {!(
              (previewTab === "appreciation" && appreciationTemplate) ||
              (previewTab === "participation" && participationTemplate)
            ) && (
              <div className="relative z-10 flex items-center justify-between pt-2 px-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logos/rset_logo.png"
                  alt="RSET Logo"
                  className="h-16 w-auto object-contain"
                />

                <div className="text-center space-y-1">
                  <h3 className="font-bold text-[17px] text-[#18122B] tracking-wide">
                    RAJAGIRI SCHOOL OF ENGINEERING &amp; TECHNOLOGY (AUTONOMOUS)
                  </h3>
                  <h4 className="font-bold text-[13px] text-[#50466E] tracking-wider">
                    COMPUTER SOCIETY OF INDIA STUDENT BRANCH - RSET
                  </h4>
                  <p className="italic text-[10px] text-slate-500">
                    Rajagiri Valley, Kakkanad, Kochi, Kerala - 682039
                  </p>
                </div>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logos/csi_logo.png"
                  alt="CSI Logo"
                  className="h-14 w-14 object-contain"
                />
              </div>
            )}

            {/* Title Badge */}
            <div className="relative z-10 text-center pt-2">
              <h2
                className={`text-2xl sm:text-3xl font-extrabold tracking-widest uppercase ${
                  previewTab === "appreciation" ? "text-amber-700" : "text-[#18122B]"
                }`}
              >
                {previewTab === "appreciation"
                  ? "CERTIFICATE OF APPRECIATION"
                  : "CERTIFICATE OF PARTICIPATION"}
              </h2>
              <div className="w-32 h-0.5 bg-amber-600 mx-auto mt-2" />
            </div>

            {/* Body */}
            <div className="relative z-10 text-center space-y-3 px-8 my-auto">
              <p className="italic text-slate-700 text-[15px]">This is to proudly certify that</p>

              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-wide uppercase">
                  {currentPreviewAttendee?.gender ? `${currentPreviewAttendee.gender}. ` : ""}
                  {currentPreviewAttendee?.name || "RECIPIENT NAME"}
                </h1>
                <div className="w-72 h-[1.5px] bg-slate-900 mx-auto mt-1" />
              </div>

              <div className="max-w-2xl mx-auto text-slate-800 text-[14px] leading-relaxed pt-2">
                {previewTab === "appreciation" ? (
                  <p>
                    {appreciationWriteup
                      .replace(
                        /{NAME}/g,
                        `${currentPreviewAttendee?.gender ? currentPreviewAttendee.gender + ". " : ""}${currentPreviewAttendee?.name || "Participant"}`
                      )
                      .replace(/{EVENT}/g, `"${event.event_name}"`)
                      .replace(
                        /{POSITION}/g,
                        currentPreviewPosition === "1st"
                          ? "First"
                          : currentPreviewPosition === "2nd"
                          ? "Second"
                          : currentPreviewPosition === "3rd"
                          ? "Third"
                          : "First"
                      )
                      .replace(/{DATE}/g, formatFullDateWithDay(event.event_date))}
                  </p>
                ) : (
                  <p>
                    {participationWriteup
                      .replace(
                        /{NAME}/g,
                        `${currentPreviewAttendee?.gender ? currentPreviewAttendee.gender + ". " : ""}${currentPreviewAttendee?.name || "Participant"}`
                      )
                      .replace(/{EVENT}/g, `"${event.event_name}"`)
                      .replace(/{DATE}/g, formatFullDateWithDay(event.event_date))}
                  </p>
                )}
              </div>
            </div>

            {/* Signatures */}
            <div className="relative z-10 flex items-end justify-between px-10 pb-4 text-center text-xs">
              <div className="space-y-1">
                <div className="w-36 border-b border-slate-400 mb-1" />
                <p className="font-bold text-slate-900">Dr. Neeba E A</p>
                <p className="text-[10px] text-slate-600">Branch Counselor, CSI SB RSET</p>
              </div>

              <div className="space-y-1">
                <div className="w-36 border-b border-slate-400 mb-1" />
                <p className="font-bold text-slate-900">
                  {event.faculty_in_charge || "Dr. Tripti C"}
                </p>
                <p className="text-[10px] text-slate-600">Faculty Coordinator, CSI SB RSET</p>
              </div>

              <div className="space-y-1">
                <div className="w-36 border-b border-slate-400 mb-1" />
                <p className="font-bold text-slate-900">Student Chair</p>
                <p className="text-[10px] text-slate-600">CSI Student Branch, RSET</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ALL VERIFIED ATTENDEES & INDIVIDUAL CERTIFICATE DOWNLOAD TABLE */}
      <div className="bg-[#12101C] rounded-2xl border border-purple-500/30 p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-500/20 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              Verified Feedback Respondent Roster ({attendees.length})
            </h2>
            <p className="text-slate-400 text-sm mt-0.5">
              Verified attendees mapped from your Feedback Form. Generate or download any student&apos;s certificate individually.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by name, UID, branch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black border border-purple-500/40 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 font-medium"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-purple-500/30 text-slate-400 uppercase tracking-wider bg-black/40">
                <th className="py-3 px-3 font-semibold text-center w-12">#</th>
                <th className="py-3 px-3 font-semibold">Name (As In Certificate)</th>
                <th className="py-3 px-3 font-semibold">UID / Email</th>
                <th className="py-3 px-3 font-semibold">Branch &amp; Year</th>
                <th className="py-3 px-3 font-semibold text-center">Certificate Type</th>
                <th className="py-3 px-3 font-semibold text-right">Individual Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-500/10">
              {filteredAttendees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 italic">
                    {attendees.length === 0
                      ? "No attendees synced yet. Click \"Sync Latest Feedback\" or \"Load Sample Attendees\" above."
                      : "No attendees matching your search filter."}
                  </td>
                </tr>
              ) : (
                filteredAttendees.map((att, idx) => {
                  const pos = getWinnerPosition(att, winnersObject);
                  const isWinner = pos === "1st" || pos === "2nd" || pos === "3rd";

                  return (
                    <tr
                      key={att.uid || att.name + idx}
                      className="hover:bg-purple-950/20 transition group"
                    >
                      <td className="py-3 px-3 text-center text-slate-500 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 font-bold text-white">
                        <span className="flex items-center gap-1.5">
                          {att.name}
                          {isWinner && <span className="text-sm">🏆</span>}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">
                        <div>{att.uid || "—"}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-xs">{att.email || ""}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        <span className="font-semibold text-cyan-300">{att.branch || "CSE"}</span>{" "}
                        <span className="text-slate-500">({att.year_of_study || "—"})</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {pos === "1st" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 text-[11px]">
                            🥇 1st Place (Appreciation)
                          </span>
                        ) : pos === "2nd" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-400/20 text-slate-200 font-bold border border-slate-400/40 text-[11px]">
                            🥈 2nd Place (Appreciation)
                          </span>
                        ) : pos === "3rd" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-700/20 text-amber-400 font-bold border border-amber-700/40 text-[11px]">
                            🥉 3rd Place (Appreciation)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 font-semibold border border-cyan-500/30 text-[11px]">
                            📜 Participation
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => {
                            exportSingleCertificatePdf({
                              attendee: att,
                              eventName: event.event_name,
                              eventDate: event.event_date,
                              venue: event.venue,
                              position: pos,
                              facultyCoordinator: event.faculty_in_charge,
                              templateImage:
                                isWinner && appreciationTemplate
                                  ? appreciationTemplate
                                  : !isWinner && participationTemplate
                                  ? participationTemplate
                                  : undefined,
                              customWriteup: isWinner ? appreciationWriteup : participationWriteup,
                            });
                          }}
                          className="px-3 py-1.5 rounded-lg bg-purple-900/40 hover:bg-purple-800 text-purple-200 border border-purple-500/40 text-xs font-bold inline-flex items-center gap-1.5 transition"
                          title={`Download certificate for ${att.name}`}
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
