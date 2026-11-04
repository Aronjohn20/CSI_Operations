"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Calendar, Plus, ExternalLink, ArrowRight } from "lucide-react";
import { CSIEvent } from "@/lib/types";
import { getStoredEvents } from "@/lib/eventsStorage";
import CreateEventModal from "@/components/CreateEventModal";

const statusStyles: Record<string, { text: string; class: string }> = {
  planned: { text: "Planned", class: "bg-amber-500/20 text-amber-400 border border-amber-500/30" },
  confirmed: { text: "Confirmed", class: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" },
  completed: { text: "Completed", class: "bg-green-500/20 text-green-400 border border-green-500/30" },
};

export default function EventsPage() {
  const [events, setEvents] = useState<CSIEvent[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const reloadEvents = () => {
    setEvents(getStoredEvents());
  };

  useEffect(() => {
    reloadEvents();
  }, []);

  const filtered = events.filter((e) => {
    const matchSearch = e.event_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || e.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-csi-border pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Events Archive &amp; Schedule</h1>
          <p className="text-xs text-csi-textDim mt-1">
            Manage upcoming calendar, required coordinators, and launch dedicated document containers.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-medium px-4 py-2 rounded-lg text-xs transition shadow-lg shadow-purple-600/25 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add New Event</span>
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-csi-textDim" />
          <input
            type="text"
            placeholder="Search events by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-csi-surface border border-csi-border text-xs text-white focus:outline-none focus:border-csi-purple placeholder:text-csi-textDim"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-lg bg-csi-surface border border-csi-border text-xs text-csi-text focus:outline-none focus:border-csi-purple"
          >
            <option value="all">All Statuses</option>
            <option value="planned">Planned</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
          </select>
          <span className="text-xs text-csi-textDim font-mono">
            {sorted.length} events
          </span>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-csi-surface rounded-xl border border-csi-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-csi-border text-csi-textDim bg-csi-sidebar/60">
                <th className="py-3.5 px-4 font-semibold text-white">Event Name</th>
                <th className="py-3.5 px-4 font-semibold text-white">Date</th>
                <th className="py-3.5 px-4 font-semibold text-white">Status</th>
                <th className="py-3.5 px-4 font-semibold text-white">Allocation</th>
                <th className="py-3.5 px-4 font-semibold text-white">Assigned Coordinators</th>
                <th className="py-3.5 px-4 font-semibold text-white text-right">Container</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-csi-border/50">
              {sorted.map((event) => {
                const statusInfo = statusStyles[event.status] || { text: event.status, class: "bg-slate-700 text-white" };
                const isFull = event.assigned_coordinators.length >= event.required_coordinators;

                return (
                  <tr key={event.id} className="hover:bg-csi-surfaceLight/50 transition">
                    <td className="py-3.5 px-4 font-medium text-white">
                      <Link href={`/events/${event.id}`} className="hover:text-csi-purpleLight">
                        {event.event_name}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-csi-textMuted font-mono">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-csi-textDim" />
                        <span>{event.event_date}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusInfo.class}`}>
                        {statusInfo.text}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-csi-textMuted font-mono">
                      <span className={isFull ? "text-green-400 font-semibold" : "text-amber-400 font-semibold"}>
                        {event.assigned_coordinators.length}
                      </span>
                      <span className="text-csi-textDim"> / {event.required_coordinators} required</span>
                    </td>
                    <td className="py-3.5 px-4">
                      {event.assigned_coordinators.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {event.assigned_coordinators.map((name) => (
                            <span
                              key={name}
                              className="px-2 py-0.5 rounded bg-csi-dark border border-csi-border text-[11px] text-csi-text"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-csi-textDim italic">None Assigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/events/${event.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-csi-purple/20 hover:bg-csi-purple/30 text-csi-purpleLight text-[11px] font-semibold transition"
                      >
                        <span>Open</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <CreateEventModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          reloadEvents();
        }}
        onEventCreated={() => {
          reloadEvents();
        }}
      />
    </div>
  );
}
