"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Calendar } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Overview", href: "/", icon: LayoutDashboard },
    { name: "Events", href: "/events", icon: Calendar },
    { name: "Members", href: "/members", icon: Users },
  ];

  return (
    <aside className="fixed top-0 left-0 h-screen w-56 bg-csi-sidebar border-r border-csi-border flex flex-col z-50">
      {/* Brand */}
      <div className="px-5 py-6 border-b border-csi-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-csi-purple flex items-center justify-center font-bold text-sm text-white shadow-lg shadow-csi-purple/30">
            CSI
          </div>
          <div>
            <Link href="/" className="font-bold text-base text-white hover:text-csi-purpleLight transition">
              CSI Operations
            </Link>
            <p className="text-[10px] text-csi-textDim uppercase tracking-wider">Student Branch Platform</p>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-csi-purple text-white shadow-lg shadow-csi-purple/25"
                  : "text-csi-textMuted hover:bg-csi-surfaceLight hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-csi-border">
        <p className="text-[10px] text-csi-textDim">CSI Operations v1.0</p>
      </div>
    </aside>
  );
}
