export type ToastVariant = "success" | "error" | "info";

export type ToastOptions = {
  message: string;
  title?: string;
  variant?: ToastVariant;
  duration?: number;
};

export const DEFAULT_DURATION = 3200;

export const VARIANT_DURATION: Record<ToastVariant, number> = {
  success: 2800,
  error: 4200,
  info: 3200,
};
