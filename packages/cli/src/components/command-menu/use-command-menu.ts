import { useRef, useState, useMemo, type RefObject } from "react";
import { ScrollBoxRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { getFilteredCommands } from "./filter-commands";
import type { Command } from "./types";
import { useKeyboardLayer } from "../../providers/keyboard-layer";

type UseCommandMenuReturn = {
  showCommandMenu: boolean;
  commandQuery: string;
  selectedIndex: number;
  scrollRef: RefObject<ScrollBoxRenderable | null>;
  handleContentChange: (text: string) => void;
  resolveCommand: (index: number) => Command | undefined;
  setSelectedIndex: (index: number) => void;
};

export function useCommandMenu(): UseCommandMenuReturn {
  const [textValue, setTextValue] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const { push, pop, isTopLayer } = useKeyboardLayer();
  // Reference to the scrollable command list so we can
  // programmatically keep the selected item visible.
  const scrollRef = useRef<ScrollBoxRenderable>(null);

  // Extract the search query from "/command".
  // Example: "/help" -> "help"
  const commandQuery =
    showCommandMenu && textValue.startsWith("/")
      ? textValue.slice(1)
      : "";

  // Only recompute matching commands when the query changes.
  const filteredCommands = useMemo(
    () => getFilteredCommands(commandQuery),
    [commandQuery]
  );

  const handleContentChange = (text: string) => {
    setTextValue(text);

    // Always reset selection when the search changes.
    setSelectedIndex(0);

    // Reset the command list to the top.
    const scrollbox = scrollRef.current;
    if (scrollbox) {
      scrollbox.scrollTo(0);
    }

    // Show the command menu only while typing the command name.
    // Hide it once the user starts entering command arguments.
    const prefix = text.startsWith("/") ? text.slice(1) : null;

    if (prefix !== null && !prefix.includes(" ")) {
      setShowCommandMenu(true);
      push("command", () => {
        setShowCommandMenu(false);
        pop("command");
        return true
      })
    } else {
      setShowCommandMenu(false);
      pop("command")
    }
  };

  const resolveCommand = (index: number): Command | undefined => {
    const command = filteredCommands[index];

    // Close the menu once a valid command has been selected.
    if (command) {
      setShowCommandMenu(false);
      pop("command")
    }

    return command;
  };

  useKeyboard((key) => {
    // Ignore keyboard navigation when the menu is hidden.
    if (!showCommandMenu || !isTopLayer("command")) return;

    if (key.name === "escape") {
      key.preventDefault();
      setShowCommandMenu(false);
      pop("command")
    } else if (key.name === "up") {
      key.preventDefault();

      setSelectedIndex((i: number) => {
        const newIdx = Math.max(0, i - 1);

        // Scroll upward when the highlighted item moves
        // above the visible portion of the list.
        const scrollbar = scrollRef.current;
        if (scrollbar && newIdx < scrollbar.scrollTop) {
          scrollbar.scrollTo(newIdx);
        }

        return newIdx;
      });
    } else if (key.name === "down") {
      key.preventDefault();

      setSelectedIndex((i: number) => {
        if (filteredCommands.length === 0) {
          return 0;
        }

        const newIdx = Math.min(filteredCommands.length - 1, i + 1);

        const scrollbar = scrollRef.current;
        if (scrollbar) {
          const viewportHeight = scrollbar.viewport.height;

          // Index of the last visible item.
          const visibleEnd = scrollbar.scrollTop + viewportHeight - 1;

          // Scroll downward when the selection leaves the viewport.
          if (newIdx > visibleEnd) {
            scrollbar.scrollTo(newIdx - viewportHeight + 1);
          }
        }

        return newIdx;
      });
    }
  });

  return {
    showCommandMenu,
    commandQuery,
    selectedIndex,
    scrollRef,
    handleContentChange,
    resolveCommand,
    setSelectedIndex,
  };
}
