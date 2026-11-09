"use client";

import { useEffect, useState, useMemo, useRef } from "react";
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
  FileText,
  Sliders,
  Eye,
  X,
  FileCheck2,
} from "lucide-react";
import jsPDF from "jspdf";
import JSZip from "jszip";
import { CSIEvent, FeedbackAttendee } from "@/lib/types";
import {
  getEventById,
  updateEvent,
  uploadGeneratedCertificatesToSupabase,
} from "@/lib/eventsStorage";
import {
  formatCertificateName,
  getWinnerPosition,
  formatDayFirstOrdinalDate,
} from "@/lib/certificateExport";

export default function CertificatePdfStudioPage() {
  const params = useParams();
  const eventId = params?.id as string;

  const [event, setEvent] = useState<CSIEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusNotice, setStatusNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Attendees & Winners
  const [attendees, setAttendees] = useState<FeedbackAttendee[]>([]);
  const [firstPlaceWinners, setFirstPlaceWinners] = useState<string[]>([]);
  const [secondPlaceWinners, setSecondPlaceWinners] = useState<string[]>([]);
  const [thirdPlaceWinners, setThirdPlaceWinners] = useState<string[]>([]);

  // High-Res Slide Background Images (Data URLs or Supabase URLs)
  const [appreciationBg, setAppreciationBg] = useState<string>("");
  const [participationBg, setParticipationBg] = useState<string>("");

  // Mode Selection: "appreciation" | "participation"
  const [activeTab, setActiveTab] = useState<"appreciation" | "participation">("appreciation");

  // Typography & Positioning Controls
  const [namePositionY, setNamePositionY] = useState<number>(44); // Percentage from top (44%)
  const [fontSize, setFontSize] = useState<number>(36); // pt
  const [fontColor, setFontColor] = useState<string>("#1e1b4b"); // Navy / Dark slate
  const [isBold, setIsBold] = useState<boolean>(true);
  const [fontFamily, setFontFamily] = useState<"times" | "helvetica">("times");

  // Export Loading States
  const [isExportingWinners, setIsExportingWinners] = useState(false);
  const [isExportingParticipation, setIsExportingParticipation] = useState(false);
  const [isExportingMasterPdf, setIsExportingMasterPdf] = useState(false);

  // Selected Attendee for Preview
  const [previewAttendeeIndex, setPreviewAttendeeIndex] = useState<number>(0);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load Event
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

      // Check for saved slide background images or templates
      const templates = found.certificate_templates;
      if (templates?.appreciation_slide_url) {
        setAppreciationBg(templates.appreciation_slide_url);
      } else if (templates?.appreciation_template_data) {
        setAppreciationBg(templates.appreciation_template_data);
      }

      if (templates?.participation_slide_url) {
        setParticipationBg(templates.participation_slide_url);
      } else if (templates?.participation_template_data) {
        setParticipationBg(templates.participation_template_data);
      }
    }
    setLoading(false);
  }, [eventId]);

  const winnersObject = useMemo(() => {
    return {
      first_place: firstPlaceWinners,
      second_place: secondPlaceWinners,
      third_place: thirdPlaceWinners,
    };
  }, [firstPlaceWinners, secondPlaceWinners, thirdPlaceWinners]);

  const targetAttendees = useMemo(() => {
    if (activeTab === "appreciation") {
      return attendees.filter((a) => {
        const pos = getWinnerPosition(a, winnersObject);
        return pos === "1st" || pos === "2nd" || pos === "3rd";
      });
    }
    return attendees.filter((a) => {
      const pos = getWinnerPosition(a, winnersObject);
      return pos === "participant";
    });
  }, [attendees, activeTab, winnersObject]);

  const currentPreviewAttendee = useMemo(() => {
    if (targetAttendees.length > 0) {
      return targetAttendees[Math.min(previewAttendeeIndex, targetAttendees.length - 1)];
    }
    return attendees[0] || ({ name: "Aron", uid: "U2303054" } as FeedbackAttendee);
  }, [targetAttendees, attendees, previewAttendeeIndex]);

  // Handle uploading high-res slide background image (PNG / JPG)
  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "appreciation" | "participation"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (type === "appreciation") {
        setAppreciationBg(result);
      } else {
        setParticipationBg(result);
      }

      // Save to event
      if (event) {
        const updated: CSIEvent = {
          ...event,
          certificate_templates: {
            ...(event.certificate_templates || {}),
            ...(type === "appreciation"
              ? { appreciation_slide_url: result, appreciation_template_data: result }
              : { participation_slide_url: result, participation_template_data: result }),
          },
        };
        setEvent(updated);
        updateEvent(updated);
      }

      setStatusNotice({
        type: "success",
        text: `Loaded high-resolution background for ${type} certificates!`,
      });
    };
    reader.readAsDataURL(file);
  };

  // Draw Live Preview Canvas
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const activeBg = activeTab === "appreciation" ? appreciationBg : participationBg;
    const nameToRender = formatCertificateName(currentPreviewAttendee?.name || "PARTICIPANT NAME");

    const renderCanvas = (img?: HTMLImageElement) => {
      canvas.width = 1920;
      canvas.height = 1080;

      if (img && img.width > 0) {
        ctx.drawImage(img, 0, 0, 1920, 1080);
      } else {
        // Fallback placeholder card
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 1920, 1080);
        ctx.strokeStyle = "#d97706";
        ctx.lineWidth = 14;
        ctx.strokeRect(40, 40, 1840, 1000);

        ctx.fillStyle = "#1e1b4b";
        ctx.font = "bold 44px 'Times New Roman', serif";
        ctx.textAlign = "center";
        ctx.fillText(
          activeTab === "appreciation"
            ? "CERTIFICATE OF APPRECIATION"
            : "CERTIFICATE OF PARTICIPATION",
          960,
          260
        );
      }

      // Stamp Participant Name
      const targetY = (namePositionY / 100) * 1080;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = fontColor;
      const weight = isBold ? "bold " : "";
      const family = fontFamily === "times" ? "'Times New Roman', serif" : "sans-serif";
      // Scale font size proportionally for 1080p canvas
      const scaledFontSize = Math.round(fontSize * 1.8);
      ctx.font = `${weight}${scaledFontSize}px ${family}`;

      ctx.fillText(nameToRender, 960, targetY);

      // Decorative underline
      const textWidth = ctx.measureText(nameToRender).width;
      ctx.strokeStyle = fontColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(960 - textWidth / 2 - 15, targetY + scaledFontSize * 0.55);
      ctx.lineTo(960 + textWidth / 2 + 15, targetY + scaledFontSize * 0.55);
      ctx.stroke();
    };

    if (activeBg) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => renderCanvas(img);
      img.onerror = () => renderCanvas();
      img.src = activeBg;
    } else {
      renderCanvas();
    }
  }, [
    activeTab,
    appreciationBg,
    participationBg,
    currentPreviewAttendee,
    namePositionY,
    fontSize,
    fontColor,
    isBold,
    fontFamily,
  ]);

  // Helper to stamp a single certificate on an offscreen canvas and return Data URL
  const stampCertificate = (name: string, bgSrc?: string): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve("");

      const draw = (img?: HTMLImageElement) => {
        if (img && img.width > 0) {
          ctx.drawImage(img, 0, 0, 1920, 1080);
        } else {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, 1920, 1080);
        }

        const targetY = (namePositionY / 100) * 1080;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = fontColor;
        const weight = isBold ? "bold " : "";
        const family = fontFamily === "times" ? "'Times New Roman', serif" : "sans-serif";
        const scaledFontSize = Math.round(fontSize * 1.8);
        ctx.font = `${weight}${scaledFontSize}px ${family}`;

        const formatted = formatCertificateName(name);
        ctx.fillText(formatted, 960, targetY);

        const textWidth = ctx.measureText(formatted).width;
        ctx.strokeStyle = fontColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(960 - textWidth / 2 - 15, targetY + scaledFontSize * 0.55);
        ctx.lineTo(960 + textWidth / 2 + 15, targetY + scaledFontSize * 0.55);
        ctx.stroke();

        resolve(canvas.toDataURL("image/jpeg", 0.96));
      };

      if (bgSrc) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => draw(img);
        img.onerror = () => draw();
        img.src = bgSrc;
      } else {
        draw();
      }
    });
  };

  // Export 1: ZIP containing Individual PDFs
  const handleExportZip = async (type: "winners" | "participation") => {
    if (!event) return;
    const isWinners = type === "winners";
    if (isWinners) setIsExportingWinners(true);
    else setIsExportingParticipation(true);
    setStatusNotice(null);

    try {
      const list = attendees.filter((a) => {
        const pos = getWinnerPosition(a, winnersObject);
        return isWinners ? pos === "1st" || pos === "2nd" || pos === "3rd" : pos === "participant";
      });

      if (list.length === 0) {
        throw new Error(`No ${isWinners ? "winners" : "participants"} found in the attendee list.`);
      }

      const bgSrc = isWinners ? appreciationBg : participationBg;
      const zip = new JSZip();

      for (let i = 0; i < list.length; i++) {
        const att = list[i];
        const formatted = formatCertificateName(att.name);
        const safeName = formatted.replace(/[^a-zA-Z0-9_ -]/g, "").trim();

        const dataUrl = await stampCertificate(att.name, bgSrc);
        const doc = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: "a4",
        });
        doc.addImage(dataUrl, "JPEG", 0, 0, 297, 210);
        zip.file(`${safeName}.pdf`, doc.output("arraybuffer"));
      }

      // Also generate combined master PDF
      const masterDoc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      for (let i = 0; i < list.length; i++) {
        if (i > 0) masterDoc.addPage("a4", "landscape");
        const dataUrl = await stampCertificate(list[i].name, bgSrc);
        masterDoc.addImage(dataUrl, "JPEG", 0, 0, 297, 210);
      }

      const masterBlob = masterDoc.output("blob");
      zip.file(`All_Certificates_${isWinners ? "Winners" : "Participation"}.pdf`, await masterBlob.arrayBuffer());

      // Download ZIP
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      const cleanEvent = event.event_name.replace(/[^a-zA-Z0-9_-]/g, "_");
      a.download = `${isWinners ? "Winners" : "Participation"}_PDF_Certificates_${cleanEvent}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Background upload to Supabase Storage
      try {
        const pdfUrl = await uploadGeneratedCertificatesToSupabase(masterBlob, event.id, type, "pdf");
        if (pdfUrl) {
          const updated: CSIEvent = {
            ...event,
            certificate_templates: {
              ...(event.certificate_templates || {}),
              ...(isWinners
                ? { winners_pdf_url: pdfUrl, winners_pdf_count: list.length }
                : { participation_pdf_url: pdfUrl, participation_pdf_count: list.length }),
              last_generated_at: new Date().toISOString(),
            },
          };
          setEvent(updated);
          updateEvent(updated);
        }
      } catch {}

      setStatusNotice({
        type: "success",
        text: `Exported ${list.length} ${isWinners ? "winner" : "participation"} certificate(s) in high-resolution PDF!`,
      });
    } catch (err: any) {
      setStatusNotice({
        type: "error",
        text: err.message || "Failed to generate certificates PDF archive.",
      });
    } finally {
      if (isWinners) setIsExportingWinners(false);
      else setIsExportingParticipation(false);
    }
  };

  // Export 2: Download Combined Master PDF directly
  const handleDownloadMasterPdf = async () => {
    if (!event || targetAttendees.length === 0) return;
    setIsExportingMasterPdf(true);
    setStatusNotice(null);

    try {
      const isWinners = activeTab === "appreciation";
      const bgSrc = isWinners ? appreciationBg : participationBg;

      const masterDoc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      for (let i = 0; i < targetAttendees.length; i++) {
        if (i > 0) masterDoc.addPage("a4", "landscape");
        const dataUrl = await stampCertificate(targetAttendees[i].name, bgSrc);
        masterDoc.addImage(dataUrl, "JPEG", 0, 0, 297, 210);
      }

      const cleanEvent = event.event_name.replace(/[^a-zA-Z0-9_-]/g, "_");
      masterDoc.save(`All_Certificates_${isWinners ? "Winners" : "Participation"}_${cleanEvent}.pdf`);

      setStatusNotice({
        type: "success",
        text: `Downloaded master multi-page PDF with ${targetAttendees.length} certificate(s)!`,
      });
    } catch (err: any) {
      setStatusNotice({
        type: "error",
        text: err.message || "Failed to compile multi-page PDF.",
      });
    } finally {
      setIsExportingMasterPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08070E] flex items-center justify-center text-white">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-400 mr-3" />
        <span>Loading High-Res PDF Studio...</span>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#08070E] flex flex-col items-center justify-center text-white gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <h2 className="text-xl font-bold">Event not found</h2>
        <Link href="/events" className="text-purple-400 underline">
          Return to Events
        </Link>
      </div>
    );
  }

  const totalWinnersCount = attendees.filter((a) => {
    const pos = getWinnerPosition(a, winnersObject);
    return pos === "1st" || pos === "2nd" || pos === "3rd";
  }).length;
  const totalParticipantsCount = attendees.length - totalWinnersCount;

  return (
    <div className="min-h-screen bg-[#08070E] text-slate-100 p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-500/20 pb-5">
        <div className="space-y-1">
          <Link
            href={`/events/${event.id}/certificates`}
            className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition mb-1 font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Certificate Studio (PPTX)</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <FileCheck2 className="w-7 h-7 text-purple-400" />
              <span>High-Res PDF Studio</span>
            </h1>
            <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-purple-950/70 text-purple-300 border border-purple-500/40">
              100% Client-Side Engine
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Export flawless vector PDFs with pristine ornate gold borders, 4K slide backgrounds, and zero Linux/Vercel dependencies.
          </p>
        </div>

        {/* Master PDF Download Button */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleDownloadMasterPdf}
            disabled={isExportingMasterPdf || targetAttendees.length === 0}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-purple-900/30 disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isExportingMasterPdf ? "animate-spin" : ""}`} />
            <span>{isExportingMasterPdf ? "Compiling PDF..." : "Download Combined PDF"}</span>
          </button>
        </div>
      </div>

      {/* Status Notice Banner */}
      {statusNotice && (
        <div
          className={`p-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between border ${
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

      {/* Main Grid: Controls + Live Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Template Background & Controls */}
        <div className="space-y-5">
          {/* Category Toggle */}
          <div className="bg-[#12101C] p-1.5 rounded-2xl border border-purple-500/30 grid grid-cols-2 gap-2 text-xs font-bold">
            <button
              onClick={() => setActiveTab("appreciation")}
              className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition ${
                activeTab === "appreciation"
                  ? "bg-amber-600 text-white shadow-lg shadow-amber-900/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Winners ({totalWinnersCount})</span>
            </button>
            <button
              onClick={() => setActiveTab("participation")}
              className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition ${
                activeTab === "participation"
                  ? "bg-cyan-600 text-white shadow-lg shadow-cyan-900/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Participants ({totalParticipantsCount})</span>
            </button>
          </div>

          {/* Template Background Card */}
          <div className="bg-[#12101C] rounded-2xl border border-purple-500/30 p-5 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-purple-400" />
                <span>
                  {activeTab === "appreciation"
                    ? "Appreciation Slide Background"
                    : "Participation Slide Background"}
                </span>
              </h3>
              {(activeTab === "appreciation" ? appreciationBg : participationBg) && (
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Loaded
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Upload the high-resolution slide image (saved from PowerPoint via <em>File ➔ Save As ➔ PNG</em>). All ornate gold borders and logos are preserved in crystal clarity.
            </p>

            <label className="flex items-center justify-center gap-2 p-3.5 rounded-xl border border-dashed border-purple-500/50 hover:border-purple-400 bg-black/40 text-purple-200 text-xs font-bold cursor-pointer transition">
              <Upload className="w-4 h-4 text-purple-400" />
              <span>Upload 4K Slide Image (.png / .jpg)</span>
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
                onChange={(e) => handleImageUpload(e, activeTab)}
              />
            </label>
          </div>

          {/* Typography & Position Sliders */}
          <div className="bg-[#12101C] rounded-2xl border border-purple-500/30 p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                <span>Name Placement &amp; Style</span>
              </h3>
            </div>

            {/* Vertical Position Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-300">Vertical Position (Y):</span>
                <span className="text-purple-300 font-mono font-bold">{namePositionY}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="75"
                value={namePositionY}
                onChange={(e) => setNamePositionY(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>

            {/* Font Size Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-300">Font Size:</span>
                <span className="text-purple-300 font-mono font-bold">{fontSize} pt</span>
              </div>
              <input
                type="range"
                min="20"
                max="60"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>

            {/* Font Family & Color */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Font Family</label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value as "times" | "helvetica")}
                  className="w-full px-2.5 py-1.5 bg-black border border-purple-500/40 rounded-lg text-xs text-white"
                >
                  <option value="times">Times New Roman</option>
                  <option value="helvetica">Clean Sans-Serif</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Font Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={fontColor}
                    onChange={(e) => setFontColor(e.target.value)}
                    className="w-8 h-8 rounded border border-purple-500/40 bg-black cursor-pointer"
                  />
                  <span className="text-xs font-mono text-slate-300">{fontColor}</span>
                </div>
              </div>
            </div>

            {/* Bold Toggle */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="boldToggle"
                checked={isBold}
                onChange={(e) => setIsBold(e.target.checked)}
                className="accent-purple-500 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="boldToggle" className="text-xs font-semibold text-slate-300 cursor-pointer">
                Bold text
              </label>
            </div>
          </div>

          {/* Export Action Card */}
          <div className="bg-gradient-to-br from-purple-950/60 to-indigo-950/60 rounded-2xl border border-purple-500/40 p-5 space-y-3.5 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-purple-300" />
              <span>Export {activeTab === "appreciation" ? "Winners" : "Participation"} Folder</span>
            </h3>

            <p className="text-xs text-slate-300">
              Generates individual high-resolution PDFs for all {targetAttendees.length} {activeTab === "appreciation" ? "winner(s)" : "participant(s)"} packaged into a single ZIP folder.
            </p>

            <button
              onClick={() => handleExportZip(activeTab === "appreciation" ? "winners" : "participation")}
              disabled={
                (activeTab === "appreciation" ? isExportingWinners : isExportingParticipation) ||
                targetAttendees.length === 0
              }
              className={`w-full py-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition shadow-lg ${
                activeTab === "appreciation"
                  ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-900/40"
                  : "bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white shadow-cyan-900/40"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  (activeTab === "appreciation" ? isExportingWinners : isExportingParticipation)
                    ? "animate-spin"
                    : ""
                }`}
              />
              <span>
                {(activeTab === "appreciation" ? isExportingWinners : isExportingParticipation)
                  ? "Stamping & Generating PDFs..."
                  : `Export ${activeTab === "appreciation" ? "Winners" : "Participation"} ZIP`}
              </span>
            </button>
          </div>
        </div>

        {/* Right Column (2 spans): Interactive Live Stamped Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#12101C] rounded-2xl border border-purple-500/30 p-5 space-y-3 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-500/20 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Interactive Stamped Canvas</h3>
              </div>

              {/* Select Attendee to Preview */}
              {targetAttendees.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Previewing:</span>
                  <select
                    value={previewAttendeeIndex}
                    onChange={(e) => setPreviewAttendeeIndex(Number(e.target.value))}
                    className="bg-black border border-purple-500/40 text-xs text-white rounded-lg px-2.5 py-1 font-medium focus:outline-none"
                  >
                    {targetAttendees.map((a, i) => (
                      <option key={a.uid || a.name} value={i}>
                        {formatCertificateName(a.name)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Canvas Container */}
            <div className="bg-slate-950 p-2 sm:p-4 rounded-xl border border-purple-500/30 flex items-center justify-center overflow-hidden">
              <canvas
                ref={previewCanvasRef}
                className="w-full h-auto object-contain rounded-lg shadow-2xl border border-purple-500/20"
                style={{ aspectRatio: "16/9" }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>Rendering at 1920 × 1080 (1080p Crystal Print Quality)</span>
              <span>100% Client-Side • Runs on all devices</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

