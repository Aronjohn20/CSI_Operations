import { CSIEvent, RegisteredAttendee } from "./types";

/**
 * Maps branch abbreviations to official RSET departmental names
 */
export function getDepartmentChoices(targetBranches: string[]): string[] {
  const branchMap: Record<string, string> = {
    AD: "AI&DS",
    CSE: "CSE",
    CSBS: "CSBS",
    IT: "IT",
    ME: "ME",
    CE: "CE",
    EEE: "EEE",
    ECE: "ECE",
    AEI: "AEI",
  };

  if (!targetBranches || targetBranches.length === 0) {
    return ["AI&DS", "CSBS", "CSE", "IT"];
  }

  const list = targetBranches.map((b) => branchMap[b] || b);
  return Array.from(new Set(list));
}

/**
 * Generates exact Google Apps Script matching the official CSI RSET Registration Form structure.
 * Automatically customizes Form Title and Department choices based on event parameters!
 */
export function generateEventGoogleAppsScript(event: CSIEvent): string {
  const deptChoices = getDepartmentChoices(event.target_branches);
  const deptChoicesJson = JSON.stringify(deptChoices);
  const cleanFuncName = `createForm_${event.id.replace(/[^a-zA-Z0-9]/g, "_")}`;

  return `/**
 * ============================================================================
 * CSI SB RSET - Automated Google Form & Responses Sheet Generator
 * Event: ${event.event_name}
 * ============================================================================
 * Instructions:
 * 1. Open Google Drive in your CSI Gmail account (https://drive.google.com).
 * 2. Go to https://script.google.com and click "+ New project".
 * 3. Delete any default code, paste this entire script, and click Save (💾).
 * 4. Click "Run". Grant permissions (Click Advanced > Go to project (unsafe) > Allow).
 * 5. Check the Execution Log below: It gives you the live Form Link & Sheet Link!
 * ============================================================================
 */

function ${cleanFuncName}() {
  const formTitle = "${event.event_name} Registration Form";

  // 1. Create Google Form
  const form = FormApp.create(formTitle);
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setLimitOneResponsePerUser(false);
  form.setProgressBar(false);
  form.setShuffleQuestions(false);
  form.setShowLinkToRespondAgain(false);
  form.setPublishingSummary(false);

  // Q1: Title * (Multiple Choice: Mr, Ms)
  form.addMultipleChoiceItem()
    .setTitle("Title")
    .setChoiceValues(["Mr", "Ms"])
    .setRequired(true);

  // Q2: Name * (Short Answer)
  form.addTextItem()
    .setTitle("Name")
    .setRequired(true);

  // Q3: Rajagiri Email ID * (Short Answer)
  form.addTextItem()
    .setTitle("Rajagiri Email ID")
    .setRequired(true);

  // Q4: Contact No.(Preferably WhatsApp) * (Short Answer)
  form.addTextItem()
    .setTitle("Contact No.(Preferably WhatsApp)")
    .setRequired(true);

  // Q5: Year of study * (Multiple Choice: 1st, 2nd, 3rd, 4th year)
  form.addMultipleChoiceItem()
    .setTitle("Year of study")
    .setChoiceValues(["1st year", "2nd year", "3rd year", "4th year"])
    .setRequired(true);

  // Q6: Department * (Auto-filtered from event's selected eligible branches)
  form.addMultipleChoiceItem()
    .setTitle("Department")
    .setChoiceValues(${deptChoicesJson})
    .setRequired(true);

  // Q7: Division * (Multiple Choice: Alpha, Beta, Gamma, Delta, Nil)
  form.addMultipleChoiceItem()
    .setTitle("Division")
    .setChoiceValues(["Alpha", "Beta", "Gamma", "Delta", "Nil"])
    .setRequired(true);

  // Q8: Are you a CSI member? * (Multiple Choice: Yes, No)
  form.addMultipleChoiceItem()
    .setTitle("Are you a CSI member?")
    .setChoiceValues(["Yes", "No"])
    .setRequired(true);

  // Q9: If yes, enter CSI membership id (Optional)
  form.addTextItem()
    .setTitle("If yes, enter CSI membership id")
    .setHelpText("Your membership ID can be found in your membership card")
    .setRequired(false);

  // 2. Create the Destination Google Sheet in CSI Google Drive
  const sheetTitle = "${event.event_name} - Registrations (Responses)";
  const spreadsheet = SpreadsheetApp.create(sheetTitle);

  // 3. Link Form responses to this Google Sheet
  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());

  const formUrl = form.getPublishedUrl();
  const editUrl = form.getEditUrl();
  const sheetUrl = spreadsheet.getUrl();

  Logger.log("=================================================");
  Logger.log("✅ REGISTRATION SYSTEM CREATED FOR: ${event.event_name.toUpperCase()}");
  Logger.log("=================================================");
  Logger.log("1. Public Form Link (Send to students in RSMS notice):");
  Logger.log(formUrl);
  Logger.log("\\n2. Edit Form in Drive (Add custom description / header banner):");
  Logger.log(editUrl);
  Logger.log("\\n3. Responses Sheet Link (Connect back to Attendance Sheet):");
  Logger.log(sheetUrl);
  Logger.log("=================================================");
}
`;
}

