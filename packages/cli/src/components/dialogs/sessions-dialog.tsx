import { useCallback, useEffect, useState } from "react";
import { TextAttributes } from "@opentui/core";
import { format, formatDistanceToNowStrict, isThisYear, isToday, isYesterday } from "date-fns";
import { useNavigate, useParams } from "react-router";
import { useDialog } from "../../providers/dialog";
import { useToast } from "../../providers/toast";
import { useTheme } from "../../providers/theme";
import { apiClient } from "../../lib/api-client";
import { DialogSearchList } from "../dialog-search-list";
import type { InferResponseType } from "hono/client";
import { LoadingPanel } from "../spinner";

type SessionData = InferResponseType<(typeof apiClient.sessions)["$get"], 200>[number];

function formatSessionTime(value: string | Date): string {
  const date = new Date(value);

  if (isToday(date)) {
    const minutesAgo = (Date.now() - date.getTime()) / 60_000;
    if (minutesAgo < 1) return "just now";
    if (minutesAgo < 60) {
      return formatDistanceToNowStrict(date, { addSuffix: true });
    }
    return format(date, "h:mm a");
  }

  if (isYesterday(date)) return "Yesterday";

  if (isThisYear(date)) return format(date, "MMM d");

  return format(date, "MMM d, yyyy");
}

function shortenPath(cwd: string | null | undefined): string | null {
  if (!cwd) return null;
  const home = process.env.HOME || process.env.USERPROFILE;
  const normalized = home && cwd.startsWith(home) ? `~${cwd.slice(home.length)}` : cwd;
  const parts = normalized.replace(/\\/g, "/").split("/").filter(Boolean);
  if (parts.length <= 2) return normalized.replace(/\\/g, "/");
  return `…/${parts.slice(-2).join("/")}`;
}

export const SessionDialog = () => {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const { close } = useDialog();
  const navigate = useNavigate();
  const { show } = useToast();
  const { colors } = useTheme();
  const { id: currentSessionId } = useParams<{ id: string }>();

  useEffect(() => {
    let ignore = false;

    const fetchSessions = async () => {
      try {
        const res = await apiClient.sessions.$get();
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          const message =
            body && typeof body === "object" && "error" in body && typeof body.error === "string"
              ? body.error
              : "Failed to load sessions";
          throw new Error(message);
        }
        const data = await res.json();
        if (!ignore) {
          setSessions(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      } catch (error) {
        if (!ignore) {
          show({
            variant: "error",
            message: error instanceof Error ? error.message : "An unknown error occurred",
          });
          setLoading(false);
          close();
        }
      }
    };

    fetchSessions();
    return () => {
      ignore = true;
    };
  }, [close, show]);

  const handleSelect = useCallback((session: SessionData) => {
    close();
    if (session.id === currentSessionId) return;
    navigate(`/sessions/${session.id}`);
    // writeLastSessionId is handled by Session screen on mount
  }, [close, navigate, currentSessionId]);

  if (loading) {
    return (
      <box height={6} width="100%" justifyContent="center">
        <LoadingPanel message="Loading sessions…" />
      </box>
    );
  }

  const emptyText =
    sessions.length === 0
      ? "No sessions yet — start a conversation"
      : "No matching sessions";

  return (
    <DialogSearchList
      items={sessions}
      onSelect={handleSelect}
      defaultSelectedKey={currentSessionId}
      filterFn={(session, query) => {
        const q = query.toLowerCase();
        return (
          session.title.toLowerCase().includes(q) ||
          (session.cwd?.toLowerCase().includes(q) ?? false)
        );
      }}
      renderItem={(session, isSelected) => {
        const isActive = session.id === currentSessionId;
        const path = shortenPath(session.cwd);
        const time = formatSessionTime(session.updatedAt ?? session.createdAt);

        return (
          <box
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            width="100%"
            gap={1}
          >
            <box flexDirection="row" alignItems="center" gap={1} flexGrow={1} overflow="hidden">
              <text
                selectable={false}
                fg={isActive ? colors.primary : colors.textGhost}
              >
                {isActive ? "●" : "·"}
              </text>
              <text
                selectable={false}
                attributes={isSelected || isActive ? TextAttributes.BOLD : undefined}
                fg={isSelected ? colors.text : isActive ? colors.text : colors.textMuted}
              >
                {session.title}
              </text>
              {path && (
                <text selectable={false} fg={colors.textGhost} attributes={TextAttributes.DIM}>
                  {path}
                </text>
              )}
            </box>
            <box flexShrink={0}>
              <text
                selectable={false}
                fg={isSelected ? colors.textMuted : colors.textGhost}
                attributes={TextAttributes.DIM}
              >
                {time}
              </text>
            </box>
          </box>
        );
      }}
      getKey={(session) => session.id}
      placeholder="Search by title or path…"
      emptyText={emptyText}
      footer={
        sessions.length > 0 ? (
          <text attributes={TextAttributes.DIM} fg={colors.textGhost}>
            {currentSessionId
              ? "● current session · enter to open"
              : "enter to open · esc to close"}
          </text>
        ) : undefined
      }
    />
  );
};
