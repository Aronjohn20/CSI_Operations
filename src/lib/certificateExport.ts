import { jsPDF } from "jspdf";
import JSZip from "jszip";
import { RSET_LOGO_BASE64, CSI_LOGO_BASE64 } from "./logosBase64";
import { COORDINATOR_TEMPLATE_BASE64 } from "./coordinatorTemplateBase64";
import { FeedbackAttendee, CSIEvent } from "./types";
import { formatFullDateWithDay } from "./documentExport";

export interface CertificateInfo {
  attendee: FeedbackAttendee;
  eventName: string;
  eventDate: string;
  venue: string;
  position?: "1st" | "2nd" | "3rd" | "participant";
  facultyCoordinator?: string;
  branchCounselor?: string;
  templateImage?: string; // Optional custom template image (Data URL / base64)
}

/**
 * Exact name formatting algorithm matching the Python certificate generator:
 * 1. Spacing after dots: re.sub(r'\.(\S)', r'. \1', name)
 * 2. Title-case capitalize each word part: ' '.join(part.capitalize() for part in formatted_name.split())
 * 3. Strip all dots: formatted_name.replace('.', '')
 */
export function formatCertificateName(name: string): string {
  if (!name) return "";
  let formatted = name.trim();
  // Ensure space after dot if missing (e.g. A.John -> A. John)
  formatted = formatted.replace(/\.(\S)/g, ". $1");
  // Capitalize each word part
  formatted = formatted
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
  // Strip dots
  formatted = formatted.replace(/\./g, "").trim();
  return formatted;
}

export function getWinnerPosition(
  attendee: FeedbackAttendee,
  winners?: {
    first_place?: string | string[];
    second_place?: string | string[];
    third_place?: string | string[];
  }
): "1st" | "2nd" | "3rd" | "participant" {
  if (!winners) return "participant";

  const clean = (s?: string) => (s ? s.trim().toLowerCase() : "");
  const cleanFmt = (s?: string) => (s ? formatCertificateName(s).toLowerCase() : "");

  const attUid = clean(attendee.uid);
  const attName = clean(attendee.name);
  const attFmtName = cleanFmt(attendee.name);
  const attEmail = clean(attendee.email);

  const isMatch = (target?: string | string[]) => {
    if (!target) return false;

    const checkOne = (t: string) => {
      if (!t) return false;
      const ct = clean(t);
      const cft = cleanFmt(t);
      return (
        (attUid && ct === attUid) ||
        (attName && ct === attName) ||
        (attFmtName && cft === attFmtName) ||
        (attEmail && ct === attEmail) ||
        (attName && (ct.includes(attName) || attName.includes(ct))) ||
        (attFmtName && (cft.includes(attFmtName) || attFmtName.includes(cft)))
      );
    };

    if (Array.isArray(target)) {
      return target.some(checkOne);
    }
    return checkOne(target);
  };

  if (isMatch(winners.first_place)) return "1st";
  if (isMatch(winners.second_place)) return "2nd";
  if (isMatch(winners.third_place)) return "3rd";
  return "participant";
}

/**
 * Helper to convert an ArrayBuffer to a Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Helper to convert a Base64 string to a Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Parses an uploaded PPTX template file:
 * - Stores the raw PPTX bytes for dynamic <<name>> & position replacement
 * - Calls the local PowerPoint conversion API (/api/convert-pptx) to export a pristine 1080p preview of Slide 1
 */
export async function extractPptxData(file: File): Promise<{
  pptxBuffer: ArrayBuffer;
  previewImageBase64?: string;
  fileName: string;
}> {
  const buffer = await file.arrayBuffer();
  let previewImageBase64: string | undefined = undefined;

  // 1. Try high-fidelity slide preview from PowerPoint COM via /api/convert-pptx
  try {
    const b64 = arrayBufferToBase64(buffer);
    const res = await fetch("/api/convert-pptx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "preview",
        pptxBase64: b64,
      }),
    });
    const data = await res.json();
    if (data.success && data.previewImage) {
      previewImageBase64 = data.previewImage;
    }
  } catch (err) {
    console.warn("Could not fetch PowerPoint slide preview from API:", err);
  }

  // 2. Fallback: Extract largest background image from ppt/media/
  if (!previewImageBase64) {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const mediaFiles = Object.keys(zip.files).filter(
        (f) => f.startsWith("ppt/media/") && !zip.files[f].dir
      );

      let maxLen = 0;
      let candidateData: string | undefined = undefined;
      let candidateExt = "jpeg";

      for (const m of mediaFiles) {
        const lower = m.toLowerCase();
        if (
          lower.endsWith(".png") ||
          lower.endsWith(".jpg") ||
          lower.endsWith(".jpeg") ||
          lower.endsWith(".webp")
        ) {
          const data = await zip.files[m].async("base64");
          if (data.length > maxLen) {
            maxLen = data.length;
            candidateExt = lower.endsWith(".png") ? "png" : "jpeg";
            candidateData = data;
          }
        }
      }

      if (candidateData) {
        previewImageBase64 = `data:image/${candidateExt};base64,${candidateData}`;
      }
    } catch (err) {
      console.warn("Could not extract image from PPTX", err);
    }
  }

  return {
    pptxBuffer: buffer,
    previewImageBase64,
    fileName: file.name,
  };
}

