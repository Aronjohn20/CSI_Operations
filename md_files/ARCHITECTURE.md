# System Architecture

## Architecture Flowchart

```mermaid
flowchart TD
    %% External Pages / Databases
    MembersDB["Members Database Page (All 23 Members)<br/>Tracks Availability & Events Coordinated"]
    EventsDB["Events Hosted Database Page<br/>Archive & History of All Hosted Events"]

    %% Create Event Trigger
    CreateBtn["[+] Create Event Button"] --> EventContainer

    subgraph EventContainer["Event Container (Inside Each Event)"]
        direction TB
        EventInfo["Event Details Input<br/>(Name, Date, Time, Venue, Class, Brief)"]

        EventInfo --> Line1["1. Registration Form"]
        EventInfo --> Line2["2. Feedback Form"]
        EventInfo --> Line3["3. Permission Letter"]
        EventInfo --> Line4["4. RSMS Notice<br/>(Contains Coordinator Names & Details)"]
        EventInfo -->|If Offline Event| Line5["5. Offline Attendance Sheet"]
        EventInfo --> Line6["6. Coordinator Allocation Box"]

        %% Registration to Bitly to RSMS
        Line1 --> Bitly["Bitly URL Shortener"]
        Bitly -->|Embed Short Link| Line4

        %% Feedback to QR
        Line2 --> QRCode["QR Code Generator"]
        QRCode --> FeedQR["Feedback QR Code"]

        %% Feedback to Certificates
        Line2 --> FeedSheet["Feedback Form Responses Sheet"]
        FeedSheet --> CertSection["Certificate Generator"]
        CertSection --> NameList["Attendee List / Select Box"]
        NameList --> SelectWinners["Select 1st, 2nd & 3rd Place Winners"]
        SelectWinners --> GenCerts["Generate Certificates<br/>(Participation + Merit Winners)"]

        %% Hidden Easter Egg with Security Question Auth
        HiddenEgg["Hidden Easter Egg Button (Invisible / Secret Place)"] --> SecretAuth{"Admin Security Gate<br/>Prompt: 'Favorite club?'"}
        SecretAuth -->|Answer: 'Bayern Munich'| AdminUnlock["Admin Access Granted"]
        Line4 -.->|Extract Coordinator Names & Info| CoordCerts["Generate Coordinator Certificates"]
        AdminUnlock --> CoordCerts
    end

    %% External Connections
    MembersDB -->|Feed Member Availability & Stats| Line6
    EventContainer -->|Save & Log Event When Created/Hosted| EventsDB
```

## Architectural Components

### 1. External Pages / Stores
- **Members Database Page (`/members`)**: Independent view listing all 23 team members, coordination history, and live availability status (`Free` / `Busy`).
- **Events Hosted Database Page (`/events`)**: Master registry storing metadata and records of every completed and upcoming event.

### 2. Event Container (`/events/[id]`)
Each event operates in an isolated container that encapsulates:
1. **Event Information Core**: Single source of truth (title, schedule, venue mode, class target, description).
2. **Registration Form Builder**: Standardized format with mandatory validation fields.
3. **Feedback Form Builder**: Collects post-event survey data and participant names.
4. **Permission Letter Generator**: Official template with dynamic placeholders for management approval.
5. **RSMS Notice Generator**: College circular generator with embedded Bitly shortened registration link.
6. **Offline Attendance Generator**: Conditional generator triggered only when the venue is physical/offline.
7. **Coordinator Allocation Box**: Picks assigned coordinators from the Members Database.

### 3. Service Modules
- **Bitly API Client**: Shortens registration URLs for easy SMS/notice readability.
- **QR Code Renderer**: Renders downloadable/projectable QR codes linked directly to the feedback form.
- **Certificate Engine**: Canvas/PDF rendering pipeline driven by feedback submission data and winner selections.
- **Admin Easter Egg**: Secret authenticated backdoor protected by security verification (`Favorite club?` -> `Bayern Munich`).

