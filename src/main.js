/*
 * Based on Flow, Copyright (C) 2026 Waled Alturkmani (LumoRez07).
 * Licensed under GPL-3.0-or-later. See LICENSE.
 */

import {
  applyAppearanceToDocument, applyTranslationsToDocument,
  initializeDesktopWindowOpacityFade, initializePersistentStorage,
  invokeAfterDesktopFadeOut, loadState, saveState, translate
} from "./shared.js";
import { MIN_WIDTH } from "./teleprompter/layout.js";
import { createPromptRenderer } from "./teleprompter/prompt-renderer.js";
import { createWindowManager } from "./teleprompter/window-manager.js";
import { createViewStateController } from "./teleprompter/view-state.js";
import { createScriptManager } from "./teleprompter/script-manager.js";
import { createCompletionTracker } from "./teleprompter/completion-tracker.js";

await initializePersistentStorage();

const state = loadState();
const invoke = window.__TAURI__?.core?.invoke;
const byId = (id) => document.getElementById(id);
const ui = {
  promptViewport: byId("promptViewport"),
  promptText: byId("promptText"),
  progressLabel: byId("progressLabel"),
  statusLabel: byId("statusLabel"),
  teleprompterApp: document.querySelector(".teleprompter-app"),
  teleprompterToolbar: document.querySelector(".teleprompter-toolbar"),
  teleprompterFooter: byId("teleprompterFooter"),
  collapseButton: byId("collapseButton"),
  pinButton: byId("pinButton"),
  dragOverlay: byId("dragOverlay"),
  teleprompterRightDock: byId("teleprompterRightDock"),
  teleprompterBottomDock: byId("teleprompterBottomDock"),
  scriptManagerCardSlot: byId("scriptManagerCardSlot"),
  scriptCompletionCardSlot: byId("scriptCompletionCardSlot")
};
const t = (key, params) => translate(key, state.language, params);
let isCollapsed = false;

const renderer = createPromptRenderer({
  state, ui, t,
  getActiveMode: () => "scroll",
  updateStatus: () => updateProgress()
});

const scriptManager = createScriptManager({
  state, t,
  onLoadScript: (script) => replaceScript(script),
  onToggleCollapse: (collapsed) => {
    const target = collapsed
      ? viewState.getPreviousViewStateBeforeScriptManager() : "SCRIPT_MANAGER_EXPANDED";
    viewState.setViewState(target).catch(console.error);
  }
});
const completionTracker = createCompletionTracker({
  state, t,
  onJumpToSection: ({ wordOffset }) => {
    renderer.getWordNodes()[wordOffset]?.scrollIntoView({ block: "start" });
  }
});
const windowManager = createWindowManager({
  state, ui, t, saveState,
  getSidePanelWindowGutter: () => viewState.getSidePanelWindowGutter(),
  getBottomDockWindowGutter: () => viewState.getBottomDockWindowGutter(),
  setSpeedRailGutter: () => applyContentWidth(),
  getIsCollapsed: () => isCollapsed,
  setIsCollapsed: (value) => { isCollapsed = value; },
  applyResponsiveText: () => renderer.applyResponsiveText(),
  onCollapse: () => scriptManager.collapse({ notify: false })
});
const viewState = createViewStateController({
  state, ui,
  getIsPlaying: () => Boolean(state.script.trim()),
  getIsCollapsed: () => isCollapsed,
  setIsCollapsed: (value) => { isCollapsed = value; },
  setCollapsed: (value, force) => windowManager.setCollapsed(value, force),
  getScriptManager: () => scriptManager,
  getCompletionTracker: () => completionTracker,
  getWindowManager: () => windowManager,
  getPromptRenderer: () => renderer
});

function applyContentWidth() {
  const width = `${Math.max(state.window.width, MIN_WIDTH)}px`;
  document.documentElement.style.setProperty("--teleprompter-base-width", width);
  document.documentElement.style.setProperty("--teleprompter-content-width", width);
}

function applyAppearance() {
  const appearance = state.appearance;
  applyAppearanceToDocument(appearance);
  const style = document.documentElement.style;
  const rgb = appearance.textColor.match(/[\da-f]{2}/gi).map((part) => parseInt(part, 16));
  style.setProperty("--teleprompter-text-rgb", rgb.join(" "));
  style.setProperty("--teleprompter-text-opacity", String(appearance.textOpacity / 100));
  applyContentWidth();
  renderer.applyResponsiveText();
}

