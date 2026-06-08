import { beforeEach, describe, expect, it } from "vitest";
import { clearAllInteractionState } from "../../../../../src/bot/core/interactions/active-flow/cleanup.js";
import { interactionManager } from "../../../../../src/bot/core/interactions/active-flow/manager.js";
import { questionManager } from "../../../../../src/bot/core/interactions/questions/manager.js";
import { permissionManager } from "../../../../../src/bot/core/interactions/permissions/manager.js";
import { renameManager } from "../../../../../src/rename/manager.js";
import type { Question } from "../../../../../src/bot/core/interactions/questions/types.js";
import type { PermissionRequest } from "../../../../../src/bot/core/interactions/permissions/types.js";

const TEST_QUESTION: Question = {
  header: "Q1",
  question: "Pick one option",
  options: [
    { label: "Yes", description: "accept" },
    { label: "No", description: "decline" },
  ],
};

const TEST_PERMISSION: PermissionRequest = {
  id: "perm-1",
  sessionID: "session-1",
  permission: "bash",
  patterns: ["npm test"],
  metadata: {},
  always: [],
};

describe("interaction/cleanup", () => {
  beforeEach(() => {
    clearAllInteractionState("test_setup");
  });

  it("clears all interaction-related managers", () => {
    questionManager.startQuestions([TEST_QUESTION], "req-1");
    permissionManager.startPermission(TEST_PERMISSION, 101);
    renameManager.startWaiting("session-1", "D:/repo", "Old title");
    interactionManager.start({
      kind: "rename",
      expectedInput: "text",
      metadata: { sessionId: "session-1" },
    });

    clearAllInteractionState("test_cleanup");

    expect(questionManager.isActive()).toBe(false);
    expect(permissionManager.isActive()).toBe(false);
    expect(renameManager.isWaitingForName()).toBe(false);
    expect(interactionManager.getSnapshot()).toBeNull();
  });

  it("allows starting new interaction after cleanup", () => {
    interactionManager.start({
      kind: "inline",
      expectedInput: "callback",
      metadata: { menuKind: "model", messageId: 1 },
    });

    clearAllInteractionState("first_cleanup");

    interactionManager.start({
      kind: "question",
      expectedInput: "callback",
      metadata: { questionIndex: 0 },
    });

    expect(interactionManager.getSnapshot()?.kind).toBe("question");
  });
});
