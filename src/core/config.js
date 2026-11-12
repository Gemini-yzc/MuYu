/*
 * Flow - A high-performance teleprompter for Windows.
 * Copyright (C) 2026 Waled Alturkmani (LumoRez07)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

function deepFreeze(obj) {
  if (obj && typeof obj === "object" && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    Object.values(obj).forEach(deepFreeze);
  }
  return obj;
}

export const defaultState = deepFreeze({
  script: "欢迎使用幕语。打开讲稿编辑器，导入或粘贴你的讲稿。将鼠标放在讲稿上，用滚轮阅读。",
  speed: 120,
  googleCloud: {
    textToSpeechApiKey: "",
    translationApiKey: "",
    translationProjectId: ""
  },
  language: "zh-CN",
  desktop: {
    hideFromCapture: true,
    captureProtectionConfigured: true,
    useSystemTray: true,
    preventSleep: false,
    clickthroughShortcutEnabled: false
  },
  remote: {
    provider: "cloud",
    receiverId: "",
    receiverSecret: "",
    accessPassword: "",
    publicHost: "",
  },
  window: {
    x: null,
    y: null,
    width: 550,
    height: 260,
    preset: "top-center",
    isPinned: true
  },
  appearance: {
    mode: "scroll",
    theme: "main",
    style: "main",
    mirrorMode: false,
    mirrorVertical: false,
    speedRailEnabled: false,
    autoHideToolbar: false,
    performanceMode: false,
    appOpacity: 60,
    companionOpacity: 95,
    textScale: 55,
    textColor: "#ffffff",
    textOpacity: 88,
    scrollStartDelaySeconds: 3,
    voiceLanguage: "en-US",
    voiceScrollStyle: "highlight",
    appWideVoiceCommands: false,
    soundInputDeviceId: "default",
    soundInputDeviceLabel: "",
    soundInputNoiseGate: 0.01,
    soundInputGain: 2,
    cornerRadius: 24,
    cardRadius: 14,
    borderWidth: 1,
    borderOpacity: 10,
    glassBlur: 28,
    customAccentColor: "",
    customHighlightColor: ""
  },
  voiceTracking: {
    confidenceThreshold: 0.35
  },
  modules: {
    scriptManager: false,
    scriptCompletion: false
  }
});

export const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "tr", label: "Türkçe" },
  { value: "ar", label: "العربية" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
  { value: "es", label: "Español" },
  { value: "pt", label: "Português" },
  { value: "fi", label: "Suomi" },
  { value: "zh-CN", label: "简体中文" }
];

export const VOICE_LANGUAGE_OPTIONS = [
  { value: "en-US", label: "English" },
  { value: "tr-TR", label: "Turkish" },
  { value: "ar-SA", label: "Arabic" },
  { value: "de-DE", label: "German" },
  { value: "fr-FR", label: "French" },
  { value: "es-ES", label: "Spanish" },
  { value: "pt-BR", label: "Portuguese" },
  { value: "fi-FI", label: "Finnish" }
];

export const THEME_OPTIONS = [
  { value: "main", label: "Main" },
  { value: "dark", label: "Dark" },
  { value: "bright", label: "Bright" },
  { value: "meadow", label: "Yellow-green" }
];

export const STYLE_OPTIONS = [
  { value: "main", label: "Main" },
  { value: "glass", label: "Frosted Glass" },
  { value: "minimal", label: "Minimalist" }
];

export function normalizeVoiceLanguage(value, fallback = defaultState.appearance.voiceLanguage) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return fallback;
  }

  if (/^en\b/i.test(normalized)) {
    return "en-US";
  }

  const match = VOICE_LANGUAGE_OPTIONS.find((option) => option.value.toLowerCase() === normalized.toLowerCase());
  return match?.value || fallback;
}
