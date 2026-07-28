import { readdirSync } from "node:fs";
import type { Dirent } from "node:fs";

import {
  isAbsolute,
  relative,
  resolve,
  sep as PATH_SEP,
} from "node:path";
import type { KeyBinding, TextareaRenderable } from "@opentui/core";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useKeyboard, useRenderer } from "@opentui/react";
import { ScrollBoxRenderable, TextAttributes } from "@opentui/core";
import { StatusBar } from "./status-bar";
import { CommandMenu } from "./command-menu";
import { useCommandMenu } from "./command-menu/use-command-menu";
import type { Command } from "./command-menu/types";
import { useToast } from "../providers/toast";
import { useKeyboardLayer } from "../providers/keyboard-layer";
import { useDialog } from "../providers/dialog";
import { useTheme } from "../providers/theme";
import { useNavigate } from "react-router";
import { usePromptConfigActions } from "../providers/prompt-config";

type Props = {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  width?: number | `${number}%`;
};

export const TEXTAREA_KEY_BINDINGS: KeyBinding[] = [
  { name: "enter", action: "submit" },
  { name: "return", action: "submit" },
  { name: "enter", shift: true, action: "newline" },
  { name: "return", shift: true, action: "newline" },
  { name: "tab", action: "buffer-home" },
  { name: "tab", shift: true, action: "buffer-home" },
];

const MAX_VISIBLE_MENTIONS = 8;
const MAX_FALLBACK_MENTION_CANDIDATES = 48;
const MENTION_QUERY_CHARACTER = /[A-Za-z0-9._/\\-]/;
const RECURSIVE_MENTION_IGNORED_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
]);

type MentionMatch = {
  start: number;
  end: number;
  query: string;
};

type MentionCandidate = {
  path: string;
  kind: "file" | "directory";
};

function isWithinCurrentDirectory(targetPath: string, cwd: string) {
  const relativePath = relative(cwd, targetPath);
  if (relativePath === "") return true;
  if (relativePath === ".." || relativePath.startsWith(`..${PATH_SEP}`)) {
    return false;
  }
  return !isAbsolute(relativePath);
}

function isMentionQueryCharacter(character: string) {
  return MENTION_QUERY_CHARACTER.test(character);
}

function normalizeMentionQuery(query: string) {
  let normalized = query.replace(/\\/g, "/");
  if (normalized.startsWith("./")) {
    normalized = normalized.slice(2);
  }
  return normalized;
}

function isDirectoryEntry(entry: Dirent) {
  try {
    return entry.isDirectory();
  } catch {
    return false;
  }
}

function findActiveMention(text: string, cursorOffset: number): MentionMatch | null {
  const safeOffset = Math.max(0, Math.min(cursorOffset, text.length));

  let start = safeOffset;
  while (start > 0 && !/\s/.test(text[start - 1]!)) {
    start -= 1;
  }

  let end = safeOffset;
  while (end < text.length && !/\s/.test(text[end]!)) {
    end += 1;
  }

  const token = text.slice(start, end);
  const relativeCursor = safeOffset - start;
  const mentionStart = token.lastIndexOf("@", relativeCursor);

  if (mentionStart === -1) {
    return null;
  }

  const previousCharacter = token[mentionStart - 1];
  if (previousCharacter && isMentionQueryCharacter(previousCharacter)) {
    return null;
  }

  let mentionEnd = mentionStart + 1;
  while (mentionEnd < token.length && isMentionQueryCharacter(token[mentionEnd]!)) {
    mentionEnd += 1;
  }

  if (relativeCursor < mentionStart || relativeCursor > mentionEnd) {
    return null;
  }

  return {
    start: start + mentionStart,
    end: start + mentionEnd,
    query: token.slice(mentionStart + 1, mentionEnd),
  };
}

function matchesPrefix(name: string, prefix: string) {
  if (!prefix) return true;
  return name.toLowerCase().startsWith(prefix.toLowerCase());
}

function readDirectoryEntries(absoluteDirectory: string): Dirent[] {
  try {
    return readdirSync(absoluteDirectory, { withFileTypes: true });
  } catch {
    return [];
  }
}

