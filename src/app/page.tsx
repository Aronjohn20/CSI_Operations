import Link from "next/link";
import { Plus, Users, Calendar, CheckCircle2, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-8">
      {/* Hero / Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Operations Dashboard
          </h1>
          <p className="text-slate-500 mt-1">
            Centralized hub for CSI student branch event planning, documentation, and coordination.
          </p>
        </div>
        <button
          disabled
          className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-lg shadow-sm transition opacity-90 cursor-pointer"
          title="Coming in Phase 3"
        >
          <Plus className="w-5 h-5" />
          <span>+ Create Event</span>
        </button>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Total CSI Members</span>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-2">23</p>
          <p className="text-xs text-slate-500 mt-1">Active registered roster</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Active Events</span>
            <Calendar className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-2">0</p>
          <p className="text-xs text-slate-500 mt-1">Events in progress</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Hosted Events</span>
            <CheckCircle2 className="w-5 h-5 text-indigo-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-2">0</p>
          <p className="text-xs text-slate-500 mt-1">Archived in history</p>
        </div>
      </div>

      {/* Navigation Quick Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <Link
          href="/members"
          className="group p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Users className="w-6 h-6" />
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition">
            Members Database & Workload
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage 23 members, track availability (Free/Busy), and monitor coordinator workload.
          </p>
        </Link>

        <Link
          href="/events"
          className="group p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6" />
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition">
            Events Hosted Archive
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Access past records, generated notices, feedback sheets, and certificates.
          </p>
        </Link>
      </div>
    </div>
  );
}

