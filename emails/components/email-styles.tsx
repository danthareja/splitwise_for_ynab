// Shared email styles - Matches app design system
// Fonts: DM Sans (body), Instrument Serif (headings)
// Colors: Warm cream background, slate grays, amber accents

export const colors = {
  // Primary palette
  background: "#FDFBF7",
  foreground: "#1a1a1a",
  muted: "#6b7280",
  border: "#e5e7eb",

  // Accent colors
  amber: "#b45309", // amber-700
  amberLight: "#fef3c7", // amber-100
  amberBorder: "#fde68a", // amber-200

  // Status colors
  emerald: "#059669",
  emeraldLight: "#d1fae5",
  emeraldBorder: "#a7f3d0",
  red: "#dc2626",
  redLight: "#fee2e2",
  redBorder: "#fecaca",
};

export const emailStyles = {
  // Typography
  h1: {
    fontFamily: "'Instrument Serif', Georgia, serif",
    color: colors.foreground,
    fontSize: "28px",
    fontWeight: "400",
    lineHeight: "1.2",
    margin: "0 0 16px 0",
  },

  h2: {
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    color: colors.foreground,
    fontSize: "18px",
    fontWeight: "600",
    lineHeight: "1.4",
    margin: "0 0 12px 0",
  },

  h3: {
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    color: colors.foreground,
    fontSize: "16px",
    fontWeight: "600",
    lineHeight: "1.4",
    margin: "0 0 8px 0",
  },

  text: {
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    color: colors.muted,
    fontSize: "15px",
    lineHeight: "1.6",
    margin: "0 0 16px 0",
  },

  textSmall: {
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    color: colors.muted,
    fontSize: "13px",
    lineHeight: "1.5",
    margin: "0 0 12px 0",
  },

  bulletText: {
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    color: colors.muted,
    fontSize: "15px",
    lineHeight: "1.6",
    margin: "0 0 8px 0",
  },

  // Layout
  section: {
    margin: "24px 0",
  },

  buttonSection: {
    margin: "28px 0",
  },

  // Primary CTA button - amber accent
  button: {
    backgroundColor: colors.foreground,
    borderRadius: "9999px",
    color: "#ffffff",
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: "15px",
    fontWeight: "500",
    textDecoration: "none",
    display: "inline-block",
    padding: "12px 28px",
    border: "none",
  },

  // Secondary button
  buttonSecondary: {
    backgroundColor: "transparent",
    borderRadius: "9999px",
    color: colors.foreground,
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: "14px",
    fontWeight: "500",
    textDecoration: "none",
    display: "inline-block",
    padding: "10px 20px",
    border: `1px solid ${colors.border}`,
  },

  link: {
    color: colors.amber,
    textDecoration: "underline",
    textUnderlineOffset: "2px",
  },

  hr: {
    border: "none",
    borderTop: `1px solid ${colors.border}`,
    margin: "32px 0",
  },

  footer: {
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    color: "#9ca3af",
    fontSize: "13px",
    lineHeight: "1.5",
    margin: "8px 0",
  },

  // Content boxes
  contentBox: {
    backgroundColor: "#ffffff",
    border: `1px solid ${colors.border}`,
    borderRadius: "12px",
    padding: "20px",
    margin: "20px 0",
  },

  highlightBox: {
    backgroundColor: colors.amberLight,
    border: `1px solid ${colors.amberBorder}`,
    borderRadius: "12px",
    padding: "20px",
    margin: "20px 0",
  },

  successBox: {
    backgroundColor: colors.emeraldLight,
    border: `1px solid ${colors.emeraldBorder}`,
    borderRadius: "12px",
    padding: "20px",
    margin: "20px 0",
  },

  errorBox: {
    backgroundColor: colors.redLight,
    border: `1px solid ${colors.redBorder}`,
    borderRadius: "12px",
    padding: "20px",
    margin: "20px 0",
  },

  // Status text
  errorText: {
    fontFamily: "Monaco, Consolas, 'Courier New', monospace",
    color: colors.red,
    fontSize: "13px",
    lineHeight: "1.5",
    margin: "0",
  },

  successText: {
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    color: colors.emerald,
    fontSize: "15px",
    lineHeight: "1.5",
    margin: "0",
  },

  actionText: {
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    color: colors.foreground,
    fontSize: "15px",
    lineHeight: "1.5",
    margin: "0",
    fontWeight: "500",
  },

  warningText: {
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    color: colors.amber,
    fontSize: "15px",
    lineHeight: "1.5",
    margin: "0",
  },

  // Table styles
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "14px",
  },

  tableHeader: {
    backgroundColor: "#f9fafb",
    padding: "10px 12px",
    textAlign: "left" as const,
    fontWeight: "500",
    color: colors.foreground,
    fontSize: "13px",
  },

  tableCell: {
    padding: "10px 12px",
    borderTop: `1px solid ${colors.border}`,
    color: colors.muted,
  },
};
