"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Calendar, Plus, ArrowRight, MapPin, Users, Trash2 } from "lucide-react";
import { CSIEvent } from "@/lib/types";
import { getStoredEvents, deleteEvent } from "@/lib/eventsStorage";
import CreateEventModal from "@/components/CreateEventModal";

const statusStyles: Record<string, { text: string; class: string }> = {
  planned: { text: "Planned", class: "bg-amber-500/20 text-amber-300 border border-amber-500/40" },
  confirmed: { text: "Confirmed", class: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" },
  completed: { text: "Completed", class: "bg-green-500/20 text-green-300 border border-green-500/40" },
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

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the event "${name}"?`)) {
      deleteEvent(id);
      reloadEvents();
    }
  };

  const filtered = events.filter((e) => {
    const matchSearch = e.event_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || e.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
  );

  // Prioritize active/upcoming events (planned or confirmed); fallback to most recent
  const activeOrUpcomingEvent = sorted.find((e) => e.status !== "completed") || sorted[0] || null;

  return (
    <div className="space-y-7 max-w-7xl mx-auto">
      {/* Header with Prominent Create Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-csi-border pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Events Management &amp; Containers</h1>
          <p className="text-slate-300 text-[18px] mt-1">
            Dedicated workspace for creating events, allocating coordinators, and managing auto-generated document containers.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold px-5 py-3 rounded-xl text-[18px] transition shadow-lg shadow-purple-600/30 flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          <span>+ Create New Event</span>
        </button>
      </div>

      {/* ACTIVE / UPCOMING EVENT CONTAINER */}
      {activeOrUpcomingEvent && (
        <div className="bg-gradient-to-b from-[#181324] to-[#120F1C] rounded-2xl border border-purple-500/40 p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-500/20 pb-3.5">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${activeOrUpcomingEvent.status !== "completed" ? "bg-green-400 animate-ping" : "bg-purple-400"}`}></span>
              <span className="text-xs font-bold text-purple-200 uppercase tracking-widest bg-purple-950/80 border border-purple-500/40 px-3 py-1 rounded-full">
                {activeOrUpcomingEvent.status !== "completed" ? "Active Event Container" : "Latest Event Container"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/events/${activeOrUpcomingEvent.id}`}
                className="text-[17px] font-bold text-purple-300 hover:text-white flex items-center gap-1.5 underline"
              >
                <span>Open Full Container View</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                onClick={() => handleDelete(activeOrUpcomingEvent.id, activeOrUpcomingEvent.event_name)}
                className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"
                title="Delete this event"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-bold text-white">{activeOrUpcomingEvent.event_name}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-green-500/20 text-green-300 border border-green-500/40">
                  {activeOrUpcomingEvent.mode}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  {activeOrUpcomingEvent.status}
                </span>
              </div>
              
              <div className="flex items-center gap-4 text-[17px] text-slate-200 pt-1 font-mono flex-wrap">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  {activeOrUpcomingEvent.event_date}
                </span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  {activeOrUpcomingEvent.venue}
                </span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Users className="w-4 h-4 text-emerald-400" />
                  {activeOrUpcomingEvent.assigned_coordinators.length} Coordinators Assigned
                </span>
              </div>
            </div>

            <div className="bg-black/70 rounded-xl border border-purple-500/30 p-4 space-y-2 flex flex-col justify-center">
              <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Assigned Coordinators</span>
              <div className="flex flex-wrap gap-1.5">
                {activeOrUpcomingEvent.assigned_coordinators.length > 0 ? (
                  activeOrUpcomingEvent.assigned_coordinators.map((name) => (
                    <span key={name} className="px-2.5 py-1 rounded-md bg-purple-900/40 border border-purple-500/40 text-xs text-purple-200 font-bold">
                      {name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 italic">None Assigned</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls & Filter */}
      <div className="flex flex-col sm:flex-row gap-3.5 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-88">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search events by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-black border border-purple-500/40 text-[18px] text-white focus:outline-none focus:border-purple-400 placeholder:text-slate-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-black border border-purple-500/40 text-[18px] text-white focus:outline-none focus:border-purple-400 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="planned">Planned</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
          </select>
          <span className="text-[18px] text-slate-300 font-mono font-semibold">
            {sorted.length} events total
          </span>
        </div>
      </div>

      {/* All Event Containers List */}
      <div className="bg-[#12101C] rounded-2xl border border-purple-500/30 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-purple-500/30 flex items-center justify-between bg-[#0B0912]">
          <h2 className="text-lg font-bold text-white">Event Containers Directory</h2>
          <span className="text-xs text-slate-400">Click any container to view generated letters &amp; notices</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-purple-500/30 text-slate-300 bg-csi-sidebar/70 text-[18px] font-bold">
                <th className="py-3.5 px-5 text-white">EVENT NAME</th>
                <th className="py-3.5 px-5 text-white">DATE</th>
                <th className="py-3.5 px-5 text-white">STATUS</th>
                <th className="py-3.5 px-5 text-white">ALLOCATION</th>
                <th className="py-3.5 px-5 text-white">ASSIGNED COORDINATORS</th>
                <th className="py-3.5 px-5 text-white text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-500/20 text-[18px]">
              {sorted.map((event) => {
                const statusInfo = statusStyles[event.status] || { text: event.status, class: "bg-slate-700 text-white" };
                const isFull = event.assigned_coordinators.length >= event.required_coordinators;

                return (
                  <tr key={event.id} className="hover:bg-purple-950/20 transition">
                    <td className="py-3.5 px-5 font-bold text-white text-[19px]">
                      <Link href={`/events/${event.id}`} className="hover:text-purple-300">
                        {event.event_name}
                      </Link>
                    </td>
                    <td className="py-3.5 px-5 text-slate-300 font-mono text-[17px]">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-purple-400" />
                        <span>{event.event_date}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`text-xs px-3 py-1 rounded-full font-bold ${statusInfo.class}`}>
                        {statusInfo.text}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-mono">
                      <span className={isFull ? "text-green-400 font-extrabold" : "text-amber-400 font-extrabold"}>
                        {event.assigned_coordinators.length}
                      </span>
                      <span className="text-slate-400 text-sm"> / {event.required_coordinators}</span>
                    </td>
                    <td className="py-3.5 px-5">
                      {event.assigned_coordinators.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {event.assigned_coordinators.map((name) => (
                            <span
                              key={name}
                              className="px-2 py-0.5 rounded-md bg-black border border-purple-500/40 text-xs text-slate-200 font-medium"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-sm">None Assigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/events/${event.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 hover:text-white border border-purple-500/40 text-sm font-bold transition shadow-sm"
                        >
                          <span>Open</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(event.id, event.event_name)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                          title="Delete Event"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Event Modal */}
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
