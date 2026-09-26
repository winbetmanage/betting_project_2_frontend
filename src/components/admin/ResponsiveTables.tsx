"use client";

import { useEffect } from "react";

function labelTables(scope: ParentNode) {
  scope.querySelectorAll("table.admin-cards, table.stripe-table").forEach((t) => {
    const heads = Array.from(t.querySelectorAll(":scope > thead th")).map((th) => (th.textContent ?? "").trim());
    t.querySelectorAll(":scope > tbody > tr").forEach((tr) => {
      Array.from(tr.children).forEach((td, i) => {
        const cell = td as HTMLTableCellElement;
        if (cell.colSpan > 1) {
          cell.removeAttribute("data-label");
          return;
        }
        const lbl = heads[i] ?? "";
        if (lbl) cell.setAttribute("data-label", lbl);
        else cell.removeAttribute("data-label");
      });
    });
  });
}

/**
 * Mount once in a console layout: keeps every table.admin-cards / table.stripe-table
 * labelled so the mobile CSS (globals.css) can render rows as cards with column
 * captions. Desktop rendering is unaffected (labels are inert without the media query).
 */
export function ResponsiveTables({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    labelTables(document);
    let queued = false;
    const mo = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        labelTables(document);
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);
  return <>{children}</>;
}
