import type { RefObject } from "react";
import { TextAttributes, type ScrollBoxRenderable } from "@opentui/core";

import { getFilteredCommands } from "./filter-commands";
import { COMMANDS } from "./commands";
import { useTheme } from "../../providers/theme";

const MAX_VISIBLE_COMMANDS = 8;

const COMMAND_COL_WIDTH =
  Math.max(...COMMANDS.map((command) => command.name.length)) + 4;

type CommandMenuProps = {
  open: boolean;
  query: string;
  selectedIndex: number;
  scrollRef: RefObject<ScrollBoxRenderable | null>;
  onSelect: (index: number) => void;
  onExecute: (index: number) => void;
};

export function CommandMenu({
  open,
  query,
  selectedIndex,
  scrollRef,
  onSelect,
  onExecute,
}: CommandMenuProps) {
  const { colors } = useTheme();
  const filtered = getFilteredCommands(query);

  // Explicit heights only — OpenTUI does not reliably expand after height={0}
  // if the open state uses `undefined` instead of a concrete size.
  const listHeight =
    filtered.length === 0
      ? 2
      : Math.min(filtered.length, MAX_VISIBLE_COMMANDS);
  // +2 for border/padding chrome when open
  const chrome = open ? 2 : 0;
  const visibleHeight = open ? listHeight + chrome : 0;

  return (
    <box flexShrink={0} height={visibleHeight} overflow="hidden" marginBottom={open ? 1 : 0}>
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
          {filtered.length === 0 ? (
            <box flexDirection="column" height={2} justifyContent="center" paddingX={1}>
              <text attributes={TextAttributes.DIM} fg={colors.textGhost}>
                No matching commands
              </text>
              <text attributes={TextAttributes.DIM} fg={colors.textGhost}>
                Type / to browse commands
              </text>
            </box>
          ) : (
            filtered.map((cmd, i) => {
              const isSelected = i === selectedIndex;
              return (
                <box
                  key={cmd.value}
                  flexDirection="row"
                  alignItems="center"
                  paddingX={1}
                  height={1}
                  overflow="hidden"
                  backgroundColor={
                    isSelected ? colors.accentMuted : undefined
                  }
                  onMouseMove={() => onSelect(i)}
                  onMouseDown={() => {
                    onSelect(i);
                    onExecute(i);
                  }}
                >
                  <box width={COMMAND_COL_WIDTH} flexShrink={0}>
                    <text
                      selectable={false}
                      attributes={isSelected ? TextAttributes.BOLD : undefined}
                      fg={isSelected ? colors.primary : colors.text}
                    >
                      /{cmd.name}
                    </text>
                  </box>
                  <box flexGrow={1} overflow="hidden" flexShrink={1}>
                    <text
                      selectable={false}
                      attributes={TextAttributes.DIM}
                      fg={colors.textMuted}
                    >
                      {cmd.description}
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
