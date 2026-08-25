import type { ExceptionCategory } from "./types";

export const CATEGORY_META: Record<
  ExceptionCategory,
  { label: string; className: string; hex: string }
> = {
  DUPLICATE: {
    label: "Duplicate settlement",
    className: "text-cat-duplicate border-cat-duplicate",
    hex: "#d95926",
  },
  REFUND: {
    label: "Refund (expected)",
    className: "text-cat-refund border-cat-refund",
    hex: "#3987e5",
  },
  ROUNDING: {
    label: "Rounding dust",
    className: "text-cat-rounding border-cat-rounding",
    hex: "#898781",
  },
  UNEXPLAINED: {
    label: "Unexplained",
    className: "text-cat-unexplained border-cat-unexplained",
    hex: "#e66767",
  },
};
