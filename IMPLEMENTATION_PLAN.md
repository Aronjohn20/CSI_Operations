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
- [ ] 4.1 **Permission Letter Generator** (dynamic preview, copy text, print/export).
- [ ] 4.2 **Registration Form Builder** (form schema preview & link generation).
- [ ] 4.3 **Bitly URL Shortener Integration** (converts reg URL to short link).
- [ ] 4.4 **RSMS Notice Generator** (circular preview with auto-injected Bitly link & copy button).
- [ ] 4.5 **Feedback Form & QR Code Generator** (dynamic QR rendering linking to feedback form).
- [ ] 4.6 **Offline Attendance Sheet** (conditional generation based on `mode == 'Offline'`).

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
