"use client";

import * as React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Thin wrapper: attach a tooltip to any single element without repeating the
// Tooltip/Trigger/Content boilerplate. The child becomes the trigger, so it
// keeps its own markup and gains the accessible aria-describedby link.
export function Tip({
  content,
  side = "top",
  children,
}: {
  content: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  children: React.ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side={side}>{content}</TooltipContent>
    </Tooltip>
  );
}
