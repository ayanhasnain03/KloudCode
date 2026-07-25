import { useCallback, useEffect, useRef } from "react"
import { TextAttributes } from "@opentui/core"
import { useDialog } from "../../providers/dialog"
import { useTheme } from "../../providers/theme"
import { DialogSearchList } from "../dialog-search-list"
import type { SupportedChatModelId } from "@kloud-code/shared"


type ModelsDialogContentProps = {
  models: SupportedChatModelId[];
  onSelect: (model: SupportedChatModelId) => void;
}


export const ModelsDialogContent = ({ models, onSelect }: ModelsDialogContentProps) => {
  const { colors } = useTheme();
  const dialog = useDialog();

  const handleSelect = useCallback((model: SupportedChatModelId) => {
    onSelect(model);
    dialog.close();
  }, [onSelect, dialog])



  return (
    <DialogSearchList
      items={models}
      onSelect={handleSelect}

      filterFn={(item, query) => item.toLowerCase().includes(query.toLowerCase())}
      renderItem={(model, isSelected) => {
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
                  isSelected ? "›" : "·"
                }
              </text>
              <text
                selectable={false}
                attributes={isSelected ? TextAttributes.BOLD : undefined}
                fg={colors.text}
              >
                {model}
              </text>
            </box>


          </box>
        );
      }}
      getKey={(model) => model}
      placeholder="Choose a model to use…"
      emptyText="No models match"
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
