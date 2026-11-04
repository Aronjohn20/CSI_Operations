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

export interface CSIEvent {
  id: string;
  event_name: string;
  event_date: string; // ISO date string e.g. "2026-11-15"
  time_start?: string; // e.g. "01:30 PM"
  time_end?: string; // e.g. "04:30 PM"
  mode: "Offline" | "Online";
  venue: string;
  target_branches: string[]; // 9 branches: AEI, CSE, CSBS, IT, AD, ME, CE, EEE, ECE
  faculty_in_charge: string;
  brief_description: string;
  status: "planned" | "confirmed" | "completed";
  required_coordinators: number;
  assigned_coordinators: string[]; // member names
  registration_url?: string;
  bitly_url?: string;
  feedback_url?: string;
}
