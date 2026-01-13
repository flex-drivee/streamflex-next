"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { LocalizationProvider } from "@/context/LocalizationContext";
import { VideoDataProvider } from "@/context/VideoDataContext";
import { GlobalPlayerProvider } from "@/components/GlobalPlayerProvider";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LocalizationProvider>
          <VideoDataProvider>
             {/* This handles the Modals and Player logic globally */}
            <GlobalPlayerProvider>
              {children}
            </GlobalPlayerProvider>
          </VideoDataProvider>
        </LocalizationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}