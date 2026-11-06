"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Award,
  Trophy,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  RotateCcw,
  X,
  Users,
} from "lucide-react";
import { CSIEvent, FeedbackAttendee } from "@/lib/types";
import { getEventById, updateEvent } from "@/lib/eventsStorage";
import {
  exportCertificatesZip,
  getWinnerPosition,
  formatCertificateName,
} from "@/lib/certificateExport";
import {
  mapGoogleSheetToFeedbackAttendees,
  generateMockFeedbackResponses,
} from "@/lib/feedbackFormGenerator";

export default function CertificateStudioPage() {
  const params = useParams();
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

  // Live Preview Controls
  const [previewTab, setPreviewTab] = useState<"appreciation" | "participation">("appreciation");
  const [selectedPreviewUid, setSelectedPreviewUid] = useState<string>("");

  // Export Loading States
  const [isExportingWinnersZip, setIsExportingWinnersZip] = useState(false);
  const [isExportingParticipationZip, setIsExportingParticipationZip] = useState(false);

  // Load event
  useEffect(() => {
    if (!eventId) return;
    const found = getEventById(eventId);
    if (found) {
      setEvent(found);
      const existingAttendees = found.feedback_attendees || [];
      setAttendees(existingAttendees);

      if (found.winners) {
        const toArr = (val?: string | string[]) =>
          Array.isArray(val) ? val : val ? [val] : [];
        setFirstPlaceWinners(toArr(found.winners.first_place));
        setSecondPlaceWinners(toArr(found.winners.second_place));
        setThirdPlaceWinners(toArr(found.winners.third_place));
      }

      if (found.certificate_templates) {
        setAppreciationTemplate(found.certificate_templates.appreciation_template_data || "");
        setParticipationTemplate(found.certificate_templates.participation_template_data || "");
      }

      if (existingAttendees.length > 0) {
        setSelectedPreviewUid(existingAttendees[0].uid || existingAttendees[0].name);
      }
    }
    setLoading(false);
  }, [eventId]);

  const saveEventChanges = (
    newFirst: string[],
    newSecond: string[],
    newThird: string[],
    newAppTemplate = appreciationTemplate,
    newPartTemplate = participationTemplate,
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
    const f = sample[0] ? [sample[0].uid || sample[0].name] : [];
    const s = sample[1] ? [sample[1].uid || sample[1].name] : [];
    const t = sample[2] ? [sample[2].uid || sample[2].name] : [];
    setFirstPlaceWinners(f);
    setSecondPlaceWinners(s);
    setThirdPlaceWinners(t);
    saveEventChanges(f, s, t, appreciationTemplate, participationTemplate, sample);

    setStatusNotice({
      type: "success",
      text: `Loaded ${sample.length} sample participants with verified names!`,
    });
    if (sample.length > 0) {
      setSelectedPreviewUid(sample[0].uid || sample[0].name);
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
        text: `Template for ${type === "appreciation" ? "Appreciation" : "Participation"} updated successfully!`,
      });
    };
    reader.readAsDataURL(file);
  };

  // Winner Toggle Logic
  const toggleWinner = (idOrName: string, place: "1st" | "2nd" | "3rd") => {
    let newFirst = [...firstPlaceWinners];
    let newSecond = [...secondPlaceWinners];
    let newThird = [...thirdPlaceWinners];

    newFirst = newFirst.filter((x) => x !== idOrName);
    newSecond = newSecond.filter((x) => x !== idOrName);
    newThird = newThird.filter((x) => x !== idOrName);

    if (place === "1st" && !firstPlaceWinners.includes(idOrName)) {
      newFirst.push(idOrName);
    } else if (place === "2nd" && !secondPlaceWinners.includes(idOrName)) {
      newSecond.push(idOrName);
    } else if (place === "3rd" && !thirdPlaceWinners.includes(idOrName)) {
      newThird.push(idOrName);
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

  // Currently Previewed Attendee
  const currentPreviewAttendee = useMemo(() => {
    if (!attendees || attendees.length === 0) return null;
    const found = attendees.find(
      (a) => (a.uid && a.uid === selectedPreviewUid) || a.name === selectedPreviewUid
    );
    return found || attendees[0];
  }, [attendees, selectedPreviewUid]);

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
        event.faculty_in_charge
      );
      setStatusNotice({
        type: "success",
        text: `Downloaded ${count} winner certificate(s) in "Winners_Appreciation_Certificates_${event.event_name}.zip"!`,
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
        event.faculty_in_charge
      );
      setStatusNotice({
        type: "success",
        text: `Downloaded ${count} participation certificate(s) in "Participation_Certificates_${event.event_name}.zip"!`,
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
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-csi-border pb-5">
        <div className="flex items-center space-x-4">
          <Link
            href={`/events/${event.id}`}
            className="w-10 h-10 rounded-xl bg-black border border-purple-500/30 flex items-center justify-center text-slate-300 hover:text-white hover:border-purple-400 transition"
            title="Back to Event Details"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Certificate Studio: {event.event_name}
            </h1>
          </div>
        </div>

        {/* Sync Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleSyncFromDriveSheet}
            disabled={isSyncing}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[15px] font-bold flex items-center gap-2 transition shadow-lg shadow-emerald-600/30 disabled:opacity-50"
            title="Pull latest feedback submissions directly from Google Drive Sheet"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Syncing..." : "Sync Latest Feedback"}</span>
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

      {/* TWO DOWNLOAD BUTTONS ONLY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* BUTTON 1: Winners ZIP */}
        <button
          onClick={handleDownloadWinnersZip}
          disabled={isExportingWinnersZip || totalWinnersCount === 0}
          className="p-5 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 hover:from-amber-500 hover:to-orange-600 text-white font-extrabold flex items-center justify-between transition shadow-xl shadow-amber-900/30 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-amber-200" />
            <div className="text-left">
              <div className="text-lg font-extrabold">Download Winners Folder</div>
              <div className="text-xs text-amber-100 font-normal">
                {totalWinnersCount} Winner(s) (1st, 2nd, 3rd Place)
              </div>
            </div>
          </div>
          <Download className="w-5 h-5 text-amber-200" />
        </button>

        {/* BUTTON 2: Participation ZIP */}
        <button
          onClick={handleDownloadParticipationZip}
          disabled={isExportingParticipationZip || totalParticipantsCount === 0}
          className="p-5 rounded-2xl bg-gradient-to-r from-cyan-600 via-teal-600 to-cyan-700 hover:from-cyan-500 hover:to-teal-500 text-white font-extrabold flex items-center justify-between transition shadow-xl shadow-cyan-900/30 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-3">
            <Award className="w-6 h-6 text-cyan-200" />
            <div className="text-left">
              <div className="text-lg font-extrabold">Download Participation Folder</div>
              <div className="text-xs text-cyan-100 font-normal">
                {totalParticipantsCount} Participant(s)
              </div>
            </div>
          </div>
          <Download className="w-5 h-5 text-cyan-200" />
        </button>
      </div>

      {/* COMPACT WINNER SELECTION (ONLY SHOWN WHEN PARTICIPANTS ARE LOADED) */}
      {attendees.length > 0 && (
        <div className="bg-[#12101C] rounded-2xl border border-purple-500/30 p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Select Winners ({attendees.length} participants loaded):</span>
            </span>
            <span className="text-xs text-slate-400 font-medium">
              1st: <strong className="text-amber-300">{firstPlaceWinners.length}</strong> • 2nd: <strong className="text-slate-300">{secondPlaceWinners.length}</strong> • 3rd: <strong className="text-amber-500">{thirdPlaceWinners.length}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1st Place Multi-Select */}
            <div className="bg-black/60 p-3 rounded-xl border border-amber-500/40 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                <span>🥇 1st Place</span>
                <span className="text-[11px] font-mono text-amber-400">{firstPlaceWinners.length}</span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                {attendees.map((a) => {
                  const key = a.uid || a.name;
                  const isChecked = firstPlaceWinners.includes(key);
                  return (
                    <label
                      key={key}
                      className={`flex items-center justify-between p-1.5 rounded text-xs cursor-pointer ${
                        isChecked ? "bg-amber-950/80 text-amber-200 font-bold" : "text-slate-300 hover:bg-slate-900"
                      }`}
                    >
                      <span className="truncate">{formatCertificateName(a.name)}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleWinner(key, "1st")}
                        className="rounded border-amber-500 text-amber-500 focus:ring-0 ml-2"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 2nd Place Multi-Select */}
            <div className="bg-black/60 p-3 rounded-xl border border-slate-400/40 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                <span>🥈 2nd Place</span>
                <span className="text-[11px] font-mono text-slate-300">{secondPlaceWinners.length}</span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                {attendees.map((a) => {
                  const key = a.uid || a.name;
                  const isChecked = secondPlaceWinners.includes(key);
                  return (
                    <label
                      key={key}
                      className={`flex items-center justify-between p-1.5 rounded text-xs cursor-pointer ${
                        isChecked ? "bg-slate-800 text-white font-bold" : "text-slate-300 hover:bg-slate-900"
                      }`}
                    >
                      <span className="truncate">{formatCertificateName(a.name)}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleWinner(key, "2nd")}
                        className="rounded border-slate-400 text-slate-400 focus:ring-0 ml-2"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 3rd Place Multi-Select */}
            <div className="bg-black/60 p-3 rounded-xl border border-amber-700/40 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-500">
                <span>🥉 3rd Place</span>
                <span className="text-[11px] font-mono text-amber-400">{thirdPlaceWinners.length}</span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                {attendees.map((a) => {
                  const key = a.uid || a.name;
                  const isChecked = thirdPlaceWinners.includes(key);
                  return (
                    <label
                      key={key}
                      className={`flex items-center justify-between p-1.5 rounded text-xs cursor-pointer ${
                        isChecked ? "bg-amber-950/60 text-amber-300 font-bold" : "text-slate-300 hover:bg-slate-900"
                      }`}
                    >
                      <span className="truncate">{formatCertificateName(a.name)}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleWinner(key, "3rd")}
                        className="rounded border-amber-700 text-amber-700 focus:ring-0 ml-2"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEMPLATE UPLOAD BOXES (CLEAN - NO WRITE-UP TEXT OR TOKEN BOILERPLATE) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Appreciation Template Box */}
        <div className="bg-[#12101C] rounded-2xl border border-amber-500/30 p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-amber-300 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              Certificate of Appreciation
            </h3>
            {appreciationTemplate && (
              <button
                onClick={() => {
                  setAppreciationTemplate("");
                  saveEventChanges(firstPlaceWinners, secondPlaceWinners, thirdPlaceWinners, "");
                }}
                className="text-xs text-red-400 hover:text-white flex items-center gap-1 font-bold"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>

          <label className="flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-amber-500/50 hover:border-amber-400 bg-black/40 text-amber-200 text-xs font-bold cursor-pointer transition">
            <Upload className="w-4 h-4 text-amber-400" />
            <span>
              {appreciationTemplate
                ? "Replace Appreciation Template (PNG / JPG)"
                : "Upload Appreciation Template (PNG / JPG)"}
            </span>
            <input
              type="file"
              accept="image/png, image/jpeg"
              className="hidden"
              onChange={(e) => handleTemplateUpload(e, "appreciation")}
            />
          </label>
        </div>

        {/* Participation Template Box */}
        <div className="bg-[#12101C] rounded-2xl border border-cyan-500/30 p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-cyan-300 flex items-center gap-2">
              <Award className="w-4 h-4 text-cyan-400" />
              Certificate of Participation
            </h3>
            {participationTemplate && (
              <button
                onClick={() => {
                  setParticipationTemplate("");
                  saveEventChanges(
                    firstPlaceWinners,
                    secondPlaceWinners,
                    thirdPlaceWinners,
                    appreciationTemplate,
                    ""
                  );
                }}
                className="text-xs text-red-400 hover:text-white flex items-center gap-1 font-bold"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>

          <label className="flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-cyan-500/50 hover:border-cyan-400 bg-black/40 text-cyan-200 text-xs font-bold cursor-pointer transition">
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>
              {participationTemplate
                ? "Replace Participation Template (PNG / JPG)"
                : "Upload Participation Template (PNG / JPG)"}
            </span>
            <input
              type="file"
              accept="image/png, image/jpeg"
              className="hidden"
              onChange={(e) => handleTemplateUpload(e, "participation")}
            />
          </label>
        </div>
      </div>

      {/* CERTIFICATE PREVIEW */}
      <div className="bg-[#12101C] rounded-2xl border border-purple-500/30 p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-500/20 pb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold text-white">Certificate Preview</h2>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Toggle Preview Template */}
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

            {/* Select Participant to Preview */}
            {attendees.length > 0 && (
              <select
                value={selectedPreviewUid}
                onChange={(e) => setSelectedPreviewUid(e.target.value)}
                className="bg-black border border-purple-500/40 text-xs text-white rounded-xl px-3 py-1.5 font-medium focus:outline-none"
              >
                {attendees.map((a) => (
                  <option key={a.uid || a.name} value={a.uid || a.name}>
                    {formatCertificateName(a.name)}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Visual Certificate Canvas */}
        <div className="bg-slate-950 p-4 sm:p-6 rounded-2xl border border-purple-500/30 flex items-center justify-center overflow-x-auto shadow-inner">
          <div
            className="w-[850px] h-[600px] shrink-0 bg-white text-black rounded-lg shadow-2xl relative flex flex-col justify-center items-center overflow-hidden"
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
            {/* If a custom template is loaded, ONLY stamp the formatted name exactly like the Python PPT script */}
            {(previewTab === "appreciation" ? appreciationTemplate : participationTemplate) ? (
              <div className="relative z-10 text-center w-full px-12 mt-12">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-wide uppercase drop-shadow-sm">
                  {currentPreviewAttendee
                    ? formatCertificateName(currentPreviewAttendee.name)
                    : "PARTICIPANT NAME"}
                </h1>
              </div>
            ) : (
              // Default template layout when no custom image is uploaded
              <div className="w-full h-full p-8 flex flex-col justify-between relative">
                <div className="absolute inset-3 border-[3px] border-[#18122B] pointer-events-none">
                  <div className="absolute inset-1.5 border border-[#D97706]" />
                </div>

                {/* Default Header */}
                <div className="relative z-10 flex items-center justify-between pt-2 px-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logos/rset_logo.png"
                    alt="RSET Logo"
                    className="h-14 w-auto object-contain"
                  />
                  <div className="text-center space-y-0.5">
                    <h3 className="font-bold text-[16px] text-[#18122B] tracking-wide">
                      RAJAGIRI SCHOOL OF ENGINEERING &amp; TECHNOLOGY (AUTONOMOUS)
                    </h3>
                    <h4 className="font-bold text-[12px] text-[#50466E] tracking-wider">
                      COMPUTER SOCIETY OF INDIA STUDENT BRANCH - RSET
                    </h4>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logos/csi_logo.png"
                    alt="CSI Logo"
                    className="h-12 w-12 object-contain"
                  />
                </div>

                {/* Default Title */}
                <div className="relative z-10 text-center">
                  <h2
                    className={`text-2xl font-extrabold tracking-widest uppercase ${
                      previewTab === "appreciation" ? "text-amber-700" : "text-[#18122B]"
                    }`}
                  >
                    {previewTab === "appreciation"
                      ? "CERTIFICATE OF APPRECIATION"
                      : "CERTIFICATE OF PARTICIPATION"}
                  </h2>
                  <div className="w-28 h-0.5 bg-amber-600 mx-auto mt-1.5" />
                </div>

                {/* Dynamic Formatted Name */}
                <div className="relative z-10 text-center space-y-2 px-8">
                  <p className="italic text-slate-700 text-sm">This is to proudly certify that</p>
                  <h1 className="text-3xl font-extrabold text-slate-900 tracking-wide uppercase">
                    {currentPreviewAttendee
                      ? formatCertificateName(currentPreviewAttendee.name)
                      : "PARTICIPANT NAME"}
                  </h1>
                  <p className="text-slate-800 text-xs max-w-xl mx-auto pt-1">
                    for outstanding contribution and participation in &quot;{event.event_name}&quot;
                    organized by the Computer Society of India (CSI) Student Branch, RSET.
                  </p>
                </div>

                {/* Default Signatures */}
                <div className="relative z-10 flex items-end justify-between px-8 pb-2 text-center text-[11px]">
                  <div className="space-y-0.5">
                    <div className="w-28 border-b border-slate-400 mb-1" />
                    <p className="font-bold text-slate-900">Dr. Neeba E A</p>
                    <p className="text-[10px] text-slate-600">Branch Counselor</p>
                  </div>
                  <div className="space-y-0.5">
                    <div className="w-28 border-b border-slate-400 mb-1" />
                    <p className="font-bold text-slate-900">{event.faculty_in_charge || "Dr. Tripti C"}</p>
                    <p className="text-[10px] text-slate-600">Faculty Coordinator</p>
                  </div>
                  <div className="space-y-0.5">
                    <div className="w-28 border-b border-slate-400 mb-1" />
                    <p className="font-bold text-slate-900">Student Chair</p>
                    <p className="text-[10px] text-slate-600">CSI SB RSET</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
