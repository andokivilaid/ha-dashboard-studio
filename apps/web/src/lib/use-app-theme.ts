"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

/**
 * next-themes reports `resolvedTheme === undefined` until it has mounted, and
 * a naive `=== "dark"` check therefore renders the first frame in the wrong
 * theme — which is what the dashboard renderer paints. Default to the server's
 * choice (dark) and correct from the real `<html>` class after mount.
 */
export function useAppTheme(): "light" | "dark" {
  const { resolvedTheme, theme } = useTheme();
  const [resolved, setResolved] = useState<"light" | "dark">("dark");

  useEffect(() => {
    setResolved(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, [resolvedTheme, theme]);

  return resolved;
}
