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
  FileCode,
  FileSpreadsheet,
  FileText,
  Link2,
  Clipboard,
  ShieldCheck,
  Cloud,
} from "lucide-react";
import { CSIEvent, FeedbackAttendee } from "@/lib/types";
import {
  getEventById,
  updateEvent,
  uploadCertificateTemplateToSupabase,
  uploadGeneratedCertificatesToSupabase,
} from "@/lib/eventsStorage";
import {
  exportCertificatesZip,
  getWinnerPosition,
  formatCertificateName,
  formatDayFirstOrdinalDate,
  extractPptxData,
  createPptxWithName,
  createMultiSlidePptx,
  arrayBufferToBase64,
  base64ToUint8Array,
  generateBatchCertificatesBlob,
} from "@/lib/certificateExport";
import {
  mapGoogleSheetToFeedbackAttendees,
  generateMockFeedbackResponses,
  parseCsvText,
  parseXlsxBuffer,
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

  // PPTX Templates (Raw ArrayBuffer & File info for <<name>> replacement)
  const [appreciationPptxFile, setAppreciationPptxFile] = useState<{
    buffer: ArrayBuffer;
    name: string;
  } | null>(null);
  const [participationPptxFile, setParticipationPptxFile] = useState<{
    buffer: ArrayBuffer;
    name: string;
  } | null>(null);

  // Preview Templates (Base64 data URLs extracted from PPTX or images)
  const [appreciationTemplate, setAppreciationTemplate] = useState<string>("");
  const [participationTemplate, setParticipationTemplate] = useState<string>("");

  // Live Preview Controls
  const [previewTab, setPreviewTab] = useState<"appreciation" | "participation">("appreciation");
  const [selectedPreviewUid, setSelectedPreviewUid] = useState<string>("");
  const [liveSlidePreview, setLiveSlidePreview] = useState<string>("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Import Responses Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importMethod, setImportMethod] = useState<"file" | "sheet" | "paste">("file");
  const [importSheetUrl, setImportSheetUrl] = useState("");
  const [importPastedText, setImportPastedText] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  // Export Loading States
  const [isExportingWinnersZip, setIsExportingWinnersZip] = useState(false);
  const [isExportingParticipationZip, setIsExportingParticipationZip] = useState(false);
  const [isCompilingToCloud, setIsCompilingToCloud] = useState(false);

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

      // Restore PPTX templates: first check Supabase permanent Storage Bucket URLs, then session storage
      if (found.certificate_templates?.appreciation_pptx_url) {
        fetch(found.certificate_templates.appreciation_pptx_url)
          .then((res) => {
            if (!res.ok) throw new Error("Storage template not accessible");
            return res.arrayBuffer();
          })
          .then((buffer) => {
            setAppreciationPptxFile({
              buffer,
              name: found.certificate_templates?.appreciation_filename || "appreciation.pptx",
            });
          })
          .catch((err) => {
            console.warn("Could not load appreciation PPTX from Supabase bucket:", err);
            try {
              const apprB64 = sessionStorage.getItem(`csi_appr_pptx_${eventId}`);
              const apprName = sessionStorage.getItem(`csi_appr_pptx_name_${eventId}`) || "appreciation.pptx";
              if (apprB64) {
                const u8 = base64ToUint8Array(apprB64);
                setAppreciationPptxFile({ buffer: u8.buffer as ArrayBuffer, name: apprName });
              }
            } catch {}
          });
      } else {
        try {
          const apprB64 = sessionStorage.getItem(`csi_appr_pptx_${eventId}`);
          const apprName = sessionStorage.getItem(`csi_appr_pptx_name_${eventId}`) || "appreciation.pptx";
          if (apprB64) {
            const u8 = base64ToUint8Array(apprB64);
            setAppreciationPptxFile({ buffer: u8.buffer as ArrayBuffer, name: apprName });
          }
        } catch {}
      }

      if (found.certificate_templates?.participation_pptx_url) {
        fetch(found.certificate_templates.participation_pptx_url)
          .then((res) => {
            if (!res.ok) throw new Error("Storage template not accessible");
            return res.arrayBuffer();
          })
          .then((buffer) => {
            setParticipationPptxFile({
              buffer,
              name: found.certificate_templates?.participation_filename || "participation.pptx",
            });
          })
          .catch((err) => {
            console.warn("Could not load participation PPTX from Supabase bucket:", err);
            try {
              const partB64 = sessionStorage.getItem(`csi_part_pptx_${eventId}`);
              const partName = sessionStorage.getItem(`csi_part_pptx_name_${eventId}`) || "participation.pptx";
              if (partB64) {
                const u8 = base64ToUint8Array(partB64);
                setParticipationPptxFile({ buffer: u8.buffer as ArrayBuffer, name: partName });
              }
            } catch {}
          });
      } else {
        try {
          const partB64 = sessionStorage.getItem(`csi_part_pptx_${eventId}`);
          const partName = sessionStorage.getItem(`csi_part_pptx_name_${eventId}`) || "participation.pptx";
          if (partB64) {
            const u8 = base64ToUint8Array(partB64);
            setParticipationPptxFile({ buffer: u8.buffer as ArrayBuffer, name: partName });
          }
        } catch {}
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
    updatedAttendees = attendees,
    extraTemplates?: Partial<CSIEvent["certificate_templates"]>
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
        ...(event.certificate_templates || {}),
        appreciation_template_data: newAppTemplate,
        participation_template_data: newPartTemplate,
        ...(extraTemplates || {}),
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

  // Template Upload Handler - Supports .pptx (PowerPoint) and image files
  const handleTemplateUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "appreciation" | "participation"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPptx =
      file.name.toLowerCase().endsWith(".pptx") ||
      file.name.toLowerCase().endsWith(".ppt") ||
      file.type.includes("presentationml");

    if (isPptx) {
      try {
        setStatusNotice({
          type: "success",
          text: `Processing and uploading PowerPoint template "${file.name}" to Supabase Storage...`,
        });

        const { pptxBuffer, previewImageBase64, fileName } = await extractPptxData(file);
        setLiveSlidePreview("");

        if (type === "appreciation") {
          setAppreciationPptxFile({ buffer: pptxBuffer, name: fileName });
          try {
            sessionStorage.setItem(`csi_appr_pptx_${eventId}`, arrayBufferToBase64(pptxBuffer));
            sessionStorage.setItem(`csi_appr_pptx_name_${eventId}`, fileName);
          } catch {}
          if (previewImageBase64) setAppreciationTemplate(previewImageBase64);
        } else {
          setParticipationPptxFile({ buffer: pptxBuffer, name: fileName });
          try {
            sessionStorage.setItem(`csi_part_pptx_${eventId}`, arrayBufferToBase64(pptxBuffer));
            sessionStorage.setItem(`csi_part_pptx_name_${eventId}`, fileName);
          } catch {}
          if (previewImageBase64) setParticipationTemplate(previewImageBase64);
        }

        // Upload directly to Supabase Storage bucket for team-wide access
        const uploadResult = await uploadCertificateTemplateToSupabase(file, eventId, type, fileName);

        const extra: Partial<CSIEvent["certificate_templates"]> = {};
        if (uploadResult?.publicUrl) {
          if (type === "appreciation") {
            extra.appreciation_pptx_url = uploadResult.publicUrl;
            extra.appreciation_filename = uploadResult.filename;
          } else {
            extra.participation_pptx_url = uploadResult.publicUrl;
            extra.participation_filename = uploadResult.filename;
          }
        }

        saveEventChanges(
          firstPlaceWinners,
          secondPlaceWinners,
          thirdPlaceWinners,
          type === "appreciation" ? (previewImageBase64 || appreciationTemplate) : appreciationTemplate,
          type === "participation" ? (previewImageBase64 || participationTemplate) : participationTemplate,
          attendees,
          extra
        );

        setStatusNotice({
          type: "success",
          text: uploadResult?.publicUrl
            ? `PowerPoint template "${fileName}" uploaded to Supabase Storage! All associates can now access it.`
            : `PowerPoint template "${fileName}" loaded locally. (Tip: Ensure 'certificate-templates' bucket is created in Supabase Storage).`,
        });
      } catch (err: any) {
        setStatusNotice({
          type: "error",
          text: `Could not process PowerPoint file: ${err.message}`,
        });
      }
      return;
    }

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = async () => {
        const result = reader.result as string;
        if (type === "appreciation") {
          setAppreciationTemplate(result);
        } else {
          setParticipationTemplate(result);
        }

        // Upload image to Supabase Storage
        const uploadResult = await uploadCertificateTemplateToSupabase(file, eventId, type, file.name);
        const extra: Partial<CSIEvent["certificate_templates"]> = {};
        if (uploadResult?.publicUrl) {
          if (type === "appreciation") {
            extra.appreciation_pptx_url = uploadResult.publicUrl;
            extra.appreciation_filename = uploadResult.filename;
          } else {
            extra.participation_pptx_url = uploadResult.publicUrl;
            extra.participation_filename = uploadResult.filename;
          }
        }

        saveEventChanges(
          firstPlaceWinners,
          secondPlaceWinners,
          thirdPlaceWinners,
          type === "appreciation" ? result : appreciationTemplate,
          type === "participation" ? result : participationTemplate,
          attendees,
          extra
        );

        setStatusNotice({
          type: "success",
          text: uploadResult?.publicUrl
            ? `Template image uploaded to Supabase Storage! Accessible to all associates.`
            : `Template image updated locally!`,
        });
      };
      reader.readAsDataURL(file);
      return;
    }

    alert("Please upload a valid .pptx PowerPoint file or an image template.");
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

  // Currently Previewed Attendee - defaults to a sample participant if feedback responses aren't imported yet
  const currentPreviewAttendee = useMemo(() => {
    if (!attendees || attendees.length === 0) {
      return {
        name: "LEYAH MARY THOMAS",
        uid: "sample_preview",
        email: "participant@csi.rset.edu",
      } as FeedbackAttendee;
    }
    const found = attendees.find(
      (a) => (a.uid && a.uid === selectedPreviewUid) || a.name === selectedPreviewUid
    );
    return found || attendees[0];
  }, [attendees, selectedPreviewUid]);

  // Generate real PowerPoint slide preview with dynamic participant name & event write-up
  useEffect(() => {
    const activePptx = previewTab === "appreciation" ? appreciationPptxFile : participationPptxFile;
    if (!activePptx?.buffer || !currentPreviewAttendee) {
      setLiveSlidePreview("");
      return;
    }

    let isCancelled = false;
    const generatePreview = async () => {
      setIsPreviewLoading(true);
      try {
        const rawPos = getWinnerPosition(currentPreviewAttendee, winnersObject);
        const pos = previewTab === "appreciation"
          ? (rawPos === "participant" ? "1st" : rawPos)
          : "participant";
        const formattedName = formatCertificateName(currentPreviewAttendee.name);
        const customizedPptx = await createPptxWithName(activePptx.buffer, formattedName, pos, event || undefined);
        const b64 = arrayBufferToBase64(customizedPptx);

        const res = await fetch("/api/convert-pptx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "preview",
            pptxBase64: b64,
          }),
        });

        const data = await res.json();
        if (!isCancelled && data.success && data.previewImage) {
          setLiveSlidePreview(data.previewImage);
        }
      } catch (err) {
        console.warn("Could not generate live slide preview:", err);
      } finally {
        if (!isCancelled) setIsPreviewLoading(false);
      }
    };

    const timeout = setTimeout(generatePreview, 200);
    return () => {
      isCancelled = true;
      clearTimeout(timeout);
    };
  }, [
    currentPreviewAttendee?.uid,
    currentPreviewAttendee?.name,
    previewTab,
    appreciationPptxFile,
    participationPptxFile,
    firstPlaceWinners,
    secondPlaceWinners,
    thirdPlaceWinners,
    winnersObject,
    event?.event_name,
    event?.event_date,
    event?.mode,
  ]);

  // Handle Import File (.xlsx, .xls, .csv, .tsv)
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setStatusNotice(null);

    try {
      const fileName = file.name.toLowerCase();
      let headers: string[] = [];
      let rows: string[][] = [];

      if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        const parsed = await parseXlsxBuffer(await file.arrayBuffer());
        headers = parsed.headers;
        rows = parsed.rows;
      } else {
        const text = await file.text();
        const parsed = parseCsvText(text);
        headers = parsed.headers;
        rows = parsed.rows;
      }

      const mapped = mapGoogleSheetToFeedbackAttendees(headers, rows);
      if (mapped.length === 0) {
        throw new Error("No participant entries found in the uploaded file.");
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
        text: `Successfully imported ${mapped.length} verified participant(s) from "${file.name}"!`,
      });
      if (mapped.length > 0) {
        setSelectedPreviewUid(mapped[0].uid || mapped[0].name);
      }
      setIsImportModalOpen(false);
    } catch (err: any) {
      alert("Import failed: " + (err.message || "Invalid file format"));
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  };

  // Handle Import from Google Sheet URL / ID
  const handleImportGoogleSheetUrl = async () => {
    if (!importSheetUrl.trim()) {
      alert("Please enter a Google Sheet URL or Sheet ID.");
      return;
    }

    setIsImporting(true);
    setStatusNotice(null);

    try {
      let sheetId = importSheetUrl.trim();
      const match = importSheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) sheetId = match[1];

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
        throw new Error("The Google Sheet has no attendee responses yet.");
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
        text: `Successfully connected & imported ${mapped.length} participant(s) from Google Sheet!`,
      });
      if (mapped.length > 0) {
        setSelectedPreviewUid(mapped[0].uid || mapped[0].name);
      }
      setIsImportModalOpen(false);
      setImportSheetUrl("");
    } catch (err: any) {
      alert("Google Sheet Import failed: " + (err.message || "Could not fetch responses"));
    } finally {
      setIsImporting(false);
    }
  };

  // Handle Import from Pasted Text
  const handleImportPastedData = () => {
    if (!importPastedText.trim()) {
      alert("Please paste table or CSV data first.");
      return;
    }

    try {
      const parsed = parseCsvText(importPastedText);
      const mapped = mapGoogleSheetToFeedbackAttendees(parsed.headers, parsed.rows);
      if (mapped.length === 0) {
        throw new Error("No participant entries found in the pasted data.");
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
        text: `Successfully imported ${mapped.length} participant(s) from pasted data!`,
      });
      if (mapped.length > 0) {
        setSelectedPreviewUid(mapped[0].uid || mapped[0].name);
      }
      setIsImportModalOpen(false);
      setImportPastedText("");
    } catch (err: any) {
      alert("Import failed: " + (err.message || "Invalid data format"));
    }
  };

  // Export 1: Winners Appreciation ZIP + Automatic Cloud Vector PDF Backup
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
        appreciationPptxFile?.buffer,
        event.faculty_in_charge
      );

      // Background compilation and upload to Supabase Storage Bucket for team-wide access
      const winnersAttendees = attendees.filter((att) => {
        const pos = getWinnerPosition(att, winnersObject);
        return pos === "1st" || pos === "2nd" || pos === "3rd";
      });

      if (winnersAttendees.length > 0) {
        try {
          const pdfBlob = generateBatchCertificatesBlob(
            winnersAttendees,
            event.event_name,
            event.event_date,
            event.venue,
            winnersObject,
            appreciationTemplate || undefined,
            event.faculty_in_charge
          );
          const pdfUrl = await uploadGeneratedCertificatesToSupabase(pdfBlob, event.id, "winners", "pdf");

          let pptxUrl: string | null = null;
          if (appreciationPptxFile?.buffer) {
            const pptxBuf = await createMultiSlidePptx(
              appreciationPptxFile.buffer,
              winnersAttendees,
              event.event_name,
              event.event_date,
              event.venue,
              winnersObject
            );
            pptxUrl = await uploadGeneratedCertificatesToSupabase(
              new Blob([pptxBuf], {
                type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
              }),
              event.id,
              "winners",
              "pptx"
            );
          }

          if (pdfUrl) {
            saveEventChanges(
              firstPlaceWinners,
              secondPlaceWinners,
              thirdPlaceWinners,
              appreciationTemplate,
              participationTemplate,
              attendees,
              {
                winners_pdf_url: pdfUrl,
                winners_pdf_count: winnersAttendees.length,
                ...(pptxUrl ? { winners_pptx_url: pptxUrl } : {}),
                last_generated_at: new Date().toISOString(),
              }
            );
          }
        } catch (uploadErr) {
          console.warn("Background upload of winners batch PDF failed:", uploadErr);
        }
      }

      setStatusNotice({
        type: "success",
        text: `Downloaded ${count} winner certificate(s) & saved to Supabase Storage! All associates can now access them.`,
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

  // Export 2: Participation ZIP + Automatic Cloud Vector PDF Backup
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
        participationPptxFile?.buffer,
        event.faculty_in_charge
      );

      // Background compilation and upload to Supabase Storage Bucket for team-wide access
      const partAttendees = attendees.filter((att) => {
        const pos = getWinnerPosition(att, winnersObject);
        return pos === "participant";
      });

      if (partAttendees.length > 0) {
        try {
          const pdfBlob = generateBatchCertificatesBlob(
            partAttendees,
            event.event_name,
            event.event_date,
            event.venue,
            winnersObject,
            participationTemplate || undefined,
            event.faculty_in_charge
          );
          const pdfUrl = await uploadGeneratedCertificatesToSupabase(pdfBlob, event.id, "participation", "pdf");

          let pptxUrl: string | null = null;
          if (participationPptxFile?.buffer) {
            const pptxBuf = await createMultiSlidePptx(
              participationPptxFile.buffer,
              partAttendees,
              event.event_name,
              event.event_date,
              event.venue,
              winnersObject
            );
            pptxUrl = await uploadGeneratedCertificatesToSupabase(
              new Blob([pptxBuf], {
                type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
              }),
              event.id,
              "participation",
              "pptx"
            );
          }

          if (pdfUrl) {
            saveEventChanges(
              firstPlaceWinners,
              secondPlaceWinners,
              thirdPlaceWinners,
              appreciationTemplate,
              participationTemplate,
              attendees,
              {
                participation_pdf_url: pdfUrl,
                participation_pdf_count: partAttendees.length,
                ...(pptxUrl ? { participation_master_pptx_url: pptxUrl } : {}),
                last_generated_at: new Date().toISOString(),
              }
            );
          }
        } catch (uploadErr) {
          console.warn("Background upload of participation batch PDF failed:", uploadErr);
        }
      }

      setStatusNotice({
        type: "success",
        text: `Downloaded ${count} participation certificate(s) & saved to Supabase Storage! All associates can now access them.`,
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

  // Compile & Save All Certificates Directly to Cloud (without local ZIP download)
  const handleCompileAllToCloud = async () => {
    if (!event || attendees.length === 0) return;
    setIsCompilingToCloud(true);
    setStatusNotice(null);

    try {
      const winnersAttendees = attendees.filter((att) => {
        const pos = getWinnerPosition(att, winnersObject);
        return pos === "1st" || pos === "2nd" || pos === "3rd";
      });
      const partAttendees = attendees.filter((att) => {
        const pos = getWinnerPosition(att, winnersObject);
        return pos === "participant";
      });

      const extraUpdates: Partial<CSIEvent["certificate_templates"]> = {
        last_generated_at: new Date().toISOString(),
      };

      if (winnersAttendees.length > 0) {
        const winBlob = generateBatchCertificatesBlob(
          winnersAttendees,
          event.event_name,
          event.event_date,
          event.venue,
          winnersObject,
          appreciationTemplate || undefined,
          event.faculty_in_charge
        );
        const winUrl = await uploadGeneratedCertificatesToSupabase(winBlob, event.id, "winners", "pdf");
        if (winUrl) {
          extraUpdates.winners_pdf_url = winUrl;
          extraUpdates.winners_pdf_count = winnersAttendees.length;
        }

        if (appreciationPptxFile?.buffer) {
          const winPptx = await createMultiSlidePptx(
            appreciationPptxFile.buffer,
            winnersAttendees,
            event.event_name,
            event.event_date,
            event.venue,
            winnersObject
          );
          const winPptxUrl = await uploadGeneratedCertificatesToSupabase(
            new Blob([winPptx], {
              type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            }),
            event.id,
            "winners",
            "pptx"
          );
          if (winPptxUrl) extraUpdates.winners_pptx_url = winPptxUrl;
        }
      }

      if (partAttendees.length > 0) {
        const partBlob = generateBatchCertificatesBlob(
          partAttendees,
          event.event_name,
          event.event_date,
          event.venue,
          winnersObject,
          participationTemplate || undefined,
          event.faculty_in_charge
        );
        const partUrl = await uploadGeneratedCertificatesToSupabase(partBlob, event.id, "participation", "pdf");
        if (partUrl) {
          extraUpdates.participation_pdf_url = partUrl;
          extraUpdates.participation_pdf_count = partAttendees.length;
        }

        if (participationPptxFile?.buffer) {
          const partPptx = await createMultiSlidePptx(
            participationPptxFile.buffer,
            partAttendees,
            event.event_name,
            event.event_date,
            event.venue,
            winnersObject
          );
          const partPptxUrl = await uploadGeneratedCertificatesToSupabase(
            new Blob([partPptx], {
              type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            }),
            event.id,
            "participation",
            "pptx"
          );
          if (partPptxUrl) extraUpdates.participation_master_pptx_url = partPptxUrl;
        }
      }

      saveEventChanges(
        firstPlaceWinners,
        secondPlaceWinners,
        thirdPlaceWinners,
        appreciationTemplate,
        participationTemplate,
        attendees,
        extraUpdates
      );

      setStatusNotice({
        type: "success",
        text: `Compiled and saved all certificates directly to Supabase Storage! All associates can now download them from any device.`,
      });
    } catch (err: any) {
      setStatusNotice({
        type: "error",
        text: err.message || "Failed to compile certificates to cloud.",
      });
    } finally {
      setIsCompilingToCloud(false);
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

        {/* Sync & Import Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href={`/events/${event.id}`}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white text-[15px] font-bold flex items-center gap-2 transition shadow-lg shadow-blue-900/30 border border-blue-400/40"
            title="Coordinator Certificates (Admin Easter Egg)"
          >
            <ShieldCheck className="w-4 h-4 text-blue-200" />
            <span>Coordinator Studio</span>
          </Link>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white text-[15px] font-bold flex items-center gap-2 transition shadow-lg shadow-purple-900/30 border border-purple-400/40"
            title="Import responses from Excel (.xlsx), CSV, or Google Sheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-purple-200" />
            <span>Import Responses</span>
          </button>

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
            {isExportingWinnersZip ? (
              <RefreshCw className="w-6 h-6 text-amber-200 animate-spin" />
            ) : (
              <Trophy className="w-6 h-6 text-amber-200" />
            )}
            <div className="text-left">
              <div className="text-lg font-extrabold">
                {isExportingWinnersZip ? "Converting PPTX to PDF..." : "Download Winners Folder"}
              </div>
              <div className="text-xs text-amber-100 font-normal">
                {isExportingWinnersZip
                  ? "PowerPoint COM rendering native PDFs..."
                  : `${totalWinnersCount} Winner(s) (1st, 2nd, 3rd Place)`}
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
            {isExportingParticipationZip ? (
              <RefreshCw className="w-6 h-6 text-cyan-200 animate-spin" />
            ) : (
              <Award className="w-6 h-6 text-cyan-200" />
            )}
            <div className="text-left">
              <div className="text-lg font-extrabold">
                {isExportingParticipationZip ? "Converting PPTX to PDF..." : "Download Participation Folder"}
              </div>
              <div className="text-xs text-cyan-100 font-normal">
                {isExportingParticipationZip
                  ? "PowerPoint COM rendering native PDFs..."
                  : `${totalParticipantsCount} Participant(s)`}
              </div>
            </div>
          </div>
          <Download className="w-5 h-5 text-cyan-200" />
        </button>
      </div>

      {/* CLOUD CERTIFICATES ARCHIVE (SHARED WITH ALL ASSOCIATES) */}
      <div className="bg-gradient-to-br from-[#131126] to-[#1c1433] rounded-2xl border border-purple-500/30 p-5 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-500/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Cloud className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Team Cloud Certificates
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Supabase Storage
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Permanently accessible to all associates and coordinators on localhost & Vercel.
              </p>
            </div>
          </div>

          <button
            onClick={handleCompileAllToCloud}
            disabled={isCompilingToCloud || attendees.length === 0}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-purple-600/30 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            title="Generate batch vector PDFs and save directly to Supabase bucket"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCompilingToCloud ? "animate-spin" : ""}`} />
            <span>{isCompilingToCloud ? "Compiling & Uploading..." : "Compile & Save to Cloud"}</span>
          </button>
        </div>

        {/* Cloud Files Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Winners Cloud File */}
          <div className="bg-black/40 rounded-xl p-4 border border-amber-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-bold text-amber-200 truncate">
                  Winners Batch Certificate
                </div>
                <div className="text-xs text-slate-400">
                  {event.certificate_templates?.winners_pdf_url ? (
                    <span className="text-emerald-400 font-medium">
                      ✓ Ready ({event.certificate_templates.winners_pdf_count || totalWinnersCount} awardees)
                    </span>
                  ) : (
                    <span className="text-slate-500 italic">Not yet compiled to cloud</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {event.certificate_templates?.winners_pdf_url && (
                <a
                  href={event.certificate_templates.winners_pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-amber-900/30"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </a>
              )}
              {event.certificate_templates?.winners_pptx_url && (
                <a
                  href={event.certificate_templates.winners_pptx_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-black/60 border border-amber-500/40 hover:bg-amber-950 text-amber-300 text-xs font-semibold flex items-center gap-1 transition"
                  title="Download multi-slide editable PowerPoint template"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PPTX</span>
                </a>
              )}
            </div>
          </div>

          {/* Participation Cloud File */}
          <div className="bg-black/40 rounded-xl p-4 border border-cyan-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Award className="w-5 h-5 text-cyan-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-bold text-cyan-200 truncate">
                  Participation Batch Certificate
                </div>
                <div className="text-xs text-slate-400">
                  {event.certificate_templates?.participation_pdf_url ? (
                    <span className="text-emerald-400 font-medium">
                      ✓ Ready ({event.certificate_templates.participation_pdf_count || totalParticipantsCount} participants)
                    </span>
                  ) : (
                    <span className="text-slate-500 italic">Not yet compiled to cloud</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {event.certificate_templates?.participation_pdf_url && (
                <a
                  href={event.certificate_templates.participation_pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-cyan-900/30"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </a>
              )}
              {event.certificate_templates?.participation_master_pptx_url && (
                <a
                  href={event.certificate_templates.participation_master_pptx_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-black/60 border border-cyan-500/40 hover:bg-cyan-950 text-cyan-300 text-xs font-semibold flex items-center gap-1 transition"
                  title="Download multi-slide editable PowerPoint template"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PPTX</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {event.certificate_templates?.last_generated_at && (
          <div className="text-[11px] text-slate-400 text-right">
            Last compiled: {new Date(event.certificate_templates.last_generated_at).toLocaleString()}
          </div>
        )}
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

      {/* PPTX TEMPLATE UPLOAD BOXES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Appreciation Template Box */}
        <div className="bg-[#12101C] rounded-2xl border border-amber-500/30 p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-amber-300 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              Certificate of Appreciation
            </h3>
            {(appreciationPptxFile || appreciationTemplate) && (
              <button
                onClick={() => {
                  setAppreciationTemplate("");
                  setAppreciationPptxFile(null);
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
            <span className="truncate">
              {appreciationPptxFile
                ? `Loaded: ${appreciationPptxFile.name}`
                : appreciationTemplate
                ? "Replace Template (.pptx)"
                : "Upload Appreciation Template (.pptx)"}
            </span>
            <input
              type="file"
              accept=".pptx, .ppt, application/vnd.openxmlformats-officedocument.presentationml.presentation, image/png, image/jpeg"
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
            {(participationPptxFile || participationTemplate) && (
              <button
                onClick={() => {
                  setParticipationTemplate("");
                  setParticipationPptxFile(null);
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
            <span className="truncate">
              {participationPptxFile
                ? `Loaded: ${participationPptxFile.name}`
                : participationTemplate
                ? "Replace Template (.pptx)"
                : "Upload Participation Template (.pptx)"}
            </span>
            <input
              type="file"
              accept=".pptx, .ppt, application/vnd.openxmlformats-officedocument.presentationml.presentation, image/png, image/jpeg"
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
        <div className="bg-slate-950 p-4 sm:p-6 rounded-2xl border border-purple-500/30 flex items-center justify-center overflow-x-auto shadow-inner relative min-h-[350px]">
          {isPreviewLoading && (
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/85 border border-purple-500/40 text-purple-200 text-xs font-semibold backdrop-blur-md shadow-lg animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
              <span>Rendering Preview...</span>
            </div>
          )}

          {/* 1. Real PowerPoint slide preview image with exact student name and placement */}
          {liveSlidePreview ? (
            <div className="w-[850px] max-w-full rounded-xl overflow-hidden shadow-2xl border border-purple-500/30 bg-black flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={liveSlidePreview}
                alt="Certificate Live Preview"
                className="w-full h-auto object-contain rounded-lg"
              />
            </div>
          ) : (previewTab === "appreciation" ? appreciationTemplate : participationTemplate) ? (
            /* 2. Fallback if preview is loading or template image is uploaded */
            <div className="w-[850px] max-w-full rounded-xl overflow-hidden shadow-2xl border border-purple-500/30 bg-black flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewTab === "appreciation" ? appreciationTemplate : participationTemplate}
                alt="Certificate Template Preview"
                className="w-full h-auto object-contain rounded-lg"
              />
            </div>
          ) : (
            // Default template layout when no custom image or PPTX is uploaded
            <div className="w-[850px] h-[600px] shrink-0 bg-white text-black rounded-lg shadow-2xl relative flex flex-col justify-between overflow-hidden p-8" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
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
                  <p className="text-slate-800 text-xs max-w-xl mx-auto pt-1 leading-relaxed">
                    {previewTab === "appreciation" ? (
                      <>
                        has secured <strong className="font-extrabold text-black">1st place</strong> in the {event.mode?.toLowerCase() || "offline"} event titled <strong className="font-extrabold text-black">&quot;{event.event_name}&quot;</strong> held on <strong className="font-extrabold text-black">{formatDayFirstOrdinalDate(event.event_date)}</strong>, organized by the Computer Society of India (CSI) Student Branch, RSET.
                      </>
                    ) : (
                      <>
                        has actively participated in the {event.mode?.toLowerCase() || "offline"} event titled <strong className="font-extrabold text-black">&quot;{event.event_name}&quot;</strong> held on <strong className="font-extrabold text-black">{formatDayFirstOrdinalDate(event.event_date)}</strong>, organized by the Computer Society of India (CSI) Student Branch, RSET.
                      </>
                    )}
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

      {/* IMPORT RESPONSES MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#12101C] border border-purple-500/40 w-full max-w-lg rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-purple-500/30 pb-3">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-bold text-white">Import Feedback Responses</h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Import Method Tabs */}
            <div className="grid grid-cols-3 gap-2 bg-black p-1 rounded-xl border border-purple-500/30 text-xs font-bold">
              <button
                type="button"
                onClick={() => setImportMethod("file")}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
                  importMethod === "file"
                    ? "bg-purple-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload File</span>
              </button>
              <button
                type="button"
                onClick={() => setImportMethod("sheet")}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
                  importMethod === "sheet"
                    ? "bg-purple-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Google Sheet</span>
              </button>
              <button
                type="button"
                onClick={() => setImportMethod("paste")}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
                  importMethod === "paste"
                    ? "bg-purple-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Paste Table</span>
              </button>
            </div>

            {/* Tab 1: Upload File (.xlsx, .xls, .csv, .tsv) */}
            {importMethod === "file" && (
              <div className="space-y-3">
                <p className="text-xs text-slate-300">
                  Upload an Excel spreadsheet or CSV file with respondent names:
                </p>
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-purple-500/40 hover:border-purple-400 rounded-xl bg-black/40 cursor-pointer transition text-center space-y-2">
                  <FileSpreadsheet className="w-8 h-8 text-purple-400" />
                  <span className="text-sm font-bold text-white">Click to choose Excel or CSV file</span>
                  <span className="text-xs text-slate-400">Supports .xlsx, .xls, .csv, .tsv</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv, .tsv, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="hidden"
                    onChange={handleImportFile}
                    disabled={isImporting}
                  />
                </label>
                {isImporting && (
                  <div className="flex items-center justify-center gap-2 text-xs text-purple-300 pt-2 font-semibold">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Parsing spreadsheet responses...</span>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Google Sheet URL */}
            {importMethod === "sheet" && (
              <div className="space-y-3">
                <p className="text-xs text-slate-300">
                  Paste the public or shared Google Sheet URL of the feedback responses:
                </p>
                <input
                  type="text"
                  value={importSheetUrl}
                  onChange={(e) => setImportSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-purple-500/40 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 font-mono"
                />
                <button
                  type="button"
                  onClick={handleImportGoogleSheetUrl}
                  disabled={isImporting || !importSheetUrl.trim()}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isImporting ? "animate-spin" : ""}`} />
                  <span>{isImporting ? "Connecting Sheet..." : "Connect & Fetch Responses"}</span>
                </button>
              </div>
            )}

            {/* Tab 3: Paste Table Data */}
            {importMethod === "paste" && (
              <div className="space-y-3">
                <p className="text-xs text-slate-300">
                  Copy cells from Excel or Google Sheets (Ctrl+C) and paste below (Ctrl+V):
                </p>
                <textarea
                  rows={6}
                  value={importPastedText}
                  onChange={(e) => setImportPastedText(e.target.value)}
                  placeholder={`Name\tUID\tDepartment\nAbhishek K Menon\tU220101\tCSE\nDevanarayanan S\tU220102\tCSE`}
                  className="w-full p-3 rounded-xl bg-black border border-purple-500/40 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-400 font-mono"
                />
                <button
                  type="button"
                  onClick={handleImportPastedData}
                  disabled={!importPastedText.trim()}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>Parse &amp; Import Participants</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
