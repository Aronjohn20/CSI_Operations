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
  event_date: string; // ISO date string
  status: "planned" | "confirmed" | "completed";
  required_coordinators: number;
  assigned_coordinators: string[]; // member names
}
