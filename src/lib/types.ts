export const BRANCHES = [
  "AEI",
  "CSE",
  "CSBS",
  "IT",
  "AD",
  "ME",
  "CE",
  "EEE",
  "ECE",
] as const;

export type Branch = typeof BRANCHES[number];

export type MemberType = "old_coordinator" | "new_coordinator";

export interface Member {
  id: string;
  name: string;
  role: string;
  domain: string;
  class_batch: string;
  member_type: MemberType;
  is_active: boolean;
  events_coordinated_count: number;
}

export interface RegisteredAttendee {
  sl_no?: number;
  name: string;
  gender?: string;
  class_batch?: string;
  roll_no?: string;
  email?: string;
}

export interface FeedbackQuestion {
  id: string;
  title: string;
  description: string;
  po_mapping: string[]; // e.g. ["PO10", "PO11"]
  choices: string[];
  type: "likert_scale" | "paragraph";
  required: boolean;
}

export interface FeedbackAttendee {
  sl_no?: number;
  name: string; // Name (As required in the certificate)
  uid?: string; // UID
  email?: string; // UID Email
  gender?: string; // Mr / Mrs
  year_of_study?: string; // 1st, 2nd, 3rd, 4th
  branch?: string; // CSE, CSBS, IT, AD
  section?: string; // Alpha, Beta, Gamma, Delta, Nil
  whatsapp?: string; // WhatsApp No
  ratings?: Record<string, string>; // { [questionTitle]: rating }
  comments?: string;
  submitted_at?: string;
}

export interface CSIEvent {
  id: string;
  event_name: string;
  event_date: string; // ISO date string e.g. "2026-11-15"
  time_start?: string; // e.g. "01:30 PM"
  time_end?: string; // e.g. "04:30 PM"
  mode: "Offline" | "Online";
  venue: string;
  target_branches?: string[]; // 9 branches: AEI, CSE, CSBS, IT, AD, ME, CE, EEE, ECE
  faculty_in_charge?: string;
  brief_description?: string;
  status: "planned" | "confirmed" | "completed";
  required_coordinators: number;
  assigned_coordinators: string[]; // member names
  registration_url?: string;
  bitly_url?: string;
  feedback_url?: string;
  google_form_url?: string;
  google_form_edit_url?: string;
  google_form_id?: string;
  google_sheet_url?: string;
  google_sheet_id?: string;
  is_registration_closed?: boolean;
  registered_attendees?: RegisteredAttendee[];

  // Feedback Form & Certificate Pipeline additions
  feedback_google_form_url?: string;
  feedback_google_form_edit_url?: string;
  feedback_google_form_id?: string;
  feedback_google_sheet_url?: string;
  feedback_google_sheet_id?: string;
  is_feedback_closed?: boolean;
  feedback_attendees?: FeedbackAttendee[];
  winners?: {
    first_place?: string | string[]; // attendee UID(s) or Name(s) - multi-select supported
    second_place?: string | string[];
    third_place?: string | string[];
  };
  certificate_templates?: {
    appreciation_template_data?: string; // Base64 data URL
    participation_template_data?: string;
  };
  certificate_writeups?: {
    appreciation_writeup?: string;
    participation_writeup?: string;
  };
  custom_feedback_questions?: FeedbackQuestion[];
}
