// i18n/index.tsx - simple English / Sinhala / Tamil translation system.
// Wrap the app in LanguageProvider (App.tsx) and call useT() in any screen to get t() and the current language.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "./strings/auth";
import { home } from "./strings/home";
import { results } from "./strings/results";

// Supported languages: English, Sinhala, Tamil.
export type Language = "EN" | "SI" | "TA";
export const LANGUAGES: Language[] = ["EN", "SI", "TA"];
// AsyncStorage key where the chosen language is remembered.
const KEY = "lexiscan.language";

// English text IS the key: t("Sign In") falls back to itself, so an untranslated string never breaks a screen.
// Each strings file maps English -> { si, ta }. Assessment content (words, letters, tasks, spoken prompts) stays English.
export type Entry = { si: string; ta: string };
const DICT: Record<string, Entry> = { ...auth, ...home, ...results };

// What useT() gives back: current language, a setter, and the translate function.
type Ctx = { lang: Language; setLang: (l: Language) => void; t: (en: string, vars?: Record<string, string | number>) => string };
const LanguageContext = createContext<Ctx>({ lang: "EN", setLang: () => {}, t: (en) => en });

// Replaces {name} placeholders in a string with values from `vars`.
function format(s: string, vars?: Record<string, string | number>) {
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
}

// Holds the selected language (restored from storage on start) and provides t() to the app.
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("EN");

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => { if (v === "SI" || v === "TA" || v === "EN") setLangState(v); })
      .catch(() => {});
  }, []);

  // Changes the language and saves it for next launch.
  const setLang = useCallback((l: Language) => {
    setLangState(l);
    AsyncStorage.setItem(KEY, l).catch(() => {});
  }, []);

  // Translate: looks up the English text; falls back to English if no translation exists.
  const t = useCallback((en: string, vars?: Record<string, string | number>) => {
    const e = DICT[en];
    const out = lang === "SI" ? e?.si : lang === "TA" ? e?.ta : undefined;
    return format(out || en, vars);
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// Hook for screens/components: const { t, lang, setLang } = useT().
export const useT = () => useContext(LanguageContext);
