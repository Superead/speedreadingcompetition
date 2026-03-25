import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import tr from "@/locales/tr.json";
import en from "@/locales/en.json";
import de from "@/locales/de.json";
import pl from "@/locales/pl.json";
import fr from "@/locales/fr.json";
import vi from "@/locales/vi.json";
import hi from "@/locales/hi.json";

i18n.use(initReactI18next).init({
  resources: {
    tr: { translation: tr },
    en: { translation: en },
    de: { translation: de },
    pl: { translation: pl },
    fr: { translation: fr },
    vi: { translation: vi },
    hi: { translation: hi },
  },
  lng: localStorage.getItem("i18n_lang") || (() => {
    // Detect browser language, map to supported languages
    const supported = ["tr", "en", "de", "pl", "fr", "vi", "hi"];
    const browserLang = navigator.language?.split("-")[0]?.toLowerCase();
    return supported.includes(browserLang || "") ? browserLang! : "en";
  })(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export function changeLanguage(lang: string) {
  i18n.changeLanguage(lang);
  localStorage.setItem("i18n_lang", lang);
}

export default i18n;
