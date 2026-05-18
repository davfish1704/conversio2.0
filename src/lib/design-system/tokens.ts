// ─── Conversio Design System Tokens ──────────────────────────────────────────
// Reference: Linear (density, mono, keyboard) + Attio (CRM polish)
// Dark-first. True neutral grays. Single accent (Conversio Blue).
// ────────────────────────────────────────────────────────────────────────────

export const colors = {
  neutral: {
    0:    "#000000",
    50:   "#0a0a0b",
    100:  "#111113",
    150:  "#18181b",
    200:  "#1c1c1f",
    250:  "#232326",
    300:  "#2a2a2e",
    350:  "#323236",
    400:  "#3c3c41",
    450:  "#4a4a50",
    500:  "#5c5c62",
    550:  "#6f6f76",
    600:  "#828289",
    650:  "#96969d",
    700:  "#ababb1",
    750:  "#bfbfc4",
    800:  "#d4d4d8",
    850:  "#e3e3e7",
    900:  "#eeeef1",
    950:  "#f6f6f8",
    1000: "#fcfcfd",
  },
  brand: {
    50:   "#0a1a3d",
    100:  "#0f254f",
    200:  "#143062",
    300:  "#19407d",
    400:  "#1e4d99",
    500:  "#2563eb",
    550:  "#3b82f6",
    600:  "#6099f8",
    650:  "#7facf9",
    700:  "#a3c5fb",
    750:  "#c3dbfd",
    800:  "#dbeafe",
    900:  "#eff6ff",
  },
  success: {
    50:   "#052e16",
    100:  "#0a4220",
    200:  "#0f5a2a",
    300:  "#14783a",
    400:  "#1a8f48",
    500:  "#22c55e",
    600:  "#4ade80",
    700:  "#86efac",
    800:  "#bbf7d0",
    900:  "#dcfce7",
  },
  warning: {
    50:   "#2a1a00",
    100:  "#3d2600",
    200:  "#5c3800",
    300:  "#7a4a00",
    400:  "#995e00",
    500:  "#f59e0b",
    600:  "#fbbf24",
    700:  "#fcd34d",
    800:  "#fde68a",
    900:  "#fef3c7",
  },
  danger: {
    50:   "#2d0a0a",
    100:  "#420f0f",
    200:  "#5c1414",
    300:  "#7a1c1c",
    400:  "#992424",
    500:  "#ef4444",
    600:  "#f87171",
    700:  "#fca5a5",
    800:  "#fecaca",
    900:  "#fee2e2",
  },
} as const

export const semantics = {
  bg: {
    primary:    colors.neutral[50],
    secondary:  colors.neutral[100],
    elevated:   colors.neutral[150],
    overlay:    colors.neutral[200],
    hover:      colors.neutral[250],
  },
  text: {
    primary:    colors.neutral[950],
    secondary:  colors.neutral[650],
    tertiary:   colors.neutral[500],
    inverse:    colors.neutral[50],
    link:       colors.brand[550],
  },
  border: {
    subtle:   colors.neutral[250],
    default:  colors.neutral[350],
    hover:    colors.neutral[450],
    brand:    colors.brand[550],
  },
} as const

export const typography = {
  font: {
    sans: "'Inter', system-ui, -apple-system, sans-serif",
    mono: "'JetBrains Mono', 'SF Mono', ui-monospace, monospace",
  },
  size: {
    caption: "0.625rem",   // 10px
    xs:      "0.75rem",    // 12px
    sm:      "0.8125rem",  // 13px
    base:    "0.875rem",   // 14px
    lg:      "0.9375rem",  // 15px
    xl:      "1.0625rem",  // 17px
    h3:      "1.25rem",    // 20px
    h2:      "1.5rem",     // 24px
    h1:      "1.875rem",   // 30px
  },
  leading: {
    tight:    "1.2",
    normal:   "1.45",
    relaxed:  "1.65",
  },
  tracking: {
    tight:  "-0.02em",
    normal: "0",
    wide:   "0.04em",
  },
} as const

export const spacing = {
  0:   "0px",
  1:   "4px",
  2:   "8px",
  3:   "12px",
  4:   "16px",
  5:   "20px",
  6:   "24px",
  8:   "32px",
  10:  "40px",
  12:  "48px",
  16:  "64px",
  20:  "80px",
  24:  "96px",
} as const

export const radii = {
  none:  "0px",
  sm:    "4px",
  md:    "6px",
  lg:    "8px",
  xl:    "12px",
  full:  "9999px",
} as const

export const shadows = {
  xs:   "0 1px 2px 0 rgba(0,0,0,0.3)",
  sm:   "0 1px 3px 0 rgba(0,0,0,0.35), 0 1px 2px -1px rgba(0,0,0,0.3)",
  md:   "0 4px 6px -1px rgba(0,0,0,0.35), 0 2px 4px -2px rgba(0,0,0,0.3)",
  lg:   "0 10px 15px -3px rgba(0,0,0,0.35), 0 4px 6px -4px rgba(0,0,0,0.3)",
  xl:   "0 20px 25px -5px rgba(0,0,0,0.4), 0 8px 10px -6px rgba(0,0,0,0.3)",
} as const

export const motion = {
  duration: {
    instant:  "50ms",
    fast:     "100ms",
    normal:   "150ms",
    slow:     "250ms",
    reveal:   "400ms",
  },
  easing: {
    default:  "cubic-bezier(0.16, 1, 0.3, 1)",
    linear:   "linear",
    decel:    "cubic-bezier(0, 0, 0.2, 1)",
    accel:    "cubic-bezier(0.4, 0, 1, 1)",
  },
} as const
