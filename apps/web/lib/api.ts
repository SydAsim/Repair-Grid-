import { getApiBaseUrl } from "./config";

const API_BASE = `${getApiBaseUrl()}/api`;

export interface ReportItem {
  report_id: string;
  reporter_id: string;
  category: "streetlights" | "potholes" | "blocked_drains";
  description: string;
  lat: number;
  lng: number;
  status: string;
  verification_confidence: number;
  duplicate_of?: string | null;
  evidence_refs: string[];
  created_at: string;
  updated_at: string;
}

export interface MissionItem {
  missionId: string;
  title: string;
  category: string;
  priority: number;
  riskBand: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  requiredSkill: string;
  department: string;
  assignedWorkerId?: string | null;
  status: string;
  slaDueAt: string;
  requiresHumanApproval: boolean;
  version: number;
  createdAt: string;
}

export interface DecisionItem {
  decisionId: string;
  missionId: string;
  type: string;
  proposedAction: string;
  agentName: string;
  confidence: number;
  evidence: Array<{ fact: string }>;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

export interface WorkerItem {
  workerId: string;
  userId: string;
  displayName: string;
  department: string;
  skills: string[];
  zone: string;
  availability: "AVAILABLE" | "ASSIGNED" | "OFF_SHIFT";
  activeMissionId?: string | null;
  lastLat: number;
  lastLng: number;
}

export interface OperationalSummary {
  community_health: number;
  category_health: {
    lighting: number;
    roads: number;
    drainage: number;
  };
  formula_breakdown: string;
  open_missions: number;
  critical_missions: number;
  resolved_today: number;
  pending_decisions: number;
  available_workers: number;
  agent_actions_today: number;
  auto_action_rate: number;
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  
  let dynamicHeaders: Record<string, string> = {
    "X-Mock-Role": "operator",
  };
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("repairgrid_resident_user");
      if (stored) {
        const u = JSON.parse(stored);
        if (u.userId) {
          dynamicHeaders["X-Mock-User-Id"] = u.userId;
          dynamicHeaders["X-Mock-Email"] = u.email;
        }
      }
    } catch (e) {}
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...dynamicHeaders,
        ...options.headers,
      },
    });
    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.warn(`API call failed to ${url}, using simulated demo fallback:`, err);
    throw err;
  }
}
