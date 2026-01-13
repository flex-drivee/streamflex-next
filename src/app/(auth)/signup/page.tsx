"use client"; // REQUIRED for hooks in Next.js

import React, { useState } from "react";
import { useRouter } from "next/navigation"; // Changed from react-router-dom
import { useLocalization } from "@/context/LocalizationContext"; // Fixed incomplete import
import { useAuth } from "@/context/AuthContext"; // Fixed path

const SignUpPage: React.FC = () => {
  const { t } = useLocalization();
  const { signup } = useAuth();
  const router = useRouter(); // Next.js router

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // Added loading state consistency

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
     await signup(email, password);
     router.push("/"); // Redirect to home
    } catch (err) {
      setError(t("signup_failed") || "Signup failed. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{
          backgroundImage:
            "url('https://orange.blender.org/wp-content/themes/orange/images/media/gallery_001_13.jpg')",
        }}
      />
      <div className="relative z-10 w-full max-w-md p-8 space-y-8 bg-black/70 rounded-lg shadow-lg backdrop-blur-sm">
        <h1 className="text-4xl font-bold text-center text-red-600">Streamflex</h1>
        <h2 className="text-2xl font-bold text-center">{t("sign_up")}</h2>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-50"
            placeholder={t("email_address")}
          />
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-50"
            placeholder={t("password")}
          />

          {error && (
            <div className="bg-red-600/20 border border-red-600 text-red-400 px-4 py-2 rounded-md text-sm text-center animate-fade-in">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 font-bold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors duration-200 disabled:bg-red-900"
          >
            {loading ? "Signing up..." : t("sign_up")}
          </button>
        </form>

        <p className="text-center text-gray-400">
          {t("already_have_account")}{" "}
          <button
            onClick={() => router.push("/login")}
            className="font-semibold text-white hover:underline"
          >
            {t("sign_in_now")}
          </button>
        </p>
      </div>
    </div>
  );
};

export default SignUpPage;