import { CSIEvent, FeedbackAttendee, FeedbackQuestion } from "./types";
import { getDepartmentChoices } from "./formScriptGenerator";

export const PO_DEFINITIONS: Record<string, { title: string; desc: string }> = {
  PO1: {
    title: "Engineering Knowledge",
    desc: "Apply knowledge of mathematics, science, engineering fundamentals, and specialization to solve complex engineering problems.",
  },
  PO2: {
    title: "Problem Analysis",
    desc: "Identify, formulate, review literature, and analyze complex engineering problems reaching substantiated conclusions.",
  },
  PO3: {
    title: "Design/Development of Solutions",
    desc: "Design solutions for complex problems and system components that meet specified needs with public health/safety considerations.",
  },
  PO4: {
    title: "Conduct Investigations of Complex Problems",
    desc: "Use research-based knowledge including experiment design, analysis, and data synthesis to provide valid conclusions.",
  },
  PO5: {
    title: "Modern Tool Usage",
    desc: "Create, select, and apply appropriate techniques, resources, and modern engineering and IT tools with an understanding of limitations.",
  },
  PO6: {
    title: "The Engineer and Society",
    desc: "Apply contextual reasoning to assess societal, health, safety, legal, and cultural issues and relevant professional responsibilities.",
  },
  PO7: {
    title: "Environment and Sustainability",
    desc: "Understand the impact of engineering solutions in societal/environmental contexts and demonstrate knowledge of sustainable development.",
  },
  PO8: {
    title: "Ethics",
    desc: "Apply ethical principles and commit to professional ethics, responsibilities, and norms of engineering practice.",
  },
  PO9: {
    title: "Individual and Team Work",
    desc: "Function effectively as an individual, and as a member or leader in diverse and multidisciplinary teams.",
  },
  PO10: {
    title: "Communication",
    desc: "Communicate effectively with the engineering community and society at large; comprehend and write effective reports; make presentations.",
  },
  PO11: {
    title: "Project Management and Finance",
    desc: "Demonstrate knowledge of engineering and management principles and apply to one's own work as member and leader in a team.",
  },
  PO12: {
    title: "Life-long Learning",
    desc: "Recognize the need for, and have preparation and ability to engage in independent and lifelong learning in the broadest context of technological change.",
  },
};

const LIKERT_CHOICES = [
  "Strongly Disagree",
  "Disagree",
  "Neutral",
  "Agree",
  "Strongly Agree",
];

/**
 * Intelligent CO/PO feedback question generator.
 * Automatically aligns with the event's type (Contest, Workshop, Seminar, Hackathon, or General Technical Event).
 */
