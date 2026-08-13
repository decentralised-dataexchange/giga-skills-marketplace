"use client";

// The one alert used everywhere: MUI Alert with the app's font and radius.
// Toasts and inline notices both render through this wrapper.
import type { ReactNode } from "react";
import MuiAlert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";

export type NoticeSeverity = "error" | "warning" | "info" | "success";

export function Notice({
  severity,
  title,
  onClose,
  className,
  children,
}: {
  severity: NoticeSeverity;
  title?: ReactNode;
  onClose?: () => void;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <MuiAlert
      severity={severity}
      onClose={onClose}
      className={className}
      sx={{
        fontFamily: "inherit",
        fontSize: 14,
        borderRadius: "10px",
        alignItems: "flex-start",
        "& .MuiAlertTitle-root": {
          fontFamily: "inherit",
          fontWeight: 600,
          fontSize: 14,
          marginBottom: children ? "2px" : 0,
        },
        "& .MuiAlert-message": { fontFamily: "inherit", overflowWrap: "anywhere" },
      }}
    >
      {title && <AlertTitle>{title}</AlertTitle>}
      {children}
    </MuiAlert>
  );
}
