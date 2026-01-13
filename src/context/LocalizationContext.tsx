"use client";

import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  ReactNode,
  useEffect,
} from "react";
import { Language } from "@/types"; // ✅ Alias import

// ------------------------------
// 🌍 Translations
// ------------------------------
const translations: Record<Language, Record<string, string>> = {
  [Language.EN]: {
    play: "Play",
    download: "Download",
    subtitles: "Subtitles",
    off: "Off",
    trending_now: "Trending Now",
    action_adventure: "Action & Adventure",
    sign_in: "Sign In",
    sign_up: "Sign Up",
    sign_out: "Sign Out",
    email_address: "Email Address",
    password: "Password",
    new_to_streamflix: "New to StreamFlix?",
    sign_up_now: "Sign Up Now",
    already_have_account: "Already have an account?",
    sign_in_now: "Sign In Now",
    // Added common keys likely needed
    home: "Home",
    movies: "Movies",
    tv_shows: "TV Shows",
    my_list: "My List",
    more_info: "More Info",
  },

  [Language.ES]: {
    play: "Reproducir",
    download: "Descargar",
    subtitles: "Subtítulos",
    off: "Desactivado",
    trending_now: "Tendencias actuales",
    action_adventure: "Acción y Aventura",
    sign_in: "Iniciar sesión",
    sign_up: "Registrarse",
    sign_out: "Cerrar sesión",
    email_address: "Correo electrónico",
    password: "Contraseña",
    new_to_streamflix: "¿Nuevo en StreamFlix?",
    sign_up_now: "Regístrate ahora",
    already_have_account: "¿Ya tienes una cuenta?",
    sign_in_now: "Inicia sesión ahora",
    home: "Inicio",
    movies: "Películas",
    tv_shows: "Series",
    my_list: "Mi Lista",
    more_info: "Más Info",
  },

  [Language.FR]: {
    play: "Lire",
    download: "Télécharger",
    subtitles: "Sous-titres",
    off: "Désactivé",
    trending_now: "Tendances actuelles",
    action_adventure: "Action et Aventure",
    sign_in: "Se connecter",
    sign_up: "S'inscrire",
    sign_out: "Se déconnecter",
    email_address: "Adresse e-mail",
    password: "Mot de passe",
    new_to_streamflix: "Nouveau sur StreamFlix ?",
    sign_up_now: "Inscrivez-vous maintenant",
    already_have_account: "Vous avez déjà un compte ?",
    sign_in_now: "Connectez-vous maintenant",
    home: "Accueil",
    movies: "Films",
    tv_shows: "Séries",
    my_list: "Ma Liste",
    more_info: "Plus d'infos",
  },

  [Language.DE]: {
    play: "Abspielen",
    download: "Herunterladen",
    subtitles: "Untertitel",
    off: "Aus",
    trending_now: "Aktuell im Trend",
    action_adventure: "Action & Abenteuer",
    sign_in: "Anmelden",
    sign_up: "Registrieren",
    sign_out: "Abmelden",
    email_address: "E-Mail-Adresse",
    password: "Passwort",
    new_to_streamflix: "Neu bei StreamFlix?",
    sign_up_now: "Jetzt registrieren",
    already_have_account: "Bereits ein Konto?",
    sign_in_now: "Jetzt anmelden",
    home: "Startseite",
    movies: "Filme",
    tv_shows: "Serien",
    my_list: "Meine Liste",
    more_info: "Mehr Infos",
  },

  [Language.ZH]: {
    play: "播放",
    download: "下载",
    subtitles: "字幕",
    off: "关闭",
    trending_now: "热门推荐",
    action_adventure: "动作与冒险",
    sign_in: "登录",
    sign_up: "注册",
    sign_out: "登出",
    email_address: "电子邮箱",
    password: "密码",
    new_to_streamflix: "新用户？",
    sign_up_now: "立即注册",
    already_have_account: "已有账户？",
    sign_in_now: "立即登录",
    home: "首页",
    movies: "电影",
    tv_shows: "电视剧",
    my_list: "我的列表",
    more_info: "更多信息",
  },
};

// ------------------------------
// 🔤 Context Types
// ------------------------------
interface LocalizationContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

// ------------------------------
// 🧠 Create Context
// ------------------------------
const LocalizationContext = createContext<LocalizationContextType | undefined>(
  undefined
);

// ------------------------------
// ⚙️ Provider (with persistence)
// ------------------------------
export const LocalizationProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // ✅ FIX: Initialize with default to avoid SSR crash
  const [language, setLanguageState] = useState<Language>(Language.EN);
  const [mounted, setMounted] = useState(false);

  // ✅ FIX: Only access localStorage after mount
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("preferredLanguage");
    if (stored && Object.values(Language).includes(stored as Language)) {
      setLanguageState(stored as Language);
    }
  }, []);

  // Persist on change (only if mounted)
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("preferredLanguage", language);
    }
  }, [language, mounted]);

  // Safe setter with validation
  const setLanguage = useCallback((lang: Language) => {
    if (Object.values(Language).includes(lang)) {
      setLanguageState(lang);
    }
  }, []);

  // Translation lookup
  const t = useCallback(
    (key: string): string => {
      // Basic normalization to match keys
      const cleanKey = key.toLowerCase().replace(/ /g, "_").replace(/\?/g, "");
      const translation = translations[language][cleanKey];
      return translation || key;
    },
    [language]
  );

  return (
    <LocalizationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LocalizationContext.Provider>
  );
};

// ------------------------------
// 🪶 Hook
// ------------------------------
export const useLocalization = (): LocalizationContextType => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error(
      "useLocalization must be used within a LocalizationProvider"
    );
  }
  return context;
};