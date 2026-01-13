"use client"; // 🚨 REQUIRED: Context uses state/effects

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authService } from "@/lib/auth"; // ✅ Import from lib, not services
import type { User } from "@/types";

interface AuthContextProps {
  user: User | null;
  isAuthenticated: boolean;
  userRole: "user" | "admin" | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  signup: (email: string, password: string) => Promise<User | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (err) {
        console.error("Auth initialization failed:", err);
        authService.logout();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []); 

  const login = async (email: string, password: string): Promise<User | null> => {
    try {
        const loggedUser = await authService.login(email, password);
        setUser(loggedUser);
        return loggedUser;
    } catch (error) {
        console.error("Login failed", error);
        throw error;
    }
  };

  const signup = async (email: string, password: string): Promise<User | null> => {
    try {
        const newUser = await authService.signup(email, password);
        setUser(newUser);
        return newUser;
    } catch (error) {
        console.error("Signup failed", error);
        throw error;
    }
  };

  const logout = (): void => {
    authService.logout();
    setUser(null);
  };

  const isAuthenticated = !!user;
  const userRole = user?.role ?? null;

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, userRole, loading, login, signup, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook
export const useAuth = (): AuthContextProps => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};