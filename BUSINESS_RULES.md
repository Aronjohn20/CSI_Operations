# Business Rules & Functional Logic

## Rule 1: Members Database & Allocation (23 Members)
1. **Roster Size**: Fixed team baseline of 23 active members.
2. **Member Attributes**:
   - `id`: Unique identifier (UUID or integer).
   - `name`: Full legal name for official certificates.
   - `class_division`: E.g., S5 CSE Alpha, S7 CSE Beta.
   - `role`: Executive member, technical coordinator, etc.
   - `is_available`: Boolean toggle (`Free` / `Busy`).
   - `events_coordinated_count`: Integer counter, incremented automatically when assigned to an event.
3. **Allocation Heuristics**:
   - The coordinator selector should highlight and prioritize members who are marked `Free` and have the lowest `events_coordinated_count` to ensure fair workload distribution.
   - Once assigned to an event, their status can be flagged as busy during the event window.

## Rule 2: Event Details Form (Single Source of Truth)
Required fields before generation:
- `event_name` (Text, required)
- `event_date` (Date, required)
- `event_time_start` & `event_time_end` (Time, required)
- `event_mode` (`Offline` | `Online`, required)
- `venue` (Text, required e.g., "Seminar Hall 2" or "Google Meet")
- `target_class` (Text, e.g., "S3 CSE & S5 CSE")
- `faculty_in_charge` (Text e.g., "Dr. Principal / Faculty Advisor")
- `brief_description` (Textarea, required)
- `selected_coordinators` (Array of Member IDs from the 23-member database)

## Rule 3: 4-in-1 Auto-Generation Engine
Upon saving an event:
1. **Registration Form**:
   - Auto-structured with standardized fields: Full Name, College Roll No/Reg No, Department, Year/Class, Email, Phone, CSI Membership Status.
   - Rules and header auto-injected from `event_name` and `brief_description`.
2. **Feedback Form**:
   - Auto-generated with questions: Rating (1-5), Key Takeaways, Organization Quality, and Participant Name Verification (for certificate generation).
3. **Permission Letter**:
   - Formal letter template addressed to Principal / HOD requesting permission for venue and date, citing coordinator names and target class.
4. **RSMS Notice**:
   - Formal circular format used by the college messaging system.
   - Must include coordinator names, venue, date, time, and the shortened registration link.

## Rule 4: Bitly Link Integration
- When the Registration Form URL is generated, it is passed to the Bitly Shortening API.
- The resulting shortened link (e.g., `bit.ly/csi-event-xyz`) is automatically embedded inside the RSMS Notice text template.

## Rule 5: Offline Attendance Sheet
- If `event_mode == "Offline"`, generate a printable PDF/Table attendance sheet formatted with:
  - Header: Event Name, Date, Venue, In-charge Coordinators.
  - Columns: Sl No, Student Name, Roll No, Branch/Class, Signature (FN), Signature (AN).
- If `event_mode == "Online"`, this section is flagged as unnecessary or hidden.

## Rule 6: Certificate Generation Pipeline
1. Ingests all submitted participant names directly from the **Feedback Form Responses**.
2. Renders a searchable **Attendee Select Box** in the Event Container:
   - User assigns **1st Place**, **2nd Place**, and **3rd Place** from the attendee list.
3. **Batch Generation**:
   - 1st, 2nd, and 3rd place winners receive **Certificates of Merit / Excellence**.
   - All other verified attendees in the feedback list receive **Certificates of Participation**.
   - Standard elements: Participant Name, Event Name, Date, Signatures of Faculty Advisor and Student Chair.

## Rule 7: Admin Easter Egg (Coordinator Certificates)
1. **Trigger**: A hidden, unlabelled target on the UI (known only to the Admin).
2. **Security Gate**:
   - Clicking the hidden element prompts a security modal asking:
     `"Favorite club?"`
   - Exact required answer: `Bayern Munich` (case-insensitive, trimmed).
3. **Action on Successful Unlock**:
   - Accesses the Coordinator Certificate generator.
   - Automatically pulls coordinator names from that specific event's RSMS Notice / Event Info.
   - Generates official **Certificate of Appreciation / Coordination** for the assigned coordinators.
