"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
// 🚨 FIX: Import from Context, not from itself
import { useAuth } from "@/context/AuthContext"; 
import Spinner from "@/components/Spinner";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: "user" | "admin";
}

export default function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated || !user) {
        router.replace("/login");
      } else if (requiredRole && user.role !== requiredRole) {
        router.replace("/"); 
      }
    }
  }, [loading, isAuthenticated, user, requiredRole, router]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#141414]">
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (requiredRole && user?.role !== requiredRole) return null;

  return <>{children}</>;
}