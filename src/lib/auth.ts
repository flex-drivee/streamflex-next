import type { User } from "@/types"; // ✅ Use Alias

export const authService = {
  // 🔐 Simulate backend login
  login: async (email: string, password: string): Promise<User | null> => {
    await new Promise((res) => setTimeout(res, 400));

    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    const fakeUser: User = {
      id: Math.random().toString(36).substr(2, 9), // Safer than crypto.randomUUID for basic mocks
      email: email.toLowerCase().trim(),
      role: email.includes("admin") ? "admin" : "user",
      token: Math.random().toString(36).slice(2),
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
    };

    // ✅ SSR Check: Ensure we are in the browser
    if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(fakeUser));
    }
    return fakeUser;
  },

  // 🧾 Simulate signup
  signup: async (email: string, password: string): Promise<User | null> => {
    await new Promise((res) => setTimeout(res, 400));

    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    const newUser: User = {
      id: Date.now().toString(),
      email,
      role: "user",
      token: "fake-jwt-token",
      expiresAt: Date.now() + 1000 * 60 * 60,
    };

    if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(newUser));
    }
    return newUser;
  },

  // 🚪 Log out
  logout: (): void => {
    if (typeof window !== "undefined") {
        localStorage.removeItem("user");
    }
  },

  // 🔍 Retrieve user if still valid
  getCurrentUser: async (): Promise<User | null> => {
    // ✅ Critical Crash Prevention: Don't run this on the server
    if (typeof window === "undefined") return null;

    await new Promise((res) => setTimeout(res, 200));

    const stored = localStorage.getItem("user");
    if (!stored) return null;

    try {
      const user = JSON.parse(stored) as User;

      // Expiry check
      if (user.expiresAt && Date.now() > user.expiresAt) {
        localStorage.removeItem("user");
        return null;
      }

      return user;
    } catch {
      localStorage.removeItem("user");
      return null;
    }
  },
};