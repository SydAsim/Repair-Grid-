"use client";

import { useState } from "react";
import Link from "next/link";
import { OperatorNav } from "@/components/OperatorNav";
import { 
  FileText, 
  Search, 
  Filter, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  ShieldAlert
} from "lucide-react";

interface MissionRow {
  id: string;
  title: string;
  category: string;
  department: string;
  priority: number;
  riskBand: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  assignedTo: string;
  status: string;
  sla: string;
}

const ALL_MISSIONS: MissionRow[] = [
  { id: "RG-M-201", title: "Restore lighting at North Gate 2", category: "streetlights", department: "Electrical", priority: 85, riskBand: "HIGH", assignedTo: "Ahmed Khan", status: "ASSIGNED", sla: "Today, 17:00" },
  { id: "SIM-M-DRAIN", title: "Clear Primary School Gate Storm Drain", category: "blocked_drains", department: "Plumbing", priority: 95, riskBand: "CRITICAL", assignedTo: "Marcus Thorne", status: "HITL PENDING", sla: "Today, 12:00" },
  { id: "RG-M-203", title: "Engineering Lane Asphalt Cavity Repair", category: "potholes", department: "Roads", priority: 65, riskBand: "MEDIUM", assignedTo: "Darius Vance", status: "IN PROGRESS", sla: "Tomorrow, 10:00" },
  { id: "RG-M-198", title: "Library Quad Lamp Module Replacement", category: "streetlights", department: "Electrical", priority: 50, riskBand: "LOW", assignedTo: "Ahmed Khan", status: "CLOSED", sla: "Completed" },
  { id: "RG-M-195", title: "Catch Basin Debris Clearing", category: "blocked_drains", department: "Plumbing", priority: 70, riskBand: "MEDIUM", assignedTo: "Elena Rostova", status: "CLOSED", sla: "Completed" },
];

export default function MissionsListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  const filtered = ALL_MISSIONS.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) || m.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "ALL" || m.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <OperatorNav />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
              OPERATIONAL AUDIT TRAIL
            </span>
            <h1 className="text-2xl font-bold text-white mt-1">All Community Missions</h1>
            <p className="text-xs text-slate-400 mt-1">
              End-to-end lifecycle tracking with optimistic concurrency versioning.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search missions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN PROGRESS">In Progress</option>
              <option value="HITL PENDING">HITL Pending</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>

        {/* Missions Table */}
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Mission ID</th>
                  <th className="py-3.5 px-4">Title & Category</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Priority & Risk</th>
                  <th className="py-3.5 px-4">Technician</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">SLA Deadline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filtered.map((m) => {
                  const isCritical = m.riskBand === "CRITICAL";
                  return (
                    <tr key={m.id} className="hover:bg-slate-900/60 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">{m.id}</td>
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {m.title}
                        <span className="text-[10px] text-slate-500 block font-normal capitalize">
                          {m.category.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">{m.department}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isCritical
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : m.riskBand === "HIGH"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-slate-800 text-slate-400"
                        }`}>
                          {m.priority} ({m.riskBand})
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-200">{m.assignedTo}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          m.status === "CLOSED"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : m.status === "HITL PENDING"
                            ? "bg-rose-500/10 text-rose-400 animate-pulse"
                            : "bg-blue-500/10 text-blue-400"
                        }`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">{m.sla}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