/**
 * Replaces placement positions in slide OpenXML (1st place, 2nd place, 3rd place, superscripts, placeholders)
 */
export function replacePositionInSlideXml(
  xml: string,
  position?: "1st" | "2nd" | "3rd" | "participant"
): string {
  if (!position || position === "participant") {
    xml = xml.replace(
      /(<<position>>|&lt;&lt;position&gt;&gt;|<position>|&lt;position&gt;|\{\{position\}\}|\{position\}|\[position\])/gi,
      "Participant"
    );
    xml = xml.replace(
      /(<<place>>|&lt;&lt;place&gt;&gt;|<place>|&lt;place&gt;|\{\{place\}\}|\{place\}|\[place\])/gi,
      "Participant"
    );
    return xml;
  }

  const ordinal = position; // "1st", "2nd", "3rd"
  const word = position === "1st" ? "first" : position === "2nd" ? "second" : "third";
  const Word = position === "1st" ? "First" : position === "2nd" ? "Second" : "Third";
  const num = position === "1st" ? "1" : position === "2nd" ? "2" : "3";
  const suffix = position === "1st" ? "st" : position === "2nd" ? "nd" : "rd";

  // 1. Explicit placeholder tokens
  xml = xml.replace(
    /(<<position>>|&lt;&lt;position&gt;&gt;|<position>|&lt;position&gt;|\{\{position\}\}|\{position\}|\[position\])/gi,
    `${ordinal} place`
  );
  xml = xml.replace(
    /(<<place>>|&lt;&lt;place&gt;&gt;|<place>|&lt;place&gt;|\{\{place\}\}|\{place\}|\[place\])/gi,
    `${ordinal} place`
  );
  xml = xml.replace(
    /(<<rank>>|&lt;&lt;rank&gt;&gt;|<rank>|&lt;rank&gt;|\{\{rank\}\}|\{rank\}|\[rank\])/gi,
    `${ordinal} rank`
  );

  // 2. Full phrase in a single text run: "3rd place", "2nd place", "1st place", "First Place", etc.
  xml = xml.replace(/\b(1st|2nd|3rd)\s+(place|prize|rank)\b/gi, `${ordinal} $2`);
  xml = xml.replace(/\b(first|second|third)\s+(place|prize|rank)\b/gi, (match, p1, p2) => {
    const isCapital = p1[0] === p1[0].toUpperCase();
    const repWord = isCapital ? Word : word;
    return `${repWord} ${p2}`;
  });

  // 3. Standalone ordinal in single run (e.g. "secured 3rd in the online...", "won 2nd"):
  // Negative lookahead/lookbehind ensuring it's not a day of the month like 16th, 21st, 23rd, 31st!
  xml = xml.replace(/(?<!\d)(1st|2nd|3rd)(?!\d)/gi, (m) => {
    const isUpper = m.toUpperCase() === m;
    return isUpper ? ordinal.toUpperCase() : ordinal;
  });

  // 4. Split across runs:
  // Handles <a:t>3</a:t> + <a:t>rd</a:t>, <a:t>3</a:t> + <a:t>rd place</a:t>, <a:t>has secured 3</a:t> + <a:t>rd</a:t>
  xml = xml.replace(
    /(<a:t[^>]*>(?:(?!<\/a:t>)[\s\S])*?(?<!\d))(?:1|2|3)(<\/a:t>(?:(?!<a:t)[\s\S])*?<a:t[^>]*>)(?:st|nd|rd)([\s\S]*?<\/a:t>)/gi,
    `$1${num}$2${suffix}$3`
  );

  // 5. Separate number run followed by "place" run:
  // e.g. <a:t>3</a:t></a:r><a:r><a:t> place</a:t>
  xml = xml.replace(
    /(<a:t[^>]*>\s*)(?:1|2|3)(\s*<\/a:t>(?:(?!<a:t)[\s\S])*?<a:t[^>]*>\s*(?:st|nd|rd)?\s*(?:place|prize|rank))/gi,
    `$1${num}$2`
  );

  return xml;
}

/**
 * Creates a customized PPTX file by replacing <<name>> AND position in slide XMLs
 * Matches the exact Python python-pptx behavior!
 */
