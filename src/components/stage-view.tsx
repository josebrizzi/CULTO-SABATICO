"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize, MessageSquare, PanelLeft } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  COLORS,
  cardsActive,
  currentSegment,
  elapsedCurrent,
  fmtHMS,
  fmtMin,
  nextSegment,
  phaseOf,
  remainingCurrent,
  useShowChannel,
} from "@/lib/show";

export default function StageView() {
  const { state, peerOnline } = useShowChannel("stage");

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
  const mode = seg?.layout ?? "timer";
  const live = now > 0 && active;
  const cardsOn = active && cardsActive(seg);

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

  /* ═══ SIN interacciones acá: el guion se muestra estático y los mensajes
     los saca el operador desde el panel (no hay ida y vuelta). ═══ */

  // Atajo local: F = pantalla completa
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyF") toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const goPanel = () => {
    window.location.hash = "#panel";
  };

  /* Tarjeta grande (una sola, con todos los puntos): el tamaño de letra se
     adapta al largo del texto y a la cantidad de renglones */
  function cardFontSize(text: string, lines: number): string {
    const len = text.length;
    const capLenW = len <= 40 ? "9vw" : len <= 90 ? "7.5vw" : len <= 160 ? "6vw" : len <= 260 ? "5vw" : "4vw";
    const capLenH = len <= 40 ? "15vh" : len <= 90 ? "12vh" : len <= 160 ? "9.5vh" : len <= 260 ? "7.5vh" : "6vh";
    const capLinesW = lines <= 1 ? "9vw" : lines <= 3 ? "6.5vw" : lines <= 5 ? "5vw" : lines <= 7 ? "4vw" : "3.2vw";
    const capLinesH = lines <= 1 ? "15vh" : lines <= 3 ? "9.5vh" : lines <= 5 ? "7vh" : lines <= 7 ? "5.6vh" : "4.6vh";
    return `min(${capLenW}, ${capLenH}, ${capLinesW}, ${capLinesH})`;
  }

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

  /* ─────────────────────────── Render ───────────────────────── */

  return (
    <div
      className={cn(
        "fixed inset-0 select-none overflow-hidden bg-black text-white",
        !uiVisible && "cursor-none",
      )}
    >
      {/* Barra superior */}
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

      {/* Esperando conexión con el panel */}
      {!peerOnline ? (
        <div className="absolute bottom-[2.5vh] left-[2vw] z-30 max-w-[30vw] text-[1.6vh] leading-snug text-zinc-600">
          Abrí el Panel de control en otra ventana de este navegador para manejar el
          cronómetro.
        </div>
      ) : null}

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
            <>
              <div className="mt-[5vh] text-[3vh] text-zinc-300">
                Primer momento: <b>{first.title}</b> · {first.minutes} min
              </div>
              <div className="mt-[1.5vh] text-[2.2vh] text-zinc-500">
                Total planificado: {fmtMin(totalMin)}
              </div>
            </>
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

      {/* ── Momento con su tarjeta grande: UNA sola, con todos los puntos ── */}
      {active && cardsOn && seg ? (
        <div className="absolute inset-0 flex flex-col">
          {/* Encabezado */}
          <div className="flex items-center justify-between gap-4 px-[4vw] pt-[6.5vh]">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={cn(
                  "h-[1.8vh] w-[1.8vh] shrink-0 rounded-full",
                  COLORS[seg.color].dot,
                )}
              />
              <div className="truncate text-[3vh] font-bold">{seg.title}</div>
              {state.status === "paused" ? (
                <span className="shrink-0 rounded-full bg-amber-400 px-[1.4vw] py-[0.5vh] text-[1.8vh] font-bold uppercase tracking-widest text-amber-950">
                  En pausa
                </span>
              ) : null}
            </div>
            <div className="shrink-0 text-[2.2vh] font-bold tabular-nums text-zinc-400">
              {seg.bullets.length} {seg.bullets.length === 1 ? "punto" : "puntos"}
            </div>
          </div>

          {/* Tarjeta: todos los puntos juntos, con letra gigante */}
          <div className="flex min-h-0 flex-1 items-center justify-center px-[5vw]">
            <div
              key={seg.id}
              className="animate-card-in max-w-[90vw] text-center font-bold leading-[1.3] text-balance text-white"
              style={{ fontSize: cardFontSize(seg.bullets.join(" "), seg.bullets.length) }}
            >
              {seg.bullets.map((b, i) => (
                <div key={i} className="py-[0.9vh]">
                  {b}
                </div>
              ))}
            </div>
          </div>

          {/* Contador abajo */}
          <div className="shrink-0 border-t border-white/10 bg-zinc-950 px-[4vw] py-[1.8vh]">
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[1.7vh] uppercase tracking-[0.25em] text-zinc-500">
                  Tiempo del momento
                </div>
                <div
                  className={cn(
                    "font-mono font-bold tabular-nums leading-none",
                    counterColor,
                    phase === "overtime" && state.settings.blink && "animate-blink-soft",
                  )}
                  style={{ fontSize: "min(8vw, 11vh)" }}
                >
                  {counterText}
                </div>
              </div>
              <div className="shrink-0 text-right text-[2vh] leading-relaxed text-zinc-500">
                <div>{seg.minutes} min planificados</div>
                <div>
                  {next ? (
                    <>
                      Siguiente: <b className="text-zinc-300">{next.title}</b> ·{" "}
                      {next.minutes} min
                    </>
                  ) : (
                    "Último momento"
                  )}
                </div>
              </div>
            </div>
            <Progress
              value={progressValue}
              className={cn("mt-[1.2vh] h-[0.8vh] bg-white/10", progressClass)}
            />
          </div>
        </div>
      ) : null}

      {/* ── Momento en modo contador grande ── */}
      {active && !cardsOn && mode === "timer" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-[4vw] pb-[6vh] text-center">
          <div className="text-[3.4vh] font-bold tracking-wide text-zinc-200">
            {seg?.title}
          </div>
          {seg?.speaker ? (
            <div className="mt-[0.8vh] text-[2.2vh] text-zinc-500">{seg.speaker}</div>
          ) : null}

          {state.status === "paused" ? (
            <div className="mt-[3vh] rounded-full bg-amber-400 px-[3vw] py-[1vh] text-[2.4vh] font-bold uppercase tracking-widest text-amber-950">
              En pausa
            </div>
          ) : phase === "overtime" ? (
            <div className="mt-[3vh] rounded-full bg-red-600 px-[3vw] py-[1vh] text-[2.4vh] font-bold uppercase tracking-widest text-white">
              Tiempo cumplido
            </div>
          ) : null}

          <div
            className={cn(
              "mt-[1.5vh] font-mono font-bold tabular-nums leading-none",
              counterColor,
              phase === "overtime" && state.settings.blink && "animate-blink-soft",
            )}
            style={{ fontSize: "min(23vw, 30vh)" }}
          >
            {counterText}
          </div>

          <div className="mt-[2vh] text-[2.4vh] text-zinc-500">
            {phase === "overtime"
              ? `Excedente · planificado ${seg?.minutes} min`
              : phase === "warning"
                ? `Quedan menos de ${state.settings.warningMin} min`
                : `${seg?.minutes} min planificados`}
          </div>

          <div className="mt-[4vh] w-[64vw] max-w-[1100px]">
            <Progress value={progressValue} className={cn("h-[1.2vh] bg-white/10", progressClass)} />
          </div>

          {state.settings.showBulletsOnTimer && seg && seg.bullets.length > 0 ? (
            <div className="absolute bottom-[3.5vh] left-[4vw] right-[4vw] flex flex-wrap items-center justify-center gap-2">
              {seg.bullets.map((b, i) => (
                <span
                  key={i}
                  className={cn(
                    "max-w-[46vw] truncate rounded-full border px-[1.6vw] py-[0.8vh] text-[2.1vh]",
                    COLORS[seg.color].chipDark,
                  )}
                  title={b}
                >
                  {b}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── Momento en modo guion + contador abajo ── */}
      {active && !cardsOn && mode === "script" && seg ? (
        <div className="absolute inset-0 flex flex-col">
          <div className="px-[4vw] pt-[6.5vh]">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "h-[1.8vh] w-[1.8vh] rounded-full",
                  COLORS[seg.color].dot,
                )}
              />
              <div className="text-[3vh] font-bold">{seg.title}</div>
              {state.status === "paused" ? (
                <span className="rounded-full bg-amber-400 px-[1.4vw] py-[0.5vh] text-[1.8vh] font-bold uppercase tracking-widest text-amber-950">
                  En pausa
                </span>
              ) : null}
            </div>
            {seg.bullets.length > 0 ? (
              <div className="mt-[1.4vh] flex flex-wrap gap-2">
                {seg.bullets.map((b, i) => (
                  <span
                    key={i}
                    className={cn(
                      "rounded-full border px-[1.4vw] py-[0.7vh] text-[2.1vh] font-medium",
                      COLORS[seg.color].chipDark,
                    )}
                  >
                    {b}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="scrollbar-none mt-[1.5vh] flex-1 overflow-y-auto px-[4vw] pb-[4vh]">
            {seg.script.trim() ? (
              seg.script.split("\n").map((line, i) =>
                line.trim() ? (
                  <p
                    key={i}
                    className="mb-[3.2vh] font-medium text-zinc-100"
                    style={{ fontSize: "min(3.2vw, 4.6vh)", lineHeight: 1.4 }}
                  >
                    {line}
                  </p>
                ) : (
                  <div key={i} className="h-[1.5vh]" />
                ),
              )
            ) : seg.bullets.length > 0 ? (
              <div className="py-[3vh]">
                {seg.bullets.map((b, i) => (
                  <p
                    key={i}
                    className="mb-[4vh] font-bold text-zinc-100"
                    style={{ fontSize: "min(3.8vw, 5.4vh)", lineHeight: 1.35 }}
                  >
                    {i + 1}. {b}
                  </p>
                ))}
              </div>
            ) : (
              <p className="py-[8vh] text-center text-[2.4vh] text-zinc-600">
                El guion de este momento está vacío. Escribilo desde el panel de control.
              </p>
            )}
          </div>

          <div className="shrink-0 border-t border-white/10 bg-zinc-950 px-[4vw] py-[1.8vh]">
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[1.7vh] uppercase tracking-[0.25em] text-zinc-500">
                  Tiempo del momento
                </div>
                <div
                  className={cn(
                    "font-mono font-bold tabular-nums leading-none",
                    counterColor,
                    phase === "overtime" && state.settings.blink && "animate-blink-soft",
                  )}
                  style={{ fontSize: "min(8vw, 11vh)" }}
                >
                  {counterText}
                </div>
              </div>
              <div className="shrink-0 text-right text-[2vh] leading-relaxed text-zinc-500">
                <div>{seg.minutes} min planificados</div>
                <div>
                  {next ? (
                    <>
                      Siguiente: <b className="text-zinc-300">{next.title}</b> ·{" "}
                      {next.minutes} min
                    </>
                  ) : (
                    "Último momento"
                  )}
                </div>
              </div>
            </div>
            <Progress
              value={progressValue}
              className={cn("mt-[1.2vh] h-[0.8vh] bg-white/10", progressClass)}
            />
          </div>
        </div>
      ) : null}

      {/* ── Mensaje del operador ── */}
      {state.message ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-[5vw]">
          <div
            className={cn(
              "animate-pulse-border w-full rounded-[3rem] px-[4vw] py-[5vh] text-center shadow-2xl",
              state.message.urgent ? "bg-red-600 text-white" : "bg-amber-400 text-zinc-950",
            )}
          >
            <div
              className={cn(
                "flex items-center justify-center gap-2 text-[1.9vh] font-bold uppercase tracking-[0.3em]",
                state.message.urgent ? "text-white/80" : "text-zinc-700",
              )}
            >
              <MessageSquare className="h-[2.2vh] w-[2.2vh]" aria-hidden="true" />
              Mensaje del operador
            </div>
            <div
              className="mt-[2.5vh] font-black leading-tight"
              style={{ fontSize: "min(6.5vw, 9vh)" }}
            >
              {state.message.text}
            </div>
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
          <CtlButton label="Volver al panel" onClick={goPanel}>
            <PanelLeft className="h-5 w-5" aria-hidden="true" />
          </CtlButton>
          <CtlButton label="Pantalla completa" onClick={toggleFullscreen}>
            <Maximize className="h-5 w-5" aria-hidden="true" />
          </CtlButton>
        </div>
      </div>
    </div>
  );
}

function CtlButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur transition-colors hover:bg-white/20"
    >
      {children}
    </button>
  );
}
