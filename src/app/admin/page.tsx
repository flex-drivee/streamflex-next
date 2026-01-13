"use client";

import React from "react";
import { useRouter } from "next/navigation"; // 👈 Next.js Router
import { useAuth } from "@/context/AuthContext"; // 👈 Fixed import path

const AdminPage: React.FC = () => {
  const router = useRouter(); // 👈 Replaces navigate
  const { logout } = useAuth();

  const handleSignOut = () => {
    logout();
    router.push("/login"); // 👈 Next.js navigation syntax
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold text-red-500">Admin Dashboard</h1>
        <p className="text-gray-300">
          Welcome, Admin! 🚀 You have access to admin-only features.
        </p>

        <div className="space-x-4">
          <button
            onClick={() => router.push("/")} // 👈 Home is now just "/"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            Go to Home
          </button>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;