export async function createPptxWithName(
  templatePptxBuffer: ArrayBuffer,
  replacementName: string,
  position?: "1st" | "2nd" | "3rd" | "participant"
): Promise<ArrayBuffer> {
  const zip = await JSZip.loadAsync(templatePptxBuffer);
  const slideFiles = Object.keys(zip.files).filter(
    (f) => f.startsWith("ppt/slides/slide") && f.endsWith(".xml")
  );

  for (const slidePath of slideFiles) {
    let xml = await zip.file(slidePath)!.async("text");

    // Replace standard placeholder tags: <<name>>, &lt;&lt;name&gt;&gt;, <name>, {name}
    xml = xml.replace(
      /(<<name>>|&lt;&lt;name&gt;&gt;|<name>|&lt;name&gt;|\{\{name\}\}|\{name\}|\[name\])/gi,
      replacementName
    );

    // Common template placeholder names
    xml = xml.replace(
      /\b(Participant\s+Name|Student\s+Name|Candidate\s+Name|Full\s+Name)\b/gi,
      replacementName
    );

    // If PowerPoint split <<name>> across XML text runs
    const splitRegex = /(&lt;&lt;|<<)(?:(?!&gt;&gt;|>>)(?:[\s\S]))*?name(?:(?!&gt;&gt;|>>)(?:[\s\S]))*?(&gt;&gt;|>>)/gi;
    if (splitRegex.test(xml)) {
      xml = xml.replace(splitRegex, replacementName);
    }

    // Replace placement position (1st, 2nd, 3rd)
    xml = replacePositionInSlideXml(xml, position);

    zip.file(slidePath, xml);
  }

  return await zip.generateAsync({ type: "arraybuffer" });
}

/**
 * Draws an official high-resolution CSI SB RSET Certificate on a jsPDF instance (Landscape A4)
 * Based on the Python script logic: The only dynamic element is the formatted participant name
 * stamped onto the selected template!
 */
