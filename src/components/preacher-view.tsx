"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  urlBibliaGuardada,
  guardarUrlBiblia,
  useBibliaSocket,
} from "@/lib/biblia";
import {
  BibliaDisplay,
  COLORS,
  cardsActive,
  currentSegment,
  elapsedCurrent,
  fmtHMS,
  fmtMin,
  nextSegment,
  phaseOf,
  useShowChannel,
} from "@/lib/show";
import { VERSION_APP } from "@/lib/version";

/* useLayoutEffect solo existe en el navegador; en el build estático se usa
   useEffect para que React no proteste al prerenderizar. */
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/* ═════════════ Paginación del texto bíblico (igual que la proyección) ═════════════
   Misma lógica que proyeccion.html de Biblia Sincronizada: máximo 4 renglones
   por parte, cortando en partes casi iguales y prefiriendo cortar después de
   un signo de puntuación (. , ; : ? !). Así el predicador ve EXACTAMENTE las
   mismas partes que se proyectan, y además le avisa al admin (el teléfono)
   cómo quedó cortado el versículo, igual que hacía la pantalla de proyección. */

const MAX_LINEAS = 4;

interface Palabra {
  t: string;
  h: string;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function palabrasAHtml(
  palabras: Palabra[],
  desdeNum: number,
  hastaNum: number,
): string {
  // Acotado defensivo: los rangos viejos pueden ser más largos que el
  // versículo nuevo (por un instante, hasta que se vuelve a medir).
  const hasta = Math.min(Math.max(0, hastaNum), palabras.length);
  const desde = Math.max(0, Math.min(desdeNum, hasta));
  let html = "";
  let colorAbierto = "";
  for (let i = desde; i < hasta; i++) {
    const w = palabras[i];
    if (!w) continue;
    if (w.h && w.h !== colorAbierto) {
      if (colorAbierto) html += "</mark>";
      html += `<mark style="background-color:${w.h}">`;
      colorAbierto = w.h;
    } else if (!w.h && colorAbierto) {
      html += "</mark>";
      colorAbierto = "";
    }
    html += escapeHtml(w.t);
    if (i < hasta - 1) html += " ";
  }
  if (colorAbierto) html += "</mark>";
  return html;
}

/** Corta las palabras en N partes casi iguales, prefiriendo los cortes
    después de signos de puntuación (igual que la proyección). */
function cortarEnN(palabras: Palabra[], N: number): [number, number][] {
  const total = palabras.reduce((a, w) => a + w.t.length + 1, 0);
  const objetivo = total / N;
  const cortes: number[] = [];
  let acc = 0;
  let nextCut = 1;
  for (let i = 0; i < palabras.length && cortes.length < N - 1; i++) {
    acc += palabras[i].t.length + 1;
    if (acc >= objetivo && i < palabras.length - 1) {
      let mejor = i;
      const ventana = Math.max(2, Math.floor(palabras.length * 0.05));
      for (let d = 0; d <= ventana; d++) {
        const izq = i - d;
        const der = i + d;
        if (
          izq > nextCut &&
          izq < palabras.length - 1 &&
          /[.,;:?!]$/.test(palabras[izq - 1].t)
        ) {
          mejor = izq;
          break;
        }
        if (
          der < palabras.length - 1 &&
          der > nextCut &&
          /[.,;:?!]$/.test(palabras[der - 1].t)
        ) {
          mejor = der;
          break;
        }
      }
      cortes.push(mejor);
      nextCut = mejor + 1;
      acc = 0;
    }
  }
  const rangos: [number, number][] = [];
  let desde = 0;
  cortes.forEach((c) => {
    rangos.push([desde, c]);
    desde = c;
  });
  rangos.push([desde, palabras.length]);
  return rangos;
}

/**
 * Pantalla del PREDICADOR — la única pantalla de la app (también hace de
 * proyección). Con un solo monitor se abre esta y listo.
 *
 * - Si el predicador proyecta un versículo desde "Biblia Sincronizada"
 *   (admin.html de su otra app), muestra el texto ARRIBA cortado en partes
 *   de 4 renglones (igual que la proyección), con el badge "Parte X de Y",
 *   y el tiempo del momento abajo (pastilla + contador grande).
 * - Si no hay texto bíblico, muestra el culto como la vieja pantalla de
 *   proyección: tarjeta gigante de avisos, contador grande o guion, más los
 *   mensajes del operador.
 */
export default function PreacherView() {
  const { state, peerOnline, sendAction } = useShowChannel("stage");

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

  const { estado, mensaje, ocultar, enviar } = useBibliaSocket(urlBiblia);

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

  const textoCitaRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (textoCitaRef.current) textoCitaRef.current.scrollTop = 0;
  }, [mensaje]);

  const estadoBibliaLabel =
    estado === "conectado"
      ? "Biblia conectada"
      : estado === "conectando"
        ? "Biblia: conectando…"
        : "Biblia: sin conexión";

  /* ─────────── Palabras del versículo + corte en partes ─────────── */

  const palabrasVerso = useMemo<Palabra[] | null>(() => {
    if (mensaje?.kind !== "verso") return null;
    return (mensaje.verso.words || []).map((w) =>
      typeof w === "string"
        ? { t: w, h: "" }
        : { t: String(w?.t ?? ""), h: String(w?.h ?? "") },
    );
  }, [mensaje]);

  const [divisiones, setDivisiones] = useState<[number, number][]>([]);
  const [parte, setParte] = useState(0);
  const [medidaTick, setMedidaTick] = useState(0);
  const medidorRef = useRef<HTMLDivElement | null>(null);

  // Al cambiar el tamaño de la ventana (o al cargar las fuentes) se vuelve a medir
  useEffect(() => {
    const onResize = () => setMedidaTick((t) => t + 1);
    window.addEventListener("resize", onResize);
    let vivo = true;
    document.fonts?.ready
      ?.then(() => {
        if (vivo) setMedidaTick((t) => t + 1);
      })
      .catch(() => {});
    return () => {
      vivo = false;
      window.removeEventListener("resize", onResize);
    };
  }, []);

  /* ─────────────────────────── Reloj del culto ─────────────────────────── */

  const seg = currentSegment(state);
  const next = nextSegment(state);
  const active = state.currentIndex >= 0 && seg !== null;
  const totalMs = (seg?.minutes ?? 0) * 60000;
  const elapsed = active ? elapsedCurrent(state, now) : 0;
  const remaining = active ? totalMs - elapsed : 0;
  const overtimeMs = active ? Math.max(0, elapsed - totalMs) : 0;
  const phase = active ? phaseOf(remaining, state.settings.warningMin) : "idle";
  const mode = seg?.layout ?? "timer";
  const cardsOn = active && cardsActive(seg);
  const live = now > 0 && active;
  const hayBarraTiempo = active && seg !== null;

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

  /* Mide y corta el versículo en partes de hasta 4 renglones (como la
     proyección). Se recalcula cuando cambia el versículo, el tamaño de la
     ventana o la barra de tiempo de abajo (que le quita altura al texto). */
  useIsoLayoutEffect(() => {
    const med = medidorRef.current;
    if (!med || !palabrasVerso || palabrasVerso.length === 0) return;
    // La caja visible del texto (el medidor la usa para saber si entra)
    const caja = med.parentElement;
    const mideOK = (r: [number, number]) => {
      med.innerHTML = palabrasAHtml(palabrasVerso, r[0], r[1]);
      const lh = parseFloat(getComputedStyle(med).lineHeight) || 10;
      // El medidor tiene altura automática: scrollHeight = altura real del texto
      const lineas = Math.round(med.scrollHeight / lh);
      const entra = caja ? med.scrollHeight <= caja.clientHeight + 2 : true;
      return lineas <= MAX_LINEAS && entra;
    };
    const medirYDividir = (): [number, number][] => {
      if (mideOK([0, palabrasVerso.length])) return [[0, palabrasVerso.length]];
      let ultimo: [number, number][] | null = null;
      for (let N = 2; N <= 8; N++) {
        const rangos = cortarEnN(palabrasVerso, N);
        if (rangos.every((r) => mideOK(r))) return rangos;
        ultimo = rangos;
      }
      return ultimo ?? [[0, palabrasVerso.length]];
    };
    setDivisiones(medirYDividir());
    setParte(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palabrasVerso, medidaTick, hayBarraTiempo]);

  const totalPartes = divisiones.length;
  const siguienteParte = useCallback(() => {
    setParte((p) => (totalPartes > 1 ? (p + 1) % totalPartes : 0));
  }, [totalPartes]);
  const anteriorParte = useCallback(() => {
    setParte((p) => (totalPartes > 1 ? (p - 1 + totalPartes) % totalPartes : 0));
  }, [totalPartes]);

  /* Avisar al servidor cómo quedó cortado el versículo (el admin del teléfono
     muestra "Parte X de Y" igual que con la pantalla de proyección). */
  const versoActual = mensaje?.kind === "verso" ? mensaje.verso : null;
  useEffect(() => {
    if (!versoActual || divisiones.length === 0) return;
    enviar({
      type: "parts-info",
      count: divisiones.length,
      current: parte + 1,
      ranges: divisiones,
      verse: versoActual.verse,
      chapter: versoActual.chapter,
    });
  }, [divisiones, parte, versoActual, enviar]);

  const largo = palabrasVerso?.length ?? 0;
  const rangoRaw = divisiones[parte] ?? [0, largo];
  const rangoActual: [number, number] = [
    Math.min(rangoRaw[0], largo),
    Math.min(rangoRaw[1], largo),
  ];
  const parteHtml =
    mensaje?.kind === "verso" && palabrasVerso
      ? palabrasAHtml(palabrasVerso, rangoActual[0], rangoActual[1])
      : "";

  const conBiblia = mensaje !== null;

  /* ─────── Espejo para la mini pantalla del panel ───────
     Le cuenta al panel qué letra bíblica se está mostrando en esta
     pantalla (referencia, versión, la parte visible y el total), para
     que la mini pantalla incrustada del panel replique lo que se ve
     acá. El contador y los mensajes ya los sabe el panel: vienen en
     el estado compartido. */
  const espejoBiblia = useMemo<Omit<BibliaDisplay, "ts"> | null>(() => {
    if (!mensaje) return null;
    if (mensaje.kind === "verso") {
      return {
        ref: referenciaDelVerso(mensaje.verso),
        version: mensaje.verso.version ? abreviarVersion(mensaje.verso.version) : "",
        html: parteHtml,
        parte: Math.min(parte + 1, Math.max(1, totalPartes)),
        totalPartes: Math.max(1, totalPartes),
      };
    }
    return { ref: "Cita", version: "", html: mensaje.html, parte: 1, totalPartes: 1 };
  }, [mensaje, parteHtml, parte, totalPartes]);

  const espejoRef = useRef(espejoBiblia);
  useEffect(() => {
    espejoRef.current = espejoBiblia;
  }, [espejoBiblia]);

  // Se envía al cambiar lo que se muestra…
  useEffect(() => {
    sendAction({
      type: "STAGE_BIBLIA",
      biblia: espejoBiblia ? { ...espejoBiblia, ts: Date.now() } : null,
    });
  }, [espejoBiblia, sendAction]);

  // …y además un latido cada 4 s: si el panel se recargó, vuelve a
  // recibir el espejo solo, sin tocar nada.
  useEffect(() => {
    const id = window.setInterval(() => {
      const base = espejoRef.current;
      sendAction({
        type: "STAGE_BIBLIA",
        biblia: base ? { ...base, ts: Date.now() } : null,
      });
    }, 4000);
    return () => window.clearInterval(id);
  }, [sendAction]);

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

  /* Teclado: F = pantalla completa; con biblia, ← → (o espacio) cambian de parte */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      ) {
        return;
      }
      if (e.code === "KeyF") {
        toggleFullscreen();
        return;
      }
      if (mensaje?.kind !== "verso" || totalPartes <= 1) return;
      if (e.code === "ArrowRight" || e.code === "Space" || e.code === "PageDown") {
        e.preventDefault();
        siguienteParte();
      } else if (e.code === "ArrowLeft" || e.code === "PageUp") {
        e.preventDefault();
        anteriorParte();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siguienteParte, anteriorParte, mensaje, totalPartes]);

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

  /* Tarjeta grande: el tamaño de letra se adapta al largo del texto y a la
     cantidad de renglones (igual que la vieja pantalla de proyección). */
  function cardFontSize(text: string, lines: number): string {
    const len = text.length;
    const capLenW = len <= 40 ? "12.5vw" : len <= 90 ? "10vw" : len <= 160 ? "8vw" : len <= 260 ? "6.5vw" : "5vw";
    const capLenH = len <= 40 ? "18vh" : len <= 90 ? "14.5vh" : len <= 160 ? "11vh" : len <= 260 ? "8.5vh" : "6.5vh";
    const capLinesW = lines <= 1 ? "12.5vw" : lines <= 3 ? "9vw" : lines <= 5 ? "6.5vw" : lines <= 7 ? "5vw" : "4vw";
    const capLinesH = lines <= 1 ? "18vh" : lines <= 3 ? "12vh" : lines <= 5 ? "9vh" : lines <= 7 ? "7vh" : "5.5vh";
    return `min(${capLenW}, ${capLenH}, ${capLinesW}, ${capLinesH})`;
  }

  /* ── Letra GIGANTE: guion, puntos numerados y mensaje del operador ──
     La idea: una palabra corta (ej. "ORACION") tiene que ocupar como mínimo
     la mitad de la pantalla. Si hay varios renglones, se achican para que
     entren todos sin scrollear. */

  /* Renglones del guion: grandes, con ajuste según la cantidad. */
  const lineasScript = (seg?.script ?? "").split("\n").filter((l) => l.trim());
  const fuenteGuion = `min(9vw, ${Math.min(
    12.5,
    Math.max(4.5, (60 / Math.max(1, lineasScript.length) - 3.2) / 1.35),
  )}vh)`;

  /* Puntos numerados (cuando el guion está vacío): el triple o más. */
  const nPuntos = seg?.bullets.length ?? 1;
  const fuentePuntos = `min(12.5vw, ${Math.min(
    17,
    Math.max(4.5, (60 / Math.max(1, nPuntos) - 4) / 1.3),
  )}vh)`;

  /* Mensaje del operador: SOLO el texto, gigante, sin leyendas ni títulos.
     Si es muy largo, baja un poco para que entre en la pantalla. Con texto
     corto (ej. "CERRÁ CON ORACIÓN") la caja ocupa como media pantalla. */
  const largoMsg = state.message?.text.length ?? 0;
  const tamMensaje =
    largoMsg <= 24
      ? "min(15vw, 22vh)"
      : largoMsg <= 60
        ? "min(10.5vw, 15vh)"
        : "min(8vw, 11vh)";

  /* ───── Barra inferior: momento a la izquierda + tiempo grande a la derecha ───── */

  const bloqueTiempoCompacto =
    active && seg ? (
      <div className="shrink-0 px-[4vw] pb-[2vh]">
        <div className="flex items-end justify-between gap-[2vw]">
          {/* Izquierda: el momento actual, en la misma línea que el contador */}
          <div className="flex min-w-0 items-center gap-[1.2vw] pb-[1.2vh]">
            <div
              key={seg.id}
              className={cn(
                "animate-card-in min-w-0 max-w-[40vw] truncate rounded-full border-2 px-[2.6vw] py-[0.9vh] font-black uppercase leading-none tracking-wide",
                COLORS[seg.color].chipDark,
              )}
              style={{ fontSize: "min(3.2vw, 4.6vh)" }}
            >
              {seg.title}
            </div>
            {state.status === "paused" ? (
              <div className="shrink-0 rounded-full bg-amber-400 px-[2vw] py-[0.6vh] text-[2.2vh] font-bold uppercase tracking-widest text-amber-950">
                En pausa
              </div>
            ) : phase === "overtime" ? (
              <div className="shrink-0 rounded-full bg-red-600 px-[2vw] py-[0.6vh] text-[2.2vh] font-bold uppercase tracking-widest text-white">
                Tiempo cumplido
              </div>
            ) : null}
          </div>

          {/* Derecha: el tiempo grande */}
          <div
            className={cn(
              "shrink-0 font-mono font-bold tabular-nums leading-none",
              counterColor,
              phase === "overtime" && state.settings.blink && "animate-blink-soft",
            )}
            style={{ fontSize: "min(14vw, 19vh)" }}
          >
            {counterText}
          </div>
        </div>

        <div className="mt-[1.2vh] w-full">
          <Progress
            value={progressValue}
            className={cn("h-[1.1vh] bg-white/10", progressClass)}
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
          {/* Referencia + badge de parte (a la derecha, sin pisar la ✕) */}
          <div className="flex shrink-0 items-end justify-between gap-3 pr-[calc(1.5vw+56px)]">
            <div
              key={`${referenciaDelVerso(mensaje.verso)}-${abreviarVersion(mensaje.verso.version)}`}
              className="animate-card-in min-w-0 truncate font-bold uppercase tracking-[0.12em] text-amber-300"
              style={{ fontSize: "min(4.6vw, 6.2vh)" }}
            >
              {referenciaDelVerso(mensaje.verso)}
              {mensaje.verso.version ? (
                <span className="ml-[1.2vw] font-semibold tracking-normal text-amber-200/70">
                  · {abreviarVersion(mensaje.verso.version)}
                </span>
              ) : null}
            </div>
            {totalPartes > 1 ? (
              <button
                type="button"
                onClick={siguienteParte}
                title="Siguiente parte (también con la tecla →)"
                className="animate-card-in shrink-0 rounded-full border border-amber-300/40 bg-amber-300/10 px-[1.8vw] py-[0.6vh] font-bold uppercase tracking-widest text-amber-200"
                style={{ fontSize: "min(1.9vw, 2.6vh)" }}
              >
                Parte {parte + 1} de {totalPartes} ▶
              </button>
            ) : null}
          </div>

          {/* Texto de la parte actual (tocar = siguiente parte) + medidor oculto */}
          <div className="relative mt-[1.6vh] min-h-0 flex-1">
            <div
              key={`t-${referenciaDelVerso(mensaje.verso)}-${abreviarVersion(mensaje.verso.version)}-${parte}`}
              onClick={siguienteParte}
              className="animate-card-in absolute inset-0 cursor-pointer overflow-hidden font-semibold leading-[1.28] text-white"
              style={{ fontSize: "min(6.2vw, 8.6vh)" }}
              dangerouslySetInnerHTML={{ __html: parteHtml }}
            />
            <div
              ref={medidorRef}
              aria-hidden="true"
              className="absolute inset-x-0 top-0 font-semibold leading-[1.28]"
              style={{ fontSize: "min(6.2vw, 8.6vh)", visibility: "hidden" }}
            />
          </div>
        </>
      ) : (
        <>
          <div className="flex shrink-0 items-end justify-between gap-3 pr-[calc(1.5vw+56px)]">
            <div
              className="animate-card-in font-bold uppercase tracking-[0.12em] text-amber-300"
              style={{ fontSize: "min(4.6vw, 6.2vh)" }}
            >
              Cita
            </div>
          </div>
          <div
            ref={textoCitaRef}
            className="animate-card-in mt-[1.6vh] min-h-0 flex-1 overflow-y-auto font-semibold leading-[1.28] text-white [&_em]:text-amber-200 [&_strong]:text-amber-200"
            style={{ fontSize: "min(6.2vw, 8.6vh)" }}
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
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-end px-[2.5vw] py-[1.6vh] text-[1.8vh] text-zinc-500">
        <span className="flex items-center gap-3">
          <span className="font-mono text-zinc-600">{VERSION_APP}</span>
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
          {/* Pista: el panel no está abierto (solo donde no estorba) */}
          {!peerOnline && (!active || mode === "timer") ? (
            <div className="absolute bottom-[2.5vh] left-[2vw] z-30 max-w-[30vw] text-[1.6vh] leading-snug text-zinc-600">
              Abrí el Panel de control en otra ventana de este navegador para
              manejar el cronómetro.
            </div>
          ) : null}

          {/* ── Culto sin iniciar ── */}
          {!active && state.status !== "finished" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-[6vw] text-center">
              <div className="text-[6.5vh] font-bold leading-tight">
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
          {active && !cardsOn && mode === "timer" && seg ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-[4vw] pb-[6vh] text-center">
              <div className="text-[3.4vh] font-bold tracking-wide text-zinc-200">
                {seg.title}
              </div>
              {seg.speaker ? (
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
                  ? `Excedente · planificado ${seg.minutes} min`
                  : phase === "warning"
                    ? `Quedan menos de ${state.settings.warningMin} min`
                    : `${seg.minutes} min planificados`}
              </div>

              <div className="mt-[4vh] w-[64vw] max-w-[1100px]">
                <Progress value={progressValue} className={cn("h-[1.2vh] bg-white/10", progressClass)} />
              </div>

              {state.settings.showBulletsOnTimer && seg.bullets.length > 0 ? (
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
                        style={{ fontSize: fuenteGuion, lineHeight: 1.35 }}
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
                        style={{ fontSize: fuentePuntos, lineHeight: 1.3 }}
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
        </>
      )}

      {/* ── Mensaje del operador: SOLO el texto, con letra gigante ── */}
      {state.message ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-[4vw]">
          <div
            className={cn(
              "animate-pulse-border flex w-full items-center justify-center rounded-[3rem] px-[4vw] py-[8vh] text-center shadow-2xl",
              state.message.urgent ? "bg-red-600 text-white" : "bg-amber-400 text-zinc-950",
            )}
          >
            <div
              className="text-balance font-black leading-[1.08]"
              style={{ fontSize: tamMensaje }}
            >
              {state.message.text}
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Configuración de Biblia Sincronizada ── */}
      <div
        className={cn(
          "absolute bottom-[13.5vh] right-[1.5vw] z-[60] transition-opacity duration-300",
          uiVisible && confAbierta && !state.message
            ? "opacity-100"
            : "pointer-events-none opacity-0",
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
            aparecen acá en vivo, cortados en partes de 4 renglones (igual que la
            proyección). Tocá el texto o usá ← → para cambiar de parte. La primera
            conexión puede demorar un minuto si el servidor estaba dormido.
          </p>
        </div>
      </div>

      {/* ── Controles flotantes (se ocultan solos; con un mensaje en
             pantalla NO se muestran: solo queda el mensaje) ── */}
      <div
        className={cn(
          "absolute bottom-[2.5vh] right-[1.5vw] z-[60] flex flex-col items-end gap-2 transition-opacity duration-300",
          uiVisible && !state.message ? "opacity-100" : "pointer-events-none opacity-0",
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