export function generateDefaultFeedbackQuestions(event: CSIEvent): FeedbackQuestion[] {
  const text = `${event.event_name} ${event.brief_description}`.toLowerCase();

  const isContest =
    text.includes("contest") ||
    text.includes("coding") ||
    text.includes("heist") ||
    text.includes("challenge") ||
    text.includes("competition") ||
    text.includes("quiz");

  const isWorkshop =
    text.includes("workshop") ||
    text.includes("hands-on") ||
    text.includes("bootcamp") ||
    text.includes("training") ||
    text.includes("lab");

  const isTalk =
    text.includes("talk") ||
    text.includes("seminar") ||
    text.includes("webinar") ||
    text.includes("lecture") ||
    text.includes("session");

  if (isContest) {
    return [
      {
        id: "q1",
        title: "Overall Coordination and Organization",
        description: `The event was well organized, and the instructions, schedule, and overall coordination were clear and effective throughout the contest. [PO10, PO11]`,
        po_mapping: ["PO10", "PO11"],
        choices: LIKERT_CHOICES,
        type: "likert_scale",
        required: true,
      },
      {
        id: "q2",
        title: "Quality of the Coding Contest",
        description: `The coding problems were well designed with an appropriate level of difficulty and provided a meaningful problem-solving experience. [PO2]`,
        po_mapping: ["PO2"],
        choices: LIKERT_CHOICES,
        type: "likert_scale",
        required: true,
      },
      {
        id: "q3",
        title: "Improvement in Problem-Solving Skills",
        description: `The contest enhanced my ability to analyze problems and develop logical, efficient solutions. [PO1, PO2]`,
        po_mapping: ["PO1", "PO2"],
        choices: LIKERT_CHOICES,
        type: "likert_scale",
        required: true,
      },
      {
        id: "q4",
        title: "Application of Programming Knowledge",
        description: `The contest provided an opportunity to apply programming concepts, data structures, and algorithms to solve coding challenges effectively. [PO1, PO3]`,
        po_mapping: ["PO1", "PO3"],
        choices: LIKERT_CHOICES,
        type: "likert_scale",
        required: true,
      },
      {
        id: "q5",
        title: "Critical Thinking and Time Management",
        description: `The contest encouraged critical thinking, analytical reasoning, and effective time management while solving coding challenges. [PO2, PO4]`,
        po_mapping: ["PO2", "PO4"],
        choices: LIKERT_CHOICES,
        type: "likert_scale",
        required: true,
      },
      {
        id: "q6",
        title: "Motivation for Continuous Learning",
        description: `Overall, the contest motivated me to further improve my programming, problem-solving, and competitive coding skills through continuous learning. [PO12]`,
        po_mapping: ["PO12"],
        choices: LIKERT_CHOICES,
        type: "likert_scale",
        required: true,
      },
      {
        id: "q7",
        title: "Do you have any other comments/suggestions that would help us make future events better?",
        description: "Please share any feedback or ideas for upcoming CSI events.",
        po_mapping: [],
        choices: [],
        type: "paragraph",
        required: true,
      },
    ];
  }

  if (isWorkshop) {
    return [
      {
        id: "q1",
        title: "Overall Coordination and Organization",
        description: `The workshop was well organized, and the instructions, venue setup, and overall coordination were clear and helpful. [PO10, PO11]`,
        po_mapping: ["PO10", "PO11"],
        choices: LIKERT_CHOICES,
        type: "likert_scale",
        required: true,
      },
      {
        id: "q2",
        title: "Quality and Content of the Workshop",
        description: `The technical topics covered were practical, well-structured, and explained clearly by the resource persons. [PO1, PO2]`,
        po_mapping: ["PO1", "PO2"],
        choices: LIKERT_CHOICES,
        type: "likert_scale",
        required: true,
      },
      {
        id: "q3",
        title: "Hands-on Practical Skills Acquired",
        description: `The practical exercises enabled me to acquire hands-on experience and apply modern development tools directly. [PO1, PO5]`,
        po_mapping: ["PO1", "PO5"],
        choices: LIKERT_CHOICES,
        type: "likert_scale",
        required: true,
      },
      {
        id: "q4",
        title: "Application of Technical Tools & Frameworks",
        description: `The session provided an opportunity to design components and utilize modern engineering tools effectively. [PO3, PO5]`,
        po_mapping: ["PO3", "PO5"],
        choices: LIKERT_CHOICES,
        type: "likert_scale",
        required: true,
      },
      {
        id: "q5",
        title: "Analytical Problem Solving & Troubleshooting",
        description: `The workshop strengthened my ability to debug, troubleshoot, and solve real-world implementation challenges. [PO2, PO4]`,
        po_mapping: ["PO2", "PO4"],
        choices: LIKERT_CHOICES,
        type: "likert_scale",
        required: true,
      },
      {
        id: "q6",
        title: "Motivation for Continuous Learning",
        description: `Overall, the workshop motivated me to continue exploring this domain and build future practical projects. [PO12]`,
        po_mapping: ["PO12"],
        choices: LIKERT_CHOICES,
        type: "likert_scale",
        required: true,
      },
      {
        id: "q7",
        title: "Do you have any other comments/suggestions that would help us make future events better?",
        description: "Please share any feedback or ideas for upcoming CSI events.",
        po_mapping: [],
        choices: [],
        type: "paragraph",
        required: true,
      },
    ];
  }

  if (isTalk) {
    return [
      {
        id: "q1",
        title: "Overall Coordination and Organization",
        description: `The session was well managed, timely, and provided smooth coordination throughout. [PO10, PO11]`,
        po_mapping: ["PO10", "PO11"],
        choices: LIKERT_CHOICES,
        type: "likert_scale",
        required: true,
      },
      {
        id: "q2",
        title: "Relevance and Depth of the Topic",
        description: `The session addressed industry-relevant insights and provided deep conceptual clarity. [PO1, PO6]`,
        po_mapping: ["PO1", "PO6"],
        choices: LIKERT_CHOICES,
        type: "likert_scale",
        required: true,
      },
      {
        id: "q3",
        title: "Exposure to Modern Trends & Technologies",
        description: `The talk introduced me to modern technological paradigms and real-world industrial tools. [PO5, PO12]`,
        po_mapping: ["PO5", "PO12"],
        choices: LIKERT_CHOICES,
        type: "likert_scale",
        required: true,
      },
      {
        id: "q4",
        title: "Clarity and Effectiveness of Delivery",
        description: `The speaker communicated complex ideas clearly and addressed attendee queries effectively. [PO10]`,
        po_mapping: ["PO10"],
        choices: LIKERT_CHOICES,
        type: "likert_scale",
        required: true,
      },
      {
        id: "q5",
        title: "Understanding of Engineering and Societal Impact",
        description: `The topic highlighted the broader social, ethical, and engineering value of modern technologies. [PO6, PO8]`,
        po_mapping: ["PO6", "PO8"],
        choices: LIKERT_CHOICES,
        type: "likert_scale",
        required: true,
      },
      {
        id: "q6",
        title: "Motivation for Lifelong Learning",
        description: `The session inspired me to pursue independent study and keep up with technological advances. [PO12]`,
        po_mapping: ["PO12"],
        choices: LIKERT_CHOICES,
        type: "likert_scale",
        required: true,
      },
      {
        id: "q7",
        title: "Do you have any other comments/suggestions that would help us make future events better?",
        description: "Please share any feedback or ideas for upcoming CSI events.",
        po_mapping: [],
        choices: [],
        type: "paragraph",
        required: true,
      },
    ];
  }

  // General Technical Event Default (Matches User Standard Screenshots)
  return [
    {
      id: "q1",
      title: "Overall Coordination and Organization",
      description: `The event was well organized, and the instructions, schedule, and overall coordination were clear and effective throughout the event. [PO10, PO11]`,
      po_mapping: ["PO10", "PO11"],
      choices: LIKERT_CHOICES,
      type: "likert_scale",
      required: true,
    },
    {
      id: "q2",
      title: `Quality of the ${event.event_name}`,
      description: `The event activities and challenges were well designed with an appropriate level of difficulty and provided a meaningful experience. [PO2]`,
      po_mapping: ["PO2"],
      choices: LIKERT_CHOICES,
      type: "likert_scale",
      required: true,
    },
    {
      id: "q3",
      title: "Improvement in Problem-Solving Skills",
      description: `The event enhanced my ability to analyze practical problems and develop logical, efficient solutions. [PO1, PO2]`,
      po_mapping: ["PO1", "PO2"],
      choices: LIKERT_CHOICES,
      type: "likert_scale",
      required: true,
    },
    {
      id: "q4",
      title: "Application of Technical Knowledge",
      description: `The event provided an opportunity to apply engineering concepts, techniques, and skills effectively. [PO1, PO3]`,
      po_mapping: ["PO1", "PO3"],
      choices: LIKERT_CHOICES,
      type: "likert_scale",
      required: true,
    },
    {
      id: "q5",
      title: "Critical Thinking and Time Management",
      description: `The event encouraged critical thinking, analytical reasoning, and effective time management while participating. [PO2, PO4]`,
      po_mapping: ["PO2", "PO4"],
      choices: LIKERT_CHOICES,
      type: "likert_scale",
      required: true,
    },
    {
      id: "q6",
      title: "Motivation for Continuous Learning",
      description: `Overall, the event motivated me to further improve my technical and professional skills through continuous learning. [PO12]`,
      po_mapping: ["PO12"],
      choices: LIKERT_CHOICES,
      type: "likert_scale",
      required: true,
    },
    {
      id: "q7",
      title: "Do you have any other comments/suggestions that would help us make future events better?",
      description: "Please share any feedback or ideas for upcoming CSI events.",
      po_mapping: [],
      choices: [],
      type: "paragraph",
      required: true,
    },
  ];
}