export function renderCertificatePage(
  doc: jsPDF,
  info: CertificateInfo,
  pageIndex: number,
  totalPages: number
) {
  if (pageIndex > 0) {
    doc.addPage("a4", "landscape");
  }

  const pageWidth = 297; // A4 Landscape mm
  const pageHeight = 210;
  const margin = 14;
  const isWinner = info.position === "1st" || info.position === "2nd" || info.position === "3rd";
  const formattedName = formatCertificateName(info.attendee.name);

  // If a custom template background image is uploaded, render it full-bleed
  // and stamp the dynamic formatted name onto it!
  if (info.templateImage) {
    try {
      doc.addImage(info.templateImage, "PNG", 0, 0, pageWidth, pageHeight);
    } catch {
      try {
        doc.addImage(info.templateImage, "JPEG", 0, 0, pageWidth, pageHeight);
      } catch (err) {
        console.warn("Could not draw custom template image", err);
      }
    }

    // Dynamic replacement of <<name>> on the template:
    doc.setFont("times", "bold");
    doc.setFontSize(26);
    doc.setTextColor(20, 20, 30);
    doc.text(formattedName, pageWidth / 2, 112, { align: "center" });
    return;
  }

  // DEFAULT TEMPLATE (When no custom image template is uploaded):
  // 1. Certificate Outer Border (Double frame with dark navy / deep purple & gold)
  doc.setDrawColor(24, 18, 43); // Deep CSI Navy
  doc.setLineWidth(1.8);
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

  doc.setDrawColor(217, 119, 6); // Warm Amber/Gold
  doc.setLineWidth(0.8);
  doc.rect(margin + 2.5, margin + 2.5, pageWidth - (margin + 2.5) * 2, pageHeight - (margin + 2.5) * 2);

  // Corner decorative marks
  const cornerSize = 7;
  const cInner = margin + 2.5;
  doc.setFillColor(217, 119, 6);
  doc.rect(cInner, cInner, cornerSize, 1.2, "F");
  doc.rect(cInner, cInner, 1.2, cornerSize, "F");
  doc.rect(pageWidth - cInner - cornerSize, cInner, cornerSize, 1.2, "F");
  doc.rect(pageWidth - cInner - 1.2, cInner, 1.2, cornerSize, "F");
  doc.rect(cInner, pageHeight - cInner - 1.2, cornerSize, 1.2, "F");
  doc.rect(cInner, pageHeight - cInner - cornerSize, 1.2, cornerSize, "F");
  doc.rect(pageWidth - cInner - cornerSize, pageHeight - cInner - 1.2, cornerSize, 1.2, "F");
  doc.rect(pageWidth - cInner - 1.2, pageHeight - cInner - cornerSize, 1.2, cornerSize, "F");

  // 2. Logos (RSET on left, CSI on right)
  try {
    doc.addImage(RSET_LOGO_BASE64, "PNG", margin + 10, margin + 8, 30, 22);
  } catch (e) {
    console.warn("Could not render RSET logo in certificate", e);
  }

  try {
    doc.addImage(CSI_LOGO_BASE64, "PNG", pageWidth - margin - 36, margin + 8, 26, 26);
  } catch (e) {
    console.warn("Could not render CSI logo in certificate", e);
  }

  // 3. Header Text
  let y = margin + 14;
  doc.setFont("times", "bold");
  doc.setFontSize(15);
  doc.setTextColor(24, 18, 43);
  doc.text(
    "RAJAGIRI SCHOOL OF ENGINEERING & TECHNOLOGY (AUTONOMOUS)",
    pageWidth / 2,
    y,
    { align: "center" }
  );

  y += 5.5;
  doc.setFontSize(12);
  doc.setTextColor(80, 70, 110);
  doc.text(
    "COMPUTER SOCIETY OF INDIA STUDENT BRANCH - RSET",
    pageWidth / 2,
    y,
    { align: "center" }
  );

  y += 4;
  doc.setFont("times", "italic");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 130);
  doc.text("Rajagiri Valley, Kakkanad, Kochi, Kerala - 682039", pageWidth / 2, y, { align: "center" });

  // 4. Certificate Badge / Title
  y += 13;
  const certTitle = isWinner ? "CERTIFICATE OF APPRECIATION" : "CERTIFICATE OF PARTICIPATION";

  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.setTextColor(isWinner ? 180 : 20, isWinner ? 83 : 20, isWinner ? 9 : 80); // Gold or Deep Navy
  doc.text(certTitle, pageWidth / 2, y, { align: "center" });

  // Subtitle banner line
  y += 3;
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.6);
  doc.line(pageWidth / 2 - 45, y, pageWidth / 2 + 45, y);

  // 5. Body Text & Dynamic Formatted Name
  let textStartY = margin + 46;

  doc.setFont("times", "normal");
  doc.setFontSize(13);
  doc.setTextColor(50, 50, 50);
  doc.text("This is to proudly certify that", pageWidth / 2, textStartY, { align: "center" });

  // Dynamic Formatted Participant Name
  textStartY += 10.5;
  doc.setFont("times", "bold");
  doc.setFontSize(24);
  doc.setTextColor(15, 23, 42);
  doc.text(formattedName, pageWidth / 2, textStartY, { align: "center" });

  // Name underline
  textStartY += 2.5;
  const nameWidth = doc.getTextWidth(formattedName);
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(pageWidth / 2 - nameWidth / 2 - 4, textStartY, pageWidth / 2 + nameWidth / 2 + 4, textStartY);

  // Detail Paragraph
  textStartY += 9.5;
  doc.setFont("times", "normal");
  doc.setFontSize(12.5);
  doc.setTextColor(50, 50, 50);

  const uidStr = info.attendee.uid ? ` (UID: ${info.attendee.uid})` : "";
  const branchStr = info.attendee.branch ? `Department of ${info.attendee.branch}` : "Rajagiri School of Engineering & Technology";
  const yearStr = info.attendee.year_of_study ? `${info.attendee.year_of_study} Year, ` : "";

  let achievementText = "";
  if (info.position === "1st") {
    achievementText = "has secured FIRST PLACE (1st Prize)";
  } else if (info.position === "2nd") {
    achievementText = "has secured SECOND PLACE (2nd Prize)";
  } else if (info.position === "3rd") {
    achievementText = "has secured THIRD PLACE (3rd Prize)";
  } else {
    achievementText = "has actively participated";
  }

  const p1 = `of ${yearStr}${branchStr}${uidStr} ${achievementText} in the technical event`;
  doc.text(p1, pageWidth / 2, textStartY, { align: "center" });

  textStartY += 7.5;
  doc.setFont("times", "bold");
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text(`"${info.eventName}"`, pageWidth / 2, textStartY, { align: "center" });

  textStartY += 7.5;
  doc.setFont("times", "normal");
  doc.setFontSize(12);
  doc.setTextColor(50, 50, 50);
  const dateFormatted = formatFullDateWithDay(info.eventDate);
  const venueStr = info.venue ? ` at ${info.venue}` : "";
  doc.text(
    `organized by the Computer Society of India (CSI) Student Branch on ${dateFormatted}${venueStr}.`,
    pageWidth / 2,
    textStartY,
    { align: "center" }
  );

  // 6. Signatures Footer
  const sigY = pageHeight - margin - 20;

  // Left Signature: Branch Counselor
  const counselor = info.branchCounselor || "Dr. Neeba E A";
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(24, 18, 43);
  doc.text(counselor, margin + 40, sigY, { align: "center" });
  doc.setFont("times", "normal");
  doc.setFontSize(9.5);
  doc.text("Branch Counselor, CSI SB RSET", margin + 40, sigY + 4.5, { align: "center" });
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.4);
  doc.line(margin + 15, sigY - 2, margin + 65, sigY - 2);

  // Middle Signature: Faculty Coordinator
  const faculty = info.facultyCoordinator || "Dr. Tripti C";
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(24, 18, 43);
  doc.text(faculty, pageWidth / 2, sigY, { align: "center" });
  doc.setFont("times", "normal");
  doc.setFontSize(9.5);
  doc.text("Faculty Coordinator, CSI SB RSET", pageWidth / 2, sigY + 4.5, { align: "center" });
  doc.line(pageWidth / 2 - 25, sigY - 2, pageWidth / 2 + 25, sigY - 2);

  // Right Signature: Student Chair
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(24, 18, 43);
  doc.text("Student Chair", pageWidth - margin - 40, sigY, { align: "center" });
  doc.setFont("times", "normal");
  doc.setFontSize(9.5);
  doc.text("CSI Student Branch, RSET", pageWidth - margin - 40, sigY + 4.5, { align: "center" });
  doc.line(pageWidth - margin - 65, sigY - 2, pageWidth - margin - 15, sigY - 2);
}

