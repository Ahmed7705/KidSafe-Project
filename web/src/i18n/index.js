import en from "./en.json";
import ar from "./ar.json";

const dictionaries = { en, ar };
const metadata = {
  en: { label: "English", dir: "ltr" },
  ar: { label: "العربية", dir: "rtl" }
};

let currentLanguage = "en";

function resolveKey(obj, key) {
  return key.split(".").reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

function applyDocumentSettings(language) {
  const meta = metadata[language] || metadata.en;
  document.documentElement.lang = language;
  document.documentElement.dir = meta.dir;
}

export function initI18n() {
  const stored = window.localStorage.getItem("kidsafe_lang");
  if (stored && dictionaries[stored]) {
    currentLanguage = stored;
  }
  applyDocumentSettings(currentLanguage);
}

export function setLanguage(language) {
  if (!dictionaries[language]) {
    return;
  }
  currentLanguage = language;
  window.localStorage.setItem("kidsafe_lang", language);
  applyDocumentSettings(language);
}

export function getLanguage() {
  return currentLanguage;
}

export function getLanguages() {
  return metadata;
}

export function t(key) {
  const current = resolveKey(dictionaries[currentLanguage], key);
  if (typeof current === "string" && current.length > 0) {
    return current;
  }
  const fallback = resolveKey(dictionaries.en, key);
  if (typeof fallback === "string" && fallback.length > 0) {
    return fallback;
  }
  return key;
}
