"use client";

import { CSIEvent, Member } from "./types";
import { events as initialEvents, members as initialMembers } from "./data";

const EVENTS_STORAGE_KEY = "csi_operations_events";
const MEMBERS_STORAGE_KEY = "csi_operations_members";

export function getStoredEvents(): CSIEvent[] {
  if (typeof window === "undefined") return initialEvents;
  const stored = localStorage.getItem(EVENTS_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(initialEvents));
    return initialEvents;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return initialEvents;
  }
}

export function getStoredMembers(): Member[] {
  if (typeof window === "undefined") return initialMembers;
  const stored = localStorage.getItem(MEMBERS_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(initialMembers));
    return initialMembers;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return initialMembers;
  }
}

export function saveNewEvent(newEvent: Omit<CSIEvent, "id">): CSIEvent {
  const currentEvents = getStoredEvents();
  const currentMembers = getStoredMembers();

  const id = "e" + (Date.now());
  const created: CSIEvent = {
    ...newEvent,
    id,
  };

  const updatedEvents = [created, ...currentEvents];
  if (typeof window !== "undefined") {
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(updatedEvents));

    // Also update coordinator assignment counts for assigned members
    if (newEvent.assigned_coordinators && newEvent.assigned_coordinators.length > 0) {
      const updatedMembers = currentMembers.map((m) => {
        if (newEvent.assigned_coordinators.includes(m.name)) {
          return {
            ...m,
            events_coordinated_count: m.events_coordinated_count + 1,
          };
        }
        return m;
      });
      localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(updatedMembers));
    }
  }

  return created;
}

export function getEventById(id: string): CSIEvent | undefined {
  const allEvents = getStoredEvents();
  return allEvents.find((e) => e.id === id);
}

