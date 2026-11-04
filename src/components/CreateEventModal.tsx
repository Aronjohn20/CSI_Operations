"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Sparkles, UserCheck, Calendar, Clock, MapPin, Users, FileText, Check, AlertCircle } from "lucide-react";
import { Member } from "@/lib/types";
import { getStoredMembers, saveNewEvent } from "@/lib/eventsStorage";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated?: (newEventId: string) => void;
}

export default function CreateEventModal({ isOpen, onClose, onEventCreated }: CreateEventModalProps) {
  const router = useRouter();
  const members: Member[] = getStoredMembers();

  // Form states
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [timeStart, setTimeStart] = useState("01:30 PM");
  const [timeEnd, setTimeEnd] = useState("04:30 PM");
  const [mode, setMode] = useState<"Offline" | "Online">("Offline");
  const [venue, setVenue] = useState("");
  const [targetClass, setTargetClass] = useState("S3, S5, S7 CS/IT");
  const [facultyInCharge, setFacultyInCharge] = useState("Dr. Binu A (Faculty Advisor)");
  const [briefDescription, setBriefDescription] = useState("");
  const [requiredCoordinators, setRequiredCoordinators] = useState(2);
  const [selectedCoordinators, setSelectedCoordinators] = useState<string[]>([]);

  // Coordinator search
  const [coordSearch, setCoordSearch] = useState("");

  if (!isOpen) return null;

  // Toggle coordinator
  const toggleCoordinator = (name: string) => {
    if (selectedCoordinators.includes(name)) {
      setSelectedCoordinators(selectedCoordinators.filter((c) => c !== name));
    } else {
      if (selectedCoordinators.length >= requiredCoordinators) {
        // Can't select more than required
        return;
      }
      setSelectedCoordinators([...selectedCoordinators, name]);
    }
  };

  // Filter members
  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(coordSearch.toLowerCase()) ||
    m.domain.toLowerCase().includes(coordSearch.toLowerCase()) ||
    m.class_batch.toLowerCase().includes(coordSearch.toLowerCase())
  );

  // Sort members so those with fewest assignments appear first (fair workload allocation)
  const sortedMembers = [...filteredMembers].sort((a, b) => a.events_coordinated_count - b.events_coordinated_count);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim() || !eventDate || !venue.trim()) {
      alert("Please fill in Event Name, Date, and Venue.");
      return;
    }

    const created = saveNewEvent({
      event_name: eventName,
      event_date: eventDate,
      time_start: timeStart,
      time_end: timeEnd,
      mode,
      venue,
      target_class: targetClass,
      faculty_in_charge: facultyInCharge,
      brief_description: briefDescription,
      status: "confirmed",
      required_coordinators: requiredCoordinators,
      assigned_coordinators: selectedCoordinators,
    });

    onClose();
    if (onEventCreated) {
      onEventCreated(created.id);
    }
    router.push(`/events/${created.id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-csi-surface border border-csi-border w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-csi-border flex items-center justify-between bg-csi-sidebar">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-csi-purple/20 text-csi-purpleLight flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Create New Event</h2>
              <p className="text-xs text-csi-textDim">Single Source of Truth: Informs all letters, forms, and notices</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-csi-textDim hover:text-white hover:bg-csi-surfaceLight transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Section 1: Core Event Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-csi-purpleLight uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              1. Event Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-csi-textMuted mb-1.5">
                  Event Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NextGen Web & AI Hackathon"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-csi-dark border border-csi-border text-sm text-white focus:outline-none focus:border-csi-purple focus:ring-1 focus:ring-csi-purple transition placeholder:text-csi-textDim"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-csi-textMuted mb-1.5">
                  Event Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-csi-dark border border-csi-border text-sm text-white focus:outline-none focus:border-csi-purple focus:ring-1 focus:ring-csi-purple transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-csi-textMuted mb-1.5">Mode</label>
                <div className="grid grid-cols-2 gap-2 bg-csi-dark p-1 rounded-lg border border-csi-border">
                  <button
                    type="button"
                    onClick={() => setMode("Offline")}
                    className={`py-1.5 text-xs font-medium rounded-md transition ${
                      mode === "Offline"
                        ? "bg-csi-purple text-white shadow-sm"
                        : "text-csi-textDim hover:text-white"
                    }`}
                  >
                    Offline
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("Online")}
                    className={`py-1.5 text-xs font-medium rounded-md transition ${
                      mode === "Online"
                        ? "bg-csi-purple text-white shadow-sm"
                        : "text-csi-textDim hover:text-white"
                    }`}
                  >
                    Online
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-csi-textMuted mb-1.5">
                  Venue / Platform <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={mode === "Offline" ? "e.g. Lab 304 / Seminar Hall 1" : "e.g. Google Meet / HackerRank"}
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-csi-dark border border-csi-border text-sm text-white focus:outline-none focus:border-csi-purple transition placeholder:text-csi-textDim"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-csi-textMuted mb-1.5">Start Time</label>
                  <input
                    type="text"
                    value={timeStart}
                    onChange={(e) => setTimeStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-csi-dark border border-csi-border text-xs text-white focus:outline-none focus:border-csi-purple"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-csi-textMuted mb-1.5">End Time</label>
                  <input
                    type="text"
                    value={timeEnd}
                    onChange={(e) => setTimeEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-csi-dark border border-csi-border text-xs text-white focus:outline-none focus:border-csi-purple"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-csi-textMuted mb-1.5">Target Audience / Class</label>
                <input
                  type="text"
                  value={targetClass}
                  onChange={(e) => setTargetClass(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-csi-dark border border-csi-border text-sm text-white focus:outline-none focus:border-csi-purple transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-csi-textMuted mb-1.5">Faculty In-Charge</label>
                <input
                  type="text"
                  value={facultyInCharge}
                  onChange={(e) => setFacultyInCharge(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-csi-dark border border-csi-border text-sm text-white focus:outline-none focus:border-csi-purple transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-csi-textMuted mb-1.5">Brief Info / Description</label>
              <textarea
                rows={2}
                placeholder="Give a concise 2-line summary of what participants will learn or accomplish in this event..."
                value={briefDescription}
                onChange={(e) => setBriefDescription(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-csi-dark border border-csi-border text-sm text-white focus:outline-none focus:border-csi-purple transition placeholder:text-csi-textDim resize-none"
              />
            </div>
          </div>

          {/* Section 2: Coordinator Allocation Box */}
          <div className="space-y-3 pt-4 border-t border-csi-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold text-csi-purpleLight uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  2. Coordinator Allocation Box
                </h3>
                <p className="text-xs text-csi-textDim">
                  Assign coordinators from the 23-member roster. Fair workload indicator highlights members with fewer assignments.
                </p>
              </div>

              {/* Required counter */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs text-csi-textMuted">Required:</span>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={requiredCoordinators}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setRequiredCoordinators(val);
                    if (selectedCoordinators.length > val) {
                      setSelectedCoordinators(selectedCoordinators.slice(0, val));
                    }
                  }}
                  className="w-14 px-2 py-1 rounded bg-csi-dark border border-csi-border text-xs text-white text-center font-bold focus:outline-none focus:border-csi-purple"
                />
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    selectedCoordinators.length === requiredCoordinators
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  }`}
                >
                  {selectedCoordinators.length} of {requiredCoordinators} Assigned
                </span>
              </div>
            </div>

            {/* Coordinator Search Input */}
            <input
              type="text"
              placeholder="Search coordinator by name, domain, or class..."
              value={coordSearch}
              onChange={(e) => setCoordSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-csi-dark border border-csi-border text-xs text-white focus:outline-none focus:border-csi-purple placeholder:text-csi-textDim"
            />

            {/* Members Selector Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1 border border-csi-border/60 rounded-xl bg-csi-dark/40">
              {sortedMembers.map((member) => {
                const isSelected = selectedCoordinators.includes(member.name);
                const isFairChoice = member.events_coordinated_count <= 1;

                return (
                  <div
                    key={member.id}
                    onClick={() => toggleCoordinator(member.name)}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all flex items-start justify-between ${
                      isSelected
                        ? "bg-csi-purple/20 border-csi-purple text-white shadow-md shadow-csi-purple/20"
                        : "bg-csi-surface border-csi-border hover:border-csi-purple/50 text-csi-textMuted hover:text-white"
                    }`}
                  >
                    <div className="space-y-0.5 flex-1 pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-white">{member.name}</span>
                        {isFairChoice && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-medium">
                            Light Workload
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-csi-textDim">{member.role} • {member.class_batch}</p>
                      <div className="flex items-center gap-1 pt-0.5">
                        <span className="text-[10px] text-csi-purpleLight">{member.domain}</span>
                        <span className="text-[10px] text-csi-textDim">• {member.events_coordinated_count} past event(s)</span>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 border ${
                        isSelected
                          ? "bg-csi-purple border-csi-purple text-white"
                          : "border-csi-border text-transparent"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-csi-border flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg bg-csi-surfaceLight hover:bg-csi-border text-xs font-semibold text-csi-text transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 transition flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Create Event &amp; Open Container</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

