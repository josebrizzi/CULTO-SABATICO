"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Maximize,
  PanelLeft,
  Settings2,
  X,
} from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  BIBLIA_URL_DEFECTO,
  abreviarVersion,
  referenciaDelVerso,
  textoDelVerso,
  urlBibliaGuardada,
  guardarUrlBiblia,
  useBibliaSocket,
} from "@/lib/biblia";
import {
  COLORS,
  currentSegment,
  elapsedCurrent,
  fmtHMS,
  fmtMin,
  nextSegment,
  phaseOf,
  useShowChannel,
} from "@/lib/show";

/**
 * Pantalla del PREDICADOR:
 * - Arriba: la letra bíblica que el predicador elige en "Biblia Sincronizada"
 *   (admin.html de su otra app); llega por WebSocket en vivo.
 * - Abajo: la pastilla con el momento actual y el tiempo grande.
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

  /* ───────────── Biblia Sincronizada (WebSocket) ───────────── */

  const [urlConf, setUrlConf] = useState<string | null>(null);
  useEffect(() => {
    setUrlConf(urlBibliaGuardada());
  }, []);
  const urlBiblia = urlConf ?? BIBLIA_URL_DEFECTO;

  const { estado, mensaje, ocultar } = useBibliaSocket(urlBiblia);

  const [confAbierta, setConfAbierta] = useState(false);
  const [inputUrl, setInputUrl] = useState(BIBLIA_URL_DEFECTO);
  const abrirConf = () => {
    setInputUrl(urlBiblia);
    setConfAbierta((v) => !v);
  };
  const aplicarUrl = () => {
    const limpia = inputUrl.trim();
    if (!limpia) return;
    guardarUrlBiblia(limpia);
    setUrlConf(limpia);
  };

  const textoBibliaRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (textoBibliaRef.current) textoBibliaRef.current.scrollTop = 0;
  }, [mensaje]);

  const estadoBibliaLabel =
    estado === "conectado"
      ? "Biblia conectada"
      : estado === "conectando"
        ? "Biblia: conectando…"
        : "Biblia: sin conexión";

  /* ─────────────────────────── Reloj del culto ─────────────────────────── */

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

  const conBiblia = mensaje !== null;

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

  /* ───────── Bloque compacto de tiempo (cuando hay Biblia arriba) ───────── */

  const bloqueTiempoCompacto =
    active && seg ? (
      <div className="flex shrink-0 flex-col items-center pb-[2.6vh] text-center">
        <div
          key={seg.id}
          className={cn(
            "animate-card-in max-w-[90vw] truncate rounded-full border-2 px-[4vw] py-[1.3vh] font-black uppercase leading-none tracking-wide",
            COLORS[seg.color].chipDark,
          )}
          style={{ fontSize: "min(3vw, 4.2vh)" }}
        >
          {seg.title}
        </div>

        {state.status === "paused" ? (
          <div className="mt-[1.2vh] rounded-full bg-amber-400 px-[2.6vw] py-[0.6vh] text-[2vh] font-bold uppercase tracking-widest text-amber-950">
            En pausa
          </div>
        ) : phase === "overtime" ? (
          <div className="mt-[1.2vh] rounded-full bg-red-600 px-[2.6vw] py-[0.6vh] text-[2vh] font-bold uppercase tracking-widest text-white">
            Tiempo cumplido
          </div>
        ) : null}

        <div
          className={cn(
            "mt-[0.8vh] font-mono font-bold tabular-nums leading-none",
            counterColor,
            phase === "overtime" && state.settings.blink && "animate-blink-soft",
          )}
          style={{ fontSize: "min(10.5vw, 13.5vh)" }}
        >
          {counterText}
        </div>

        <div className="mt-[1.4vh] w-[46vw] max-w-[820px]">
          <Progress
            value={progressValue}
            className={cn("h-[0.9vh] bg-white/10", progressClass)}
          />
        </div>
      </div>
    ) : null;

  /* ─────────────────────── Área de la letra bíblica ─────────────────────── */

  const areaBiblia = mensaje ? (
    <div className="relative flex min-h-0 flex-1 flex-col px-[6vw] pb-[1.5vh] pt-[6.5vh]">
      {/* Botón para quitar el texto (solo afecta esta pantalla) */}
      <button
        type="button"
        aria-label="Quitar el texto bíblico de esta pantalla"
        title="Quitar el texto de esta pantalla"
        onClick={ocultar}
        className={cn(
          "absolute right-[1.5vw] top-[6vh] z-30 grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur transition-opacity duration-300 hover:bg-white/20",
          uiVisible ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>

      {mensaje.kind === "verso" ? (
        <>
          <div
            key={`${referenciaDelVerso(mensaje.verso)}-${abreviarVersion(mensaje.verso.version)}`}
            className="animate-card-in shrink-0 font-bold uppercase tracking-[0.12em] text-amber-300"
            style={{ fontSize: "min(3.4vw, 4.6vh)" }}
          >
            {referenciaDelVerso(mensaje.verso)}
            {mensaje.verso.version ? (
              <span className="ml-[1.2vw] font-semibold tracking-normal text-amber-200/70">
                · {abreviarVersion(mensaje.verso.version)}
              </span>
            ) : null}
          </div>
          <div
            ref={textoBibliaRef}
            key={`t-${referenciaDelVerso(mensaje.verso)}-${abreviarVersion(mensaje.verso.version)}`}
            className="animate-card-in mt-[1.6vh] min-h-0 flex-1 overflow-y-auto font-semibold leading-[1.28] text-white"
            style={{ fontSize: "min(4.4vw, 5.6vh)" }}
          >
            {textoDelVerso(mensaje.verso)}
          </div>
        </>
      ) : (
        <>
          <div className="animate-card-in shrink-0 font-bold uppercase tracking-[0.12em] text-amber-300" style={{ fontSize: "min(3.4vw, 4.6vh)" }}>
            Cita
          </div>
          <div
            ref={textoBibliaRef}
            className="animate-card-in mt-[1.6vh] min-h-0 flex-1 overflow-y-auto font-semibold leading-[1.28] text-white [&_em]:text-amber-200 [&_strong]:text-amber-200"
            style={{ fontSize: "min(4.4vw, 5.6vh)" }}
            dangerouslySetInnerHTML={{ __html: mensaje.html }}
          />
        </>
      )}
    </div>
  ) : null;

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
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5" title={estadoBibliaLabel}>
            <BookOpen
              className={cn(
                "h-[1.9vh] w-[1.9vh]",
                estado === "conectado"
                  ? "text-emerald-400"
                  : estado === "conectando"
                    ? "text-amber-400"
                    : "text-zinc-600",
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                "h-[1.2vh] w-[1.2vh] rounded-full",
                estado === "conectado"
                  ? "animate-pulse bg-emerald-400"
                  : estado === "conectando"
                    ? "bg-amber-400"
                    : "bg-zinc-600",
              )}
            />
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
        </span>
      </div>

      {/* ═══ Con letra bíblica: texto arriba + tiempo abajo ═══ */}
      {conBiblia ? (
        <div className="absolute inset-0 flex flex-col">
          {areaBiblia}
          {bloqueTiempoCompacto}
        </div>
      ) : (
        <>
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
        </>
      )}

      {/* ── Configuración de Biblia Sincronizada ── */}
      <div
        className={cn(
          "absolute bottom-[13.5vh] right-[1.5vw] z-[60] transition-opacity duration-300",
          uiVisible && confAbierta ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="w-[330px] max-w-[86vw] space-y-2 rounded-xl border border-white/15 bg-black/85 p-3.5 text-left backdrop-blur">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-300">
            <BookOpen className="h-4 w-4" aria-hidden="true" /> Biblia Sincronizada
          </div>
          <input
            aria-label="Dirección del servidor de Biblia Sincronizada"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") aplicarUrl();
            }}
            placeholder="https://biblia-sincronizada.onrender.com"
            className="h-9 w-full rounded-md border border-white/20 bg-white/10 px-2.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-emerald-400/60"
            spellCheck={false}
          />
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={aplicarUrl}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
            >
              Conectar
            </button>
            <span
              className={cn(
                "text-xs",
                estado === "conectado"
                  ? "text-emerald-400"
                  : estado === "conectando"
                    ? "text-amber-400"
                    : "text-zinc-400",
              )}
            >
              {estadoBibliaLabel}
            </span>
          </div>
          <p className="text-[11px] leading-snug text-zinc-500">
            Los versículos que elijas en <b>admin.html</b> de Biblia Sincronizada
            aparecen acá en vivo, con el contador abajo. La primera conexión puede
            demorar un minuto si el servidor estaba dormido.
          </p>
        </div>
      </div>

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
            aria-label="Configurar Biblia Sincronizada"
            title="Configurar Biblia Sincronizada"
            onClick={abrirConf}
            className={cn(
              "grid h-11 w-11 place-items-center rounded-full border backdrop-blur transition-colors",
              confAbierta
                ? "border-emerald-400/60 bg-emerald-600/30 text-emerald-200"
                : "border-white/20 bg-black/60 text-white hover:bg-white/20",
            )}
          >
            <Settings2 className="h-5 w-5" aria-hidden="true" />
          </button>
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
