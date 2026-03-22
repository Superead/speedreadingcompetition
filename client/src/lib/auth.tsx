import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { User } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { changeLanguage } from "@/lib/i18n";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
  isAdmin: boolean;
  isStudent: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    
    if (storedToken && storedUser) {
      const parsed = JSON.parse(storedUser);
      setToken(storedToken);
      setUser(parsed);
      // UI language is managed by i18n.ts init (reads from localStorage "i18n_lang")
      // No need to override it here — the globe dropdown controls UI language
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    // Clear all cached data from any previous user session
    queryClient.clear();
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    // Only set UI language on first login (when no explicit UI language choice exists yet)
    if (!localStorage.getItem("i18n_lang") && (newUser as any).preferredLanguage) {
      changeLanguage((newUser as any).preferredLanguage);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("i18n_lang");
    // Clear all cached queries so next user doesn't see stale data
    queryClient.clear();
    // Reset UI language to Turkish (default)
    changeLanguage("tr");
  };

  const isAdmin = user?.role === "ADMIN";
  const isStudent = user?.role === "STUDENT";

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading, isAdmin, isStudent }}>
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
