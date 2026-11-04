/**
 * ============================================================================
 * CSI SB RSET - Master Automation Webhook
 * One-time deployment for all CSI technical events.
 * ============================================================================
 */

// Test endpoint to check if webhook is live
function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({ status: "online", message: "CSI SB RSET Automation Hub is active." })
  ).setMimeType(ContentService.MimeType.JSON);
}

// Handles requests from CSI Operations app
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || "create_form";

    // ACTION 1: Create Form & Linked Sheet
    if (action === "create_form") {
      const eventName = data.eventName || "CSI Event";
      const targetDepts = data.targetDepartments && data.targetDepartments.length > 0
        ? data.targetDepartments
        : ["AI&DS", "CSBS", "CSE", "IT"];

      // 1. Create Google Form
      const formTitle = eventName + " Registration Form";
      const form = FormApp.create(formTitle);
      form.setCollectEmail(true);
      form.setAllowResponseEdits(false);
      form.setLimitOneResponsePerUser(true);

      // 10 Official CSI RSET Questions:
      // Q1: Title *
      form.addMultipleChoiceItem()
        .setTitle("Title")
        .setChoiceValues(["Mr", "Ms"])
        .setRequired(true);

      // Q2: Name *
      form.addTextItem()
        .setTitle("Name")
        .setRequired(true);

      // Q3: Rajagiri Email ID *
      form.addTextItem()
        .setTitle("Rajagiri Email ID")
        .setRequired(true);

      // Q4: Contact No.(Preferably WhatsApp) *
      form.addTextItem()
        .setTitle("Contact No.(Preferably WhatsApp)")
        .setRequired(true);

      // Q5: Year of study *
      form.addMultipleChoiceItem()
        .setTitle("Year of study")
        .setChoiceValues(["1st year", "2nd year", "3rd year", "4th year"])
        .setRequired(true);

      // Q6: Department * (Injected from event's selected branches)
      form.addMultipleChoiceItem()
        .setTitle("Department")
        .setChoiceValues(targetDepts)
        .setRequired(true);

      // Q7: Division *
      form.addMultipleChoiceItem()
        .setTitle("Division")
        .setChoiceValues(["Alpha", "Beta", "Gamma", "Delta", "Nil"])
        .setRequired(true);

      // Q8: Are you a CSI member? *
      form.addMultipleChoiceItem()
        .setTitle("Are you a CSI member?")
        .setChoiceValues(["Yes", "No"])
        .setRequired(true);

      // Q9: If yes, enter CSI membership id (Optional)
      form.addTextItem()
        .setTitle("If yes, enter CSI membership id")
        .setHelpText("Your membership ID can be found in your membership card")
        .setRequired(false);

      // 2. Create the Destination Responses Google Sheet in CSI Drive
      const sheetTitle = eventName + " - Registrations (Responses)";
      const spreadsheet = SpreadsheetApp.create(sheetTitle);

      // 3. Link Form responses to this Sheet
      form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        formId: form.getId(),
        formUrl: form.getPublishedUrl(),
        editUrl: form.getEditUrl(),
        sheetUrl: spreadsheet.getUrl(),
        sheetId: spreadsheet.getId()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ACTION 2: Fetch Final Responses after Form is Closed
    if (action === "get_responses") {
      const sheetId = data.sheetId;
      if (!sheetId) throw new Error("No sheetId provided.");

      const ss = SpreadsheetApp.openById(sheetId);
      const sheet = ss.getSheets()[0];
      const values = sheet.getDataRange().getValues();

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        headers: values[0] || [],
        rows: values.slice(1) || []
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ACTION 3: Close Registration Form
    if (action === "close_form") {
      const formId = data.formId;
      if (!formId) throw new Error("No formId provided.");

      const form = FormApp.openById(formId);
      form.setAcceptingResponses(false);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Form has been closed for registrations."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    throw new Error("Unknown action requested.");

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

