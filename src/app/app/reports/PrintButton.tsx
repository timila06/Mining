"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm font-bold text-stone-700 hover:bg-stone-50 print:hidden"
    >
      <Printer className="h-4 w-4" aria-hidden="true" />
      Print Report
    </button>
  );
}
