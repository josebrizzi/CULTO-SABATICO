"use client";

import { useEffect, useState } from "react";

import PanelView from "@/components/panel-view";
import PreacherView from "@/components/preacher-view";
import StageView from "@/components/stage-view";

type View = "panel" | "stage" | "preacher";

function viewFromHash(): View {
  const h = window.location.hash.replace("#", "");
  if (h === "pantalla") return "stage";
  if (h === "predicador") return "preacher";
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

  if (view === "stage") return <StageView />;
  if (view === "preacher") return <PreacherView />;
  return <PanelView />;
}
