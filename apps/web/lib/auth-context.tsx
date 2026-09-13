"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { API_BASE_URL, getApiBaseUrl } from "./config";

export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  role: string;
  token?: string;
  department?: string;
}

export type ResidentUser = UserProfile;

interface AuthContextType {
  // Legacy / Default resident user
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string, roleHint?: string) => Promise<{ success: boolean; user?: UserProfile; error?: string }>;
  register: (name: string, email: string, password: string, role?: string, department?: string) => Promise<{ success: boolean; user?: UserProfile; error?: string }>;
  logout: (roleTarget?: any) => void;
  getAuthHeaders: (roleTarget?: string) => Record<string, string>;

  // Role-isolated states
  residentUser: UserProfile | null;
  workerUser: UserProfile | null;
  operatorUser: UserProfile | null;
  loginRole: (email: string, password: string, roleTarget: "resident" | "field_worker" | "operator") => Promise<{ success: boolean; user?: UserProfile; error?: string }>;
  registerRole: (name: string, email: string, password: string, roleTarget: "resident" | "field_worker" | "operator", department?: string) => Promise<{ success: boolean; user?: UserProfile; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_RESIDENT = "repairgrid_resident_user";
const STORAGE_KEY_WORKER = "repairgrid_worker_user";
const STORAGE_KEY_OPERATOR = "repairgrid_operator_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [residentUser, setResidentUser] = useState<UserProfile | null>(null);
  const [workerUser, setWorkerUser] = useState<UserProfile | null>(null);
  const [operatorUser, setOperatorUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const defaultWorker: UserProfile = {
        userId: "worker-electric-001",
        name: "Ahmed Khan",
        email: "worker.electric@repairgrid.demo",
        role: "field_worker",
        department: "electrical",
      };

      const defaultResident: UserProfile = {
        userId: "resident-asim-001",
        name: "Asim Syed",
        email: "resident@repairgrid.demo",
        role: "resident",
      };

      const defaultOperator: UserProfile = {
        userId: "operator-demo-001",
        name: "Elena Rostova",
        email: "operator@repairgrid.demo",
        role: "operator",
      };

      const storedRes = localStorage.getItem(STORAGE_KEY_RESIDENT);
      setResidentUser(storedRes ? JSON.parse(storedRes) : defaultResident);

      const storedWkr = localStorage.getItem(STORAGE_KEY_WORKER);
      setWorkerUser(storedWkr ? JSON.parse(storedWkr) : defaultWorker);

      const storedOps = localStorage.getItem(STORAGE_KEY_OPERATOR);
      setOperatorUser(storedOps ? JSON.parse(storedOps) : defaultOperator);
    } catch (e) {
      console.error("Failed to load users from localStorage", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (
    email: string, 
    password: string, 
    roleHint?: string
  ): Promise<{ success: boolean; user?: UserProfile; error?: string }> => {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.detail || "Login failed" };
      }

      const profile: UserProfile = {
        userId: data.user_id,
        name: data.name,
        email: data.email,
        role: data.role,
        token: data.token,
      };

      const targetRole = roleHint || data.role;
      if (targetRole === "field_worker" || targetRole === "technician" || targetRole === "worker") {
        setWorkerUser(profile);
        localStorage.setItem(STORAGE_KEY_WORKER, JSON.stringify(profile));
      } else if (targetRole === "operator" || targetRole === "admin") {
        setOperatorUser(profile);
        localStorage.setItem(STORAGE_KEY_OPERATOR, JSON.stringify(profile));
      } else {
        setResidentUser(profile);
        localStorage.setItem(STORAGE_KEY_RESIDENT, JSON.stringify(profile));
      }

      return { success: true, user: profile };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error during login" };
    }
  }, []);

  const register = useCallback(async (
    name: string, 
    email: string, 
    password: string, 
    role?: string,
    department?: string
  ): Promise<{ success: boolean; user?: UserProfile; error?: string }> => {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: name.trim(), 
          email: email.trim().toLowerCase(), 
          password,
          role: role || "resident",
          department: department || "electrical"
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.detail || "Registration failed" };
      }

      const profile: UserProfile = {
        userId: data.user_id,
        name: data.name,
        email: data.email,
        role: data.role,
        token: data.token,
        department,
      };

      if (profile.role === "field_worker" || profile.role === "technician") {
        setWorkerUser(profile);
        localStorage.setItem(STORAGE_KEY_WORKER, JSON.stringify(profile));
      } else if (profile.role === "operator" || profile.role === "admin") {
        setOperatorUser(profile);
        localStorage.setItem(STORAGE_KEY_OPERATOR, JSON.stringify(profile));
      } else {
        setResidentUser(profile);
        localStorage.setItem(STORAGE_KEY_RESIDENT, JSON.stringify(profile));
      }

      return { success: true, user: profile };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error during registration" };
    }
  }, []);

  const logout = useCallback((roleTarget?: any) => {
    const target = typeof roleTarget === "string" ? roleTarget : "all";
    if (target === "resident" || target === "all") {
      setResidentUser(null);
      localStorage.removeItem(STORAGE_KEY_RESIDENT);
    }
    if (target === "field_worker" || target === "all") {
      setWorkerUser(null);
      localStorage.removeItem(STORAGE_KEY_WORKER);
    }
    if (target === "operator" || target === "all") {
      setOperatorUser(null);
      localStorage.removeItem(STORAGE_KEY_OPERATOR);
    }
  }, []);

  const loginRole = useCallback(async (
    email: string, 
    password: string, 
    roleTarget: "resident" | "field_worker" | "operator"
  ) => {
    return login(email, password, roleTarget);
  }, [login]);

  const registerRole = useCallback(async (
    name: string, 
    email: string, 
    password: string, 
    roleTarget: "resident" | "field_worker" | "operator",
    department?: string
  ) => {
    return register(name, email, password, roleTarget, department);
  }, [register]);

  const getAuthHeaders = useCallback((roleTarget: string = "resident"): Record<string, string> => {
    let u = residentUser;
    if (roleTarget === "field_worker" || roleTarget === "worker" || roleTarget === "technician") {
      u = workerUser;
      if (u) {
        return {
          "X-Mock-Role": "field_worker",
          "X-Mock-User-Id": u.userId,
          "X-Mock-Email": u.email,
          "Authorization": `Bearer ${u.token || ""}`,
        };
      }
      return {
        "X-Mock-Role": "field_worker",
        "X-Mock-User-Id": "worker-electric-001",
        "X-Mock-Email": "worker.electric@repairgrid.demo",
      };
    }

    if (roleTarget === "operator" || roleTarget === "admin") {
      u = operatorUser;
      if (u) {
        return {
          "X-Mock-Role": u.role || "operator",
          "X-Mock-User-Id": u.userId,
          "X-Mock-Email": u.email,
          "Authorization": `Bearer ${u.token || ""}`,
        };
      }
      return {
        "X-Mock-Role": "operator",
        "X-Mock-User-Id": "operator-demo-001",
        "X-Mock-Email": "operator@repairgrid.demo",
      };
    }

    // Default Resident
    if (residentUser) {
      return {
        "X-Mock-Role": residentUser.role || "resident",
        "X-Mock-User-Id": residentUser.userId,
        "X-Mock-Email": residentUser.email,
        "Authorization": `Bearer ${residentUser.token || ""}`,
      };
    }

    return {
      "X-Mock-Role": "resident",
      "X-Mock-User-Id": "resident-demo-001",
      "X-Mock-Email": "resident@repairgrid.demo",
    };
  }, [residentUser, workerUser, operatorUser]);

  return (
    <AuthContext.Provider value={{
      user: residentUser,
      isLoading,
      login,
      register,
      logout,
      getAuthHeaders,
      residentUser,
      workerUser,
      operatorUser,
      loginRole,
      registerRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useWorkerAuth() {
  const { workerUser, isLoading, loginRole, registerRole, logout, getAuthHeaders } = useAuth();
  return {
    user: workerUser,
    isLoading,
    login: (email: string, pass: string) => loginRole(email, pass, "field_worker"),
    register: (name: string, email: string, pass: string, dept?: string) => 
      registerRole(name, email, pass, "field_worker", dept),
    logout: () => logout("field_worker"),
    getAuthHeaders: () => getAuthHeaders("field_worker"),
  };
}

export function useOperatorAuth() {
  const { operatorUser, isLoading, loginRole, registerRole, logout, getAuthHeaders } = useAuth();
  return {
    user: operatorUser,
    isLoading,
    login: (email: string, pass: string) => loginRole(email, pass, "operator"),
    register: (name: string, email: string, pass: string) => 
      registerRole(name, email, pass, "operator"),
    logout: () => logout("operator"),
    getAuthHeaders: () => getAuthHeaders("operator"),
  };
}
