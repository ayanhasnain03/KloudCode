import type { ReactNode } from "react";

export type DialogConfig = {
  title: string;
  description?: string;
  children: ReactNode;
  hints?: string;
  /** Preferred dialog width in columns. Clamped to terminal size. */
  width?: number;
}
