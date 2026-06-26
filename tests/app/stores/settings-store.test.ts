import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setRuntimeMode } from "../../../src/runtime/mode.js";
import {
  __resetSettingsForTests,
  getCompactOutputMode,
  getShowThinkingContent,
  getTtsMode,
  loadSettings,
  setCompactOutputMode,
  setShowThinkingContent,
} from "../../../src/app/stores/settings-store.js";

describe("app/stores/settings-store", () => {
  let tempHome: string;

  beforeEach(async () => {
    tempHome = await mkdtemp(path.join(os.tmpdir(), "opencode-telegram-settings-store-"));
    process.env.OPENCODE_TELEGRAM_HOME = tempHome;
    setRuntimeMode("installed");
    __resetSettingsForTests();
  });

  afterEach(async () => {
    delete process.env.OPENCODE_TELEGRAM_HOME;
    __resetSettingsForTests();
    await rm(tempHome, { recursive: true, force: true });
  });

  it.each([
    { oldValue: true, expectedMode: "all" },
    { oldValue: false, expectedMode: "off" },
  ] as const)(
    "migrates ttsEnabled=$oldValue to $expectedMode mode",
    async ({ oldValue, expectedMode }) => {
      await writeFile(
        path.join(tempHome, "settings.json"),
        JSON.stringify({ ttsEnabled: oldValue }, null, 2),
      );

      await loadSettings();

      expect(getTtsMode()).toBe(expectedMode);
    },
  );

  it("uses disabled compact output mode by default", async () => {
    await loadSettings();

    expect(getCompactOutputMode()).toBe(false);
  });

  it("loads compact output mode from settings.json", async () => {
    await writeFile(path.join(tempHome, "settings.json"), JSON.stringify({ compactOutputMode: true }));

    await loadSettings();

    expect(getCompactOutputMode()).toBe(true);
  });

  it("shows thinking content by default", async () => {
    await loadSettings();

    expect(getShowThinkingContent()).toBe(true);
  });

  it("loads thinking content setting from settings.json", async () => {
    await writeFile(path.join(tempHome, "settings.json"), JSON.stringify({ showThinkingContent: false }));

    await loadSettings();

    expect(getShowThinkingContent()).toBe(false);
  });

  it("persists compact output mode to settings.json", async () => {
    await loadSettings();

    setCompactOutputMode(true);

    expect(getCompactOutputMode()).toBe(true);
    await vi.waitFor(async () => {
      const settings = JSON.parse(await readFile(path.join(tempHome, "settings.json"), "utf-8"));
      expect(settings.compactOutputMode).toBe(true);
    });

    setCompactOutputMode(false);

    expect(getCompactOutputMode()).toBe(false);
    await vi.waitFor(async () => {
      const settings = JSON.parse(await readFile(path.join(tempHome, "settings.json"), "utf-8"));
      expect(settings.compactOutputMode).toBe(false);
    });
  });

  it("persists thinking content setting to settings.json", async () => {
    await loadSettings();

    setShowThinkingContent(false);

    expect(getShowThinkingContent()).toBe(false);
    await vi.waitFor(async () => {
      const settings = JSON.parse(await readFile(path.join(tempHome, "settings.json"), "utf-8"));
      expect(settings.showThinkingContent).toBe(false);
    });
  });
});