/**
 * Intelligent Mapper from Google Form CSV/TSV response columns to Attendance Sheet format
 */
export function mapGoogleFormResponsesToAttendance(
  headers: string[],
  rows: string[][]
): RegisteredAttendee[] {
  const normHeaders = headers.map((h) => h.replace(/^["']|["']$/g, "").trim().toLowerCase());

  // Detect index of each question
  const titleIdx = normHeaders.findIndex((h) => h === "title");
  const nameIdx = normHeaders.findIndex((h) => h === "name" || h.includes("student name") || h.includes("full name"));
  const yearIdx = normHeaders.findIndex((h) => h.includes("year of study") || h.includes("year"));
  const deptIdx = normHeaders.findIndex((h) => h === "department" || h.includes("dept") || h.includes("branch"));
  const divIdx = normHeaders.findIndex((h) => h === "division" || h.includes("div"));
  const directClassIdx = normHeaders.findIndex((h) => h.includes("class & batch") || h.includes("class"));
  const directGenderIdx = normHeaders.findIndex((h) => h.includes("gender") || h.includes("sex"));

  if (nameIdx === -1) {
    throw new Error("Could not locate the 'Name' column in the uploaded response sheet.");
  }

  const yearShorthand: Record<string, string> = {
    "1st year": "S1/S2",
    "2nd year": "S3/S4",
    "3rd year": "S5/S6",
    "4th year": "S7/S8",
  };

  const divisionShorthand: Record<string, string> = {
    alpha: "A",
    beta: "B",
    gamma: "C",
    delta: "D",
    nil: "",
  };

  const attendees: RegisteredAttendee[] = [];

  rows.forEach((row) => {
    const rawName = row[nameIdx] || "";
    if (!rawName.trim()) return;

    // Determine Gender (from Title: Mr -> Male, Ms -> Female, or direct Gender column)
    let gender = "";
    if (directGenderIdx !== -1 && row[directGenderIdx]) {
      gender = row[directGenderIdx];
    } else if (titleIdx !== -1 && row[titleIdx]) {
      const t = row[titleIdx].trim().toLowerCase();
      if (t === "mr") gender = "Male";
      else if (t === "ms") gender = "Female";
    }

    // Determine Class (from Year + Department + Division, or direct Class column)
    let classBatch = "";
    if (directClassIdx !== -1 && row[directClassIdx]) {
      classBatch = row[directClassIdx];
    } else {
      const dept = deptIdx !== -1 && row[deptIdx] ? row[deptIdx].trim() : "";
      const divRaw = divIdx !== -1 && row[divIdx] ? row[divIdx].trim().toLowerCase() : "";
      const div = divisionShorthand[divRaw] || (divRaw !== "nil" ? divRaw.toUpperCase() : "");
      const yr = yearIdx !== -1 && row[yearIdx] ? row[yearIdx].trim() : "";

      if (dept) {
        if (yr && div) {
          classBatch = `${yr} ${dept} ${div}`;
        } else if (dept && div) {
          classBatch = `${dept} ${div}`;
        } else {
          classBatch = dept;
        }
      }
    }

    attendees.push({
      sl_no: attendees.length + 1,
      name: rawName.trim(),
      gender: gender,
      class_batch: classBatch,
    });
  });

  return attendees;
}
