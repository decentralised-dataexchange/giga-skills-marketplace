"use client";

import * as React from "react";
import Tooltip from "@mui/material/Tooltip";

// The one tooltip used everywhere: a thin MUI Tooltip wrapper so every hover
// detail shares the same look. The child becomes the anchor and keeps its own
// markup. followCursor suits wide anchors (table rows) where a centred bubble
// would float far from the pointer.
export function Tip({
  content,
  side = "top",
  followCursor = false,
  children,
}: {
  content: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  followCursor?: boolean;
  children: React.ReactElement;
}) {
  return (
    <Tooltip
      title={content}
      placement={side}
      arrow
      followCursor={followCursor}
      slotProps={{
        tooltip: {
          sx: {
            fontFamily: "inherit",
            fontSize: 12,
            lineHeight: 1.45,
            maxWidth: 320,
            padding: "6px 10px",
            borderRadius: "6px",
          },
        },
      }}
    >
      {children}
    </Tooltip>
  );
}
