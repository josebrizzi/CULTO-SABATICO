"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize } from "lucide-react";

import { cn } from "@/lib/utils";
import { useShowChannel } from "@/lib/show";

/**
 * Pantalla EXCLUSIVA de teleprompter: solo muestra el texto que alguien va a
 * leer, con letra gigante. No tiene botones de lectura ni confirmaciones:
 * todo el avance del scroll se maneja desde el panel de control.
 */
export default function PrompterView() {
  const { state, peerOnline } = useShowChannel("stage");
  const prompter = state.prompter;
  const hasText = prompter.text.trim().length > 0;

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

  /* ─────────────────────── Pantalla completa ─────────────────────────── */
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  /* ───────── Scroll medido: la posición la manda el panel (0..1) ───────── */
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [maxScroll, setMaxScroll] = useState(0);

  useEffect(() => {
    const measure = () => {
      const w = wrapRef.current;
      const i = innerRef.current;
      if (w && i) setMaxScroll(Math.max(0, i.offsetHeight - w.clientHeight));
    };
    // Se vuelve a medir cuando cambia el texto: los refs recién existen
    // después de que el texto entra en pantalla.
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    if (innerRef.current) ro.observe(innerRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [prompter.text]);

  const y = -prompter.offset * maxScroll;

  const baseFont = "min(4.2vw, 6.4vh)";
  const fontSize = `calc(${baseFont} * ${Math.min(3, Math.max(0.5, prompter.fontScale))})`;

  return (
    <div
      className={cn(
        "fixed inset-0 select-none overflow-hidden bg-black text-white",
        !uiVisible && "cursor-none",
      )}
    >
      {/* Etiqueta mínima (no molesta a la lectura) */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 z-20 flex items-center justify-between px-[2.5vw] py-[1.4vh] text-[1.5vh] uppercase tracking-[0.3em] text-zinc-700 transition-opacity duration-300",
          uiVisible ? "opacity-100" : "opacity-0",
        )}
      >
        <span>Teleprompter</span>
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "h-[1.2vh] w-[1.2vh] rounded-full",
              peerOnline ? "bg-emerald-600" : "bg-zinc-700",
            )}
          />
          {peerOnline ? "Conectado" : "Sin panel"}
        </span>
      </div>

      {/* Botón de pantalla completa (único control local, se esconde solo) */}
      <button
        type="button"
        aria-label="Pantalla completa"
        title="Pantalla completa"
        onClick={toggleFullscreen}
        className={cn(
          "absolute right-[1.5vw] top-[4.5vh] z-30 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur transition-all duration-300 hover:bg-white/20",
          uiVisible ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <Maximize className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Esperando texto */}
      {!hasText ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-[6vw] text-center">
          <div className="text-[2.2vh] uppercase tracking-[0.4em] text-zinc-600">
            Teleprompter
          </div>
          <div className="mt-[2.5vh] text-[5.5vh] font-bold leading-tight text-zinc-300">
            Listo para leer
          </div>
          <div className="mt-[3vh] max-w-[52vw] text-[2.3vh] leading-relaxed text-zinc-500">
            Desde el panel de control escribí el texto y tocá{" "}
            <b className="text-zinc-300">“Enviar al teleprompter”</b>. El avance del
            scroll se maneja todo desde ahí, sin tocar esta pantalla.
          </div>
        </div>
      ) : (
        <>
          {/* Texto gigante, desplazado según la posición que manda el panel */}
          <div ref={wrapRef} className="absolute inset-0 overflow-hidden">
            <div
              ref={innerRef}
              className="px-[7vw] pt-[32vh] pb-[60vh]"
              style={{
                transform: `translateY(${y}px)`,
                transition: "transform 380ms cubic-bezier(0.22, 0.61, 0.36, 1)",
              }}
            >
              {prompter.text.split("\n").map((line, i) =>
                line.trim() ? (
                  <p
                    key={i}
                    className="mb-[4.5vh] font-semibold leading-[1.38] text-white"
                    style={{ fontSize, lineHeight: 1.38 }}
                  >
                    {line}
                  </p>
                ) : (
                  <div key={i} className="h-[3vh]" />
                ),
              )}
            </div>
          </div>

          {/* Barra fina de progreso (referencia para el operador) */}
          <div className="absolute inset-x-0 bottom-0 z-20 h-[0.9vh] bg-white/10">
            <div
              className="h-full bg-white/60 transition-[width] duration-300"
              style={{ width: `${Math.round(prompter.offset * 100)}%` }}
            />
          </div>

          {/* Porcentaje mínimo, también para el operador */}
          <div
            className={cn(
              "absolute bottom-[1.6vh] right-[2vw] z-20 text-[1.6vh] tabular-nums text-zinc-600 transition-opacity duration-300",
              uiVisible ? "opacity-100" : "opacity-0",
            )}
          >
            {Math.round(prompter.offset * 100)}%
          </div>
        </>
      )}
    </div>
  );
}