function getMentionCandidates(query: string): MentionCandidate[] {
  const cwd = process.cwd();
  const normalizedQuery = normalizeMentionQuery(query);
  if (normalizedQuery.startsWith("/")) {
    return [];
  }

  const hasTrailingSlash = normalizedQuery.endsWith("/");
  const lastSlashIndex = hasTrailingSlash
    ? normalizedQuery.length - 1
    : normalizedQuery.lastIndexOf("/");

  const directoryPart = hasTrailingSlash
    ? normalizedQuery.slice(0, -1)
    : lastSlashIndex === -1
      ? ""
      : normalizedQuery.slice(0, lastSlashIndex);

  const namePrefix = hasTrailingSlash
    ? ""
    : lastSlashIndex === -1
      ? normalizedQuery
      : normalizedQuery.slice(lastSlashIndex + 1);

  const absoluteDirectory = directoryPart
    ? resolve(cwd, ...directoryPart.split("/"))
    : cwd;

  if (!isWithinCurrentDirectory(absoluteDirectory, cwd)) {
    return [];
  }

  const showHiddenEntries = namePrefix.startsWith(".");
  const entries = readDirectoryEntries(absoluteDirectory);

  const directMatches = entries
    .filter((entry) => showHiddenEntries || !entry.name.startsWith("."))
    .filter((entry) => matchesPrefix(entry.name, namePrefix))
    .sort((left, right) => {
      const leftDir = isDirectoryEntry(left);
      const rightDir = isDirectoryEntry(right);
      if (leftDir !== rightDir) return leftDir ? -1 : 1;
      return left.name.localeCompare(right.name);
    })
    .map((entry) => {
      const path = directoryPart ? `${directoryPart}/${entry.name}` : entry.name;
      const kind: MentionCandidate["kind"] = isDirectoryEntry(entry)
        ? "directory"
        : "file";
      return {
        path: kind === "directory" ? `${path}/` : path,
        kind,
      };
    });

  if (directMatches.length > 0 || directoryPart !== "" || namePrefix === "") {
    return directMatches;
  }

  // No direct hit — walk the tree for basename prefix matches.
  const fallbackMatches: MentionCandidate[] = [];

  const visit = (
    absoluteDirectory: string,
    directoryPart: string,
    depth: number,
  ) => {
    if (fallbackMatches.length >= MAX_FALLBACK_MENTION_CANDIDATES) return;

    for (const entry of readDirectoryEntries(absoluteDirectory)) {
      if (fallbackMatches.length >= MAX_FALLBACK_MENTION_CANDIDATES) return;
      if (!showHiddenEntries && entry.name.startsWith(".")) continue;

      const entryIsDirectory = isDirectoryEntry(entry);
      if (
        entryIsDirectory
        && RECURSIVE_MENTION_IGNORED_DIRECTORIES.has(entry.name)
      ) {
        continue;
      }

      const path = directoryPart ? `${directoryPart}/${entry.name}` : entry.name;
      const kind: MentionCandidate["kind"] = entryIsDirectory ? "directory" : "file";

      if (matchesPrefix(entry.name, namePrefix)) {
        fallbackMatches.push({
          path: kind === "directory" ? `${path}/` : path,
          kind,
        });
      }

      if (entryIsDirectory && depth < 6) {
        visit(resolve(absoluteDirectory, entry.name), path, depth + 1);
      }
    }
  };

  visit(cwd, "", 0);
  return fallbackMatches.sort((left, right) => left.path.localeCompare(right.path));
}

type FileMentionMenuProps = {
  open: boolean;
  candidates: MentionCandidate[];
  selectedIndex: number;
  scrollRef: RefObject<ScrollBoxRenderable | null>;
  onSelect: (index: number) => void;
  onExecute: (index: number) => void;
};

