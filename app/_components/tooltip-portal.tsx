"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

// Empty subscribe — the hook is only used to return different values
// between server render ("not hydrated") and client render ("hydrated").
const subscribe = (): (() => void) => () => {};
const getClientSnapshot = (): boolean => true;
const getServerSnapshot = (): boolean => false;

/**
 * Renders children into `document.body` via a React portal.
 *
 * Escapes ancestor `overflow: hidden`, `overflow: clip`, and `contain`
 * rules that would otherwise clip a positioned tooltip. Renders nothing
 * during SSR and the initial hydration pass; only mounts the portal on
 * the client.
 */
export function TooltipPortal({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element | null {
  const isClient = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  if (!isClient || typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
