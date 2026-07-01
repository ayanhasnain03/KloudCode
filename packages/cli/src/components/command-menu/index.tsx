import type { RefObject } from "react";
import { TextAttributes, type ScrollBoxRenderable } from "@opentui/core";

import { getFilteredCommands } from "./filter-commands";
import { COMMANDS } from "./commands";
import { palette } from "../../theme";


const MAX_VISIBLE_COMMANDS = 8;

const COMMAND_COL_WIDTH = Math.max(...COMMANDS.map((command) => command.name.length)) + 4;


type CommandMenuProps = {
  query: string;
  selectedIndex: number;
  scrollRef: RefObject<ScrollBoxRenderable | null>;
  onSelect: (index: number) => void;
  onExecute: (index: number) => void
}


export function CommandMenu({
  query,
  selectedIndex,
  scrollRef,
  onSelect,
  onExecute
}: CommandMenuProps) {
  const filtered = getFilteredCommands(query);
  const visibleHeight = Math.min(filtered.length, MAX_VISIBLE_COMMANDS);

  if (filtered.length === 0) {
    return (
      <box paddingY={1}>
        <text attributes={TextAttributes.DIM} fg={palette.silverGhost}>No matching commands found</text>
        <text attributes={TextAttributes.DIM} fg={palette.silverGhost}>Type / to see available commands</text>
      </box>
    )
  }
  return (
    <scrollbox ref={scrollRef} height={visibleHeight}>
      {
        filtered.map((cmd, i) => {
          const isSelected = i === selectedIndex;
          return (
            <box key={cmd.value}
              flexDirection="row"
              paddingX={1}
              height={1}
              overflow="hidden"
              backgroundColor={isSelected ? palette.copperMuted : palette.elevated}
              onMouseMove={() => onSelect(i)}
              onMouseDown={() => onSelect(i)}
            >
              <box
                width={COMMAND_COL_WIDTH}
                flexShrink={0}
              >
                <text
                  selectable={false}
                >
                  /{cmd.name}
                </text>

              </box>
              <box
                flexGrow={1}
                overflow="hidden"
                flexShrink={0}
              >
                <text
                  selectable={false}

                >
                  {cmd.description}
                </text>

              </box>
            </box>
          )
        })
      }
    </scrollbox>
  )

}