/**
 * Builds the official form header description based on event aims
 */
export function getFeedbackHeaderDescription(event: CSIEvent): string {
  const customDesc = event.brief_description
    ? `${event.event_name} is ${event.brief_description}`
    : `${event.event_name} is a premier technical initiative organized by the Computer Society of India (CSI) Student Branch, RSET.`;

  return `${customDesc}\nThank you for participating – your feedback will help us improve and deliver even better events ahead!`;
}

/**
 * Generates exact Google Apps Script matching the official 2-Page Feedback Form structure
 */
export function generateFeedbackGoogleAppsScript(
  event: CSIEvent,
  questions?: FeedbackQuestion[]
): string {
  const activeQuestions = questions && questions.length > 0
    ? questions
    : generateDefaultFeedbackQuestions(event);

  const deptChoices = getDepartmentChoices(event.target_branches);
  const deptChoicesJson = JSON.stringify(deptChoices);
  const formDesc = getFeedbackHeaderDescription(event).replace(/"/g, '\\"').replace(/\n/g, "\\n");
  const cleanFuncName = `createFeedbackForm_${event.id.replace(/[^a-zA-Z0-9]/g, "_")}`;

  const questionsScript = activeQuestions
    .map((q) => {
      if (q.type === "paragraph") {
        return `
  // Question: ${q.title}
  form.addParagraphTextItem()
    .setTitle("${q.title.replace(/"/g, '\\"')}")
    .setHelpText("${q.description.replace(/"/g, '\\"')}")
    .setRequired(${q.required});
`;
      }

      return `
  // Question: ${q.title}
  form.addMultipleChoiceItem()
    .setTitle("${q.title.replace(/"/g, '\\"')}")
    .setHelpText("${q.description.replace(/"/g, '\\"')}")
    .setChoiceValues(["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"])
    .setRequired(${q.required});
`;
    })
    .join("\n");

  return `/**
 * ============================================================================
 * CSI SB RSET - Automated Feedback Form & Certificate Roster Generator
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
  const formTitle = "${event.event_name} Feedback";

  // 1. Create Google Form
  const form = FormApp.create(formTitle);
  form.setDescription("${formDesc}");
  form.setCollectEmail(true);
  form.setAllowResponseEdits(false);
  form.setLimitOneResponsePerUser(true);

  // -------------------------------------------------------------
  // SECTION 1: Standard Attendee Profile (First 2 Pages)
  // -------------------------------------------------------------

  // Q1: Name (As required in the certificate) *
  form.addTextItem()
    .setTitle("Name (As required in the certificate)")
    .setRequired(true);

  // Q2: UID *
  form.addTextItem()
    .setTitle("UID")
    .setRequired(true);

  // Q3: UID Email (if no then provide your personal email) *
  form.addTextItem()
    .setTitle("UID Email (if no then provide your personal email)")
    .setRequired(true);

  // Q4: Gender *
  form.addMultipleChoiceItem()
    .setTitle("Gender")
    .setChoiceValues(["Mr", "Mrs"])
    .setRequired(true);

  // Q5: Year of Study *
  form.addMultipleChoiceItem()
    .setTitle("Year of Study")
    .setChoiceValues(["1st", "2nd", "3rd", "4th"])
    .setRequired(true);

  // Q6: Branch * (Auto-populated from event's selected eligible branches)
  form.addMultipleChoiceItem()
    .setTitle("Branch")
    .setChoiceValues(${deptChoicesJson})
    .setRequired(true);

  // Q7: Section *
  form.addMultipleChoiceItem()
    .setTitle("Section")
    .setChoiceValues(["Alpha", "Beta", "Gamma", "Delta", "Nil"])
    .setRequired(true);

  // Q8: WhatsApp No *
  form.addTextItem()
    .setTitle("WhatsApp No")
    .setRequired(true);

  // -------------------------------------------------------------
  // SECTION 2: Event-Specific CO/PO Evaluation (FEEDBACK FORM)
  // -------------------------------------------------------------
  const sectionBreak = form.addPageBreakItem();
  sectionBreak.setTitle("FEEDBACK FORM");
  sectionBreak.setHelpText("Please evaluate the following criteria based on your experience.");

${questionsScript}

  // 2. Create the Destination Google Sheet in CSI Google Drive
  const sheetTitle = "${event.event_name} - Feedback (Responses)";
  const spreadsheet = SpreadsheetApp.create(sheetTitle);

  // 3. Link Form responses to this Google Sheet
  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());

  const formUrl = form.getPublishedUrl();
  const editUrl = form.getEditUrl();
  const sheetUrl = spreadsheet.getUrl();

  Logger.log("=================================================");
  Logger.log("✅ FEEDBACK SYSTEM CREATED FOR: ${event.event_name.toUpperCase()}");
  Logger.log("=================================================");
  Logger.log("1. Public Form Link (Display QR Code on projector):");
  Logger.log(formUrl);
  Logger.log("\\n2. Edit Form in Drive (Adjust questions if needed):");
  Logger.log(editUrl);
  Logger.log("\\n3. Responses Sheet Link (Connects directly to Certificate Generator):");
  Logger.log(sheetUrl);
  Logger.log("=================================================");
}
`;
}

/**
 * Intelligent parser that converts Google Sheet responses into typed FeedbackAttendee objects
 */
export function mapGoogleSheetToFeedbackAttendees(
  headers: string[],
  rows: any[][]
): FeedbackAttendee[] {
  const normHeaders = headers.map((h) => String(h || "").trim().toLowerCase());

  const nameIdx = normHeaders.findIndex(
    (h) => h.includes("name (as required") || h.includes("certificate") || h === "name" || h.includes("student name")
  );
  const uidIdx = normHeaders.findIndex((h) => h === "uid" || h.includes("roll") || h.includes("reg"));
  const emailIdx = normHeaders.findIndex(
    (h) => h.includes("uid email") || h.includes("personal email") || h.includes("email")
  );
  const genderIdx = normHeaders.findIndex((h) => h === "gender" || h.includes("sex") || h === "title");
  const yearIdx = normHeaders.findIndex((h) => h.includes("year of study") || h.includes("year"));
  const branchIdx = normHeaders.findIndex((h) => h === "branch" || h.includes("department") || h.includes("dept"));
  const sectionIdx = normHeaders.findIndex((h) => h === "section" || h.includes("div"));
  const whatsappIdx = normHeaders.findIndex(
    (h) => h.includes("whatsapp") || h.includes("phone") || h.includes("contact")
  );
  const commentsIdx = normHeaders.findIndex(
    (h) => h.includes("comments") || h.includes("suggestions") || h.includes("better")
  );

  if (nameIdx === -1) {
    throw new Error("Could not find 'Name (As required in the certificate)' in the uploaded sheet headers.");
  }

  const attendees: FeedbackAttendee[] = [];

  rows.forEach((row, idx) => {
    const rawName = String(row[nameIdx] || "").trim();
    if (!rawName) return;

    const ratings: Record<string, string> = {};
    headers.forEach((hdr, colIdx) => {
      if (
        colIdx !== nameIdx &&
        colIdx !== uidIdx &&
        colIdx !== emailIdx &&
        colIdx !== genderIdx &&
        colIdx !== yearIdx &&
        colIdx !== branchIdx &&
        colIdx !== sectionIdx &&
        colIdx !== whatsappIdx &&
        colIdx !== commentsIdx
      ) {
        if (row[colIdx]) {
          ratings[hdr] = String(row[colIdx]).trim();
        }
      }
    });

    attendees.push({
      sl_no: idx + 1,
      name: rawName,
      uid: uidIdx !== -1 && row[uidIdx] ? String(row[uidIdx]).trim() : `U${24000 + idx}`,
      email: emailIdx !== -1 && row[emailIdx] ? String(row[emailIdx]).trim() : undefined,
      gender: genderIdx !== -1 && row[genderIdx] ? String(row[genderIdx]).trim() : "Mr",
      year_of_study: yearIdx !== -1 && row[yearIdx] ? String(row[yearIdx]).trim() : "3rd",
      branch: branchIdx !== -1 && row[branchIdx] ? String(row[branchIdx]).trim() : "CSE",
      section: sectionIdx !== -1 && row[sectionIdx] ? String(row[sectionIdx]).trim() : "Alpha",
      whatsapp: whatsappIdx !== -1 && row[whatsappIdx] ? String(row[whatsappIdx]).trim() : undefined,
      ratings,
      comments: commentsIdx !== -1 && row[commentsIdx] ? String(row[commentsIdx]).trim() : undefined,
      submitted_at: new Date().toISOString(),
    });
  });

  return attendees;
}

/**
 * Realistic Mock Feedback Responses Generator (for immediate testing of certificate generation)
 */
export function generateMockFeedbackResponses(event: CSIEvent): FeedbackAttendee[] {
  const branches = event.target_branches && event.target_branches.length > 0
    ? event.target_branches
    : ["CSE", "CSBS", "IT", "AD"];

  const sampleNames = [
    { name: "Devanarayanan S", gender: "Mr", year: "3rd", section: "Alpha" },
    { name: "Meera Nandakumar", gender: "Mrs", year: "2nd", section: "Beta" },
    { name: "Abhishek K Menon", gender: "Mr", year: "3rd", section: "Alpha" },
    { name: "Ananya Pillai", gender: "Mrs", year: "1st", section: "Gamma" },
    { name: "Rohan Varghese", gender: "Mr", year: "4th", section: "Beta" },
    { name: "Gowri Sankar", gender: "Mr", year: "2nd", section: "Alpha" },
    { name: "Siddharth Nair", gender: "Mr", year: "3rd", section: "Delta" },
    { name: "Diya Mariam", gender: "Mrs", year: "2nd", section: "Nil" },
  ];

  return sampleNames.map((s, idx) => ({
    sl_no: idx + 1,
    name: s.name,
    uid: `U220${101 + idx}`,
    email: `${s.name.toLowerCase().replace(/\s+/g, ".")}@rajagiri.edu.in`,
    gender: s.gender,
    year_of_study: s.year,
    branch: branches[idx % branches.length],
    section: s.section,
    whatsapp: `+91 9847${100000 + idx * 1111}`,
    ratings: {
      "Overall Coordination and Organization": idx % 2 === 0 ? "Strongly Agree" : "Agree",
      "Quality of Content": "Strongly Agree",
      "Problem-Solving Impact": "Strongly Agree",
    },
    comments: "Excellent session organized by CSI SB RSET! Highly informative.",
    submitted_at: new Date().toISOString(),
  }));
}
