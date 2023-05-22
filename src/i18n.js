import { createI18n } from "vue-i18n";
import { languages } from "./locales";

let lang = navigator.language || navigator.userLanguage;
lang = lang.split("-")[0];

export default createI18n({
  legacy: false,
  locale: lang,
  fallbackLocale: "en",
  messages: languages,
  globalInjection: true,
});