function FileMentionMenu({
  open,
  candidates,
  selectedIndex,
  scrollRef,
  onSelect,
  onExecute,
}: FileMentionMenuProps) {
  const { colors } = useTheme();

  const listHeight =
    candidates.length === 0
      ? 2
      : Math.min(candidates.length, MAX_VISIBLE_MENTIONS);
  // Explicit heights only — OpenTUI does not reliably expand after height={0}.
  const chrome = open ? 2 : 0;
  const visibleHeight = open ? listHeight + chrome : 0;

  return (
    <box
      flexShrink={0}
      height={visibleHeight}
      overflow="hidden"
      marginBottom={open ? 1 : 0}
    >
      <box
        flexDirection="column"
        border
        borderStyle="rounded"
        borderColor={colors.border}
        backgroundColor={colors.surface}
        paddingX={1}
        paddingY={0}
        height={listHeight + chrome}
      >
        <scrollbox ref={scrollRef} height={listHeight}>
          {candidates.length === 0 ? (
            <box flexDirection="column" height={2} justifyContent="center" paddingX={1}>
              <text attributes={TextAttributes.DIM} fg={colors.textGhost}>
                No matching files or folders
              </text>
              <text attributes={TextAttributes.DIM} fg={colors.textGhost}>
                Type @ to browse files
              </text>
            </box>
          ) : (
            candidates.map((candidate, index) => {
              const isSelected = index === selectedIndex;

              return (
                <box
                  key={candidate.path}
                  flexDirection="row"
                  alignItems="center"
                  paddingX={1}
                  height={1}
                  overflow="hidden"
                  backgroundColor={isSelected ? colors.accentMuted : undefined}
                  onMouseMove={() => onSelect(index)}
                  onMouseDown={() => {
                    onSelect(index);
                    onExecute(index);
                  }}
                >
                  <box flexGrow={1} flexShrink={1} overflow="hidden">
                    <text
                      selectable={false}
                      attributes={isSelected ? TextAttributes.BOLD : undefined}
                      fg={isSelected ? colors.primary : colors.text}
                    >
                      {candidate.path}
                    </text>
                  </box>
                  <box width={8} alignItems="flex-end" flexShrink={0}>
                    <text
                      selectable={false}
                      attributes={TextAttributes.DIM}
                      fg={isSelected ? colors.textMuted : colors.textGhost}
                    >
                      {candidate.kind === "directory" ? "Folder" : "File"}
                    </text>
                  </box>
                </box>
              );
            })
          )}
        </scrollbox>
      </box>
    </box>
  );
}

function scrollMentionSelectionIntoView(
  scrollRef: RefObject<ScrollBoxRenderable | null>,
  index: number,
  direction: "up" | "down",
) {
  const scrollbox = scrollRef.current;
  if (!scrollbox) return;

  if (direction === "up") {
    if (index < scrollbox.scrollTop) {
      scrollbox.scrollTo(index);
    }
    return;
  }

  const viewportHeight = scrollbox.viewport?.height;
  if (viewportHeight == null) return;

  const visibleEnd = scrollbox.scrollTop + viewportHeight - 1;
  if (index > visibleEnd) {
    scrollbox.scrollTo(index - viewportHeight + 1);
  }
}

