import { useCallback, useEffect, useRef } from "react"
import { TextAttributes } from "@opentui/core"
import { useDialog } from "../../providers/dialog"
import { useTheme } from "../../providers/theme"
import { DialogSearchList } from "../dialog-search-list"
import { THEMES, type Theme } from "../../theme"

function normalize(value: string): string {
  return value.toLowerCase().replace(/[\s-]/g, "");
}

export const ThemeDialogContent = () => {
  const dialog = useDialog();
  const { setTheme, previewTheme, currentTheme, colors } = useTheme();

  const originalThemeRef = useRef(currentTheme);
  const confirmedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (!confirmedRef.current) {
        previewTheme(originalThemeRef.current)
      }
    }
  }, [previewTheme])

  const handleSelect = useCallback((theme: Theme) => {
    confirmedRef.current = true;
    setTheme(theme);
    dialog.close();
  }, [setTheme, dialog])

  const handleHighlight = useCallback((theme: Theme) => {
    previewTheme(theme)
  }, [previewTheme])

  const filterFn = useCallback(
    (theme: Theme, query: string) => normalize(theme.name).includes(normalize(query)),
    [],
  )

  const savedThemeName = originalThemeRef.current.name;
  const isPreviewing = currentTheme.name !== savedThemeName;

  return (
    <DialogSearchList
      items={THEMES}
      onSelect={handleSelect}
      onHighlight={handleHighlight}
      defaultSelectedKey={savedThemeName}
      filterFn={filterFn}
      renderItem={(theme, isSelected) => {
        const isActive = theme.name === savedThemeName;
        const nameColor = isSelected
          ? theme.colors.primary
          : isActive
            ? colors.text
            : colors.textMuted;

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
                    ? theme.colors.primary
                    : isActive
                      ? colors.primary
                      : colors.textGhost
                }
              >
                {isSelected ? "›" : isActive ? "●" : "·"}
              </text>
              <text
                selectable={false}
                attributes={isSelected ? TextAttributes.BOLD : undefined}
                fg={nameColor}
              >
                {theme.name}
              </text>
            </box>

            {isActive && !isSelected && (
              <box flexShrink={0}>
                <text
                  selectable={false}
                  fg={colors.textGhost}
                  attributes={TextAttributes.DIM}
                >
                  current
                </text>
              </box>
            )}
          </box>
        );
      }}
      getKey={(theme) => theme.name}
      placeholder="Find a theme…"
      emptyText="Nothing matches"
      footer={
        <box
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          width="100%"
          gap={1}
        >
          <text
            attributes={isPreviewing ? undefined : TextAttributes.DIM}
            fg={isPreviewing ? colors.primary : colors.textGhost}
          >
            {isPreviewing ? currentTheme.name : savedThemeName}
          </text>
          <text attributes={TextAttributes.DIM} fg={colors.textGhost}>
            {isPreviewing ? "enter to keep · esc undoes" : "↑↓ to wander"}
          </text>
        </box>
      }
    />
  )
}
