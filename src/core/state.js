/*
 * Flow - A high-performance teleprompter for Windows.
 * Copyright (C) 2026 Waled Alturkmani (LumoRez07)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { normalizeState, createDefaults, mergeState } from "./normalizers.js";

const STORAGE_KEY = "flow.teleprompter.state.v2";
const STORAGE_WRITE_DEBOUNCE_MS = 140;

const tauriInvoke = window.__TAURI__?.core?.invoke;
const tauriEvent = window.__TAURI__?.event;

let stateCache = null;
let storageInitPromise = null;
let persistedStateWriteTimer = 0;

function readBrowserStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeBrowserStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore browser storage failures and continue with in-memory state.
  }
}

function readCachedStateFromBrowser() {
  try {
    const raw = readBrowserStorage(STORAGE_KEY);
    if (!raw) {
      return createDefaults();
    }
    return normalizeState(JSON.parse(raw));
  } catch {
    return createDefaults();
  }
}

function hasBrowserStorageValue(key) {
  return Boolean(readBrowserStorage(key));
}

function cacheState(nextState) {
  stateCache = normalizeState(nextState);
  return stateCache;
}

function setStateCache(nextState) {
  cacheState(nextState);
  writeBrowserStorage(STORAGE_KEY, stateCache);
  return stateCache;
}

function schedulePersistedStateWrite(nextState) {
  if (!tauriInvoke) {
    return;
  }
  window.clearTimeout(persistedStateWriteTimer);
  persistedStateWriteTimer = window.setTimeout(() => {
    tauriInvoke("save_persisted_app_state", { state: nextState }).catch((error) => {
      console.error("Persisted app state save failed", error);
    });
  }, STORAGE_WRITE_DEBOUNCE_MS);
}

export async function initializePersistentStorage() {
  if (storageInitPromise) {
    return storageInitPromise;
  }

  storageInitPromise = (async () => {
    const hasBrowserState = hasBrowserStorageValue(STORAGE_KEY);
    const browserState = readCachedStateFromBrowser();
    setStateCache(browserState);

    if (!tauriInvoke) {
      return {
        state: stateCache
      };
    }

    try {
      const payload = await tauriInvoke("load_persisted_app_data");
      const persistedStateRaw = payload?.state;
      const hasPersistedState = persistedStateRaw && typeof persistedStateRaw === "object" && Object.keys(persistedStateRaw).length > 0;

      if (hasPersistedState) {
        setStateCache(persistedStateRaw);
      } else if (hasBrowserState) {
        setStateCache(browserState);
        schedulePersistedStateWrite(browserState);
      }

    } catch (error) {
      console.error("Persistent storage initialization failed", error);
    }

    return {
      state: stateCache
    };
  })();

  return storageInitPromise;
}

export function loadState() {
  const browserState = readCachedStateFromBrowser();
  if (!stateCache || JSON.stringify(stateCache) !== JSON.stringify(browserState)) {
    return cacheState(browserState);
  }
  return normalizeState(stateCache);
}

export function saveState(nextState) {
  const mergedState = mergeState(loadState(), nextState);
  setStateCache(mergedState);
  schedulePersistedStateWrite(mergedState);
  window.dispatchEvent(new CustomEvent("flow-state-updated", { detail: mergedState }));
  if (tauriEvent?.emit) {
    tauriEvent.emit("flow-state-updated", mergedState).catch(() => {});
  }
  return mergedState;
}

window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY && event.newValue) {
    try {
      const parsed = normalizeState(JSON.parse(event.newValue));
      cacheState(parsed);
      window.dispatchEvent(new CustomEvent("flow-state-updated", { detail: parsed }));
    } catch (e) {
      // Ignore parse errors on storage sync
    }
  }

});

if (tauriEvent?.listen) {
  tauriEvent.listen("flow-state-updated", (event) => {
    if (event?.payload) {
      try {
        const parsed = normalizeState(event.payload);
        setStateCache(parsed);
        window.dispatchEvent(new CustomEvent("flow-state-updated", { detail: parsed }));
      } catch (e) {
        // Ignore parse errors on Tauri sync
      }
    }
  });

}
