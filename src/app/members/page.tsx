"use client";

import { useState } from "react";
import { members } from "@/lib/data";
import { Search } from "lucide-react";

const domainColors: Record<string, string> = {
  Executive: "bg-purple-900/40 text-purple-300 border border-purple-500/40",
  Operations: "bg-blue-900/40 text-blue-300 border border-blue-500/40",
  Creative: "bg-pink-900/40 text-pink-300 border border-pink-500/40",
  Documentation: "bg-amber-900/40 text-amber-300 border border-amber-500/40",
  Marketing: "bg-emerald-900/40 text-emerald-300 border border-emerald-500/40",
  Technical: "bg-cyan-900/40 text-cyan-300 border border-cyan-500/40",
};

const memberTypeLabel: Record<string, { text: string; class: string }> = {
  old_coordinator: { text: "Old Coordinator", class: "bg-indigo-900/40 text-indigo-300 border border-indigo-500/40" },
  new_coordinator: { text: "New Coordinator", class: "bg-teal-900/40 text-teal-300 border border-teal-500/40" },
};

export default function MembersPage() {
  const [search, setSearch] = useState("");
  const [filterDomain, setFilterDomain] = useState<string>("all");

  const domains = Array.from(new Set(members.map((m) => m.domain)));

  const filtered = members.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.role.toLowerCase().includes(search.toLowerCase()) ||
      m.class_batch.toLowerCase().includes(search.toLowerCase());
    const matchDomain = filterDomain === "all" || m.domain === filterDomain;
    return matchSearch && matchDomain;
  });

  return (
    <div className="space-y-7 max-w-7xl mx-auto">
      {/* Header */}
      <div className="border-b border-csi-border pb-6">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Members Database
        </h1>
        <p className="text-slate-300 text-[18px] mt-1">
          Club Members &amp; Coordinator Classification — Manage active member roster, coordinator classification, and completed event counts.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-88">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search members by name, role, class..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-black border border-purple-500/40 text-[18px] text-white focus:outline-none focus:border-purple-400 placeholder:text-slate-500 font-medium"
          />
        </div>

        {/* Domain Filter */}
        <div className="flex items-center gap-3">
          <select
            value={filterDomain}
            onChange={(e) => setFilterDomain(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-black border border-purple-500/40 text-[18px] text-white focus:outline-none focus:border-purple-400 font-medium"
          >
            <option value="all">All Domains</option>
            {domains.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <span className="text-[18px] text-slate-300 font-mono font-semibold">
            {filtered.length} of {members.length} members
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#12101C] rounded-2xl border border-purple-500/30 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-purple-500/30 bg-[#0B0912] text-slate-300 text-[18px] font-bold">
                <th className="px-5 py-4">MEMBER NAME</th>
                <th className="px-5 py-4">ROLE &amp; DOMAIN</th>
                <th className="px-5 py-4">CLASS</th>
                <th className="px-5 py-4">CLASSIFICATION</th>
                <th className="px-5 py-4">ASSIGNMENTS</th>
                <th className="px-5 py-4">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-500/20 text-[18px]">
              {filtered.map((member, idx) => {
                const domainStyle = domainColors[member.domain] || "bg-slate-800 text-slate-300";
                const typeInfo = memberTypeLabel[member.member_type];
                return (
                  <tr
                    key={member.id}
                    className={`hover:bg-purple-950/20 transition ${
                      idx % 2 === 0 ? "bg-[#12101C]" : "bg-[#0E0C16]"
                    }`}
                  >
                    <td className="px-5 py-3.5 font-bold text-white text-[19px]">
                      {member.name}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col gap-1">
                        <span className="text-white font-semibold text-[18px]">{member.role}</span>
                        <span className={`inline-block w-fit text-xs px-2.5 py-0.5 rounded-full font-bold ${domainStyle}`}>
                          {member.domain}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="bg-black text-slate-200 text-sm font-mono px-2.5 py-1 rounded-lg border border-purple-500/30 font-bold">
                        {member.class_batch}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs px-3 py-1 rounded-full font-bold ${typeInfo.class}`}>
                        {typeInfo.text}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`font-bold text-[18px] ${member.events_coordinated_count === 0 ? "text-slate-500" : "text-white"}`}>
                        {member.events_coordinated_count} event(s)
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {member.is_active ? (
                        <span className="bg-green-500/20 text-green-300 border border-green-500/40 text-xs px-3 py-1 rounded-full font-bold">
                          Active
                        </span>
                      ) : (
                        <span className="bg-red-500/20 text-red-300 border border-red-500/40 text-xs px-3 py-1 rounded-full font-bold">
                          Inactive
                        </span>
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
