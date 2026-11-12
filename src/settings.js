/*
 * Flow - A high-performance teleprompter for Windows.
 * Copyright (C) 2026 Waled Alturkmani (LumoRez07)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import {
  updaterState,
  setUpdaterDelegate,
  getUpdaterCheckAvailable,
  getUpdaterInstallAvailable,
  resolveMicrosoftStoreBuild,
  checkForAppUpdates,
  installAvailableUpdate,
  ensureCurrentAppVersion,
  isMicrosoftStoreBuild
} from "./services/updater.js";
import {
  applyAppearanceToDocument,
  applyTranslationsToDocument,
  clampNumber,
  defaultState,
  getThemeTeleprompterTextColor,
  initializePersistentStorage,
  initializeDesktopWindowOpacityFade,
  initializeSmoothScrollbox,
  invokeAfterDesktopFadeOut,
  loadState,
  parseLocaleNumber,
  normalizeCustomColor,
  saveState,
  translate
} from "./shared.js";
import { getProModule } from "./core/pro-loader.js";
import { openAnimatedMenu as showMenu, closeAnimatedMenu as hideMenu } from "./ui/animated-menu.js";
import {
  MIN_WIDTH,
  MIN_HEIGHT,
  COLLAPSED_HEIGHT,
  SIDE_PANEL_WINDOW_GUTTER,
  MAX_WIDTH_FALLBACK,
  MAX_HEIGHT_FALLBACK,
  TOP_CENTER_X_OFFSET
} from "./teleprompter/layout.js";

await initializePersistentStorage();

const POSITION_PADDING = 600;
const APPLY_DELAY = 120;
const WINDOW_SIZE_PREVIEW_CLASS = "window-size-preview-active";
const WINDOW_SIZE_PREVIEW_RELEASE_DELAY = 140;
const WINDOW_LOCATION_PREVIEW_RELEASE_DELAY = 500;
const tauriCore = window.__TAURI__?.core;
const invoke = tauriCore?.invoke;
const tauriApp = window.__TAURI__?.app;
const tauriWindow = window.__TAURI__?.window;
const tauriDpi = window.__TAURI__?.dpi;
const tauriEvent = window.__TAURI__?.event;


const state = loadState();
state.window = state.window || structuredClone(defaultState.window);
state.desktop = state.desktop || structuredClone(defaultState.desktop);

const ui = {
  xInput: document.querySelector("#xInput"),
  xValue: document.querySelector("#xValue"),
  yInput: document.querySelector("#yInput"),
  yValue: document.querySelector("#yValue"),
  widthInput: document.querySelector("#widthInput"),
  widthValue: document.querySelector("#widthValue"),
  heightInput: document.querySelector("#heightInput"),
  heightValue: document.querySelector("#heightValue"),
  presetPicker: document.querySelector("#presetPicker"),
  presetSelect: document.querySelector("#presetSelect"),
  presetTrigger: document.querySelector("#presetTrigger"),
  presetTriggerLabel: document.querySelector("#presetTriggerLabel"),
  presetTriggerPreview: document.querySelector("#presetTriggerPreview"),
  presetMenu: document.querySelector("#presetMenu"),
  languageSelect: document.querySelector("#languageSelect"),
  languagePicker: document.querySelector("#languagePicker"),
  languageTrigger: document.querySelector("#languageTrigger"),
  languageTriggerFlag: document.querySelector("#languageTriggerFlag"),
  languageTriggerLabel: document.querySelector("#languageTriggerLabel"),
  languageMenu: document.querySelector("#languageMenu"),
  languageOptions: document.querySelectorAll(".language-option"),
  appOpacityInput: document.querySelector("#appOpacityInput"),
  appOpacityValue: document.querySelector("#appOpacityValue"),
  textSizeInput: document.querySelector("#textSizeInput"),
  textSizeValue: document.querySelector("#textSizeValue"),
  mirrorModeInput: document.querySelector("#mirrorModeInput"),
  mirrorVerticalInput: document.querySelector("#mirrorVerticalInput"),
  autoHideToolbarInput: document.querySelector("#autoHideToolbarInput"),
  styleSelect: document.querySelector("#styleSelect"),
  themeSelect: document.querySelector("#themeSelect"),
  performanceModeInput: document.querySelector("#performanceModeInput"),
  hideFromCaptureInput: document.querySelector("#hideFromCaptureInput"),
  captureProtectionStatus: document.querySelector("#captureProtectionStatus"),
  useSystemTrayInput: document.querySelector("#useSystemTrayInput"),
  preventSleepInput: document.querySelector("#preventSleepInput"),
  clickthroughShortcutInput: document.querySelector("#clickthroughShortcutInput"),
  textColorInput: document.querySelector("#textColorInput"),
  textOpacityInput: document.querySelector("#textOpacityInput"),
  textOpacityValue: document.querySelector("#textOpacityValue"),
  settingsSectionPicker: document.querySelector("#settingsSectionPicker"),
  settingsSectionSelect: document.querySelector("#settingsSectionSelect"),
  settingsSectionTrigger: document.querySelector("#settingsSectionTrigger"),
  settingsSectionTriggerLabel: document.querySelector("#settingsSectionTriggerLabel"),
  settingsSectionTriggerPreview: document.querySelector("#settingsSectionTriggerPreview"),
  settingsSectionMenu: document.querySelector("#settingsSectionMenu"),
  settingsUpdatesOption: document.querySelector('#settingsSectionSelect option[value="updates"]'),
  stylePicker: document.querySelector("#stylePicker"),
  styleTrigger: document.querySelector("#styleTrigger"),
  styleTriggerLabel: document.querySelector("#styleTriggerLabel"),
  styleTriggerPreview: document.querySelector("#styleTriggerPreview"),
  styleMenu: document.querySelector("#styleMenu"),
  themePicker: document.querySelector("#themePicker"),
  themeTrigger: document.querySelector("#themeTrigger"),
  themeTriggerLabel: document.querySelector("#themeTriggerLabel"),
  themeTriggerPreview: document.querySelector("#themeTriggerPreview"),
  themeMenu: document.querySelector("#themeMenu"),
  settingsSections: document.querySelectorAll("[data-settings-section]"),
  updatesSection: document.querySelector('[data-settings-section="updates"]'),
  showScriptManagerInput: document.querySelector("#showScriptManagerInput"),
  showScriptCompletionInput: document.querySelector("#showScriptCompletionInput"),
  windowStatus: document.querySelector("#windowStatus"),
  updaterCurrentVersion: document.querySelector("#updaterCurrentVersion"),
  updaterAvailableVersion: document.querySelector("#updaterAvailableVersion"),
  updaterPublishedAt: document.querySelector("#updaterPublishedAt"),
  updaterStatusBadge: document.querySelector("#updaterStatusBadge"),
  updaterStatusText: document.querySelector("#updaterStatusText"),
  updaterProgress: document.querySelector("#updaterProgress"),
  updaterProgressFill: document.querySelector("#updaterProgressFill"),
  updaterProgressLabel: document.querySelector("#updaterProgressLabel"),
  updaterProgressStats: document.querySelector("#updaterProgressStats"),
  updaterReleaseNotes: document.querySelector("#updaterReleaseNotes"),
  updaterCheckButton: document.querySelector("#updaterCheckButton"),
  closeWindowButton: document.querySelector("#closeWindowButton"),
  openTextButton: document.querySelector("#openTextButton"),
  cornerRadiusInput: document.querySelector("#cornerRadiusInput"),
  cornerRadiusValue: document.querySelector("#cornerRadiusValue"),
  cardRadiusInput: document.querySelector("#cardRadiusInput"),
  cardRadiusValue: document.querySelector("#cardRadiusValue"),
  borderWidthInput: document.querySelector("#borderWidthInput"),
  borderWidthValue: document.querySelector("#borderWidthValue"),
  borderOpacityInput: document.querySelector("#borderOpacityInput"),
  borderOpacityValue: document.querySelector("#borderOpacityValue"),
  glassBlurInput: document.querySelector("#glassBlurInput"),
  glassBlurValue: document.querySelector("#glassBlurValue"),
  companionOpacityInput: document.querySelector("#companionOpacityInput"),
  companionOpacityValue: document.querySelector("#companionOpacityValue"),
  customAccentColorInput: document.querySelector("#customAccentColorInput"),
  customAccentColorHex: document.querySelector("#customAccentColorHex"),
  customHighlightColorInput: document.querySelector("#customHighlightColorInput"),
  resetStylingButton: document.querySelector("#resetStylingButton"),
  resetCornerRadiusBtn: document.querySelector("#resetCornerRadiusBtn"),
  resetCardRadiusBtn: document.querySelector("#resetCardRadiusBtn"),
  resetBorderWidthBtn: document.querySelector("#resetBorderWidthBtn"),
  resetBorderOpacityBtn: document.querySelector("#resetBorderOpacityBtn"),
  resetGlassBlurBtn: document.querySelector("#resetGlassBlurBtn"),
  resetCompanionOpacityBtn: document.querySelector("#resetCompanionOpacityBtn"),
  resetCustomAccentBtn: document.querySelector("#resetCustomAccentBtn"),
  resetCustomHighlightBtn: document.querySelector("#resetCustomHighlightBtn")
};

let applyTimer = null;
let isSyncingForm = false;
let isApplying = false;
let windowSizePreviewReleaseTimer = 0;
const customSettingsSelectControllers = [];
const RTL_TEXT_PATTERN = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
const SETTINGS_SECTION_CHOICE_METADATA = {
  appearance: { icon: "ph-palette", accent: "appearance" },
  "advanced-styling": { icon: "ph-paint-brush-broad", accent: "advanced-styling" },
  positioning: { icon: "ph-app-window", accent: "positioning" },
  usability: { icon: "ph-keyboard", accent: "usability" },
  privacy: { icon: "ph-shield-check", accent: "privacy" },
  updates: { icon: "ph-cloud-arrow-down", accent: "updates" }
};
const WINDOW_PRESET_CHOICE_METADATA = {
  "top-center": { icon: "ph-arrow-line-up", accent: "window" },
  center: { icon: "ph-frame-corners", accent: "window" },
  custom: { icon: "ph-sliders-horizontal", accent: "window" },
  drag: { icon: "ph-arrows-out-cardinal", accent: "window" }
};




function getChoiceTextDirection(text, fallback = document.body?.dataset.uiDirection || "ltr") {
  const normalizedText = String(text || "").trim();
  if (!normalizedText) {
    return fallback;
  }

  return fallback;
}

function setChoiceTextContent(element, text, dir = getChoiceTextDirection(text)) {
  if (!element) {
    return;
  }

  const normalizedText = String(text || "").trim();
  element.textContent = "";
  element.dir = dir;

  if (!normalizedText) {
    return;
  }

  const ticker = document.createElement("span");
  ticker.className = "choice-ticker";
  ticker.dir = dir;

  const tickerText = document.createElement("span");
  tickerText.className = "choice-ticker-text";
  tickerText.textContent = normalizedText;

  ticker.append(tickerText);
  element.append(ticker);
}

function refreshChoiceTickerOverflow(root) {
  if (!root) {
    return;
  }

  root.querySelectorAll(".choice-ticker").forEach((ticker) => {
    const tickerText = ticker.querySelector(".choice-ticker-text");
    if (!tickerText) {
      return;
    }

    const overflowDistance = Math.max(Math.ceil(tickerText.scrollWidth - ticker.clientWidth), 0);
    const hasOverflow = overflowDistance > 10;
    ticker.classList.toggle("is-overflowing", hasOverflow);

    if (!hasOverflow) {
      ticker.style.removeProperty("--choice-overflow-distance");
      ticker.style.removeProperty("--choice-overflow-duration");
      return;
    }

    ticker.style.setProperty("--choice-overflow-distance", `${overflowDistance}px`);
    ticker.style.setProperty("--choice-overflow-duration", `${Math.min(Math.max(overflowDistance / 28 + 4.2, 5.2), 11)}s`);
  });
}

function queueChoiceTickerOverflowRefresh(...roots) {
  requestAnimationFrame(() => {
    roots.forEach((root) => refreshChoiceTickerOverflow(root));
  });
}

function createChoiceLeadingElement(leading) {
  if (!leading?.kind) {
    return null;
  }

  if (leading.kind === "flag") {
    const flag = document.createElement("span");
    flag.className = "language-flag choice-leading";
    flag.dataset.flag = leading.flag;
    flag.setAttribute("aria-hidden", "true");
    flag.dataset.choiceLeading = "true";
    return flag;
  }

  const shell = document.createElement("span");
  shell.className = "choice-leading";
  shell.setAttribute("aria-hidden", "true");
  shell.dataset.choiceLeading = "true";

  if (leading.kind === "icon") {
    shell.classList.add("choice-leading-icon");
    shell.dataset.accent = leading.accent || "default";
    const icon = document.createElement("i");
    icon.className = `ph ${leading.icon || "ph-circle"}`;
    shell.append(icon);
    return shell;
  }

  if (leading.kind === "theme") {
    shell.classList.add("choice-swatch");
    shell.dataset.themeValue = leading.theme || "main";
    return shell;
  }

  if (leading.kind === "status") {
    shell.classList.add("choice-status-dot");
    shell.dataset.state = leading.state || "idle";
    const icon = document.createElement("i");
    icon.className = `ph ${leading.icon || "ph-waveform"}`;
    shell.append(icon);
    return shell;
  }

  return null;
}

function replaceChoiceLeading(host, leading) {
  if (!host) {
    return;
  }

  host.querySelectorAll('[data-choice-leading="true"]').forEach((node) => node.remove());
  const leadingElement = createChoiceLeadingElement(leading);
  if (leadingElement) {
    host.prepend(leadingElement);
  }
}

function t(key, params = {}) {
  return translate(key, state.language, params);
}

function getSpeedRailWindowGutter() {
  return 0;
}

function getSidePanelWindowGutter() {
  return 0;
}

function getBottomDockWindowGutter() {
  return state.modules?.scriptManager !== false ? 40 : 0;
}

function getWindowPositionOffset(gutterWidth = getSpeedRailWindowGutter()) {
  return -gutterWidth;
}

function formatPublishedDate(value) {
  if (!value) {
    return t("settings.updaterNoDate");
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  try {
    return new Intl.DateTimeFormat(state.language, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  } catch (_error) {
    return date.toLocaleString();
  }
}


async function syncUpdatesSettingsVisibility() {
  await resolveMicrosoftStoreBuild();
  const hideUpdates = !getUpdaterCheckAvailable();

  if (ui.settingsUpdatesOption) {
    ui.settingsUpdatesOption.hidden = hideUpdates;
    ui.settingsUpdatesOption.disabled = hideUpdates;
  }

  if (hideUpdates && ui.settingsSectionSelect?.value === "updates") {
    ui.settingsSectionSelect.value = "appearance";
  }
}

function setUpdaterProgress(progress = null) {
  if (!ui.updaterProgress) {
    return;
  }

  if (!progress) {
    ui.updaterProgress.classList.add("hidden");
    ui.updaterProgressFill.style.width = "0%";
    ui.updaterProgressLabel.textContent = "0%";
    ui.updaterProgressStats.textContent = t("settings.updaterProgressIdle");
    return;
  }

  const totalBytes = Math.max(Number(progress.totalBytes) || 0, 0);
  const downloadedBytes = Math.max(Number(progress.downloadedBytes) || 0, 0);
  const ratio = totalBytes > 0 ? Math.min(downloadedBytes / totalBytes, 1) : 0;
  const percent = totalBytes > 0 ? Math.round(ratio * 100) : 0;

  ui.updaterProgress.classList.remove("hidden");
  ui.updaterProgressFill.style.width = `${percent}%`;
  ui.updaterProgressLabel.textContent = totalBytes > 0 ? `${percent}%` : formatMegabytes(downloadedBytes);
  ui.updaterProgressStats.textContent = t("settings.updaterProgressStats", {
    downloaded: formatMegabytes(downloadedBytes),
    total: totalBytes > 0 ? formatMegabytes(totalBytes) : t("common.unavailable")
  });
}

function renderUpdaterCard() {
  if (!ui.updaterCurrentVersion) {
    return;
  }

  const update = updaterState.update;
  const publishedVersion = String(update?.version || updaterState.publishedVersion || "").trim();
  const publishedAt = String(update?.date || update?.pub_date || updaterState.publishedAt || "").trim();
  const publishedNotes = String(update?.body || updaterState.publishedNotes || "").trim();
  const hasUpdate = Boolean(update?.version);
  const hasPublishedVersion = Boolean(publishedVersion);
  const canCheckUpdater = getUpdaterCheckAvailable();
  const canInstallUpdater = getUpdaterInstallAvailable();

  ui.updaterCurrentVersion.textContent = updaterState.currentVersion || t("common.unavailable");
  ui.updaterAvailableVersion.textContent = hasPublishedVersion
    ? publishedVersion
    : (updaterState.checking ? t("common.loading") : t("settings.updaterNotChecked"));
  ui.updaterPublishedAt.textContent = publishedAt
    ? formatPublishedDate(publishedAt)
    : t("settings.updaterNoDate");
  ui.updaterStatusBadge.dataset.i18n = updaterState.badgeKey;
  ui.updaterStatusBadge.textContent = t(updaterState.badgeKey);
  ui.updaterStatusBadge.classList.toggle("is-offline", [
    "settings.updaterStatusError",
    "settings.updaterStatusCurrent",
    "settings.updaterStatusUnavailable"
  ].includes(updaterState.badgeKey));
  ui.updaterStatusText.dataset.i18n = updaterState.messageKey;
  ui.updaterStatusText.textContent = t(updaterState.messageKey, updaterState.messageParams);
  ui.updaterReleaseNotes.textContent = publishedNotes || t("settings.updaterNoNotes");
  ui.updaterCheckButton.disabled = updaterState.checking || updaterState.installing || !canCheckUpdater || (hasUpdate && !canInstallUpdater);
  ui.updaterCheckButton.textContent = updaterState.installing
    ? t("settings.updaterInstallingAction")
    : (updaterState.checking
      ? t("settings.updaterCheckingAction")
      : (hasUpdate ? t("settings.updaterInstallAction") : t("settings.updaterCheckAction")));

  setUpdaterProgress(updaterState.progress);
}

let activeSettingsMenu = null;

function positionActiveSettingsMenu() {
  if (!activeSettingsMenu) return;
  const { menu, trigger, picker } = activeSettingsMenu;
  const page = picker.closest(".page-shell");
  const viewport = page?.getBoundingClientRect();
  const top = Math.max(0, viewport?.top ?? 0);
  const bottom = Math.min(window.innerHeight, viewport?.bottom ?? window.innerHeight);
  const anchor = trigger.getBoundingClientRect();
  if (anchor.bottom <= top || anchor.top >= bottom) {
    closeAnimatedMenu(menu, trigger, picker);
    return;
  }

  const clearance = 16;
  const above = Math.max(0, anchor.top - top - clearance);
  const below = Math.max(0, bottom - anchor.bottom - clearance);
  const limit = Number.parseFloat(getComputedStyle(menu).getPropertyValue("--settings-menu-limit"));
  const desiredHeight = Math.min(menu.scrollHeight + 2, limit);
  const opensUp = desiredHeight > below && above > below;
  menu.classList.toggle("settings-menu-opens-up", opensUp);
  menu.style.setProperty("--settings-menu-room", `${Math.floor(opensUp ? above : below)}px`);
}

function openAnimatedMenu(menu, trigger, picker) {
  showMenu(menu, trigger, picker);
  activeSettingsMenu = { menu, trigger, picker };
  positionActiveSettingsMenu();
}

function closeAnimatedMenu(menu, trigger, picker, selectedOption = null, onAfterClose = null) {
  if (activeSettingsMenu?.menu === menu) activeSettingsMenu = null;
  if (!menu.classList.contains("is-closing")) {
    hideMenu(menu, trigger, picker, selectedOption, onAfterClose);
  }
}

function closeLanguageMenu(selectedOption = null, onAfterClose = null) {
  closeAnimatedMenu(ui.languageMenu, ui.languageTrigger, ui.languagePicker, selectedOption, onAfterClose);
}

function openLanguageMenu() {
  openAnimatedMenu(ui.languageMenu, ui.languageTrigger, ui.languagePicker);
}

function renderLanguagePicker(selectedValue = ui.languageSelect.value, previewLanguage = state.language) {
  const activeLanguage = selectedValue || defaultState.language;
  ui.languageTriggerFlag.dataset.flag = activeLanguage;
  ui.languageTriggerLabel.textContent = translate(`language.${activeLanguage}`, previewLanguage);

  ui.languageOptions.forEach((option) => {
    const value = option.dataset.value;
    const selected = value === activeLanguage;
    option.setAttribute("aria-selected", selected ? "true" : "false");
    option.classList.toggle("is-selected", selected);
    option.querySelector("[data-language-label]").textContent = translate(`language.${value}`, previewLanguage);
  });
}

function getCustomSelectEntries(select) {
  const entries = [];

  Array.from(select.children).forEach((child) => {
    if (child instanceof HTMLOptGroupElement) {
      entries.push({ type: "group", label: child.label });
      Array.from(child.children).forEach((option) => {
        if (option instanceof HTMLOptionElement && !option.hidden) {
          entries.push({ type: "option", option, groupLabel: child.label });
        }
      });
      return;
    }

    if (child instanceof HTMLOptionElement && !child.hidden) {
      entries.push({ type: "option", option: child, groupLabel: "" });
    }
  });

  return entries;
}

function closeCustomSettingsSelect(controller, selectedOption = null, onAfterClose = null) {
  closeAnimatedMenu(controller.menu, controller.trigger, controller.picker, selectedOption, onAfterClose);
}

function openCustomSettingsSelect(controller) {
  if (controller.select.disabled) {
    return;
  }

  openAnimatedMenu(controller.menu, controller.trigger, controller.picker);
  queueChoiceTickerOverflowRefresh(controller.trigger, controller.menu);
}

function getCustomSettingsSelectDisplay(controller, option, { context = "option", groupLabel = "" } = {}) {
  const fallbackLabel = option?.textContent?.trim() || option?.value || "";
  const label = controller.getLabel
    ? controller.getLabel(option, { context, groupLabel })
    : fallbackLabel;
  const preview = context === "trigger"
    ? (controller.getPreview ? controller.getPreview(option) : "")
    : (controller.getOptionDescription ? controller.getOptionDescription(option, groupLabel) : "");

  return {
    label,
    preview,
    leading: controller.getLeading ? controller.getLeading(option, { context, groupLabel }) : null,
    labelDir: controller.getLabelDirection
      ? controller.getLabelDirection(option, { context, groupLabel, label })
      : getChoiceTextDirection(label),
    previewDir: controller.getPreviewDirection
      ? controller.getPreviewDirection(option, { context, groupLabel, preview })
      : getChoiceTextDirection(preview, getChoiceTextDirection(label))
  };
}

function renderCustomSettingsSelect(controller) {
  const selectedOption = controller.select.selectedOptions?.[0] || controller.select.options?.[0] || null;
  const triggerDisplay = getCustomSettingsSelectDisplay(controller, selectedOption, { context: "trigger" });

  replaceChoiceLeading(controller.trigger, triggerDisplay.leading);
  setChoiceTextContent(controller.label, triggerDisplay.label, triggerDisplay.labelDir);
  controller.trigger.title = triggerDisplay.label;
  controller.trigger.disabled = controller.select.disabled;
  controller.picker.classList.toggle("is-disabled", controller.select.disabled);
  if (controller.preview) {
    setChoiceTextContent(controller.preview, triggerDisplay.preview, triggerDisplay.previewDir);
    controller.preview.classList.toggle("hidden", !triggerDisplay.preview);
  }

  controller.menu.textContent = "";
  getCustomSelectEntries(controller.select).forEach((entry) => {
    if (entry.type === "group") {
      const groupLabel = document.createElement("div");
      groupLabel.className = "choice-group-label";
      groupLabel.textContent = entry.label;
      controller.menu.append(groupLabel);
      return;
    }

    const option = entry.option;
    const button = document.createElement("button");
    const selected = option.value === controller.select.value;
    const optionDisplay = getCustomSettingsSelectDisplay(controller, option, {
      context: "option",
      groupLabel: entry.groupLabel
    });
    button.type = "button";
    button.className = "choice-option";
    button.dataset.value = option.value;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", selected ? "true" : "false");
    button.classList.toggle("is-selected", selected);
    button.disabled = controller.select.disabled || option.disabled;
    button.title = optionDisplay.label;

    const copy = document.createElement("span");
    copy.className = "choice-option-copy";

    const title = document.createElement("span");
    title.className = "choice-option-title";
    setChoiceTextContent(title, optionDisplay.label, optionDisplay.labelDir);
    copy.append(title);

    if (optionDisplay.preview) {
      const description = document.createElement("span");
      description.className = "choice-option-sample";
      setChoiceTextContent(description, optionDisplay.preview, optionDisplay.previewDir);
      copy.append(description);
    }

    replaceChoiceLeading(button, optionDisplay.leading);
    button.append(copy);
    button.addEventListener("click", () => {
      controller.select.value = option.value;
      closeCustomSettingsSelect(controller, button, () => {
        renderCustomSettingsSelect(controller);
        controller.select.dispatchEvent(new Event("change", { bubbles: true }));
        controller.onSelect?.(option.value);
      });
    });
    controller.menu.append(button);
  });

  queueChoiceTickerOverflowRefresh(controller.trigger);
}

function initializeCustomSettingsSelects() {
  if (customSettingsSelectControllers.length > 0) {
    return;
  }

  [
    {
      picker: ui.settingsSectionPicker,
      select: ui.settingsSectionSelect,
      trigger: ui.settingsSectionTrigger,
      label: ui.settingsSectionTriggerLabel,
      preview: ui.settingsSectionTriggerPreview,
      menu: ui.settingsSectionMenu,
      getLeading: (option) => {
        const metadata = SETTINGS_SECTION_CHOICE_METADATA[option?.value] || SETTINGS_SECTION_CHOICE_METADATA.appearance;
        return {
          kind: "icon",
          icon: metadata.icon,
          accent: metadata.accent
        };
      }
    },
    {
      picker: ui.presetPicker,
      select: ui.presetSelect,
      trigger: ui.presetTrigger,
      label: ui.presetTriggerLabel,
      preview: ui.presetTriggerPreview,
      menu: ui.presetMenu,
      getLeading: (option) => {
        const metadata = WINDOW_PRESET_CHOICE_METADATA[option?.value] || WINDOW_PRESET_CHOICE_METADATA["top-center"];
        return {
          kind: "icon",
          icon: metadata.icon,
          accent: metadata.accent
        };
      }
    },
    {
      picker: ui.stylePicker,
      select: ui.styleSelect,
      trigger: ui.styleTrigger,
      label: ui.styleTriggerLabel,
      preview: ui.styleTriggerPreview,
      menu: ui.styleMenu
    },
    {
      picker: ui.themePicker,
      select: ui.themeSelect,
      trigger: ui.themeTrigger,
      label: ui.themeTriggerLabel,
      preview: ui.themeTriggerPreview,
      menu: ui.themeMenu,
      getLeading: (option) => ({
        kind: "theme",
        theme: option?.value || "main"
      })
    }
  ].forEach((controller) => {
    if (!controller.picker || !controller.select || !controller.trigger || !controller.label || !controller.menu) {
      return;
    }

    customSettingsSelectControllers.push(controller);
    controller.trigger.addEventListener("click", () => {
      if (controller.menu.classList.contains("hidden")) {
        customSettingsSelectControllers.forEach((entry) => {
          if (entry !== controller) {
            closeCustomSettingsSelect(entry);
          }
        });
        openCustomSettingsSelect(controller);
        return;
      }

      closeCustomSettingsSelect(controller);
    });
  });
}

function syncCustomSettingsSelects() {
  customSettingsSelectControllers.forEach((controller) => renderCustomSettingsSelect(controller));
}

function clampToInput(input, value) {
  const min = Number(input.min || Number.NEGATIVE_INFINITY);
  const max = Number(input.max || Number.POSITIVE_INFINITY);
  return Math.min(Math.max(value, min), max);
}

function syncSliderProgress(input) {
  if (!input) {
    return;
  }

  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const value = Number(input.value || min);
  const range = max - min;
  const progress = range > 0 ? ((value - min) / range) * 100 : 0;
  input.style.setProperty("--slider-progress", `${Math.max(0, Math.min(progress, 100))}%`);
}

function setSliderValue(input, value) {
  input.value = String(clampToInput(input, value));
  syncSliderProgress(input);
}

function setWindowSizePreviewActive(active) {
  if (windowSizePreviewReleaseTimer) {
    window.clearTimeout(windowSizePreviewReleaseTimer);
    windowSizePreviewReleaseTimer = 0;
  }

  document.body?.classList.toggle(WINDOW_SIZE_PREVIEW_CLASS, Boolean(active));
}

function scheduleWindowSizePreviewClear(delay = WINDOW_SIZE_PREVIEW_RELEASE_DELAY) {
  if (windowSizePreviewReleaseTimer) {
    window.clearTimeout(windowSizePreviewReleaseTimer);
  }

  windowSizePreviewReleaseTimer = window.setTimeout(() => {
    windowSizePreviewReleaseTimer = 0;
    setWindowSizePreviewActive(false);
  }, delay);
}

function initializeWindowSizePreview(inputs) {
  const sliderInputs = inputs.filter(Boolean);
  if (!sliderInputs.length) {
    return;
  }

  const armPreview = () => {
    setWindowSizePreviewActive(true);
  };

  const clearPreview = () => {
    setWindowSizePreviewActive(false);
  };

  const scheduleClearPreview = () => {
    scheduleWindowSizePreviewClear();
  };

  sliderInputs.forEach((input) => {
    input.addEventListener("pointerdown", armPreview);
    input.addEventListener("focus", armPreview);
    input.addEventListener("input", armPreview);
    input.addEventListener("pointerup", scheduleClearPreview);
    input.addEventListener("pointercancel", scheduleClearPreview);
    input.addEventListener("change", scheduleClearPreview);
    input.addEventListener("blur", scheduleClearPreview);
  });

  window.addEventListener("pointerup", scheduleClearPreview);
  window.addEventListener("pointercancel", scheduleClearPreview);
  window.addEventListener("blur", clearPreview);
}

function initializeWindowLocationPreview(input) {
  if (!input) {
    return;
  }

  const previewLocationChange = () => {
    setWindowSizePreviewActive(true);
    scheduleWindowSizePreviewClear(WINDOW_LOCATION_PREVIEW_RELEASE_DELAY);
  };

  input.addEventListener("input", previewLocationChange);
  input.addEventListener("change", previewLocationChange);
}

function updateValueLabels() {
  ui.xValue.textContent = `${ui.xInput.value} px`;
  ui.yValue.textContent = `${ui.yInput.value} px`;
  ui.widthValue.textContent = `${ui.widthInput.value} px`;
  ui.heightValue.textContent = `${ui.heightInput.value} px`;
  ui.appOpacityValue.textContent = `${ui.appOpacityInput.value}%`;
  ui.textSizeValue.textContent = `${ui.textSizeInput.value}%`;
  ui.textOpacityValue.textContent = `${ui.textOpacityInput.value}%`;

  if (ui.cornerRadiusValue && ui.cornerRadiusInput) {
    ui.cornerRadiusValue.textContent = `${ui.cornerRadiusInput.value} px`;
  }
  if (ui.cardRadiusValue && ui.cardRadiusInput) {
    ui.cardRadiusValue.textContent = `${ui.cardRadiusInput.value} px`;
  }
  if (ui.borderWidthValue && ui.borderWidthInput) {
    ui.borderWidthValue.textContent = `${ui.borderWidthInput.value} px`;
  }
  if (ui.borderOpacityValue && ui.borderOpacityInput) {
    ui.borderOpacityValue.textContent = `${ui.borderOpacityInput.value}%`;
  }
  if (ui.glassBlurValue && ui.glassBlurInput) {
    ui.glassBlurValue.textContent = `${ui.glassBlurInput.value} px`;
  }
  if (ui.companionOpacityValue && ui.companionOpacityInput) {
    ui.companionOpacityValue.textContent = `${ui.companionOpacityInput.value}%`;
  }
}

function updatePositioningAvailability() {
  const disabled = ui.presetSelect.value !== "custom";
  ui.xInput.disabled = disabled;
  ui.yInput.disabled = disabled;
}

function setActiveSettingsSection(section = ui.settingsSectionSelect?.value || "appearance") {
  try {
    const requestedSection = String(section || "appearance");
    const activeSection = isMicrosoftStoreBuild && requestedSection === "updates"
      ? "appearance"
      : requestedSection;

    if (ui.settingsSectionSelect) {
      ui.settingsSectionSelect.value = activeSection;
    }

    syncCustomSettingsSelects();

    ui.settingsSections.forEach((element) => {
      const selected = element.dataset.settingsSection === activeSection
        && !(isMicrosoftStoreBuild && element.dataset.settingsSection === "updates");
      element.classList.toggle("hidden", !selected);
      element.setAttribute("aria-hidden", selected ? "false" : "true");
    });


    if (activeSection === "updates") {
      checkForAppUpdates({ silentNoUpdate: true }).catch((error) => console.warn("App update check skipped", error));
    }

    document.querySelector(".page-shell")?.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    console.error("Failed to switch settings section", error);
  }
}



async function getMainWindow() {
  if (!tauriWindow?.getAllWindows) return null;
  const windows = await tauriWindow.getAllWindows();
  return windows.find((windowRef) => windowRef.label === "main") || windows[0] || null;
}

async function isMainWindowCollapsed(appWindow) {
  if (!appWindow?.outerSize) {
    return false;
  }

  try {
    const scaleFactor = normalizeScaleFactor(await appWindow.scaleFactor?.().catch(() => 1));
    const size = physicalSizeToLogical(await appWindow.outerSize(), scaleFactor);
    return Number(size?.height) > 0 && Number(size.height) <= COLLAPSED_HEIGHT + 8;
  } catch (error) {
    console.error(error);
    return false;
  }
}

async function getRelevantMonitor() {
  if (!tauriWindow?.currentMonitor && !tauriWindow?.primaryMonitor) {
    return null;
  }

  return (await tauriWindow.currentMonitor?.()) ?? (await tauriWindow.primaryMonitor?.()) ?? null;
}

function normalizeScaleFactor(scaleFactor) {
  const numericScaleFactor = Number(scaleFactor);
  return Number.isFinite(numericScaleFactor) && numericScaleFactor > 0 ? numericScaleFactor : 1;
}

function physicalSizeToLogical(size, scaleFactor) {
  if (!size) {
    return { width: 0, height: 0 };
  }

  if (typeof size.toLogical === "function") {
    return size.toLogical(scaleFactor);
  }

  return {
    width: Number(size.width || 0) / scaleFactor,
    height: Number(size.height || 0) / scaleFactor
  };
}

function logicalValueToPhysical(value, scaleFactor) {
  return Math.round((Number(value) || 0) * scaleFactor);
}

function getMonitorLogicalSize(monitor) {
  return physicalSizeToLogical(monitor?.size, normalizeScaleFactor(monitor?.scaleFactor));
}

async function configureSliderRanges() {
  const allMonitors = await tauriWindow?.availableMonitors?.().catch(() => []) || [];
  const monitor = await getRelevantMonitor();
  const scaleFactor = normalizeScaleFactor(monitor?.scaleFactor ?? 1);
  const baseWidth = Math.max(state.window?.width || defaultState.window.width, MIN_WIDTH);
  const baseHeight = Math.max(state.window?.height || defaultState.window.height, MIN_HEIGHT);
  const baseWidthPhysical = logicalValueToPhysical(baseWidth, scaleFactor);
  const baseHeightPhysical = logicalValueToPhysical(baseHeight, scaleFactor);

  let minX = 0;
  let maxX = 1920 - baseWidthPhysical;
  let minY = 0;
  let maxY = 1080 - baseHeightPhysical;

  if (allMonitors.length > 0) {
    minX = Math.min(...allMonitors.map((m) => m.position?.x ?? 0));
    maxX = Math.max(...allMonitors.map((m) => (m.position?.x ?? 0) + Math.max((m.size?.width ?? 1920) - baseWidthPhysical, 0)));
    minY = Math.min(...allMonitors.map((m) => m.position?.y ?? 0));
    maxY = Math.max(...allMonitors.map((m) => (m.position?.y ?? 0) + Math.max((m.size?.height ?? 1080) - baseHeightPhysical, 0)));
  } else if (monitor) {
    const originX = monitor.position?.x ?? 0;
    const originY = monitor.position?.y ?? 0;
    const monitorWidth = monitor.size?.width ?? 1920;
    const monitorHeight = monitor.size?.height ?? 1080;
    minX = originX;
    maxX = originX + Math.max(monitorWidth - baseWidthPhysical, 0);
    minY = originY;
    maxY = originY + Math.max(monitorHeight - baseHeightPhysical, 0);
  }

  ui.xInput.min = String(minX);
  ui.xInput.max = String(Math.max(maxX, minX));
  ui.yInput.min = String(minY);
  ui.yInput.max = String(Math.max(maxY, minY));

  const logicalMonitorSize = getMonitorLogicalSize(monitor);
  const gutterWidth = getSpeedRailWindowGutter();
  const sideGutter = getSidePanelWindowGutter();
  const totalGutters = gutterWidth + sideGutter;
  ui.widthInput.max = String(Math.max(Math.min((logicalMonitorSize.width || 1920) - totalGutters, MAX_WIDTH_FALLBACK - totalGutters), MIN_WIDTH));
  ui.heightInput.max = String(Math.max(logicalMonitorSize.height || 1080, MAX_HEIGHT_FALLBACK));
}

function fillForm() {
  isSyncingForm = true;
  setSliderValue(ui.xInput, state.window.x ?? 0);
  setSliderValue(ui.yInput, state.window.y ?? 0);
  setSliderValue(ui.widthInput, state.window.width);
  setSliderValue(ui.heightInput, state.window.height);
  ui.presetSelect.value = state.window.preset || "top-center";
  ui.languageSelect.value = state.language || defaultState.language;
  setSliderValue(ui.appOpacityInput, state.appearance?.appOpacity ?? defaultState.appearance.appOpacity);
  ui.textSizeInput.value = String(state.appearance?.textScale || defaultState.appearance.textScale);
  ui.styleSelect.value = state.appearance?.style || defaultState.appearance.style;
  ui.themeSelect.value = state.appearance?.theme || defaultState.appearance.theme;
  ui.mirrorModeInput.checked = Boolean(state.appearance?.mirrorMode);
  ui.mirrorVerticalInput.checked = Boolean(state.appearance?.mirrorVertical);
  ui.autoHideToolbarInput.checked = Boolean(state.appearance?.autoHideToolbar);
  
  
  ui.performanceModeInput.checked = Boolean(state.appearance?.performanceMode);
  ui.hideFromCaptureInput.checked = Boolean(state.desktop?.hideFromCapture);
  ui.useSystemTrayInput.checked = Boolean(state.desktop?.useSystemTray);
  ui.preventSleepInput.checked = Boolean(state.desktop?.preventSleep);
  ui.clickthroughShortcutInput.checked = Boolean(state.desktop?.clickthroughShortcutEnabled);
  if (ui.showScriptManagerInput) ui.showScriptManagerInput.checked = Boolean(state.modules?.scriptManager);
  if (ui.showScriptCompletionInput) ui.showScriptCompletionInput.checked = Boolean(state.modules?.scriptCompletion);
  ui.textColorInput.value = state.appearance?.textColor || getThemeTeleprompterTextColor(ui.themeSelect.value);
  ui.textOpacityInput.value = String(state.appearance?.textOpacity || defaultState.appearance.textOpacity);

  if (ui.cornerRadiusInput) setSliderValue(ui.cornerRadiusInput, state.appearance?.cornerRadius ?? defaultState.appearance.cornerRadius);
  if (ui.cardRadiusInput) setSliderValue(ui.cardRadiusInput, state.appearance?.cardRadius ?? defaultState.appearance.cardRadius);
  if (ui.borderWidthInput) setSliderValue(ui.borderWidthInput, state.appearance?.borderWidth ?? defaultState.appearance.borderWidth);
  if (ui.borderOpacityInput) setSliderValue(ui.borderOpacityInput, state.appearance?.borderOpacity ?? defaultState.appearance.borderOpacity);
  if (ui.glassBlurInput) setSliderValue(ui.glassBlurInput, state.appearance?.glassBlur ?? defaultState.appearance.glassBlur);
  if (ui.companionOpacityInput) setSliderValue(ui.companionOpacityInput, state.appearance?.companionOpacity ?? defaultState.appearance.companionOpacity);

  if (ui.customAccentColorInput) {
    ui.customAccentColorInput.value = state.appearance?.customAccentColor || "#818cf8";
  }
  if (ui.customAccentColorHex) {
    ui.customAccentColorHex.value = state.appearance?.customAccentColor || "";
  }
  if (ui.customHighlightColorInput) {
    ui.customHighlightColorInput.value = state.appearance?.customHighlightColor || "#facc15";
  }
  if (ui.customHighlightColorHex) {
    ui.customHighlightColorHex.value = state.appearance?.customHighlightColor || "";
  }

  updatePositioningAvailability();
  updateValueLabels();
  applyAppearanceToDocument(state.appearance || {
    theme: ui.themeSelect.value,
    style: ui.styleSelect.value,
    mirrorMode: ui.mirrorModeInput.checked,
    mirrorVertical: ui.mirrorVerticalInput.checked,
    autoHideToolbar: ui.autoHideToolbarInput.checked,
    performanceMode: ui.performanceModeInput.checked,
    appOpacity: parseLocaleNumber(ui.appOpacityInput.value)
  });
  applyTranslationsToDocument(ui.languageSelect.value);
  renderLanguagePicker(ui.languageSelect.value, ui.languageSelect.value);
  syncCustomSettingsSelects();
  renderUpdaterCard();
  isSyncingForm = false;
}

async function readCurrentWindow() {
  const appWindow = await getMainWindow();
  if (!appWindow) return;

  const scaleFactor = normalizeScaleFactor(await appWindow.scaleFactor?.().catch(() => 1));
  const pos = await appWindow.outerPosition?.().catch?.(() => null);

  if (pos && typeof pos.x === "number" && typeof pos.y === "number") {
    const gutterWidth = getSpeedRailWindowGutter();
    const gutterWidthPhysical = logicalValueToPhysical(gutterWidth, scaleFactor);
    const topCenterOffsetPhysical = logicalValueToPhysical(TOP_CENTER_X_OFFSET, scaleFactor);
    const positionOffset = state.window?.preset === "top-center"
      ? topCenterOffsetPhysical - gutterWidthPhysical
      : -gutterWidthPhysical;
    state.window.x = pos.x - positionOffset;
    state.window.y = pos.y;
  }

  await configureSliderRanges();
  fillForm();
  ui.windowStatus.textContent = t("settings.synced");
}

function collectFormState() {
  state.window.width = Math.max(parseLocaleNumber(ui.widthInput.value) || defaultState.window.width, MIN_WIDTH);
  state.window.height = Math.max(parseLocaleNumber(ui.heightInput.value) || defaultState.window.height, MIN_HEIGHT);
  state.window.x = parseLocaleNumber(ui.xInput.value || 0);
  state.window.y = parseLocaleNumber(ui.yInput.value || 0);
  state.window.preset = ui.presetSelect.value;
  state.language = ui.languageSelect.value;
  state.desktop = {
    hideFromCapture: ui.hideFromCaptureInput.checked,
    captureProtectionConfigured: true,
    useSystemTray: ui.useSystemTrayInput.checked,
    preventSleep: ui.preventSleepInput.checked,
    clickthroughShortcutEnabled: ui.clickthroughShortcutInput.checked
  };
  state.modules = {
    scriptManager: Boolean(ui.showScriptManagerInput?.checked),
    scriptCompletion: Boolean(ui.showScriptCompletionInput?.checked)
  };
  state.appearance = {
    ...defaultState.appearance,
    ...(state.appearance || {}),
    appOpacity: parseLocaleNumber(ui.appOpacityInput.value),
    textScale: parseLocaleNumber(ui.textSizeInput.value),
    theme: ui.themeSelect.value,
    style: ui.styleSelect.value,
    mirrorMode: ui.mirrorModeInput.checked,
    mirrorVertical: ui.mirrorVerticalInput.checked,
    autoHideToolbar: ui.autoHideToolbarInput.checked,
    performanceMode: ui.performanceModeInput.checked,
    textColor: ui.textColorInput.value || state.appearance?.textColor || getThemeTeleprompterTextColor(ui.themeSelect.value),
    textOpacity: parseLocaleNumber(ui.textOpacityInput.value),
    cornerRadius: parseLocaleNumber(ui.cornerRadiusInput?.value ?? defaultState.appearance.cornerRadius),
    cardRadius: parseLocaleNumber(ui.cardRadiusInput?.value ?? defaultState.appearance.cardRadius),
    borderWidth: parseLocaleNumber(ui.borderWidthInput?.value ?? defaultState.appearance.borderWidth),
    borderOpacity: parseLocaleNumber(ui.borderOpacityInput?.value ?? defaultState.appearance.borderOpacity),
    glassBlur: parseLocaleNumber(ui.glassBlurInput?.value ?? defaultState.appearance.glassBlur),
    companionOpacity: parseLocaleNumber(ui.companionOpacityInput?.value ?? defaultState.appearance.companionOpacity),
    customAccentColor: normalizeCustomColor(ui.customAccentColorHex?.value || ui.customAccentColorInput?.value || ""),
    customHighlightColor: normalizeCustomColor(ui.customHighlightColorHex?.value || ui.customHighlightColorInput?.value || "")
  };
}

async function applyDesktopSettings() {
  if (!invoke) {
    return;
  }

  await invoke("set_capture_protection", { enabled: Boolean(state.desktop?.hideFromCapture) });
  await invoke("set_system_tray_enabled", { enabled: Boolean(state.desktop?.useSystemTray) });
  await invoke("set_prevent_sleep", { enabled: Boolean(state.desktop?.preventSleep) });
  await invoke("set_clickthrough_shortcut_enabled", { enabled: Boolean(state.desktop?.clickthroughShortcutEnabled) });

  if (!state.desktop?.clickthroughShortcutEnabled) {
    await invoke("set_main_clickthrough", { enabled: false }).catch(console.error);
  }
}

async function applyWindowSettings() {
  if (isApplying) return;

  const appWindow = await getMainWindow();
  if (!appWindow || !tauriDpi) return;

  isApplying = true;

  try {
    collectFormState();
    await configureSliderRanges();
    const windowIsCollapsed = await isMainWindowCollapsed(appWindow);
    const gutterWidth = getSpeedRailWindowGutter();
    const sideGutter = getSidePanelWindowGutter();
    const totalGutters = gutterWidth + sideGutter;
    const monitor = await getRelevantMonitor();
    const scaleFactor = normalizeScaleFactor(await appWindow.scaleFactor?.().catch(() => monitor?.scaleFactor ?? 1));
    const gutterWidthPhysical = logicalValueToPhysical(gutterWidth, scaleFactor);
    const positionOffset = -gutterWidthPhysical;
    const baseWidth = Math.max(state.window.width, MIN_WIDTH);
    const baseWidthPhysical = logicalValueToPhysical(baseWidth, scaleFactor);
    const logicalMonitorSize = getMonitorLogicalSize(monitor);
    const maxContentWidth = Math.max(Math.min((logicalMonitorSize.width || (state.window.width + totalGutters)) - totalGutters, MAX_WIDTH_FALLBACK - totalGutters), MIN_WIDTH);
    state.window.width = Math.max(Math.min(state.window.width, maxContentWidth), MIN_WIDTH);
    state.window.height = Math.max(Math.min(state.window.height, logicalMonitorSize.height || MAX_HEIGHT_FALLBACK), MIN_HEIGHT);

    const bottomGutter = getBottomDockWindowGutter();
    const targetHeight = state.window.height + bottomGutter;

    if (!windowIsCollapsed) {
      const targetLogicalSize = new tauriDpi.LogicalSize(state.window.width + totalGutters, targetHeight);
      const targetPhysicalSize = targetLogicalSize.toPhysical(scaleFactor);
      await appWindow.setSize(targetLogicalSize);

      if (state.window.preset === "center" && tauriWindow.currentMonitor && tauriWindow.primaryMonitor) {
        const monitor = (await tauriWindow.currentMonitor()) ?? (await tauriWindow.primaryMonitor());
        if (monitor) {
          const x = monitor.position.x + Math.round((monitor.size.width - baseWidthPhysical) / 2) - gutterWidthPhysical;
          const y = monitor.position.y + Math.round((monitor.size.height - targetPhysicalSize.height) / 2);
          await appWindow.setPosition(new tauriDpi.PhysicalPosition(x, y));
          state.window.x = x - positionOffset;
          state.window.y = y;
        }
      } else if (state.window.preset === "top-center" && tauriWindow.currentMonitor && tauriWindow.primaryMonitor) {
        const monitor = (await tauriWindow.currentMonitor()) ?? (await tauriWindow.primaryMonitor());
        if (monitor) {
          const x = monitor.position.x + Math.round((monitor.size.width - baseWidthPhysical) / 2) - gutterWidthPhysical;
          const y = monitor.position.y;
          await appWindow.setPosition(new tauriDpi.PhysicalPosition(x, y));
          state.window.x = x - positionOffset;
          state.window.y = y;
        }
      } else {
        await appWindow.setPosition(new tauriDpi.PhysicalPosition(state.window.x + positionOffset, state.window.y));
      }
    }

    saveState({
      window: {
        width: state.window.width,
        height: state.window.height,
        x: state.window.x,
        y: state.window.y,
        preset: state.window.preset
      },
      desktop: state.desktop,
      language: state.language,
      appearance: state.appearance,
      modules: state.modules
    });
    await applyDesktopSettings();
    fillForm();
    ui.windowStatus.dataset.i18n = "settings.autoApply";
    ui.windowStatus.textContent = t("settings.autoApply");
  } finally {
    isApplying = false;
  }
}

function scheduleApply() {
  updatePositioningAvailability();
  updateValueLabels();

  if (isSyncingForm) {
    return;
  }

  clearTimeout(applyTimer);
  applyTimer = window.setTimeout(() => {
    applyWindowSettings().catch(console.error);
  }, APPLY_DELAY);
}

function resetAdvancedStyling() {
  if (ui.cornerRadiusInput) setSliderValue(ui.cornerRadiusInput, defaultState.appearance.cornerRadius);
  if (ui.cardRadiusInput) setSliderValue(ui.cardRadiusInput, defaultState.appearance.cardRadius);
  if (ui.borderWidthInput) setSliderValue(ui.borderWidthInput, defaultState.appearance.borderWidth);
  if (ui.borderOpacityInput) setSliderValue(ui.borderOpacityInput, defaultState.appearance.borderOpacity);
  if (ui.glassBlurInput) setSliderValue(ui.glassBlurInput, defaultState.appearance.glassBlur);
  if (ui.companionOpacityInput) setSliderValue(ui.companionOpacityInput, defaultState.appearance.companionOpacity);
  if (ui.customAccentColorInput) ui.customAccentColorInput.value = "#818cf8";
  if (ui.customAccentColorHex) ui.customAccentColorHex.value = "";
  if (ui.customHighlightColorInput) ui.customHighlightColorInput.value = "#facc15";
  if (ui.customHighlightColorHex) ui.customHighlightColorHex.value = "";

  [ui.cornerRadiusInput, ui.cardRadiusInput, ui.borderWidthInput, ui.borderOpacityInput, ui.glassBlurInput, ui.companionOpacityInput].forEach((input) => {
    if (input) syncSliderProgress(input);
  });
  updateValueLabels();
  scheduleApply();
}

async function bootSettingsPage() {
  setUpdaterDelegate({
    onStateChange: () => renderUpdaterCard(),
    translate: t,
    onWindowStatusChange: (text) => {
      if (ui.windowStatus) {
        ui.windowStatus.textContent = text;
      }
    }
  });

  initializeCustomSettingsSelects();
  fillForm();
  initializeDesktopWindowOpacityFade();
  initializeSmoothScrollbox();
  document.querySelector(".page-shell")?.addEventListener("scroll", positionActiveSettingsMenu, { passive: true });
  window.addEventListener("resize", positionActiveSettingsMenu);
  initializeWindowSizePreview([ui.xInput, ui.yInput, ui.widthInput, ui.heightInput]);
  initializeWindowLocationPreview(ui.presetSelect);

  [
    ui.xInput, ui.yInput, ui.widthInput, ui.heightInput, ui.appOpacityInput, ui.textSizeInput, ui.textOpacityInput,
    ui.cornerRadiusInput, ui.cardRadiusInput, ui.borderWidthInput, ui.borderOpacityInput, ui.glassBlurInput, ui.companionOpacityInput
  ].forEach((input) => {
    if (!input) return;
    syncSliderProgress(input);
    input.addEventListener("input", () => {
      syncSliderProgress(input);
      updateValueLabels();
      scheduleApply();
    });
  });

  ui.customAccentColorInput?.addEventListener("input", () => {
    if (ui.customAccentColorHex) {
      ui.customAccentColorHex.value = ui.customAccentColorInput.value;
    }
    scheduleApply();
  });
  ui.customAccentColorHex?.addEventListener("input", () => {
    const val = normalizeCustomColor(ui.customAccentColorHex.value, "");
    if (val && ui.customAccentColorInput) {
      ui.customAccentColorInput.value = val;
    }
    scheduleApply();
  });

  ui.customHighlightColorInput?.addEventListener("input", () => {
    if (ui.customHighlightColorHex) {
      ui.customHighlightColorHex.value = ui.customHighlightColorInput.value;
    }
    scheduleApply();
  });
  ui.customHighlightColorHex?.addEventListener("input", () => {
    const val = normalizeCustomColor(ui.customHighlightColorHex.value, "");
    if (val && ui.customHighlightColorInput) {
      ui.customHighlightColorInput.value = val;
    }
    scheduleApply();
  });

  ui.resetStylingButton?.addEventListener("click", () => {
    resetAdvancedStyling();
  });

  ui.resetCornerRadiusBtn?.addEventListener("click", () => {
    if (ui.cornerRadiusInput) {
      setSliderValue(ui.cornerRadiusInput, defaultState.appearance.cornerRadius);
      updateValueLabels();
      scheduleApply();
    }
  });

  ui.resetCardRadiusBtn?.addEventListener("click", () => {
    if (ui.cardRadiusInput) {
      setSliderValue(ui.cardRadiusInput, defaultState.appearance.cardRadius);
      updateValueLabels();
      scheduleApply();
    }
  });

  ui.resetBorderWidthBtn?.addEventListener("click", () => {
    if (ui.borderWidthInput) {
      setSliderValue(ui.borderWidthInput, defaultState.appearance.borderWidth);
      updateValueLabels();
      scheduleApply();
    }
  });

  ui.resetBorderOpacityBtn?.addEventListener("click", () => {
    if (ui.borderOpacityInput) {
      setSliderValue(ui.borderOpacityInput, defaultState.appearance.borderOpacity);
      updateValueLabels();
      scheduleApply();
    }
  });

  ui.resetGlassBlurBtn?.addEventListener("click", () => {
    if (ui.glassBlurInput) {
      setSliderValue(ui.glassBlurInput, defaultState.appearance.glassBlur);
      updateValueLabels();
      scheduleApply();
    }
  });

  ui.resetCompanionOpacityBtn?.addEventListener("click", () => {
    if (ui.companionOpacityInput) {
      setSliderValue(ui.companionOpacityInput, defaultState.appearance.companionOpacity);
      updateValueLabels();
      scheduleApply();
    }
  });

  ui.resetCustomAccentBtn?.addEventListener("click", () => {
    if (ui.customAccentColorInput) ui.customAccentColorInput.value = "#818cf8";
    if (ui.customAccentColorHex) ui.customAccentColorHex.value = "";
    scheduleApply();
  });

  ui.resetCustomHighlightBtn?.addEventListener("click", () => {
    if (ui.customHighlightColorInput) ui.customHighlightColorInput.value = "#facc15";
    if (ui.customHighlightColorHex) ui.customHighlightColorHex.value = "";
    scheduleApply();
  });

  [ui.presetSelect, ui.languageSelect, ui.themeSelect, ui.styleSelect, ui.textColorInput].forEach((input) => {
    input.addEventListener("input", scheduleApply);
    input.addEventListener("change", scheduleApply);
  });

  ui.settingsSectionSelect?.addEventListener("input", () => {
    setActiveSettingsSection(ui.settingsSectionSelect.value);
  });
  ui.settingsSectionSelect?.addEventListener("change", () => {
    setActiveSettingsSection(ui.settingsSectionSelect.value);
  });

  ui.updaterCheckButton?.addEventListener("click", () => {
    if (updaterState.update?.rid) {
      installAvailableUpdate().catch(console.error);
      return;
    }

    checkForAppUpdates({ installIfAvailable: true }).catch(console.error);
  });
  ui.languageTrigger.addEventListener("click", () => {
    if (ui.languageMenu.classList.contains("hidden")) {
      openLanguageMenu();
      return;
    }

    closeLanguageMenu();
  });

  ui.languageOptions.forEach((option) => {
    option.addEventListener("click", () => {
      ui.languageSelect.value = option.dataset.value;
      state.language = option.dataset.value;
      applyTranslationsToDocument(state.language);
      syncCustomSettingsSelects();
      renderUpdaterCard();
      renderLanguagePicker(option.dataset.value, option.dataset.value);
      closeLanguageMenu(option, () => {
        scheduleApply();
      });
    });
  });

  document.addEventListener("click", (event) => {
    if (!ui.languagePicker.contains(event.target)) {
      closeLanguageMenu();
    }

    customSettingsSelectControllers.forEach((controller) => {
      if (!controller.picker.contains(event.target)) {
        closeCustomSettingsSelect(controller);
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeLanguageMenu();
      customSettingsSelectControllers.forEach((controller) => closeCustomSettingsSelect(controller));
    }
  });
  ui.hideFromCaptureInput.addEventListener("change", async () => {
    const enabled = ui.hideFromCaptureInput.checked;
    ui.captureProtectionStatus.hidden = true;
    ui.hideFromCaptureInput.disabled = true;
    const { desktop } = saveState({ desktop: { hideFromCapture: enabled, captureProtectionConfigured: true } });
    state.desktop = desktop;
    try {
      await invoke?.("set_capture_protection", { enabled });
    } catch (error) {
      ui.captureProtectionStatus.textContent = t("settings.captureProtectionFailed", { error });
      ui.captureProtectionStatus.hidden = false;
    } finally {
      ui.hideFromCaptureInput.disabled = false;
    }
  });
  [ui.mirrorModeInput, ui.mirrorVerticalInput, ui.autoHideToolbarInput, ui.performanceModeInput, ui.useSystemTrayInput, ui.preventSleepInput, ui.clickthroughShortcutInput, ui.showScriptManagerInput, ui.showScriptCompletionInput].filter(Boolean).forEach((input) => {
    input.addEventListener("input", scheduleApply);
    input.addEventListener("change", scheduleApply);
  });

  ui.closeWindowButton.addEventListener("click", () => {
    if (!invoke) {
      return;
    }

    invokeAfterDesktopFadeOut("hide_aux_window", { kind: "settings" }).catch(console.error);
  });
  ui.openTextButton.addEventListener("click", () => {
    invoke?.("open_aux_window", { kind: "input" }).catch(console.error);
  });
  setActiveSettingsSection(ui.settingsSectionSelect?.value || "appearance");

  window.addEventListener("focus", async () => {
    Object.assign(state, loadState());
    state.desktop = state.desktop || structuredClone(defaultState.desktop);
    await configureSliderRanges().catch(() => {});
    await applyDesktopSettings().catch(console.error);
    await readCurrentWindow().catch(console.error);
    fillForm();
  });
  function isEditableElement(element) {
    if (!element || !(element instanceof HTMLElement)) {
      return false;
    }
    return element.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName);
  }

  let syncSettingsTimer = 0;
  function handleSettingsExternalSync() {
    if (isEditableElement(document.activeElement)) {
      return;
    }
    if (syncSettingsTimer) {
      clearTimeout(syncSettingsTimer);
    }
    syncSettingsTimer = window.setTimeout(() => {
      syncSettingsTimer = 0;
      Object.assign(state, loadState());
      state.desktop = state.desktop || structuredClone(defaultState.desktop);
      fillForm();
      applyDesktopSettings().catch(console.error);
    }, 80);
  }

  window.addEventListener("storage", handleSettingsExternalSync);
  window.addEventListener("flow-state-updated", handleSettingsExternalSync);
  // Background non-blocking tasks (never stalls or freezes UI responsiveness)
  (async () => {
    await resolveMicrosoftStoreBuild().catch(() => false);
    await syncUpdatesSettingsVisibility().catch(() => {});
    await configureSliderRanges().catch(() => {});
    await readCurrentWindow().catch(() => {});

    try {
      const pro = await getProModule().catch(() => null);
      pro?.mountProSettings?.(document.querySelector(".page-shell") || document.body, { state, saveState, ui });
    } catch (e) {
      console.warn("Pro settings mount skipped", e);
    }

    applyDesktopSettings().catch(() => {});
    ensureCurrentAppVersion().catch(() => {});
    checkForAppUpdates({ silentNoUpdate: true }).catch(() => {});
  })();
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", () => {
    bootSettingsPage().catch(console.error);
  }, { once: true });
} else {
  bootSettingsPage().catch(console.error);
}
