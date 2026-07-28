import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { TextAttributes, type InputRenderable, type ScrollBoxRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useKeyboardLayer } from "../providers/keyboard-layer";
import { useTheme } from "../providers/theme";


const MAX_VISIBLE_ITEMS = 8;

type DialogSearchListProps<T> = {
  items: T[];
  onSelect: (item: T) => void;
  onHighlight?: (item: T) => void;
  filterFn: (item: T, query: string) => boolean;
  renderItem: (item: T, isSelected: boolean) => ReactNode;
  getKey: (item: T) => string;
  placeholder?: string;
  emptyText?: string;
  /** Prefer selecting this key when items load / search resets. */
  defaultSelectedKey?: string;
  /** Optional content rendered above the search field. */
  header?: ReactNode;
  footer?: ReactNode;
};

function indexForKey<T>(
  items: T[],
  getKey: (item: T) => string,
  key: string | undefined,
): number {
  if (!key) return 0;
  const idx = items.findIndex((item) => getKey(item) === key);
  return idx >= 0 ? idx : 0;
}

export function DialogSearchList<T>({
  items,
  onSelect,
  onHighlight,
  filterFn,
  renderItem,
  getKey,
  placeholder = "Search",
  emptyText = "No results",
  defaultSelectedKey,
  header,
  footer,
}: DialogSearchListProps<T>) {
  const { colors } = useTheme();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchValue, setSearchValue] = useState("");
  const inputRef = useRef<InputRenderable>(null);
  const scrollRef = useRef<ScrollBoxRenderable>(null);
  const { isTopLayer } = useKeyboardLayer();
  const didInitSelection = useRef(false);
  const lastHighlightedKey = useRef<string | null>(null);
  const onHighlightRef = useRef(onHighlight);
  onHighlightRef.current = onHighlight;

  const filtered = useMemo(
    () => (searchValue ? items.filter((item) => filterFn(item, searchValue)) : items),
    [items, searchValue, filterFn],
  );

  const highlightItem = useCallback((item: T | undefined) => {
    if (!item) return;
    const key = getKey(item);
    if (lastHighlightedKey.current === key) return;
    lastHighlightedKey.current = key;
    onHighlightRef.current?.(item);
  }, [getKey]);

  // Prefer the active/default key once items arrive (async lists).
  useEffect(() => {
    if (didInitSelection.current || items.length === 0) return;
    didInitSelection.current = true;
    const next = indexForKey(items, getKey, defaultSelectedKey);
    setSelectedIndex(next);
    highlightItem(items[next]);

    const sb = scrollRef.current;
    if (sb && next > 0) {
      const viewportHeight = Math.min(items.length, MAX_VISIBLE_ITEMS);
      if (next >= viewportHeight) {
        sb.scrollTo(Math.max(0, next - viewportHeight + 1));
      }
    }
  }, [items, getKey, defaultSelectedKey, highlightItem]);

  const handleContentChange = useCallback(() => {
    const text = inputRef.current?.value ?? "";
    const nextFiltered = text
      ? items.filter((item) => filterFn(item, text))
      : items;

    setSearchValue(text);
    setSelectedIndex(0);
    lastHighlightedKey.current = null;
    highlightItem(nextFiltered[0]);

    const scrollbox = scrollRef.current;
    if (scrollbox) {
      scrollbox.scrollTo(0);
    }
  }, [items, filterFn, highlightItem]);

  const visibleHeight = Math.min(Math.max(filtered.length, 1), MAX_VISIBLE_ITEMS);

  useKeyboard((key) => {
    if (!isTopLayer("dialog")) return;

    if (key.name === "return" || key.name === "enter") {
      const item = filtered[selectedIndex];
      if (item) {
        onSelect(item);
      }
    } else if (key.name === "up") {
      setSelectedIndex((i) => {
        const newIndex = Math.max(0, i - 1);
        const sb = scrollRef.current;
        if (sb && newIndex < sb.scrollTop) {
          sb.scrollTo(newIndex);
        }
        highlightItem(filtered[newIndex]);
        return newIndex;
      });
    } else if (key.name === "down") {
      setSelectedIndex((i) => {
        const newIndex = Math.min(filtered.length - 1, i + 1);
        const sb = scrollRef.current;
        if (sb) {
          const viewportHeight = sb.viewport.height;
          const visibleEnd = sb.scrollTop + viewportHeight - 1;
          if (newIndex > visibleEnd) {
            sb.scrollTo(newIndex - viewportHeight + 1);
          }
        }
        highlightItem(filtered[newIndex]);
        return newIndex;
      });
    }
  });

  return (
    <box flexDirection="column" gap={0}>
      {header && (
        <>
          <box paddingX={1} paddingY={0}>
            {header}
          </box>
          <box height={1} width="100%" backgroundColor={colors.borderSoft} />
        </>
      )}

      <box
        flexDirection="row"
        alignItems="center"
        gap={1}
        paddingX={1}
        height={1}
      >
        <text attributes={TextAttributes.DIM} fg={colors.textGhost}>
          /
        </text>
        <box flexGrow={1}>
          <input
            ref={inputRef}
            placeholder={placeholder}
            focused
            onContentChange={handleContentChange}
          />
        </box>
        {filtered.length > 0 && (
          <text attributes={TextAttributes.DIM} fg={colors.textGhost}>
            {filtered.length}
          </text>
        )}
      </box>

      <box height={1} width="100%" backgroundColor={colors.borderSoft} />

      {filtered.length === 0 ? (
        <box paddingX={1} paddingY={1} height={visibleHeight} justifyContent="center">
          <text attributes={TextAttributes.DIM} fg={colors.textGhost}>
            {emptyText}
          </text>
        </box>
      ) : (
        <scrollbox ref={scrollRef} height={visibleHeight} paddingY={0}>
          {filtered.map((item, i) => {
            const isSelected = i === selectedIndex;
            return (
              <box
                key={getKey(item)}
                flexDirection="row"
                height={1}
                overflow="hidden"
                backgroundColor={isSelected ? colors.accentMuted : undefined}
                onMouseMove={() => {
                  setSelectedIndex(i);
                  highlightItem(item);
                }}
                onMouseDown={() => onSelect(item)}
              >
                <box
                  flexGrow={1}
                  flexDirection="row"
                  alignItems="center"
                  paddingX={1}
                  gap={1}
                >
                  {renderItem(item, isSelected)}
                </box>
              </box>
            );
          })}
        </scrollbox>
      )}

      {footer && (
        <>
          <box height={1} width="100%" backgroundColor={colors.borderSoft} />
          <box paddingX={1} paddingY={0} height={1}>
            {footer}
          </box>
        </>
      )}
    </box>
  );
}
