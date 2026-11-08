# Step-by-Step Implementation Plan

Each phase must be completed, tested, and approved before moving to the next.

---

## Phase 1: Environment & Project Foundation
- [ ] 1.1 Initialize Next.js 14+ project with TypeScript, Tailwind CSS, and Lucid icons / shadcn.
- [ ] 1.2 Configure global design tokens (colors, font, styles) matching `UI_UX_SPEC.md`.
- [ ] 1.3 Setup Navigation Shell (Top Navbar with CSI branding, Dashboard link, Members link, Events link).
- [ ] 1.4 Test build & verify local development server runs cleanly.

---

## Phase 2: Members Database & Workload Tracker (`/members`)
- [ ] 2.1 Create mock / initial seed data for the 23 CSI members.
- [ ] 2.2 Build the Members Roster table with search, filter, and `Free` / `Busy` status toggle.
- [ ] 2.3 Display coordination counters (`events_coordinated_count`) with visual badge indicators.
- [ ] 2.4 Verify member update actions work smoothly.

---

## Phase 3: Event Container & Event Creation Form
- [ ] 3.1 Build the `+ Create Event` modal / page with single-source-of-truth fields (Name, Date, Time, Venue, Class, Brief).
- [ ] 3.2 Implement the **Coordinator Allocation Box** populated from the Members Database (filtering available members).
- [ ] 3.3 Create the Event Container view (`/events/[id]`) showing the event overview.

---

## Phase 4: Document Generation Pipeline (Lines 1 to 5)
- [x] 4.1 **Permission Letter Generator** (dynamic preview, direct 1-click PDF & Word downloads, strict Principal format).
- [x] 4.2 **RSMS Notice Generator** (clean official black-and-white preview, clickable blue Bitly shortlink, direct 1-click PDF & Word downloads).
- [x] 4.3 **Attendance Sheet Generator** (with official RSET & CSI logos, 13pt compact metadata, calibrated column widths, direct 1-click PDF & Word downloads).
- [ ] 4.4 **Registration Form Builder & Bitly Link** (standard form schema & live registration link preview).
- [ ] 4.5 **Feedback Form & QR Code Studio** (projector-ready QR display linking to official feedback survey).

---

## Future Enhancement: Permission Letter Multi-Variant Content Generation (ON HOLD — For Later)
*Checklist for generating permission letter content in different ways based on event type, audience, and recipients:*

- [ ] **F.1 Event Type Content Templates:**
  - [ ] *Workshop / Hands-On Lab Variant:* Auto-inserts software requirements, hardware specifications, and system admin assistance requests.
  - [ ] *Hackathon / Coding Competition Variant:* Auto-inserts multi-round structure, problem statements, evaluation criteria, and prize approvals.
  - [ ] *Guest Lecture / Industry Speaker Variant:* Auto-inserts external speaker credentials, session outline, and hospitality/memento arrangements.
  - [ ] *Activity Hour / Internal Session Variant:* Concise 1-page format for standard weekly student chapter activities.

- [ ] **F.2 Target Recipient Routing:**
  - [ ] Addressed to *The Principal* (College-level institutional approval).
  - [ ] Addressed to *Head of the Department (HOD)* (Branch-specific departmental approval).
  - [ ] Addressed to *Lab In-Charge / System Administrator* (Requesting lab booking, internet/firewall access, projector).

- [ ] **F.3 Dynamic Structure & Resource Checklist:**
  - [ ] Expandable *Event Objectives & Learning Outcomes* section.
  - [ ] *Logistics & Requirements Grid* (Audio/Visual, Venue booking, Power backups, Wi-Fi bypass).
  - [ ] *Schedule / Timeline Table* for multi-hour or multi-day programs.

- [ ] **F.4 In-Place Document Customizer:**
  - [ ] In-line editable text editor to tweak phrasing directly on screen before downloading.
  - [ ] Tone switcher (*Concise Formal*, *Standard Academic*, *Detailed KTU Compliant*).

---

## Phase 5: Certificate Studio & Winner Selection
- [ ] 5.1 Feedback response ingestion table (participant names list).
- [ ] 5.2 Single select-box UI to select 1st, 2nd, and 3rd place winners.
- [ ] 5.3 Canvas/PDF generator producing Merit Certificates for winners and Participation Certificates for all attendees.

---

## Phase 6: Admin Easter Egg (Coordinator Certificates)
- [ ] 6.1 Implement the secret trigger location on the UI.
- [ ] 6.2 Security gate modal prompting: *"Favorite club?"* with verification check for `Bayern Munich`.
- [ ] 6.3 On unlock: auto-generate Coordinator Appreciation Certificates pulling coordinator names directly from the event.

---

## Phase 7: Events Hosted Archive (`/events`)
- [ ] 7.1 Master event history list showing past & ongoing events with status badges.
- [ ] 7.2 Full integration test & build verification.

---

## Phase 8: Supabase Live Database Integration (ON HOLD - Waiting for User Cue)
- [ ] 8.1 Setup `@supabase/supabase-js` client & environment variables (`.env.local`).
- [ ] 8.2 Connect Members table to fetch and update live member data from Supabase.
- [ ] 8.3 Connect Event Creation & Coordinator Allocation to save directly to Supabase (`events` and `event_coordinators`).
- [ ] 8.4 Replace static `data.ts` reads with Supabase queries across all pages.


