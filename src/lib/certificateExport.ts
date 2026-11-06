import { jsPDF } from "jspdf";
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
}

/**
 * Draws an official high-resolution CSI SB RSET Certificate on a jsPDF instance (Landscape A4)
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
  const isWinner = info.position === "1st" || info.position === "2nd" || info.position === "3rd";
  const certTitle = isWinner ? "CERTIFICATE OF EXCELLENCE" : "CERTIFICATE OF PARTICIPATION";

  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.setTextColor(isWinner ? 180 : 20, isWinner ? 83 : 20, isWinner ? 9 : 80); // Gold or Deep Navy
  doc.text(certTitle, pageWidth / 2, y, { align: "center" });

  // Subtitle banner line
  y += 3;
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.6);
  doc.line(pageWidth / 2 - 40, y, pageWidth / 2 + 40, y);

  // 5. Body Text
  y += 11;
  doc.setFont("times", "normal");
  doc.setFontSize(13);
  doc.setTextColor(50, 50, 50);
  doc.text("This is to proudly certify that", pageWidth / 2, y, { align: "center" });

  // Participant Name (Big & Bold)
  y += 10;
  doc.setFont("times", "bold");
  doc.setFontSize(23);
  doc.setTextColor(15, 23, 42);
  const honorific = info.attendee.gender ? `${info.attendee.gender}. ` : "";
  const participantDisplay = `${honorific}${info.attendee.name.toUpperCase()}`;
  doc.text(participantDisplay, pageWidth / 2, y, { align: "center" });

  // Name underline
  y += 2.5;
  const nameWidth = doc.getTextWidth(participantDisplay);
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(pageWidth / 2 - nameWidth / 2 - 4, y, pageWidth / 2 + nameWidth / 2 + 4, y);

  // Detail Paragraph
  y += 9;
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
    achievementText = "has successfully participated";
  }

  const p1 = `of ${yearStr}${branchStr}${uidStr} ${achievementText} in the technical event`;
  doc.text(p1, pageWidth / 2, y, { align: "center" });

  y += 7.5;
  doc.setFont("times", "bold");
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text(`"${info.eventName}"`, pageWidth / 2, y, { align: "center" });

  y += 7.5;
  doc.setFont("times", "normal");
  doc.setFontSize(12);
  doc.setTextColor(50, 50, 50);
  const dateFormatted = formatFullDateWithDay(info.eventDate);
  const venueStr = info.venue ? ` at ${info.venue}` : "";
  doc.text(
    `organized by the Computer Society of India (CSI) Student Branch on ${dateFormatted}${venueStr}.`,
    pageWidth / 2,
    y,
    { align: "center" }
  );

  // 6. Signatures Footer
  const sigY = pageHeight - margin - 22;

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

  const cleanName = info.attendee.name.replace(/[^a-zA-Z0-9_-]/g, "_");
  const cleanEvent = info.eventName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const certType = info.position ? `Merit_${info.position}` : "Participation";

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
  winners?: { first_place?: string; second_place?: string; third_place?: string },
  facultyCoordinator?: string
) {
  if (!attendees || attendees.length === 0) return;

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  attendees.forEach((att, idx) => {
    let position: "1st" | "2nd" | "3rd" | "participant" = "participant";

    if (winners?.first_place && (att.uid === winners.first_place || att.name === winners.first_place)) {
      position = "1st";
    } else if (winners?.second_place && (att.uid === winners.second_place || att.name === winners.second_place)) {
      position = "2nd";
    } else if (winners?.third_place && (att.uid === winners.third_place || att.name === winners.third_place)) {
      position = "3rd";
    }

    renderCertificatePage(
      doc,
      {
        attendee: att,
        eventName,
        eventDate,
        venue,
        position,
        facultyCoordinator,
      },
      idx,
      attendees.length
    );
  });

  const cleanEvent = eventName.replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.save(`All_Certificates_${cleanEvent}.pdf`);
}