/**
 * Downloads a single certificate as high-definition PDF
 */
export function exportSingleCertificatePdf(info: CertificateInfo) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  renderCertificatePage(doc, info, 0, 1);

  const cleanName = formatCertificateName(info.attendee.name).replace(/[^a-zA-Z0-9_-]/g, "_");
  const cleanEvent = info.eventName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const certType = info.position && info.position !== "participant" ? `Appreciation_${info.position}` : "Participation";

  doc.save(`Certificate_${certType}_${cleanEvent}_${cleanName}.pdf`);
}

/**
 * Batch exports all certificates into a single consolidated PDF document
 */
export function exportBatchCertificatesPdf(
  attendees: FeedbackAttendee[],
  eventName: string,
  eventDate: string,
  venue: string,
  winners?: {
    first_place?: string | string[];
    second_place?: string | string[];
    third_place?: string | string[];
  },
  templateImage?: string,
  facultyCoordinator?: string
) {
  if (!attendees || attendees.length === 0) return;

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  attendees.forEach((att, idx) => {
    const position = getWinnerPosition(att, winners);

    renderCertificatePage(
      doc,
      {
        attendee: att,
        eventName,
        eventDate,
        venue,
        position,
        facultyCoordinator,
        templateImage,
      },
      idx,
      attendees.length
    );
  });

  const cleanEvent = eventName.replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.save(`All_Certificates_${cleanEvent}.pdf`);
}

/**
 * Batch exports certificates into two separate ZIP folders (Winners Appreciation vs Participation)
 * Matches the user's exact Python workflow:
 * - Replaces <<name>> and position (1st, 2nd, 3rd) in the PowerPoint PPTX
 * - Uses PowerPoint COM (/api/convert-pptx) to convert the exact PPTX to high-fidelity PDF (SaveAs 32)
 * - Includes both {Formatted_Name}.pdf and {Formatted_Name}.pptx in the ZIP archive!
 */
