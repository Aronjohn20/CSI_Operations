/**
 * ============================================================================
 * CSI RSET - Automated Registration Form & Sheet Generator
 * ============================================================================
 * Instructions:
 * 1. Open Google Drive with your CSI Gmail account (https://drive.google.com).
 * 2. Go to Google Apps Script (https://script.google.com) and click "New Project".
 * 3. Delete any code in the editor, paste this entire file, and click "Save".
 * 4. Update the EVENT_CONFIG object below with your event details.
 * 5. Select "createRegistrationFormAndSheet" in the function dropdown and click "Run".
 * 6. Review permissions (click "Advanced" > "Go to project (unsafe)" > "Allow").
 * 7. Check the Execution Log: It outputs the Form Link and Response Sheet Link!
 * ============================================================================
 */

const EVENT_CONFIG = {
  eventName: "Off the Script",
  eventDate: "25th September 2026",
  time: "01:00 PM - 04:30 PM",
  venue: "Main Auditorium",
  description: "Annual CSI technical event organized by Computer Society of India Student Branch RSET.",
  targetBranches: ["AEI", "CSE", "CSBS", "IT", "AD", "ME", "CE", "EEE", "ECE"],
};

function createRegistrationFormAndSheet() {
  const formTitle = `${EVENT_CONFIG.eventName} - Registration Form`;

  // 1. Create the Google Form
  const form = FormApp.create(formTitle);
  form.setDescription(
    `Computer Society of India (CSI) Student Branch RSET\n` +
    `Event: ${EVENT_CONFIG.eventName}\n` +
    `Date: ${EVENT_CONFIG.eventDate}\n` +
    `Time: ${EVENT_CONFIG.time}\n` +
    `Venue: ${EVENT_CONFIG.venue}\n\n` +
    `${EVENT_CONFIG.description}\n\n` +
    `Please fill out this form to register for the event.`
  );

  form.setCollectEmail(true);
  form.setAllowResponseEdits(false);
  form.setLimitOneResponsePerUser(true);

  // Standard CSI Registration Questions
  // Q1: Full Name (Maps directly to Attendance Sheet NAME)
  form.addTextItem()
    .setTitle("Full Name")
    .setHelpText("Enter your full legal name as it should appear in event records.")
    .setRequired(true);

  // Q2: Gender (Maps directly to Attendance Sheet GENDER)
  form.addMultipleChoiceItem()
    .setTitle("Gender")
    .setChoiceValues(["Male", "Female", "Other"])
    .setRequired(true);

  // Q3: Class & Batch (Maps directly to Attendance Sheet CLASS)
  form.addTextItem()
    .setTitle("Class & Batch")
    .setHelpText("e.g., S7 CS A, S5 IT, S3 CSBS, S3 AD")
    .setRequired(true);

  // Q4: Branch / Department
  form.addListItem()
    .setTitle("Branch / Department")
    .setChoiceValues(EVENT_CONFIG.targetBranches)
    .setRequired(true);

  // Q5: College Roll Number / Register Number
  form.addTextItem()
    .setTitle("Roll Number / Register Number")
    .setHelpText("e.g., RET23CS045")
    .setRequired(true);

  // Q6: Phone Number / WhatsApp
  form.addTextItem()
    .setTitle("WhatsApp Contact Number")
    .setHelpText("Enter 10-digit mobile number for event coordinator updates.")
    .setRequired(true);

  // Q7: CSI Membership Status
  form.addMultipleChoiceItem()
    .setTitle("Are you a CSI Member?")
    .setChoiceValues(["Yes", "No"])
    .setRequired(true);

  // 2. Create the Destination Google Sheet inside CSI Google Drive
  const sheetTitle = `${EVENT_CONFIG.eventName} - Registrations (Responses)`;
  const spreadsheet = SpreadsheetApp.create(sheetTitle);

  // 3. Link Form responses to this Google Sheet
  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());

  const formUrl = form.getPublishedUrl();
  const editUrl = form.getEditUrl();
  const sheetUrl = spreadsheet.getUrl();

  Logger.log("=================================================");
  Logger.log("✅ REGISTRATION SYSTEM SUCCESSFULLY CREATED!");
  Logger.log("=================================================");
  Logger.log("1. Public Form URL (for students to register):");
  Logger.log(formUrl);
  Logger.log("\n2. Form Edit URL (to modify questions in Drive):");
  Logger.log(editUrl);
  Logger.log("\n3. Google Sheet Responses URL (for attendance sheet sync):");
  Logger.log(sheetUrl);
  Logger.log("=================================================");

  return {
    formUrl: formUrl,
    editUrl: editUrl,
    sheetUrl: sheetUrl
  };
}
