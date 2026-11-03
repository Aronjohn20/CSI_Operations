"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Users, Layers, Shield } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/", icon: Layers },
    { name: "Events Archive", href: "/events", icon: Calendar },
    { name: "Members Database", href: "/members", icon: Users },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-700 flex items-center justify-center font-bold text-lg text-white shadow-inner">
              CSI
            </div>
            <div>
              <Link href="/" className="font-bold text-lg tracking-tight hover:text-blue-300 transition">
                CSI Operations
              </Link>
              <p className="text-xs text-slate-400">Student Chapter Platform</p>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-800 text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}