export async function exportCertificatesZip(
  type: "winners" | "participation",
  attendees: FeedbackAttendee[],
  eventName: string,
  eventDate: string,
  venue: string,
  winners?: {
    first_place?: string | string[];
    second_place?: string | string[];
    third_place?: string | string[];
  },
  templateImage?: string,
  templatePptxBuffer?: ArrayBuffer,
  facultyCoordinator?: string
): Promise<number> {
  const zip = new JSZip();

  const targetAttendees = attendees.filter((att) => {
    const pos = getWinnerPosition(att, winners);
    if (type === "winners") {
      return pos === "1st" || pos === "2nd" || pos === "3rd";
    }
    return pos === "participant";
  });

  if (targetAttendees.length === 0) {
    throw new Error(
      type === "winners"
        ? "No winners selected yet. Please select 1st, 2nd, or 3rd place winners."
        : "No participants found in the feedback response list."
    );
  }

  // If a PowerPoint template was uploaded, customize PPTX and convert via PowerPoint COM
  if (templatePptxBuffer) {
    const pptxItems: {
      name: string;
      pptxBuffer: ArrayBuffer;
      pptxBase64: string;
      attendee: FeedbackAttendee;
      position: "1st" | "2nd" | "3rd" | "participant";
    }[] = [];

    for (const att of targetAttendees) {
      const pos = getWinnerPosition(att, winners);
      const formattedName = formatCertificateName(att.name);
      const safeName = formattedName.replace(/[^a-zA-Z0-9_ -]/g, "").trim();

      const pptxData = await createPptxWithName(templatePptxBuffer, formattedName, pos);
      const b64 = arrayBufferToBase64(pptxData);

      pptxItems.push({
        name: safeName,
        pptxBuffer: pptxData,
        pptxBase64: b64,
        attendee: att,
        position: pos,
      });
    }

    // Call PowerPoint COM API to convert customized PPTX files directly into native PDFs
    let convertedPdfs: Record<string, string> = {};
    try {
      const res = await fetch("/api/convert-pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "batch_convert",
          items: pptxItems.map((item) => ({
            name: item.name,
            pptxBase64: item.pptxBase64,
          })),
        }),
      });

      const data = await res.json();
      if (data.success && data.pdfs) {
        convertedPdfs = data.pdfs;
      } else {
        console.warn("PowerPoint batch conversion returned error:", data.error);
      }
    } catch (apiErr) {
      console.warn("Could not reach /api/convert-pptx, falling back to client PDF:", apiErr);
    }

    // For each item, add the converted native PDF (or fallback to jsPDF)
    for (const item of pptxItems) {
      if (convertedPdfs[item.name]) {
        const pdfBytes = base64ToUint8Array(convertedPdfs[item.name]);
        zip.file(`${item.name}.pdf`, pdfBytes);
      } else {
        // Fallback: jsPDF
        const doc = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: "a4",
        });

        renderCertificatePage(
          doc,
          {
            attendee: item.attendee,
            eventName,
            eventDate,
            venue,
            position: item.position,
            facultyCoordinator,
            templateImage,
          },
          0,
          1
        );

        const fallbackPdf = doc.output("arraybuffer");
        zip.file(`${item.name}.pdf`, fallbackPdf);
      }
    }
  } else {
    // Default Official CSI SB RSET Vector Certificate (when no custom PPTX is uploaded)
    for (let i = 0; i < targetAttendees.length; i++) {
      const att = targetAttendees[i];
      const pos = getWinnerPosition(att, winners);
      const formattedName = formatCertificateName(att.name);
      const safeName = formattedName.replace(/[^a-zA-Z0-9_ -]/g, "").trim();

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      renderCertificatePage(
        doc,
        {
          attendee: att,
          eventName,
          eventDate,
          venue,
          position: pos,
          facultyCoordinator,
          templateImage,
        },
        0,
        1
      );

      const pdfData = doc.output("arraybuffer");
      zip.file(`${safeName}.pdf`, pdfData);
    }
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const cleanEvent = eventName.replace(/[^a-zA-Z0-9_-]/g, "_");
  a.download =
    type === "winners"
      ? `Winners_Appreciation_Certificates_${cleanEvent}.zip`
      : `Participation_Certificates_${cleanEvent}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return targetAttendees.length;
}

/**
 * Converts a PDF ArrayBuffer to an image Data URL in the browser using PDF.js
 */
export async function convertPdfToImageDataUrl(pdfBuffer: ArrayBuffer): Promise<string> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return "";
  }

  // Inject pdf.js from cdnjs if not already present on window
  if (!(window as any).pdfjsLib) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = () => {
        try {
          (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        } catch {}
        resolve();
      };
      script.onerror = () => reject(new Error("Failed to load PDF.js engine"));
      document.head.appendChild(script);
    });
  }

  const pdfjsLib = (window as any).pdfjsLib;
  const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);

  // Render at 2.0x scale for crisp certificate print quality
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not initialize 2D canvas");

  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL("image/png");
}

/**
 * Creates a customized Coordinator PPTX file by replacing <<name>>, <<event>>, and <<date>> tags
 */
export async function createCoordinatorPptx(
  templatePptxBuffer: ArrayBuffer,
  coordinatorName: string,
  eventName: string,
  eventDate: string
): Promise<ArrayBuffer> {
  const zip = await JSZip.loadAsync(templatePptxBuffer);
  const slideFiles = Object.keys(zip.files).filter(
    (f) => f.startsWith("ppt/slides/slide") && f.endsWith(".xml")
  );

  const formattedName = formatCertificateName(coordinatorName);
  const formattedDate = formatOrdinalDate(eventDate);

  for (const slidePath of slideFiles) {
    let xml = await zip.file(slidePath)!.async("text");

    // Replace name tags:
    xml = xml.replace(
      /(<<\s*(?:coordinator(?:\s|_)?name|name)\s*>>|&lt;&lt;\s*(?:coordinator(?:\s|_)?name|name)\s*&gt;&gt;|\{\{\s*(?:coordinator(?:\s|_)?name|name)\s*\}\}|\{\s*(?:coordinator(?:\s|_)?name|name)\s*\}|\[\s*(?:coordinator(?:\s|_)?name|name|student(?:\s|_)?name|candidate(?:\s|_)?name|participant(?:\s|_)?name|full(?:\s|_)?name)\s*\])/gi,
      formattedName
    );
    xml = xml.replace(
      /\b(Coordinator\s+Name|Participant\s+Name|Student\s+Name|Candidate\s+Name|Full\s+Name)\b/gi,
      formattedName
    );

    // Replace event tags:
    xml = xml.replace(
      /(<<\s*(?:event(?:\s|_)?name|event)\s*>>|&lt;&lt;\s*(?:event(?:\s|_)?name|event)\s*&gt;&gt;|\{\{\s*(?:event(?:\s|_)?name|event)\s*\}\}|\{\s*(?:event(?:\s|_)?name|event)\s*\}|\[\s*(?:event(?:\s|_)?name|event)\s*\])/gi,
      eventName
    );
    xml = xml.replace(/\bEvent\s+Name\b/gi, eventName);

    // Replace date tags:
    xml = xml.replace(
      /(<<\s*(?:event(?:\s|_)?date|date)\s*>>|&lt;&lt;\s*(?:event(?:\s|_)?date|date)\s*&gt;&gt;|\{\{\s*(?:event(?:\s|_)?date|date)\s*\}\}|\{\s*(?:event(?:\s|_)?date|date)\s*\}|\[\s*(?:event(?:\s|_)?date|date)\s*\])/gi,
      formattedDate
    );
    xml = xml.replace(/\bEvent\s+Date\b/gi, formattedDate);

    zip.file(slidePath, xml);
  }

  return await zip.generateAsync({ type: "arraybuffer" });
}

/**
 * Format date with ordinal day (e.g. "September 17th 2026")
 */
export function formatOrdinalDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const j = day % 10, k = day % 100;
    let suffix = "th";
    if (j === 1 && k !== 11) suffix = "st";
    else if (j === 2 && k !== 12) suffix = "nd";
    else if (j === 3 && k !== 13) suffix = "rd";
    return `${month} ${day}${suffix} ${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Generates high-res raster data URL for official CSI RSET Coordinator Appreciation Certificate
 * using the pre-baked official template image (or uploaded custom template) with dynamic coordinator name, event, and date.
 */
export async function generateCoordinatorCertificateDataUrl(
  event: CSIEvent,
  coordinatorName: string,
  customTemplateImage?: string
): Promise<string> {
  const baseImgSrc = customTemplateImage || COORDINATOR_TEMPLATE_BASE64;
  if (typeof window === "undefined" || typeof document === "undefined") {
    return baseImgSrc;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 725;
  const ctx = canvas.getContext("2d");
  if (!ctx) return baseImgSrc;

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to load template image"));
    img.src = baseImgSrc;
  });

  // 1. Draw base clean template
  ctx.drawImage(img, 0, 0, 1024, 725);

  const formattedName = formatCertificateName(coordinatorName);
  const formattedDate = formatOrdinalDate(event.event_date);

  // If custom template image is uploaded, clear any placeholder name and writeup areas
  // using pure white / clean background color so new dynamic values replace them cleanly!
  if (customTemplateImage) {
    let clearColor = "#FFFFFF";
    try {
      // Sample clean background area away from any text
      const sample = ctx.getImageData(300, 300, 1, 1).data;
      if (sample && sample[0] > 220 && sample[1] > 220 && sample[2] > 220) {
        clearColor = `rgb(${sample[0]}, ${sample[1]}, ${sample[2]})`;
      }
    } catch {
      clearColor = "#FFFFFF";
    }

    ctx.fillStyle = clearColor;
    // Clear name placeholder area (e.g. "[Coordinator Name]", "[Name]", etc.)
    ctx.fillRect(140, 320, 744, 82);

    // Clear writeup placeholder area (e.g. "[Event Name]", "[Date]", etc.)
    ctx.fillRect(140, 422, 744, 100);
  }

  // 2. Render Coordinator Name in gold script font (Default official template)
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = 'italic 52px "Brush Script MT", "Great Vibes", "Playfair Display", "Georgia", "Times New Roman", cursive';
  ctx.fillStyle = "#C99B3B";
  ctx.shadowColor = "rgba(180, 130, 40, 0.25)";
  ctx.shadowBlur = 4;
  ctx.fillText(formattedName, 512, 368);
  ctx.restore();

  // 3. Render Gold Divider line with center diamond accent
  ctx.save();
  ctx.strokeStyle = "#E2B857";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(300, 408);
  ctx.lineTo(502, 408);
  ctx.moveTo(522, 408);
  ctx.lineTo(724, 408);
  ctx.stroke();

  // Center diamond accent
  ctx.fillStyle = "#E2B857";
  ctx.beginPath();
  ctx.moveTo(512, 403);
  ctx.lineTo(517, 408);
  ctx.lineTo(512, 413);
  ctx.lineTo(507, 408);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 4. Render Writeup Text (Serif font matching original certificate)
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#111827";

  const renderMultiFontLine = (
    y: number,
    segments: Array<{ text: string; bold: boolean }>
  ) => {
    let totalWidth = 0;
    const measured: Array<{ text: string; bold: boolean; width: number }> = [];
    for (const seg of segments) {
      ctx.font = seg.bold
        ? '700 17.5px "Times New Roman", Times, serif'
        : '400 17.5px "Times New Roman", Times, serif';
      const w = ctx.measureText(seg.text).width;
      measured.push({ ...seg, width: w });
      totalWidth += w;
    }

    let startX = 512 - totalWidth / 2;
    for (const m of measured) {
      ctx.font = m.bold
        ? '700 17.5px "Times New Roman", Times, serif'
        : '400 17.5px "Times New Roman", Times, serif';
      ctx.fillText(m.text, startX + m.width / 2, y);
      startX += m.width;
    }
  };

  // Line 1: In appreciation for their esteemed support as the Coordinator of [Event Name],
  renderMultiFontLine(446, [
    { text: "In appreciation for their esteemed support as the Coordinator of ", bold: false },
    { text: event.event_name, bold: true },
    { text: ",", bold: false },
  ]);

  // Line 2: by Computer Society of India (CSI) SB RSET on [Date],
  renderMultiFontLine(474, [
    { text: "by ", bold: false },
    { text: "Computer Society of India (CSI) SB RSET", bold: true },
    { text: " on ", bold: false },
    { text: formattedDate, bold: false },
    { text: ",", bold: false },
  ]);

  // Line 3: at Rajagiri School of Engineering & Technology, Kakkanad.
  renderMultiFontLine(502, [
    { text: "at Rajagiri School of Engineering & Technology, Kakkanad.", bold: false },
  ]);

  ctx.restore();

  return canvas.toDataURL("image/png");
}

/**
 * Render Coordinator Certificate onto a jsPDF instance
 */
export async function renderCoordinatorCertificate(
  doc: jsPDF,
  event: CSIEvent,
  coordinatorName: string,
  customTemplateImage?: string
) {
  const dataUrl = await generateCoordinatorCertificateDataUrl(event, coordinatorName, customTemplateImage);
  doc.addImage(dataUrl, "PNG", 0, 0, 297, 210);
}

/**
 * Export single Coordinator Certificate as PDF (supports PPTX COM or custom image / default)
 */
export async function exportCoordinatorCertificatePdf(
  event: CSIEvent,
  coordinatorName: string,
  customTemplateImage?: string,
  pptxBuffer?: ArrayBuffer
) {
  const formattedName = formatCertificateName(coordinatorName);
  const safeName = formattedName.replace(/[^a-zA-Z0-9_ -]/g, "").trim() || "Coordinator";

  // If PPTX buffer provided, use PowerPoint COM conversion
  if (pptxBuffer) {
    try {
      const customizedPptx = await createCoordinatorPptx(
        pptxBuffer,
        coordinatorName,
        event.event_name,
        event.event_date
      );
      const b64 = arrayBufferToBase64(customizedPptx);

      const res = await fetch("/api/convert-pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "batch_convert",
          items: [{ name: safeName, pptxBase64: b64 }],
        }),
      });

      const data = await res.json();
      if (data.success && data.convertedPdfs?.[0]?.pdfBase64) {
        const pdfBytes = base64ToUint8Array(data.convertedPdfs[0].pdfBase64);
        const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${safeName} - Coordinator Certificate.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
    } catch (err) {
      console.warn("PowerPoint COM conversion failed, falling back to jsPDF:", err);
    }
  }

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });
  await renderCoordinatorCertificate(doc, event, coordinatorName, customTemplateImage);
  doc.save(`${safeName} - Coordinator Certificate.pdf`);
}

