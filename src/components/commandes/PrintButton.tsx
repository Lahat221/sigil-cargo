"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function PrintButton() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("print") === "1") {
      window.print();
    }
  }, [searchParams]);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-2 print:hidden"
    >
      Imprimer
    </button>
  );
}