function updateProgress() {
  const words = renderer.getWordNodes();
  const viewportTop = ui.promptViewport.getBoundingClientRect().top;
  const lines = renderer.getLineGroups();
  let low = 0;
  let high = lines.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const word = words[lines[mid].firstIndex];
    if (word?.getBoundingClientRect().bottom <= viewportTop) low = mid + 1;
    else high = mid;
  }
  const index = lines[low]?.firstIndex ?? (words.length && Math.max(0, words.length - 1));
  ui.progressLabel.textContent = t("tele.progress", { current: words.length ? index + 1 : 0, total: words.length });
  completionTracker.updateWordProgress(index, words.length);
}

function renderScript({ reset = false } = {}) {
  const top = reset ? 0 : ui.promptViewport.scrollTop;
  renderer.renderScript();
  ui.promptViewport.scrollTop = top;
  completionTracker.refreshSections();
  updateProgress();
}

function replaceScript(script) {
  Object.assign(state, saveState({ script }));
  renderScript({ reset: true });
  viewState.setViewState("PROMPTER_EXPANDED").catch(console.error);
  viewState.syncModulesVisibility();
}

function refreshFromStorage() {
  const previous = { ...state };
  Object.assign(state, loadState());
  const changed = (key) => JSON.stringify(previous[key]) !== JSON.stringify(state[key]);
  const languageChanged = changed("language");
  if (languageChanged) {
    applyTranslationsToDocument(state.language);
    windowManager.updateCollapseButton();
    scriptManager.render();
  }
  if (changed("appearance") || languageChanged || changed("window")) applyAppearance();
  if (changed("script") || languageChanged) renderScript({ reset: changed("script") });
  if (changed("desktop")) windowManager.applyDesktopPreferences().catch(console.error);
  if (changed("window")) {
    windowManager.updateDragControls();
    windowManager.applyStoredWindowSettings().catch(console.error);
  }
  if (changed("modules") || changed("script")) viewState.syncModulesVisibility();
}

document.body.dataset.animationStyle = "scroll";
applyTranslationsToDocument(state.language);
applyAppearance();
scriptManager.mount(ui.scriptManagerCardSlot);
completionTracker.mount(ui.scriptCompletionCardSlot);
renderScript();
viewState.syncModulesVisibility();
windowManager.updateCollapseButton();
windowManager.updateDragControls();
windowManager.applyDesktopPreferences().catch(console.error);
windowManager.bindDesktopEventListeners().catch(console.error);
windowManager.applyStoredWindowSettings().catch(console.error);
initializeDesktopWindowOpacityFade(document, false);

for (const kind of ["input", "settings"]) {
  byId(`${kind}Button`).addEventListener("click", () => {
    invoke?.("open_aux_window", { kind }).catch((error) => {
      ui.statusLabel.textContent = t(kind === "input" ? "tele.failedOpenInput" : "tele.failedOpenSettings", { error });
    });
  });
}
byId("closeAppButton").addEventListener("click", () => {
  if (invoke) invokeAfterDesktopFadeOut("close_app").catch(console.error);
});
ui.pinButton.addEventListener("click", () => windowManager.toggleDragOverlay().catch(console.error));
ui.collapseButton.addEventListener("click", () => {
  const target = viewState.getCurrentViewState() === "PROMPTER_EXPANDED" ? "BOTH_MINIMIZED" : "PROMPTER_EXPANDED";
  viewState.setViewState(target).catch(console.error);
});

ui.promptViewport.addEventListener("scroll", updateProgress, { passive: true });
window.addEventListener("keydown", (event) => {
  if (event.target.closest?.("button, input, textarea, select, [contenteditable]")) return;
  if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
  const step = { ArrowUp: -40, ArrowDown: 40, PageUp: -ui.promptViewport.clientHeight, PageDown: ui.promptViewport.clientHeight }[event.key];
  if (step === undefined && event.key !== "Home") return;
  event.preventDefault();
  if (event.key === "Home") ui.promptViewport.scrollTop = 0;
  else ui.promptViewport.scrollBy({ top: step });
});
const resizeObserver = new ResizeObserver(() => {
  if (!isCollapsed && viewState.getCurrentViewState() === "PROMPTER_EXPANDED") renderer.applyResponsiveText();
});
resizeObserver.observe(ui.promptViewport);
for (const event of ["storage", "flow-state-updated", "focus"]) window.addEventListener(event, refreshFromStorage);
window.addEventListener("beforeunload", () => windowManager.unbindDesktopEventListeners());