/**
 * Batch export all Coordinator Certificates as a single ZIP with only .pdf files
 */
export async function exportCoordinatorCertificatesZip(
  event: CSIEvent,
  coordinatorNames: string[],
  customTemplateImage?: string,
  pptxBuffer?: ArrayBuffer
): Promise<number> {
  const zip = new JSZip();

  // If PPTX buffer provided, convert all coordinators via PowerPoint COM
  if (pptxBuffer) {
    try {
      const itemsToConvert: { name: string; pptxBase64: string }[] = [];
      for (const name of coordinatorNames) {
        if (!name.trim()) continue;
        const formattedName = formatCertificateName(name);
        const safeName = formattedName.replace(/[^a-zA-Z0-9_ -]/g, "").trim() || "Coordinator";
        const customizedPptx = await createCoordinatorPptx(
          pptxBuffer,
          name,
          event.event_name,
          event.event_date
        );
        itemsToConvert.push({
          name: safeName,
          pptxBase64: arrayBufferToBase64(customizedPptx),
        });
      }

      if (itemsToConvert.length > 0) {
        const res = await fetch("/api/convert-pptx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "batch_convert",
            items: itemsToConvert,
          }),
        });

        const data = await res.json();
        if (data.success && data.convertedPdfs && data.convertedPdfs.length > 0) {
          for (const conv of data.convertedPdfs) {
            const pdfBytes = base64ToUint8Array(conv.pdfBase64);
            zip.file(`${conv.name} - Coordinator Certificate.pdf`, pdfBytes);
          }

          const blob = await zip.generateAsync({ type: "blob" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          const cleanEvent = event.event_name.replace(/[^a-zA-Z0-9_-]/g, "_");
          a.download = `Coordinator_Certificates_${cleanEvent}.zip`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          return itemsToConvert.length;
        }
      }
    } catch (err) {
      console.warn("PowerPoint batch conversion failed, falling back to jsPDF:", err);
    }
  }

  // Default / Image template fallback
  for (const name of coordinatorNames) {
    if (!name.trim()) continue;
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
    await renderCoordinatorCertificate(doc, event, name, customTemplateImage);
    const pdfData = doc.output("arraybuffer");
    const formattedName = formatCertificateName(name);
    const safeName = formattedName.replace(/[^a-zA-Z0-9_ -]/g, "").trim() || "Coordinator";
    zip.file(`${safeName} - Coordinator Certificate.pdf`, pdfData);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const cleanEvent = event.event_name.replace(/[^a-zA-Z0-9_-]/g, "_");
  a.download = `Coordinator_Certificates_${cleanEvent}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return coordinatorNames.length;
}