export function InputBar({
  onSubmit,
  disabled = false,
  width = "100%",
}: Props) {
  const navigate = useNavigate();
  const { toggleMode, setMode, setModel, getMode } = usePromptConfigActions();

  const textareaRef = useRef<TextareaRenderable>(null);
  const onSubmitRef = useRef<() => void>(() => { });
  const activeMentionRef = useRef<MentionMatch | null>(null);
  const showMentionMenuRef = useRef(false);
  const mentionCandidatesRef = useRef<MentionCandidate[]>([]);
  const mentionSelectedIndexRef = useRef(0);
  const mentionScrollRef = useRef<ScrollBoxRenderable | null>(null);

  const renderer = useRenderer();
  const toast = useToast();
  const dialog = useDialog();
  const { colors } = useTheme();
  const [focused, setFocused] = useState(!disabled);
  const { isTopLayer, setResponder, push, pop } = useKeyboardLayer();

  const [activeMention, setActiveMention] = useState<MentionMatch | null>(null);
  const [mentionCandidates, setMentionCandidates] = useState<MentionCandidate[]>([]);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);

  const {
    resolveCommand,
    commandQuery,
    handleContentChange,
    scrollRef,
    selectedIndex,
    setSelectedIndex,
    showCommandMenu,
  } = useCommandMenu();

  const showMentionMenu = activeMention !== null;
  showMentionMenuRef.current = showMentionMenu;
  mentionCandidatesRef.current = mentionCandidates;
  mentionSelectedIndexRef.current = mentionSelectedIndex;

  const loadMentionCandidates = useCallback((query: string) => {
    const nextCandidates = getMentionCandidates(query);
    setMentionCandidates(nextCandidates);
    mentionCandidatesRef.current = nextCandidates;
    setMentionSelectedIndex(0);
    mentionSelectedIndexRef.current = 0;
    mentionScrollRef.current?.scrollTo(0);
  }, []);

  const closeMentionMenu = useCallback(() => {
    if (!showMentionMenuRef.current && !activeMentionRef.current) {
      pop("mention");
      return;
    }
    activeMentionRef.current = null;
    showMentionMenuRef.current = false;
    setActiveMention(null);
    setMentionCandidates([]);
    mentionCandidatesRef.current = [];
    setMentionSelectedIndex(0);
    pop("mention");
  }, [pop]);

  const syncMentionMenu = useCallback((text: string, cursorOffset: number) => {
    const nextMention = findActiveMention(text, cursorOffset);
    const previousMention = activeMentionRef.current;

    if (!nextMention) {
      if (previousMention) {
        closeMentionMenu();
      }
      return;
    }

    const queryChanged = previousMention?.query !== nextMention.query;
    const rangeChanged =
      previousMention?.start !== nextMention.start ||
      previousMention?.end !== nextMention.end;

    activeMentionRef.current = nextMention;

    if (!previousMention) {
      showMentionMenuRef.current = true;
      loadMentionCandidates(nextMention.query);
      setActiveMention(nextMention);
      push("mention", () => {
        closeMentionMenu();
        return true;
      });
      return;
    }

    if (queryChanged) {
      loadMentionCandidates(nextMention.query);
    }

    if (queryChanged || rangeChanged) {
      setActiveMention(nextMention);
    }
  }, [closeMentionMenu, loadMentionCandidates, push]);

  const handleCommand = useCallback(
    (command: Command | undefined) => {
      const textarea = textareaRef.current;
      if (!textarea || !command) return;

      textarea.setText("");

      if (command.action) {
        command.action({
          // Tearing the renderer down inside a key handler kills the process
          // mid-commit, so let the current frame finish first.
          exit: () => setTimeout(() => renderer.destroy(), 0),
          toast,
          dialog,
          navigate,
          mode: getMode(),
          setMode,
          setModel,
        });
      } else {
        textarea.insertText(`${command.value} `);
      }
    },
    [renderer, toast, dialog, navigate, getMode, setMode, setModel],
  );

  const handleSubmit = useCallback(() => {
    if (disabled) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    const text = textarea.plainText.trim();
    if (!text) return;

    onSubmit(text);
    textarea.setText("");
  }, [disabled, onSubmit]);

  const handleTextareaContentChange = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    handleContentChange(textarea.plainText);
    syncMentionMenu(textarea.plainText, textarea.cursorOffset);
  }, [handleContentChange, syncMentionMenu]);

  const handleMentionExecute = useCallback((index: number) => {
    const textarea = textareaRef.current;
    const mention = activeMentionRef.current;
    const candidate = mentionCandidatesRef.current[index];

    if (!textarea || !mention || !candidate) return;

    const insertion = candidate.kind === "directory"
      ? candidate.path
      : `${candidate.path} `;

    const nextText =
      `${textarea.plainText.slice(0, mention.start)}@${insertion}${textarea.plainText.slice(mention.end)}`;

    textarea.replaceText(nextText);
    textarea.cursorOffset = mention.start + insertion.length + 1;
    // Content-change events can lag behind replaceText; sync from the
    // values we just wrote so the menu updates immediately.
    syncMentionMenu(nextText, mention.start + insertion.length + 1);
  }, [syncMentionMenu]);

  const moveMentionSelection = useCallback((delta: number) => {
    const total = mentionCandidatesRef.current.length;
    if (total === 0) {
      setMentionSelectedIndex(0);
      return;
    }

    setMentionSelectedIndex((currentIndex) => {
      const nextIndex = (currentIndex + delta + total) % total;
      scrollMentionSelectionIntoView(
        mentionScrollRef,
        nextIndex,
        delta < 0 ? "up" : "down",
      );
      mentionSelectedIndexRef.current = nextIndex;
      return nextIndex;
    });
  }, []);

  const handleCommandExecute = useCallback(
    (index: number) => {
      const command = resolveCommand(index);
      handleCommand(command);
    },
    [resolveCommand, handleCommand],
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.onSubmit = () => {
      onSubmitRef.current();
    };
  }, []);

  useEffect(() => {
    onSubmitRef.current = () => {
      if (disabled) return;

      if (showCommandMenu) {
        const command = resolveCommand(selectedIndex);
        handleCommand(command);
        return;
      }
      if (showMentionMenuRef.current) {
        const candidates = mentionCandidatesRef.current;
        const index = mentionSelectedIndexRef.current;
        if (candidates[index]) {
          handleMentionExecute(index);
          return;
        }
      }
      handleSubmit();
    };
  }, [
    disabled,
    showCommandMenu,
    selectedIndex,
    resolveCommand,
    handleCommand,
    handleMentionExecute,
    handleSubmit,
  ]);

  useKeyboard((key) => {
    if (disabled) return;
    if (!isTopLayer("base")) return;
    if (showCommandMenu) return;
    if (key.name !== "tab") return;
    key.preventDefault();
    toggleMode();
  });

  useEffect(() => {
    setResponder("base", () => {
      if (disabled) return false;
      const textarea = textareaRef.current;
      if (textarea && textarea.plainText.length > 0) {
        textarea.setText("");
        return true;
      }
      return true;
    });
    return () => setResponder("base", null);
  }, [disabled, setResponder]);

  useKeyboard((key) => {
    if (disabled) return;
    if (!showMentionMenuRef.current || !isTopLayer("mention")) return;

    if (key.name === "escape") {
      key.preventDefault();
      closeMentionMenu();
      return;
    }

    if (key.name === "tab") {
      key.preventDefault();
      const candidates = mentionCandidatesRef.current;
      const index = mentionSelectedIndexRef.current;
      if (candidates[index]) {
        handleMentionExecute(index);
      }
      return;
    }

    if (key.name === "up" || (key.ctrl && key.name === "p")) {
      key.preventDefault();
      moveMentionSelection(-1);
      return;
    }

    if (key.name === "down" || (key.ctrl && key.name === "n")) {
      key.preventDefault();
      moveMentionSelection(1);
      return;
    }

    if (key.name === "pageup") {
      key.preventDefault();
      moveMentionSelection(-MAX_VISIBLE_MENTIONS);
      return;
    }

    if (key.name === "pagedown") {
      key.preventDefault();
      moveMentionSelection(MAX_VISIBLE_MENTIONS);
      return;
    }
  });

  return (
    <box width={width} flexDirection="row">
      <box
        width={1}
        backgroundColor={focused ? colors.accent : colors.accentMuted}
      />

      {/*
        Command menu stays always mounted (height 0 when closed) to avoid
        OpenTUI "Anchor does not exist". StatusBar stays inside the bordered
        input chrome — mode label updates imperatively on Tab.
      */}
      <box flexGrow={1} flexDirection="column">
        <CommandMenu
          open={showCommandMenu}
          query={commandQuery}
          selectedIndex={selectedIndex}
          scrollRef={scrollRef}
          onSelect={setSelectedIndex}
          onExecute={handleCommandExecute}
        />
        <FileMentionMenu
          open={showMentionMenu}
          candidates={mentionCandidates}
          selectedIndex={mentionSelectedIndex}
          scrollRef={mentionScrollRef}
          onSelect={setMentionSelectedIndex}
          onExecute={handleMentionExecute}
        />
        <box
          flexGrow={1}
          border
          borderStyle="rounded"
          borderColor={focused ? colors.accentMuted : colors.border}
          focusedBorderColor={colors.primary}
          backgroundColor={colors.surface}
          paddingX={2}
          paddingY={1}
          gap={1}
        >
          <textarea
            ref={textareaRef}
            focused={
              !disabled
              && (isTopLayer("base")
                || isTopLayer("command")
                || isTopLayer("mention"))
            }
            placeholder="Ask anything..."
            keyBindings={TEXTAREA_KEY_BINDINGS}
            placeholderColor={colors.textGhost}
            textColor={colors.text}
            backgroundColor={colors.surface}
            focusedTextColor={colors.text}
            focusedBackgroundColor={colors.surface}
            onContentChange={() => {
              setFocused(true);
              handleTextareaContentChange();
            }}
          />

          <StatusBar />
        </box>
      </box>
    </box>
  );
}
