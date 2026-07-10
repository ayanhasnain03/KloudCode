import { useCallback, useEffect, useRef } from "react"
import { TextAttributes } from "@opentui/core"
import { useDialog } from "../../providers/dialog"
import { useTheme } from "../../providers/theme"
import { DialogSearchList } from "../dialog-search-list"
import { THEMES, type Theme } from "../../theme"

export const ThemeDialogContent = () => {
  const dialog = useDialog();
  const { setTheme, currentTheme } = useTheme();

  const originalThemeRef = useRef(currentTheme);

  const confirmedRef = useRef(false);


  // revert to original theme if the user dismisses withought confirming



  useEffect(() => {
    return () => {
      if (!confirmedRef.current) {
        setTheme(originalThemeRef.current)
      }
    }
  }, [setTheme])

  const handleSelect = useCallback((theme: Theme) => {
    confirmedRef.current = true;
    setTheme(theme);
    dialog.close();
  }, [setTheme, dialog])

  const handleHighlight = useCallback((theme: Theme) => {
    setTheme(theme)
  }, [setTheme])

  const { colors } = useTheme();

  return (
    <DialogSearchList
      items={THEMES}
      onSelect={handleSelect}
      onHighlight={handleHighlight}
      filterFn={(t, query) => t.name.toLowerCase().includes(query.toLowerCase())}
      renderItem={(theme, isSelected) => {
        const isActive = theme.name === originalThemeRef.current.name;
        return (
          <box flexDirection="row" gap={1} alignItems="center">
            <text
              selectable={false}
              fg={isActive ? colors.primary : colors.textGhost}
            >
              {isActive ? "●" : "·"}
            </text>
            <text
              selectable={false}
              attributes={isSelected ? TextAttributes.BOLD : undefined}
              fg={isSelected ? colors.text : colors.textMuted}
            >
              {theme.name}
            </text>
          </box>
        );
      }}
      getKey={(t) => t.name}
      placeholder="Search themes..."
      emptyText="No matching themes"
    />
  )
}
