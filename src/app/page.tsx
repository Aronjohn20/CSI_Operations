"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Users, Calendar, CheckCircle2, ArrowRight, Activity, Sparkles } from "lucide-react";
import { CSIEvent, Member } from "@/lib/types";
import { getStoredEvents, getStoredMembers } from "@/lib/eventsStorage";
import CreateEventModal from "@/components/CreateEventModal";

export default function Home() {
  const [events, setEvents] = useState<CSIEvent[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    setEvents(getStoredEvents());
    setMembers(getStoredMembers());
  }, []);

  const totalMembers = members.length;
  const activeEvents = events.filter((e) => e.status !== "completed").length;
  const completedEvents = events.filter((e) => e.status === "completed").length;
  const totalEvents = events.length;

  const newCoords = members.filter((m) => m.member_type === "new_coordinator").length;
  const oldCoords = members.filter((m) => m.member_type === "old_coordinator").length;

  const statCards = [
    {
      label: "ACTIVE COORDINATORS",
      value: totalMembers,
      sub: `${newCoords} New • ${oldCoords} Senior/Old`,
      borderColor: "border-t-green-500",
      icon: Users,
    },
    {
      label: "SCHEDULED EVENTS",
      value: totalEvents,
      sub: "Active term calendar",
      borderColor: "border-t-purple-500",
      icon: Calendar,
    },
    {
      label: "COMPLETED EVENTS",
      value: completedEvents,
      sub: `${activeEvents} still active`,
      borderColor: "border-t-cyan-500",
      icon: CheckCircle2,
    },
    {
      label: "PLATFORM STATUS",
      value: "Ready",
      sub: "CSI Core Engine Online",
      borderColor: "border-t-pink-500",
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Overview Dashboard</h1>
          <p className="text-xs text-csi-textDim mt-0.5">CSI Student Chapter Operations &amp; Event Automation Platform</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-medium px-4 py-2 rounded-lg text-xs transition shadow-lg shadow-purple-600/25 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Event</span>
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`bg-csi-surface rounded-xl border border-csi-border border-t-2 ${card.borderColor} p-5 shadow-sm`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-semibold text-csi-textDim uppercase tracking-wider">
                  {card.label}
                </span>
                <Icon className="w-4 h-4 text-csi-textDim" />
              </div>
              <p className="text-3xl font-bold text-white mb-1">{card.value}</p>
              <p className="text-xs text-csi-textMuted">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events Table */}
        <div className="lg:col-span-2 bg-csi-surface rounded-xl border border-csi-border overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-csi-border flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">Upcoming &amp; Recent Club Events</h2>
              <p className="text-xs text-csi-textDim">Click any event to open its complete auto-generation container</p>
            </div>
            <Link href="/events" className="text-xs text-csi-purpleLight hover:underline font-medium">
              View all ({totalEvents}) →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-csi-border text-csi-textDim bg-csi-sidebar/50">
                  <th className="py-3 px-4 font-medium">Event Name</th>
                  <th className="py-3 px-4 font-medium">Date</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Allocation</th>
                  <th className="py-3 px-4 font-medium">Assigned</th>
                  <th className="py-3 px-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-csi-border/50">
                {events.slice(0, 6).map((event) => {
                  const statusMap: Record<string, { text: string; cls: string }> = {
                    planned: { text: "Planned", cls: "bg-amber-500/20 text-amber-400 border border-amber-500/30" },
                    confirmed: { text: "Confirmed", cls: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" },
                    completed: { text: "Completed", cls: "bg-green-500/20 text-green-400 border border-green-500/30" },
                  };
                  const statusInfo = statusMap[event.status] || { text: event.status, cls: "bg-slate-700 text-white" };

                  return (
                    <tr
                      key={event.id}
                      className="hover:bg-csi-surfaceLight/50 transition cursor-pointer"
                    >
                      <td className="py-3 px-4 font-medium text-white">
                        <Link href={`/events/${event.id}`} className="hover:text-csi-purpleLight">
                          {event.event_name}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-csi-textMuted font-mono">
                        {event.event_date}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusInfo.cls}`}>
                          {statusInfo.text}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-csi-textMuted font-mono">
                        {event.required_coordinators} required
                      </td>
                      <td className="py-3 px-4 text-csi-textMuted max-w-[180px] truncate">
                        {event.assigned_coordinators.length > 0 ? (
                          event.assigned_coordinators.join(", ")
                        ) : (
                          <span className="text-csi-textDim italic">None Assigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/events/${event.id}`}
                          className="px-2 py-1 rounded bg-csi-dark border border-csi-border text-[10px] text-csi-purpleLight hover:bg-csi-purple hover:text-white transition"
                        >
                          Open Container →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Operational Actions Card */}
        <div className="bg-csi-surface rounded-xl border border-csi-border p-6 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-csi-purpleLight" />
              <h2 className="font-semibold text-white">Quick Operational Hub</h2>
            </div>
            <p className="text-xs text-csi-textDim leading-relaxed">
              Create an event to automatically generate RSMS notices, permission letters, feedback QR codes, and coordinator allocations in 1 click.
            </p>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-medium py-3 rounded-lg transition shadow-lg shadow-purple-600/20 flex items-center justify-center space-x-2 text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Launch Event Creation Wizard</span>
            </button>
          </div>

          <div className="p-3.5 rounded-lg bg-csi-dark border border-csi-border space-y-1.5 text-xs">
            <span className="text-[10px] font-bold text-csi-purpleLight uppercase tracking-wider">CSI Rule Engine</span>
            <p className="text-csi-textDim text-[11px]">
              Coordinators are fairly distributed based on the 23-member workload counter.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Quick Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/members"
          className="group p-6 bg-csi-surface rounded-xl border border-csi-border hover:border-csi-purple/50 hover:shadow-lg hover:shadow-csi-purple/10 transition"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
              <Users className="w-6 h-6" />
            </div>
            <ArrowRight className="w-5 h-5 text-csi-textDim group-hover:text-purple-400 group-hover:translate-x-1 transition" />
          </div>
          <h2 className="text-lg font-semibold text-white group-hover:text-purple-400 transition">
            Members Database &amp; Workload
          </h2>
          <p className="text-sm text-csi-textDim mt-1">
            Manage {totalMembers} members, track availability (Free/Busy), and monitor coordinator workload.
          </p>
        </Link>

        <Link
          href="/events"
          className="group p-6 bg-csi-surface rounded-xl border border-csi-border hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6" />
            </div>
            <ArrowRight className="w-5 h-5 text-csi-textDim group-hover:text-cyan-400 group-hover:translate-x-1 transition" />
          </div>
          <h2 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition">
            Events Hosted Archive
          </h2>
          <p className="text-sm text-csi-textDim mt-1">
            {completedEvents} completed events archived with coordinator assignments and records.
          </p>
        </Link>
      </div>

      {/* Modal */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEvents(getStoredEvents());
          setMembers(getStoredMembers());
        }}
        onEventCreated={() => {
          setEvents(getStoredEvents());
          setMembers(getStoredMembers());
        }}
      />
    </div>
  );
}
