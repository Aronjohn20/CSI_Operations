"use client";

import { useState } from "react";
import { events } from "@/lib/data";
import { CSIEvent } from "@/lib/types";
import { Search, Calendar } from "lucide-react";

const statusStyles: Record<string, { text: string; class: string }> = {
  planned: { text: "Planned", class: "bg-amber-500/20 text-amber-400 border border-amber-500/30" },
  confirmed: { text: "Confirmed", class: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" },
  completed: { text: "Completed", class: "bg-green-500/20 text-green-400 border border-green-500/30" },
};

export default function EventsPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filtered = events.filter((e) => {
    const matchSearch = e.event_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || e.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Sort events by date (latest first)
  const sorted = [...filtered].sort(
    (a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-csi-border pb-6">
        <h1 className="text-2xl font-bold text-white">
          Events Archive
        </h1>
        <p className="text-csi-textMuted mt-1">
          Club Events Schedule — Manage upcoming calendar, required coordinators, and event status.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-csi-textDim" />
          <input
            type="text"
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-csi-surface border border-csi-border text-sm text-csi-text placeholder-csi-textDim focus:outline-none focus:ring-2 focus:ring-csi-purple focus:border-csi-purple"
          />
        </div>

        {/* Status Filter + Count */}
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-lg bg-csi-surface border border-csi-border text-sm text-csi-text focus:outline-none focus:ring-2 focus:ring-csi-purple"
          >
            <option value="all">All Statuses</option>
            <option value="planned">Planned</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
          </select>
          <span className="text-sm text-csi-textMuted">
            {sorted.length} event(s)
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-csi-surface rounded-xl border border-csi-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-csi-border">
                <th className="text-left px-4 py-3 font-medium text-csi-textDim text-xs uppercase tracking-wider">Event Name</th>
                <th className="text-left px-4 py-3 font-medium text-csi-textDim text-xs uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 font-medium text-csi-textDim text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 font-medium text-csi-textDim text-xs uppercase tracking-wider">Required Coordinators</th>
                <th className="text-left px-4 py-3 font-medium text-csi-textDim text-xs uppercase tracking-wider">Assigned Coordinators</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((event) => {
                const statusInfo = statusStyles[event.status];
                const hasCoordinators = event.assigned_coordinators.length > 0;
                const isFull = event.assigned_coordinators.length >= event.required_coordinators;

                return (
                  <tr
                    key={event.id}
                    className="border-b border-csi-border/50 hover:bg-csi-surfaceLight/50 transition"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-white">{event.event_name}</span>
                    </td>
                    <td className="px-4 py-3 text-csi-textMuted">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-csi-textDim" />
                        <span>
                          {new Date(event.event_date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusInfo.class}`}>
                        {statusInfo.text}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${isFull ? "text-green-400" : "text-amber-400"}`}>
                        {event.assigned_coordinators.length}
                      </span>
                      <span className="text-csi-textDim"> / {event.required_coordinators} required</span>
                    </td>
                    <td className="px-4 py-3">
                      {hasCoordinators ? (
                        <div className="flex flex-wrap gap-1.5">
                          {event.assigned_coordinators.map((name) => (
                            <span
                              key={name}
                              className="bg-csi-surfaceLight text-csi-text text-xs px-2 py-0.5 rounded-md border border-csi-border"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-csi-textDim italic">None Assigned</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
