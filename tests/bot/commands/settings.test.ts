import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "grammy";
import { settingsCommand } from "../../../src/bot/commands/settings-command.js";
import { handleSettingsCallback } from "../../../src/bot/callbacks/settings-callback-handler.js";
import { interactionManager } from "../../../src/app/managers/interaction-manager.js";
import { t } from "../../../src/i18n/index.js";
import {
  SETTINGS_CALLBACK_PREFIX,
  SETTINGS_COMPACT_OUTPUT_CALLBACK,
} from "../../../src/bot/menus/settings-menu.js";

const mocked = vi.hoisted(() => ({
  getCompactOutputModeMock: vi.fn(),
  setCompactOutputModeMock: vi.fn(),
}));

vi.mock("../../../src/app/stores/settings-store.js", () => ({
  getCompactOutputMode: mocked.getCompactOutputModeMock,
  setCompactOutputMode: mocked.setCompactOutputModeMock,
}));

describe("bot/commands/settings-command", () => {
  beforeEach(() => {
    mocked.getCompactOutputModeMock.mockReset();
    mocked.setCompactOutputModeMock.mockReset();
    interactionManager.clear("settings_test_reset");
  });

  it("shows settings menu with current compact output mode", async () => {
    mocked.getCompactOutputModeMock.mockReturnValue(true);
    const replyMock = vi.fn().mockResolvedValue({ message_id: 10 });
    const ctx = {
      chat: { id: 42, type: "private" },
      message: { text: "/settings" },
      reply: replyMock,
    } as unknown as Context;

    await settingsCommand(ctx as never);

    expect(replyMock).toHaveBeenCalledTimes(1);
    const [text, opts] = replyMock.mock.calls[0];
    expect(text).toBe(t("settings.menu.title"));
    expect(opts.reply_markup.inline_keyboard[0][0].text).toBe(
      `${t("settings.compact_output.label")}: ${t("settings.value.on")}`,
    );
    expect(opts.reply_markup.inline_keyboard[1][0].text).toBe(t("inline.button.cancel"));
  });
});

describe("bot/callbacks/settings-callback-handler", () => {
  beforeEach(() => {
    mocked.getCompactOutputModeMock.mockReset();
    mocked.setCompactOutputModeMock.mockReset();
    interactionManager.clear("settings_test_reset");
  });

  function activateSettingsMenu(): void {
    interactionManager.start({
      kind: "inline",
      expectedInput: "callback",
      metadata: {
        menuKind: "settings",
        messageId: 10,
      },
    });
  }

  function createCallbackContext(data: string): Context {
    return {
      callbackQuery: { data, message: { message_id: 10 } },
      answerCallbackQuery: vi.fn().mockResolvedValue(undefined),
      editMessageText: vi.fn().mockResolvedValue(undefined),
    } as unknown as Context;
  }

  it("opens compact output mode value picker", async () => {
    mocked.getCompactOutputModeMock.mockReturnValue(false);
    activateSettingsMenu();
    const ctx = createCallbackContext(SETTINGS_COMPACT_OUTPUT_CALLBACK);

    const result = await handleSettingsCallback(ctx);

    expect(result).toBe(true);
    expect(ctx.answerCallbackQuery).toHaveBeenCalledTimes(1);
    expect(ctx.editMessageText).toHaveBeenCalledTimes(1);
    const [text, opts] = vi.mocked(ctx.editMessageText).mock.calls[0];
    expect(text).toBe(`${t("settings.menu.title")}\n\n<b>${t("settings.compact_output.label")}</b>`);
    expect(opts?.parse_mode).toBe("HTML");
    expect(opts?.reply_markup.inline_keyboard[0][0].text).toContain("✅");
  });

  it("saves compact output mode and returns to settings menu", async () => {
    mocked.getCompactOutputModeMock.mockReturnValue(true);
    activateSettingsMenu();
    const ctx = createCallbackContext(`${SETTINGS_COMPACT_OUTPUT_CALLBACK}:on`);

    const result = await handleSettingsCallback(ctx);

    expect(result).toBe(true);
    expect(mocked.setCompactOutputModeMock).toHaveBeenCalledWith(true);
    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({ text: t("settings.saved") });
    const [text, opts] = vi.mocked(ctx.editMessageText).mock.calls[0];
    expect(text).toBe(t("settings.menu.title"));
    expect(opts?.reply_markup.inline_keyboard[0][0].text).toBe(
      `${t("settings.compact_output.label")}: ${t("settings.value.on")}`,
    );
  });

  it("ignores unrelated callbacks", async () => {
    const ctx = createCallbackContext("unknown:data");

    const result = await handleSettingsCallback(ctx);

    expect(result).toBe(false);
    expect(ctx.answerCallbackQuery).not.toHaveBeenCalled();
  });

  it("handles unknown settings callbacks", async () => {
    activateSettingsMenu();
    const ctx = createCallbackContext(`${SETTINGS_CALLBACK_PREFIX}unknown`);

    const result = await handleSettingsCallback(ctx);

    expect(result).toBe(true);
    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({ text: t("callback.processing_error") });
  });
});
