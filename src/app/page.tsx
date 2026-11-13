"use client";

import { useEffect, useState } from "react";

import PanelView from "@/components/panel-view";
import PreacherView from "@/components/preacher-view";

type View = "panel" | "preacher";

function viewFromHash(): View {
  const h = window.location.hash.replace("#", "");
  // Hay UNA sola pantalla: la del predicador (hace de proyección también).
  // "#pantalla" queda como alias para que los enlaces viejos sigan funcionando.
  if (h === "pantalla" || h === "predicador") return "preacher";
  return "panel";
}

export default function Home() {
  const [view, setView] = useState<View>("panel");

  useEffect(() => {
    const apply = () => setView(viewFromHash());
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  if (view === "preacher") return <PreacherView />;
  return <PanelView />;
}
