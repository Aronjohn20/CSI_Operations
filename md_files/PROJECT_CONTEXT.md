# CSI Operations - Project Context

## Overview
**CSI Operations** is a dedicated operational and event management platform built for the Computer Society of India (CSI) student branch / chapter. It streamlines the lifecycle of organizing, documenting, and executing college technical events.

## Core Problem Solved
Organizing an event currently requires tedious, repetitive manual work across multiple platforms:
1. Drafting permission letters for HOD/Principal.
2. Building registration forms with standard college rules and fields.
3. Generating RSMS (college internal messaging/portal) broadcast notices with shortened links.
4. Designing and linking feedback forms.
5. Tracking member workload to avoid assigning the same coordinators repeatedly.
6. Generating attendance sheets for offline venues.
7. Issuing certificates of participation, merit (1st, 2nd, 3rd), and coordinator appreciation certificates.

## Solution
A unified, single-source-of-truth dashboard where entering event details once automatically triggers:
- Pre-filled **Permission Letters** & **RSMS Notices** (with auto-generated Bitly shortened links).
- Standardized **Registration Forms** and **Feedback Forms**.
- **Offline Attendance Sheets** (when offline mode is selected).
- Dynamic **Coordinator Allocation** powered by a persistent 23-member availability and workload database.
- **Certificate Studio** directly connected to feedback form responses with dropdown winner selection.
- An **Admin Easter Egg** protected by security authentication for generating official coordinator certificates.
- An **Events Hosted Archive** tracking all past and upcoming initiatives.

## Target Platform & Hosting
- **Hosting Platform**: Vercel
- **Version Control**: GitHub (`Aronjohn20/CSI_Operations`)
- **Database**: Supabase / Serverless PostgreSQL

