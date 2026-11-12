/*
 * Flow - A high-performance teleprompter for Windows.
 * Copyright (C) 2026 Waled Alturkmani (LumoRez07)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

// Core math and time utilities
export {
  clamp,
  parseLocaleNumber,
  clampNumber,
  wait,
  estimateMinutes
} from "./core/utils.js";

// Core configuration and constants
export {
  defaultState,
  LANGUAGE_OPTIONS,
  VOICE_LANGUAGE_OPTIONS,
  THEME_OPTIONS,
  STYLE_OPTIONS,
  normalizeVoiceLanguage
} from "./core/config.js";

// Core sanitizers and normalizers
export {
  createDefaults,
  normalizeState,
  mergeState,
  normalizeColor,
  normalizeOpacity,
  normalizeAppOpacity,
  normalizeTextScale,
  normalizeScrollStartDelaySeconds,
  normalizeSpeed,
  normalizeTheme,
  normalizeStyle,
  getThemeTeleprompterTextColor,
  normalizeTeleprompterTextColor,
  normalizeLanguage,
  normalizeRemoteCredential,
  normalizeRemoteHost,
  normalizeRemoteProvider,
  normalizeDesktopSettings,
  normalizeWindowSettings,
  generateRemoteId,
  generateRemoteSecret,
  generateRemoteAccessPassword,
  resolveLanguageSystemFontStack,
  normalizeCornerRadius,
  normalizeCardRadius,
  normalizeBorderWidth,
  normalizeBorderOpacity,
  normalizeGlassBlur,
  normalizeCustomColor
} from "./core/normalizers.js";

// Core persistence and state management
export {
  initializePersistentStorage,
  loadState,
  saveState
} from "./core/state.js";

// Internationalization and translations
export {
  getLanguageDirection,
  translate,
  parseWaitCardText,
  applyTranslationsToDocument
} from "./core/i18n.js";

// Document and file importers
export {
  PDF_TEXT_TYPES,
  DOCX_TEXT_TYPES,
  DIRECT_TEXT_EXTENSIONS,
  getFileExtension,
  getFileNameFromPath,
  mimeTypeFromFileName,
  classifyImportFile,
  loadPdfModule,
  loadMammothModule,
  detectTextEncoding,
  decodeTextBytes,
  extractPdfText,
  extractDocxText,
  extractImportedText,
  readImportedText
} from "./core/file-parser.js";

// Teleprompter script markup and tokenizer
export {
  stripFormattingMarkers,
  parseCardDescriptor,
  detectTextDirection,
  applyTextDirection,
  parseFormattedScript,
  splitWords,
  extractScriptSections
} from "./core/script-parser.js";

// UI themes and appearance
export {
  applyThemeToDocument,
  applyAppearanceToDocument
} from "./ui/theme.js";

// UI window lifecycle and animations
export {
  DESKTOP_WINDOW_FADE_MS,
  scheduleAnimationFrame,
  waitForMs,
  revealDesktopWindow,
  initializeDesktopWindowOpacityFade,
  fadeOutDesktopWindow,
  invokeAfterDesktopFadeOut
} from "./ui/window.js";

// Custom smooth scrollbar
export {
  initializeSmoothScrollbox
} from "./ui/scrollbox.js";

// Disable default browser context menu (inspect element, reload)
if (typeof window !== "undefined") {
  window.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });
}
