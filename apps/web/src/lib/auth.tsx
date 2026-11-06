"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "@/lib/api";

export type SessionUser = {
  id: string;
  fullName: string;
  email: string;
  username: string;
  roles: string[];
  permissions: string[];
};

type AuthState = {
  user: SessionUser | null;
  ready: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("aiq_user");
    const token = localStorage.getItem("aiq_token");
    if (raw && token) {
      try {
        setUser(JSON.parse(raw) as SessionUser);
      } catch {
        localStorage.removeItem("aiq_user");
        localStorage.removeItem("aiq_token");
      }
    }
    setReady(true);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      ready,
      async login(identifier, password) {
        const result = await api<{
          accessToken: string;
          user: SessionUser;
        }>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ identifier, password }),
        });
        localStorage.setItem("aiq_token", result.accessToken);
        localStorage.setItem("aiq_user", JSON.stringify(result.user));
        setUser(result.user);
      },
      logout() {
        localStorage.removeItem("aiq_token");
        localStorage.removeItem("aiq_user");
        setUser(null);
      },
    }),
    [ready, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

export function useRequireAuth() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.ready && !auth.user) router.replace("/login");
  }, [auth.ready, auth.user, router]);

  return auth;
}
