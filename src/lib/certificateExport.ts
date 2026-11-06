import { jsPDF } from "jspdf";
import JSZip from "jszip";
import { RSET_LOGO_BASE64, CSI_LOGO_BASE64 } from "./logosBase64";
import { FeedbackAttendee } from "./types";
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

  const isMatch = (target?: string | string[]) => {
    if (!target) return false;
    if (Array.isArray(target)) {
      return target.some(
        (t) =>
          (attendee.uid && t.toLowerCase() === attendee.uid.toLowerCase()) ||
          (attendee.name && t.toLowerCase() === attendee.name.toLowerCase())
      );
    }
    return (
      (attendee.uid && target.toLowerCase() === attendee.uid.toLowerCase()) ||
      (attendee.name && target.toLowerCase() === attendee.name.toLowerCase())
    );
  };

  if (isMatch(winners.first_place)) return "1st";
  if (isMatch(winners.second_place)) return "2nd";
  if (isMatch(winners.third_place)) return "3rd";
  return "participant";
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
 * Batch exports certificates into two separate ZIP folders (Winners Appreciation vs Participation)
 * Matches Python output_dir structure: Generates {Formatted_Name}.pdf inside the zip
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

  for (let i = 0; i < targetAttendees.length; i++) {
    const att = targetAttendees[i];
    const pos = getWinnerPosition(att, winners);

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
    const formattedName = formatCertificateName(att.name);
    const safeName = formattedName.replace(/[^a-zA-Z0-9_ -]/g, "").trim();

    // Exactly like the python script: {name}.pdf
    const fileName = `${safeName}.pdf`;
    zip.file(fileName, pdfData);
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
