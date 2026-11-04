import { jsPDF } from "jspdf";

/**
 * Direct 1-Click Word (.doc) Downloader
 * Generates an MS Word compatible document blob and immediately triggers browser download.
 */
export function exportToWord(filename: string, title: string, htmlContent: string) {
  const fileContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta charset='utf-8'>
    <title>${title}</title>
    <style>
      body { font-family: 'Calibri', 'Times New Roman', serif; font-size: 11.5pt; line-height: 1.5; color: #111; margin: 40px; }
      h2 { color: #1E3A8A; text-align: center; font-size: 16pt; margin-bottom: 4px; }
      p.subtitle { text-align: center; color: #555; font-size: 10pt; margin-top: 0; margin-bottom: 20px; }
      hr { border: none; border-top: 1.5px solid #2563EB; margin-bottom: 20px; }
      pre { font-family: 'Calibri', sans-serif; font-size: 11pt; white-space: pre-wrap; line-height: 1.6; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 16px; }
      th, td { border: 1px solid #444; padding: 7px 10px; font-size: 10pt; text-align: left; }
      th { background-color: #f1f5f9; font-weight: bold; }
    </style>
  </head>
  <body>
    <h2>COMPUTER SOCIETY OF INDIA (CSI)</h2>
    <p class="subtitle">Student Branch Chapter • Official Operations Document</p>
    <hr />
    ${htmlContent}
  </body>
  </html>`;

  const blob = new Blob(["\ufeff", fileContent], {
    type: "application/msword;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename.replace(/[^a-zA-Z0-9_-]/g, "_")}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Direct 1-Click PDF Downloader
 * Generates an A4 PDF document client-side and immediately saves to Downloads folder.
 */
export function exportToPdf(filename: string, title: string, textContent: string) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  // Header Banner
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30, 58, 138); // Royal blue
  doc.text("COMPUTER SOCIETY OF INDIA (CSI)", pageWidth / 2, 16, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("Student Branch Chapter • Official Operations Document", pageWidth / 2, 21, { align: "center" });

  // Divider line
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.4);
  doc.line(margin, 25, pageWidth - margin, 25);

  // Document Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text(title.toUpperCase(), margin, 32);

  // Document Body
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);

  const lines = doc.splitTextToSize(textContent, contentWidth);
  let y = 39;

  for (let i = 0; i < lines.length; i++) {
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(lines[i], margin, y);
    y += 5.2;
  }

  // Save directly to Downloads without print dialog
  doc.save(`${filename.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`);
}

/**
 * Direct Attendance Sheet Exporters (Table Format)
 */
export function exportAttendancePdf(
  filename: string,
  eventTitle: string,
  eventDate: string,
  venue: string,
  coordinators: string[]
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.text("COMPUTER SOCIETY OF INDIA (CSI)", pageWidth / 2, 15, { align: "center" });

  doc.setFontSize(11);
  doc.text("STUDENT ATTENDANCE SHEET", pageWidth / 2, 21, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(70, 70, 70);
  doc.text(`Event: ${eventTitle} | Date: ${eventDate} | Venue: ${venue}`, pageWidth / 2, 27, { align: "center" });
  if (coordinators.length > 0) {
    doc.text(`Coordinators: ${coordinators.join(", ")}`, pageWidth / 2, 32, { align: "center" });
  }

  // Table setup
  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(0.3);

  const startY = 38;
  const rowHeight = 9.5;
  const colWidths = [12, 55, 30, 25, 28, 28]; // Total = 178mm
  const colHeaders = ["Sl", "Student Name", "Roll / Reg No", "Branch", "FN Signature", "AN Signature"];

  let curY = startY;

  // Table Header
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, curY, 178, 8, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);

  let curX = margin;
  colHeaders.forEach((header, idx) => {
    doc.text(header, curX + 2, curY + 5.5);
    curX += colWidths[idx];
  });

  curY += 8;

  // Draw 20 blank rows for offline attendance
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  for (let r = 1; r <= 20; r++) {
    curX = margin;
    doc.rect(margin, curY, 178, rowHeight);
    doc.text(String(r), curX + 3, curY + 6.5);

    colWidths.forEach((w) => {
      doc.line(curX, curY, curX, curY + rowHeight);
      curX += w;
    });
    doc.line(curX, curY, curX, curY + rowHeight);

    curY += rowHeight;
  }

  // Footer notes for faculty verification
  curY += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Coordinators Signature: _______________________", margin, curY);
  doc.text("Faculty In-Charge Signature: _______________________", 115, curY);

  doc.save(`${filename.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`);
}

export function exportAttendanceWord(
  filename: string,
  eventTitle: string,
  eventDate: string,
  venue: string,
  coordinators: string[]
) {
  let tableRows = "";
  for (let i = 1; i <= 20; i++) {
    tableRows += `
      <tr>
        <td style="text-align: center; width: 40px;">${i}</td>
        <td style="width: 220px;">&nbsp;</td>
        <td style="width: 120px;">&nbsp;</td>
        <td style="width: 80px;">&nbsp;</td>
        <td style="width: 100px;">&nbsp;</td>
        <td style="width: 100px;">&nbsp;</td>
      </tr>
    `;
  }

  const html = `
    <h3 style="text-align: center; margin-bottom: 2px;">OFFICIAL ATTENDANCE SHEET</h3>
    <p style="text-align: center; margin-top: 0; font-size: 11pt;">
      <strong>Event:</strong> ${eventTitle} &nbsp;|&nbsp; 
      <strong>Date:</strong> ${eventDate} &nbsp;|&nbsp; 
      <strong>Venue:</strong> ${venue}
    </p>
    <p style="text-align: center; font-size: 10pt; color: #444;">
      <strong>Coordinators:</strong> ${coordinators.join(", ") || "CSI Coordinators"}
    </p>

    <table>
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">Sl</th>
          <th style="width: 220px;">Student Name</th>
          <th style="width: 120px;">Roll / Reg No</th>
          <th style="width: 80px;">Branch</th>
          <th style="width: 100px; text-align: center;">FN Sign</th>
          <th style="width: 100px; text-align: center;">AN Sign</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>

    <div style="margin-top: 35px; display: flex; justify-content: space-between;">
      <p><strong>Student Coordinator Signature:</strong> _______________________</p>
      <p style="text-align: right;"><strong>Faculty In-Charge Signature:</strong> _______________________</p>
    </div>
  `;

  exportToWord(filename, `Attendance_${eventTitle}`, html);
}
