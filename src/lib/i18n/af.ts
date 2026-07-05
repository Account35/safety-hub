import type { Translations } from "./types";

/**
 * Afrikaans (af-ZA) translations. Structurally identical to `en.ts` — TS
 * enforces every English key has an Afrikaans equivalent. Content sweep for
 * remaining Phase 1–7 strings happens in a later chunk; this file starts
 * with the current en.ts coverage so the app is fully bilingual for
 * everything already extracted.
 */
export const t: Translations = {
  app: {
    name: "Gemeenskapsveiligheidsnaspeurstelsel",
    tagline: "Help om jou gemeenskap veilig te hou",
  },
  nav: {
    home: "Tuis",
    cases: "Sake",
    report: "Rapporteer",
    activity: "Aktiwiteit",
    profile: "Profiel",
    signIn: "Teken aan",
    signOut: "Teken uit",
    skipToContent: "Spring na hoofinhoud",
  },
  auth: {
    welcomeTitle: "Help Om Jou Gemeenskap Veilig Te Hou",
    welcomeSubtitle: "Blaai sake, rapporteer veilig, en help SAPD jou gemeenskap beskerm.",
    browseGuest: "Blaai Veiligheidsinligting",
    createAccount: "Skep Rekening",
    signInTab: "Teken aan",
    signUpTab: "Skep rekening",
    emailLabel: "E-pos",
    passwordLabel: "Wagwoord",
    fullNameLabel: "Volle naam",
    showPassword: "Wys wagwoord",
    hidePassword: "Versteek wagwoord",
    submitSignIn: "Teken aan",
    submitSignUp: "Skep rekening",
    continueWithGoogle: "Gaan voort met Google",
    or: "of",
    rememberMe: "Onthou my",
    accountCreated: "Rekening geskep. Welkom aan boord.",
    signedIn: "Suksesvol aangeteken.",
    signedOut: "Uitgeteken.",
  },
  dashboard: {
    welcomeBack: "Welkom terug",
    welcomeGuest: "Welkom by Gemeenskapsveiligheidsnaspeurstelsel",
    morning: "Goeie môre",
    afternoon: "Goeie middag",
    evening: "Goeie naand",
    locationPrompt: "Stel jou area om plaaslike sake te sien",
    locationLabel: "Jou area",
    saveArea: "Stoor",
    nearestStation: "Naaste SAPD-stasie",
    actions: {
      browseWanted: "Blaai Gesogte",
      browseWantedDesc: "Help gevaarlike verdagtes vind",
      browseMissing: "Blaai Vermistes",
      browseMissingDesc: "Help vermiste mense vind",
      report: "Rapporteer Anoniem",
      reportDesc: "Dien 'n waarneming of wenk veilig in",
      myReports: "My Verslae",
      myReportsDesc: "Volg jou indienings",
      rewards: "Belonings",
      rewardsDesc: "Kyk beskikbare belonings",
      community: "Gemeenskap",
      communityDesc: "Puntelys en prestasies",
    },
  },
};