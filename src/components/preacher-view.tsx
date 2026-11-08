"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize, PanelLeft } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  COLORS,
  currentSegment,
  elapsedCurrent,
  fmtHMS,
  fmtMin,
  nextSegment,
  phaseOf,
  remainingCurrent,
  useShowChannel,
} from "@/lib/show";

/**
 * Pantalla del PREDICADOR: solo lo que él necesita.
 * - La pastilla grande con el nombre del momento actual.
 * - El tiempo grande, abajo.
 * Sin mensajes del operador y sin tarjetas: eso queda en la pantalla de
 * proyección (#pantalla).
 */
export default function PreacherView() {
  const { state } = useShowChannel("stage");

  const [now, setNow] = useState(0);
  useEffect(() => {
    const first = window.setTimeout(() => setNow(Date.now()), 0);
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);

  const seg = currentSegment(state);
  const next = nextSegment(state);
  const active = state.currentIndex >= 0 && seg !== null;
  const totalMs = (seg?.minutes ?? 0) * 60000;
  const elapsed = active ? elapsedCurrent(state, now) : 0;
  const remaining = active ? totalMs - elapsed : 0;
  const overtimeMs = active ? Math.max(0, elapsed - totalMs) : 0;
  const phase = active ? phaseOf(remaining, state.settings.warningMin) : "idle";
  const live = now > 0 && active;

  const counterText = live
    ? phase === "overtime"
      ? `+${fmtHMS(Math.floor(overtimeMs / 1000))}`
      : fmtHMS(Math.ceil(remaining / 1000))
    : "--:--";

  const counterColor =
    phase === "overtime"
      ? "text-red-500"
      : phase === "warning"
        ? "text-amber-300"
        : "text-white";

  const progressValue = totalMs > 0 ? Math.min(100, (elapsed / totalMs) * 100) : 0;
  const progressClass =
    phase === "overtime"
      ? "[&>div]:bg-red-500"
      : phase === "warning"
        ? "[&>div]:bg-amber-400"
        : "[&>div]:bg-white/80";

  /* ─────────────── Ocultar cursor y controles al inactividad ─────────────── */

  const [uiVisible, setUiVisible] = useState(true);
  const hideTimerRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    const poke = () => {
      setUiVisible(true);
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = window.setTimeout(() => setUiVisible(false), 3000);
    };
    poke();
    window.addEventListener("mousemove", poke);
    window.addEventListener("touchstart", poke);
    return () => {
      window.clearTimeout(hideTimerRef.current);
      window.removeEventListener("mousemove", poke);
      window.removeEventListener("touchstart", poke);
    };
  }, []);

  /* ─────────────────────────── Pantalla completa ─────────────────────────── */

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyF") toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ────────────── Evitar que la pantalla entre en reposo ────────────── */

  useEffect(() => {
    const nav = navigator as Navigator & {
      wakeLock?: { request(type: "screen"): Promise<{ release(): Promise<void> }> };
    };
    let lock: { release(): Promise<void> } | null = null;
    const req = async () => {
      try {
        lock = (await nav.wakeLock?.request("screen")) ?? null;
      } catch {
        lock = null;
      }
    };
    req();
    const onVis = () => {
      if (document.visibilityState === "visible") req();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      lock?.release().catch(() => {});
    };
  }, []);

  const goPanel = () => {
    window.location.hash = "#panel";
  };

  const first = state.segments[0];
  const totalMin = state.segments.reduce((a, x) => a + x.minutes, 0);

  const statusLabel =
    state.status === "finished"
      ? "Finalizado"
      : !active
        ? "En espera"
        : state.status === "running"
          ? phase === "overtime"
            ? "Tiempo cumplido"
            : "En vivo"
          : "En pausa";

  return (
    <div
      className={cn(
        "fixed inset-0 select-none overflow-hidden bg-black text-white",
        !uiVisible && "cursor-none",
      )}
    >
      {/* Barra superior discreta */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-[2.5vw] py-[1.6vh] text-[1.8vh] text-zinc-500">
        <span className="font-medium uppercase tracking-[0.3em]">
          {state.serviceTitle}
        </span>
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "h-[1.4vh] w-[1.4vh] rounded-full",
              state.status === "running"
                ? "animate-pulse bg-red-500"
                : state.status === "paused"
                  ? "bg-amber-400"
                  : "bg-zinc-600",
            )}
          />
          {statusLabel}
        </span>
      </div>

      {/* ── Culto sin iniciar ── */}
      {!active && state.status !== "finished" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-[6vw] text-center">
          <div className="text-[2.2vh] uppercase tracking-[0.4em] text-zinc-500">
            {state.serviceTitle}
          </div>
          <div className="mt-[2.5vh] text-[6.5vh] font-bold leading-tight">
            El culto comienza pronto
          </div>
          {first ? (
            <div className="mt-[4vh] text-[2.6vh] text-zinc-400">
              Primer momento: <b>{first.title}</b> · {first.minutes} min · total{" "}
              {fmtMin(totalMin)}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── Culto finalizado ── */}
      {state.status === "finished" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="text-[7vh] font-bold">Culto finalizado</div>
          <div className="mt-[2vh] text-[2.5vh] text-zinc-500">
            Reiniciá desde el panel de control para un nuevo culto.
          </div>
        </div>
      ) : null}

      {/* ── Pastilla grande del momento + tiempo grande abajo ── */}
      {active && seg ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-[4vw] pb-[5vh] text-center">
          {/* Pastilla grande */}
          <div
            key={seg.id}
            className={cn(
              "animate-card-in max-w-[92vw] rounded-full border-2 px-[5vw] py-[2.6vh] font-black uppercase leading-none tracking-wide",
              "truncate",
              COLORS[seg.color].chipDark,
            )}
            style={{ fontSize: "min(6.2vw, 8.5vh)" }}
          >
            {seg.title}
          </div>

          {seg.speaker ? (
            <div className="mt-[1.6vh] text-[2.2vh] text-zinc-500">{seg.speaker}</div>
          ) : null}

          {state.status === "paused" ? (
            <div className="mt-[2.4vh] rounded-full bg-amber-400 px-[3vw] py-[0.9vh] text-[2.3vh] font-bold uppercase tracking-widest text-amber-950">
              En pausa
            </div>
          ) : phase === "overtime" ? (
            <div className="mt-[2.4vh] rounded-full bg-red-600 px-[3vw] py-[0.9vh] text-[2.3vh] font-bold uppercase tracking-widest text-white">
              Tiempo cumplido
            </div>
          ) : null}

          {/* El tiempo, abajo de la pastilla */}
          <div
            className={cn(
              "mt-[1.2vh] font-mono font-bold tabular-nums leading-none",
              counterColor,
              phase === "overtime" && state.settings.blink && "animate-blink-soft",
            )}
            style={{ fontSize: "min(22vw, 29vh)" }}
          >
            {counterText}
          </div>

          <div className="mt-[1.8vh] text-[2.2vh] text-zinc-500">
            {phase === "overtime"
              ? `Excedente · planificado ${seg.minutes} min`
              : phase === "warning"
                ? `Quedan menos de ${state.settings.warningMin} min`
                : `${seg.minutes} min planificados`}
          </div>

          <div className="mt-[3.5vh] w-[58vw] max-w-[1000px]">
            <Progress
              value={progressValue}
              className={cn("h-[1.1vh] bg-white/10", progressClass)}
            />
          </div>

          <div className="mt-[2.6vh] text-[2vh] text-zinc-500">
            {next ? (
              <>
                Siguiente: <b className="text-zinc-300">{next.title}</b> · {next.minutes} min
              </>
            ) : (
              "Último momento del culto"
            )}
          </div>
        </div>
      ) : null}

      {/* ── Controles flotantes (se ocultan solos) ── */}
      <div
        className={cn(
          "absolute bottom-[2.5vh] right-[1.5vw] z-[60] flex flex-col items-end gap-2 transition-opacity duration-300",
          uiVisible ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Volver al panel"
            title="Volver al panel"
            onClick={goPanel}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur transition-colors hover:bg-white/20"
          >
            <PanelLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Pantalla completa"
            title="Pantalla completa"
            onClick={toggleFullscreen}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur transition-colors hover:bg-white/20"
          >
            <Maximize className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
