import { useCallback, useEffect, useRef } from "react"
import { TextAttributes } from "@opentui/core"
import { useDialog } from "../../providers/dialog"
import { useTheme } from "../../providers/theme"
import { DialogSearchList } from "../dialog-search-list"
import { THEMES, type Theme } from "../../theme"
import { Mode } from "@kloud-code/database/enums";
const AVAILABLE_MODES: Mode[] = ["BUILD", "PLAN"];
type AgentsDialogContentProps = {
  currentMode: Mode;
  onSelect: (mode: Mode) => void;
}
function getModeLabel(mode: Mode): string {
  return mode === Mode.BUILD ? "Build" : "Plan";
}
export const AgentsDialogContent = ({ currentMode, onSelect }: AgentsDialogContentProps) => {
  const { colors } = useTheme();
  const dialog = useDialog();

  const handleSelect = useCallback((nextMode: Mode) => {
    onSelect(nextMode);
    dialog.close();
  }, [onSelect, dialog])



  return (
    <DialogSearchList
      items={AVAILABLE_MODES}
      onSelect={handleSelect}

      filterFn={(item, query) => getModeLabel(item).toLowerCase().includes(query.toLowerCase())}
      renderItem={(mode, isSelected) => {
        return (
          <box
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            width="100%"
            gap={1}
          >
            <box flexDirection="row" gap={1} alignItems="center" flexGrow={1} overflow="hidden">
              <text
                selectable={false}
                fg={
                  isSelected
                    ? colors.primary
                    : colors.textGhost
                }
              >
                {
                  isSelected ? "›" : currentMode === mode ? "●" : "·"
                }
              </text>
              <text
                selectable={false}
                attributes={isSelected ? TextAttributes.BOLD : undefined}
                fg={colors.text}
              >
                {getModeLabel(mode)}
              </text>
            </box>


          </box>
        );
      }}
      getKey={(mode) => mode}
      placeholder="Choose a mode…"
      emptyText="No modes match"
      footer={
        <box
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          width="100%"
          gap={1}
        >
          <text attributes={TextAttributes.DIM} fg={colors.textGhost}>↑↓ to wander</text>
          <text attributes={TextAttributes.DIM} fg={colors.textGhost}>enter to keep · esc undoes</text>
        </box>
      }
    />
  )
}
