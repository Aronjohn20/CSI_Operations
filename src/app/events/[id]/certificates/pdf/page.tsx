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
  extractPptxData,
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

  // Certificate Slide Template Images (Appreciation for Winners, Participation for Participants)
  const [appreciationSlideBg, setAppreciationSlideBg] = useState<string>("");
  const [participationSlideBg, setParticipationSlideBg] = useState<string>("");

  // Mode Selection: "appreciation" | "participation"
  const [activeTab, setActiveTab] = useState<"appreciation" | "participation">("appreciation");

  // Export Loading States
  const [isExportingWinners, setIsExportingWinners] = useState(false);
  const [isExportingParticipation, setIsExportingParticipation] = useState(false);
  const [isExportingMasterPdf, setIsExportingMasterPdf] = useState(false);

  // Selected Attendee for Preview
  const [previewAttendeeIndex, setPreviewAttendeeIndex] = useState<number>(0);
  const [fontLoaded, setFontLoaded] = useState(false);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load calligraphy script fonts matching the template's Palace Script MT
  useEffect(() => {
    if (typeof document === "undefined") return;
    const fontId = "certificate-cursive-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.href =
        "https://fonts.googleapis.com/css2?family=Alex+Brush&family=Allura&family=Great+Vibes&family=Pinyon+Script&display=swap";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    if (document.fonts) {
      document.fonts.ready.then(() => setFontLoaded(true)).catch(() => {});
    }
  }, []);

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
      const apprBg =
        templates?.appreciation_slide_url ||
        templates?.appreciation_template_data ||
        "";
      const partBg =
        templates?.participation_slide_url ||
        templates?.participation_template_data ||
        "";
      if (apprBg) setAppreciationSlideBg(apprBg);
      if (partBg) setParticipationSlideBg(partBg);
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

  // Apply loaded slide template
  const applyTemplateImage = (result: string) => {
    if (activeTab === "appreciation") {
      setAppreciationSlideBg(result);
    } else {
      setParticipationSlideBg(result);
    }

    if (event) {
      const updated: CSIEvent = {
        ...event,
        certificate_templates: {
          ...(event.certificate_templates || {}),
          ...(activeTab === "appreciation"
            ? {
                appreciation_slide_url: result,
                appreciation_template_data: result,
              }
            : {
                participation_slide_url: result,
                participation_template_data: result,
              }),
        },
      };
      setEvent(updated);
      updateEvent(updated);
    }

    setStatusNotice({
      type: "success",
      text: `Loaded ${activeTab === "appreciation" ? "Appreciation" : "Participation"} slide template successfully!`,
    });
  };

  // Clear loaded template for active tab
  const handleClearTemplate = () => {
    if (activeTab === "appreciation") {
      setAppreciationSlideBg("");
    } else {
      setParticipationSlideBg("");
    }

    if (event) {
      const updated: CSIEvent = {
        ...event,
        certificate_templates: {
          ...(event.certificate_templates || {}),
          ...(activeTab === "appreciation"
            ? {
                appreciation_slide_url: "",
                appreciation_template_data: "",
              }
            : {
                participation_slide_url: "",
                participation_template_data: "",
              }),
        },
      };
      setEvent(updated);
      updateEvent(updated);
    }

    setStatusNotice({
      type: "success",
      text: `Cleared ${activeTab === "appreciation" ? "Appreciation" : "Participation"} template. You can now upload a separate slide.`,
    });
  };

  // Handle uploading slide template image (PNG / JPG / PPTX)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith(".pptx")) {
      setStatusNotice({
        type: "success",
        text: "Extracting high-resolution slide template from PPTX...",
      });
      try {
        const { previewImageBase64 } = await extractPptxData(file);
        if (previewImageBase64) {
          applyTemplateImage(previewImageBase64);
          return;
        }
      } catch (err) {
        console.warn("Could not extract slide preview from PPTX:", err);
      }
    }

    const reader = new FileReader();
    reader.onload = () => {
      applyTemplateImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const activeTemplateBg = activeTab === "appreciation" ? appreciationSlideBg : participationSlideBg;

  // Draw Live Preview Canvas - Wipes out <<name>> and cleanly replaces with real name and dynamic position
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const nameToRender = formatCertificateName(currentPreviewAttendee?.name || "PARTICIPANT NAME");
    const currentWinnerPos = activeTab === "appreciation" ? getWinnerPosition(currentPreviewAttendee, winnersObject) : "participant";

    const renderCanvas = (img?: HTMLImageElement) => {
      canvas.width = 1920;
      canvas.height = 1080;

      if (img && img.width > 0) {
        ctx.drawImage(img, 0, 0, 1920, 1080);
      } else {
        // Fallback white certificate background
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

      // 1. Cleanly wipe out <<name>> placeholder while leaving the template's underline intact below
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(360, 420, 1200, 134);

      // 2. Draw student's name in exact PowerPoint gold gradient
      // Matching OpenXML: pos 0 = #CF9F1C, pos 100000 = #AA8021
      const textGrad = ctx.createLinearGradient(960 - 450, 0, 960 + 450, 0);
      textGrad.addColorStop(0, "#CF9F1C");
      textGrad.addColorStop(0.5, "#E8C862");
      textGrad.addColorStop(1, "#AA8021");
      ctx.fillStyle = textGrad;
      ctx.strokeStyle = textGrad;

      // 3. Palace Script MT (matches exact PowerPoint template font)
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      let fontSize = 135;
      ctx.font = `italic ${fontSize}px "Palace Script MT", "Pinyon Script", "Alex Brush", "Great Vibes", "Allura", cursive`;
      while (ctx.measureText(nameToRender).width > 1250 && fontSize > 70) {
        fontSize -= 3;
        ctx.font = `italic ${fontSize}px "Palace Script MT", "Pinyon Script", "Alex Brush", "Great Vibes", "Allura", cursive`;
      }

      // 4. Gold stroke of 2px + fill for distinct bold calligraphy
      ctx.lineJoin = "round";
      ctx.lineWidth = 2;
      ctx.strokeText(nameToRender, 960, 504);
      ctx.fillText(nameToRender, 960, 504);

      // 5. Dynamic Winner Position (1st, 2nd, 3rd) on Appreciation Certificate
      if (activeTab === "appreciation" && (currentWinnerPos === "1st" || currentWinnerPos === "2nd" || currentWinnerPos === "3rd")) {
        // Cleanly wipe out "3rd place" placeholder on Line 1 without touching Line 2 below or "has secured " on the left
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(475, 598, 145, 46);

        const num = currentWinnerPos === "1st" ? "1" : currentWinnerPos === "2nd" ? "2" : "3";
        const suffix = currentWinnerPos === "1st" ? "st" : currentWinnerPos === "2nd" ? "nd" : "rd";

        ctx.fillStyle = "#000000";
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";

        const startX = 477.5;
        // Main number: bold 33px Times New Roman
        ctx.font = 'bold 33px "Times New Roman", serif';
        ctx.fillText(num, startX, 630);
        const numW = ctx.measureText(num).width;

        // Superscript ordinal suffix: bold 22px Times New Roman
        ctx.font = 'bold 22px "Times New Roman", serif';
        ctx.fillText(suffix, startX + numW + 1, 618);
        const suffixW = ctx.measureText(suffix).width;

        // Word " place": bold 33px Times New Roman
        ctx.font = 'bold 33px "Times New Roman", serif';
        ctx.fillText(" place", startX + numW + suffixW + 1, 630);
      }
    };

    if (activeTemplateBg) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => renderCanvas(img);
      img.onerror = () => renderCanvas();
      img.src = activeTemplateBg;
    } else {
      renderCanvas();
    }
  }, [activeTemplateBg, currentPreviewAttendee, activeTab, fontLoaded, winnersObject]);

  // Helper to stamp a single certificate on an offscreen canvas and return Data URL
  const stampCertificate = async (
    name: string,
    position: "1st" | "2nd" | "3rd" | "participant",
    bgSrc?: string
  ): Promise<string> => {
    if (typeof document !== "undefined" && document.fonts) {
      try {
        await document.fonts.ready;
      } catch {
        // ignore
      }
    }

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

        // 1. Cleanly wipe out <<name>> placeholder while leaving template underline intact
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(360, 420, 1200, 134);

        // 2. Draw student's real name in Palace Script MT matching exact PowerPoint template font
        const formatted = formatCertificateName(name);
        const textGrad = ctx.createLinearGradient(960 - 450, 0, 960 + 450, 0);
        textGrad.addColorStop(0, "#CF9F1C");
        textGrad.addColorStop(0.5, "#E8C862");
        textGrad.addColorStop(1, "#AA8021");
        ctx.fillStyle = textGrad;
        ctx.strokeStyle = textGrad;

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        let fontSize = 135;
        ctx.font = `italic ${fontSize}px "Palace Script MT", "Pinyon Script", "Alex Brush", "Great Vibes", "Allura", cursive`;
        while (ctx.measureText(formatted).width > 1250 && fontSize > 70) {
          fontSize -= 3;
          ctx.font = `italic ${fontSize}px "Palace Script MT", "Pinyon Script", "Alex Brush", "Great Vibes", "Allura", cursive`;
        }

        // Gold stroke of 2px + fill for distinct bold calligraphy
        ctx.lineJoin = "round";
        ctx.lineWidth = 2;
        ctx.strokeText(formatted, 960, 504);
        ctx.fillText(formatted, 960, 504);

        // 3. Dynamic Winner Position (1st, 2nd, 3rd) on Appreciation Certificate
        if (position === "1st" || position === "2nd" || position === "3rd") {
          // Cleanly wipe out "3rd place" placeholder on Line 1 without touching Line 2 below or "has secured " on the left
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(475, 598, 145, 44);

          const num = position === "1st" ? "1" : position === "2nd" ? "2" : "3";
          const suffix = position === "1st" ? "st" : position === "2nd" ? "nd" : "rd";

          ctx.fillStyle = "#000000";
          ctx.textAlign = "left";
          ctx.textBaseline = "alphabetic";

          const startX = 477.5;
          // Main number: bold 33px Times New Roman
          ctx.font = 'bold 33px "Times New Roman", serif';
          ctx.fillText(num, startX, 630);
          const numW = ctx.measureText(num).width;

          // Superscript ordinal suffix: bold 22px Times New Roman
          ctx.font = 'bold 22px "Times New Roman", serif';
          ctx.fillText(suffix, startX + numW + 1, 617);
          const suffixW = ctx.measureText(suffix).width;

          // Word " place": bold 33px Times New Roman
          ctx.font = 'bold 33px "Times New Roman", serif';
          ctx.fillText(" place", startX + numW + suffixW + 1, 630);
        }

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

      const zip = new JSZip();

      for (let i = 0; i < list.length; i++) {
        const att = list[i];
        const pos = getWinnerPosition(att, winnersObject);
        const formatted = formatCertificateName(att.name);
        const safeName = formatted.replace(/[^a-zA-Z0-9_ -]/g, "").trim();

        const bgToUse = isWinners ? appreciationSlideBg : participationSlideBg;
        const dataUrl = await stampCertificate(att.name, pos, bgToUse);
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
        const pos = getWinnerPosition(list[i], winnersObject);
        const bgToUse = isWinners ? appreciationSlideBg : participationSlideBg;
        const dataUrl = await stampCertificate(list[i].name, pos, bgToUse);
        masterDoc.addImage(dataUrl, "JPEG", 0, 0, 297, 210);
      }

      const masterBlob = masterDoc.output("blob");
      // zip.file(`All_Certificates_${isWinners ? "Winners" : "Participation"}.pdf`, await masterBlob.arrayBuffer());

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
        text: `Exported ${list.length} ${isWinners ? "winner" : "participation"} certificate(s) to PDF archive!`,
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
      const bgToUse = isWinners ? appreciationSlideBg : participationSlideBg;

      const masterDoc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      for (let i = 0; i < targetAttendees.length; i++) {
        if (i > 0) masterDoc.addPage("a4", "landscape");
        const pos = getWinnerPosition(targetAttendees[i], winnersObject);
        const dataUrl = await stampCertificate(targetAttendees[i].name, pos, bgToUse);
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
        <span>Loading PDF Studio...</span>
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
      {/* Preload Google Cursive Calligraphy Fonts */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Alex+Brush&family=Allura&family=Great+Vibes&family=Pinyon+Script&display=swap"
      />
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
              <span>PDF Studio</span>
            </h1>
          </div>
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
        {/* Left Column: Template Background & Export Cards */}
        <div className="space-y-5">
          {/* Category Toggle */}
          <div className="bg-[#12101C] p-1.5 rounded-2xl border border-purple-500/30 grid grid-cols-2 gap-2 text-xs font-bold">
            <button
              onClick={() => {
                setActiveTab("appreciation");
                setPreviewAttendeeIndex(0);
              }}
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
              onClick={() => {
                setActiveTab("participation");
                setPreviewAttendeeIndex(0);
              }}
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

          {/* Dedicated Template Background Card */}
          <div className="bg-[#12101C] rounded-2xl border border-purple-500/30 p-5 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-purple-400" />
                <span>
                  {activeTab === "appreciation"
                    ? "Appreciation Template (Winners)"
                    : "Participation Template"}
                </span>
              </h3>
              {activeTemplateBg ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Loaded
                  </span>
                  <button
                    onClick={handleClearTemplate}
                    className="text-[11px] text-rose-400 hover:text-rose-300 underline font-medium ml-1"
                    title="Clear template for this tab"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <span className="text-[11px] font-medium text-amber-400/80">
                  No template
                </span>
              )}
            </div>

            {activeTab === "participation" && participationSlideBg && participationSlideBg === appreciationSlideBg && (
              <p className="text-[11px] text-amber-300 bg-amber-950/40 border border-amber-500/30 rounded-lg p-2.5 leading-relaxed">
                Notice: Participation is currently borrowing the Appreciation slide image. Click <strong>Clear</strong> or upload a separate Participation slide image/PPTX below.
              </p>
            )}

            <p className="text-xs text-slate-400 leading-relaxed">
              {activeTab === "appreciation"
                ? "Upload the slide image or PPTX for Appreciation Certificates. 1st, 2nd, and 3rd place positions and names are dynamically customized for each winner."
                : "Upload the slide image or PPTX for Participation Certificates. Each participant's name is dynamically stamped."}
            </p>

            <label className="flex items-center justify-center gap-2 p-3.5 rounded-xl border border-dashed border-purple-500/50 hover:border-purple-400 bg-black/40 text-purple-200 text-xs font-bold cursor-pointer transition">
              <Upload className="w-4 h-4 text-purple-400" />
              <span>
                Upload {activeTab === "appreciation" ? "Appreciation" : "Participation"} Slide (.png / .jpg / .pptx)
              </span>
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp, .pptx, application/vnd.openxmlformats-officedocument.presentationml.presentation"
                className="hidden"
                onChange={handleImageUpload}
              />
            </label>
          </div>

          {/* Export Action Card */}
          <div className="bg-gradient-to-br from-purple-950/60 to-indigo-950/60 rounded-2xl border border-purple-500/40 p-5 space-y-3.5 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-purple-300" />
              <span>Export {activeTab === "appreciation" ? "Winners" : "Participation"} Folder</span>
            </h3>

            <p className="text-xs text-slate-300">
              Generates individual PDFs for all {targetAttendees.length} {activeTab === "appreciation" ? "winner(s)" : "participant(s)"} packaged into a single ZIP folder.
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
                  ? "Generating PDFs..."
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
                <h3 className="text-sm font-bold text-white">Live Stamped Preview</h3>
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
                    {targetAttendees.map((a, i) => {
                      const pos = getWinnerPosition(a, winnersObject);
                      return (
                        <option key={a.uid || a.name} value={i}>
                          {formatCertificateName(a.name)}{activeTab === "appreciation" ? ` (${pos} Place)` : ""}
                        </option>
                      );
                    })}
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
              <span>Automatic Name Stamping • Zero Distortions</span>
              <span>100% Client-Side</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
