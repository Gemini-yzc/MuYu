import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { LANGUAGE_OPTIONS, defaultState } from "../src/core/config.js";
import { applyTranslationsToDocument, parseWaitCardText, translate } from "../src/core/i18n.js";
import { zhCN } from "../src/core/locales/zh-CN.js";
import { normalizeState, resolveLanguageSystemFontStack } from "../src/core/normalizers.js";
import { parseFormattedScript, splitWords } from "../src/core/script-parser.js";

const readSource = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const placeholders = (text) => [...text.matchAll(/\{\w+\}/g)].map(([value]) => value).sort();
const tags = (text) => [...text.matchAll(/<\/?[a-z][^>]*>/gi)].map(([value]) => value);

test("Markdown headings keep inline formatting and do not leak hash markers into the reading view", () => {
  const source = "# **项目汇报** | 进展 #\r\n\r\n## 下一步\nC# 和 #话题";
  const tokens = parseFormattedScript(source);
  assert.deepEqual(tokens.filter(({ type }) => type === "heading-start").map(({ level }) => level), [1, 2]);
  assert.equal(tokens.find(({ text }) => text === "项目汇报").style.bold, true);
  assert.deepEqual(tokens.filter(({ type }) => type === "symbol").map(({ text }) => text), ["|"]);
  assert.deepEqual(splitWords(source), ["项目汇报", "进展", "下一步", "C#", "和", "#话题"]);
});

test("the language picker offers Simplified Chinese and persists it without changing the script", () => {
  assert.equal(LANGUAGE_OPTIONS.find(({ value }) => value === "zh-CN")?.label, "简体中文");
  const settings = readSource("../src/settings.html");
  assert.match(settings, /<option value="zh-CN" data-i18n="language\.zh-CN">简体中文<\/option>/);
  assert.match(settings, /class="language-option"[^>]*data-value="zh-CN"/);
  const script = "这是用户讲稿。\nDo not translate or normalize this line.";
  const restored = normalizeState(JSON.parse(JSON.stringify({ ...defaultState, language: "zh-CN", script })));
  assert.equal(restored.language, "zh-CN");
  assert.equal(restored.script, script);
  assert.match(resolveLanguageSystemFontStack("zh-CN"), /Microsoft YaHei/);
  assert.equal(translate("language.zh-CN", "fi"), "简体中文");
});

test("the reading font follows the interface language and legacy font choices are ignored", () => {
  const settings = readSource("../src/settings.html");
  const styles = readSource("../src/styles.css");
  assert.doesNotMatch(settings, /id="fontSelect"/);
  assert.match(settings, /id="textSizeInput"/);
  assert.match(styles, /--teleprompter-font-family:\s*var\(--flow-ui-font-family,/);
  const state = normalizeState({ script: "# 中文讲稿", language: "zh-CN", appearance: { fontFamily: "english-pro", textScale: 55 } });
  assert.equal(state.script, "# 中文讲稿");
  assert.equal(state.appearance.textScale, 55);
  assert.equal(Object.hasOwn(state.appearance, "fontFamily"), false);
  assert.match(resolveLanguageSystemFontStack(state.language), /Microsoft YaHei/);
});

test("capture protection defaults on and respects an explicit choice in the new settings", () => {
  assert.equal(normalizeState().desktop.hideFromCapture, true);
  assert.equal(normalizeState({ desktop: { hideFromCapture: false } }).desktop.hideFromCapture, true);
  const state = normalizeState({ script: "原讲稿", desktop: { hideFromCapture: false, captureProtectionConfigured: true } });
  assert.equal(state.desktop.hideFromCapture, false);
  assert.equal(state.script, "原讲稿");
});

test("legacy playback preferences cannot re-enable voice, speed controls, or remote access", () => {
  const state = normalizeState({
    script: "保留现有讲稿。",
    desktop: { hideFromCapture: true },
    appearance: { mode: "voice", appWideVoiceCommands: true, speedRailEnabled: true, appOpacity: 0, textScale: 75 },
    remote: { receiverId: "old-receiver" },
    voiceTracking: { confidenceThreshold: 0.8 }
  });
  assert.equal(state.script, "保留现有讲稿。");
  assert.equal(state.desktop.hideFromCapture, true);
  assert.equal(state.appearance.mode, "scroll");
  assert.equal(state.appearance.speedRailEnabled, false);
  assert.equal(state.appearance.appWideVoiceCommands, false);
  assert.equal(state.appearance.appOpacity, 0);
  assert.equal(state.appearance.textScale, 75);
  assert.equal(state.remote, undefined);
  assert.equal(state.voiceTracking, undefined);
});

test("legacy generation settings are discarded while the script and desktop settings remain", () => {
  const state = normalizeState({ script: "# 汇报", groqKey: "synthetic-test-key", groqPrompt: "test", groq: { personality: "friendly" }, desktop: { hideFromCapture: true } });
  for (const key of ["groqKey", "groqPrompt", "groq"]) assert.equal(Object.hasOwn(state, key), false);
  assert.equal(state.script, "# 汇报");
  assert.equal(state.desktop.hideFromCapture, true);
});

test("Chinese covers the English catalog and preserves dynamic placeholders and HTML", () => {
  const i18n = readSource("../src/core/i18n.js");
  const english = i18n.slice(i18n.indexOf("\n  en: {"), i18n.indexOf("\n  tr: {"));
  const keys = [...english.matchAll(/^\s*"([^"]+)": "/gm)].map(([, key]) => key);
  assert.ok(keys.includes("settings.hideFromCapture"));
  assert.deepEqual(Object.keys(zhCN).sort(), [...new Set(keys)].sort());
  for (const key of keys) {
    const original = translate(key, "en");
    const localized = translate(key, "zh-CN");
    assert.ok(localized.length > 0, key);
    assert.deepEqual(placeholders(localized), placeholders(original), key);
    assert.deepEqual(tags(localized), tags(original), key);
  }
  assert.equal(translate("input.imported", "zh-CN", { name: "讲稿.txt" }), "已从 讲稿.txt 载入文本。");
});

test("the real screen-capture setting label is translated without changing the setting", () => {
  const element = {
    dataset: { i18n: "settings.hideFromCapture" },
    textContent: "Invisible in screen capture",
    checked: true,
  };
  const html = { style: { setProperty() {} } };
  const page = {
    documentElement: html,
    body: { dataset: {} },
    querySelectorAll: (selector) => (selector === "[data-i18n]" ? [element] : []),
  };
  applyTranslationsToDocument("zh-CN", page);
  assert.equal(html.lang, "zh-CN");
  assert.equal(element.textContent, "屏幕捕获时隐藏");
  assert.equal(element.checked, true);
});

test("a localized wait card remains a timed cue", () => {
  const card = translate("input.cardPreset.waitSecondsText", "zh-CN", { seconds: 3 });
  assert.deepEqual(parseWaitCardText(card), { prefix: "等待", seconds: 3, suffix: "秒" });
  assert.equal(parseWaitCardText("暂停2秒")?.seconds, 2);
  assert.equal(parseWaitCardText("WAIT 4 SECONDS")?.seconds, 4);
  assert.equal(parseWaitCardText("等待发言"), null);
});
