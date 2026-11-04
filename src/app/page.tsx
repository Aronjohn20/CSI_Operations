import Link from "next/link";
import { Plus, Users, Calendar, CheckCircle2, ArrowRight, Clock, Activity } from "lucide-react";
import { members, events } from "@/lib/data";

export default function Home() {
  const totalMembers = members.length;
  const activeEvents = events.filter((e) => e.status !== "completed").length;
  const completedEvents = events.filter((e) => e.status === "completed").length;
  const totalEvents = events.length;

  const newCoords = members.filter(m => m.member_type === "new_coordinator").length;
  const oldCoords = members.filter(m => m.member_type === "old_coordinator").length;

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
      value: "Active",
      sub: "CSI Operations Ready",
      borderColor: "border-t-pink-500",
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <div className="flex items-center space-x-2 bg-csi-surface px-3 py-1.5 rounded-full border border-csi-border">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-xs text-csi-textMuted">Supabase: Run Schema SQL</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`bg-csi-surface rounded-xl border border-csi-border border-t-2 ${card.borderColor} p-5`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-semibold text-csi-textDim uppercase tracking-wider">
                  {card.label}
                </span>
                <Icon className="w-4 h-4 text-csi-textDim" />
              </div>
              <p className="text-3xl font-bold text-white">{card.value}</p>
              <p className="text-xs text-csi-textMuted mt-1">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Events Table + Quick Actions side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events Table */}
        <div className="lg:col-span-2 bg-csi-surface rounded-xl border border-csi-border overflow-hidden">
          <div className="px-6 py-4 border-b border-csi-border">
            <h2 className="font-semibold text-white">Upcoming Club Events & Assigned Coordinators</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-csi-border">
                  <th className="text-left px-4 py-3 font-medium text-csi-textDim text-xs uppercase tracking-wider">Event Name</th>
                  <th className="text-left px-4 py-3 font-medium text-csi-textDim text-xs uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-csi-textDim text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-csi-textDim text-xs uppercase tracking-wider">Allocation</th>
                  <th className="text-left px-4 py-3 font-medium text-csi-textDim text-xs uppercase tracking-wider">Assigned</th>
                </tr>
              </thead>
              <tbody>
                {[...events]
                  .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
                  .slice(0, 7)
                  .map((event) => {
                    const statusMap: Record<string, { text: string; cls: string }> = {
                      planned: { text: "Planned", cls: "bg-amber-500/20 text-amber-400 border border-amber-500/30" },
                      confirmed: { text: "Confirmed", cls: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" },
                      completed: { text: "Completed", cls: "bg-green-500/20 text-green-400 border border-green-500/30" },
                    };
                    const status = statusMap[event.status];

                    return (
                      <tr key={event.id} className="border-b border-csi-border/50 hover:bg-csi-surfaceLight/50 transition">
                        <td className="px-4 py-3">
                          <span className="font-medium text-white">{event.event_name}</span>
                        </td>
                        <td className="px-4 py-3 text-csi-textMuted">
                          {new Date(event.event_date).toLocaleDateString("en-IN", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.cls}`}>
                            {status.text}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-csi-textMuted">
                          {event.required_coordinators} required
                        </td>
                        <td className="px-4 py-3">
                          {event.assigned_coordinators.length > 0 ? (
                            <span className="text-csi-text text-xs">
                              {event.assigned_coordinators.join(", ")}
                            </span>
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

        {/* Quick Operational Actions */}
        <div className="bg-csi-surface rounded-xl border border-csi-border p-6 space-y-4">
          <h2 className="font-semibold text-white">Quick Operational Actions</h2>
          <button className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-medium py-3 rounded-lg transition shadow-lg shadow-purple-600/20 flex items-center justify-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Add New Event</span>
          </button>
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
          <p className="text-sm text-csi-textMuted mt-1">
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
          <p className="text-sm text-csi-textMuted mt-1">
            {completedEvents} completed events archived with coordinator assignments and records.
          </p>
        </Link>
      </div>
    </div>
  );
}
