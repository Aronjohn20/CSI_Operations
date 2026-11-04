"use client";

import { useState } from "react";
import { members } from "@/lib/data";
import { Member } from "@/lib/types";
import { Search } from "lucide-react";

const domainColors: Record<string, string> = {
  Executive: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
  Operations: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  Creative: "bg-pink-500/20 text-pink-400 border border-pink-500/30",
  Documentation: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  Marketing: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  Technical: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30",
};

const memberTypeLabel: Record<string, { text: string; class: string }> = {
  old_coordinator: { text: "Old Coordinator", class: "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" },
  new_coordinator: { text: "New Coordinator", class: "bg-teal-500/20 text-teal-400 border border-teal-500/30" },
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
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-csi-border pb-6">
        <h1 className="text-2xl font-bold text-white">
          Members Database
        </h1>
        <p className="text-csi-textMuted mt-1">
          Club Members &amp; Coordinator Classification — Manage active member roster, coordinator classification, and completed event counts.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-csi-textDim" />
          <input
            type="text"
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-csi-surface border border-csi-border text-sm text-csi-text placeholder-csi-textDim focus:outline-none focus:ring-2 focus:ring-csi-purple focus:border-csi-purple"
          />
        </div>

        {/* Domain Filter */}
        <div className="flex items-center gap-2">
          <select
            value={filterDomain}
            onChange={(e) => setFilterDomain(e.target.value)}
            className="px-3 py-2 rounded-lg bg-csi-surface border border-csi-border text-sm text-csi-text focus:outline-none focus:ring-2 focus:ring-csi-purple"
          >
            <option value="all">All Domains</option>
            {domains.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <span className="text-sm text-csi-textMuted">
            {filtered.length} of {members.length} members
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-csi-surface rounded-xl border border-csi-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-csi-border">
                <th className="text-left px-4 py-3 font-medium text-csi-textDim text-xs uppercase tracking-wider">Member Name</th>
                <th className="text-left px-4 py-3 font-medium text-csi-textDim text-xs uppercase tracking-wider">Role &amp; Domain</th>
                <th className="text-left px-4 py-3 font-medium text-csi-textDim text-xs uppercase tracking-wider">Class</th>
                <th className="text-left px-4 py-3 font-medium text-csi-textDim text-xs uppercase tracking-wider">Classification</th>
                <th className="text-left px-4 py-3 font-medium text-csi-textDim text-xs uppercase tracking-wider">Assignments</th>
                <th className="text-left px-4 py-3 font-medium text-csi-textDim text-xs uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((member) => {
                const domainStyle = domainColors[member.domain] || "bg-csi-surfaceLight text-csi-textMuted";
                const typeInfo = memberTypeLabel[member.member_type];
                return (
                  <tr
                    key={member.id}
                    className="border-b border-csi-border/50 hover:bg-csi-surfaceLight/50 transition"
                  >
                    <td className="px-4 py-3 font-medium text-white">{member.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-csi-text font-medium">{member.role}</span>
                        <span className={`inline-block w-fit text-xs px-2 py-0.5 rounded-full ${domainStyle}`}>
                          {member.domain}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-csi-surfaceLight text-csi-textMuted text-xs font-mono px-2 py-1 rounded border border-csi-border">
                        {member.class_batch}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${typeInfo.class}`}>
                        {typeInfo.text}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${member.events_coordinated_count === 0 ? "text-csi-textDim" : "text-white"}`}>
                        {member.events_coordinated_count} event(s)
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {member.is_active ? (
                        <span className="bg-green-500/20 text-green-400 border border-green-500/30 text-xs px-2.5 py-1 rounded-full font-medium">
                          Active
                        </span>
                      ) : (
                        <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs px-2.5 py-1 rounded-full font-medium">
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
