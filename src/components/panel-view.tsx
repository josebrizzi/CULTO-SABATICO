"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  ExternalLink,
  HelpCircle,
  MessageSquare,
  Minus,
  MonitorPlay,
  Pencil,
  Pause,
  Play,
  Plus,
  RotateCcw,
  ScrollText,
  Send,
  SkipBack,
  SkipForward,
  Trash2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  advance,
  back,
  COLORS,
  COLOR_KEYS,
  ColorKey,
  cardsActive,
  currentSegment,
  currentSlide,
  defaultSegments,
  elapsedCurrent,
  fmtHMS,
  fmtMin,
  goSlide,
  jumpTo,
  nextSegment,
  pause,
  phaseOf,
  prompterGo,
  prompterSend,
  prompterStep,
  remainingCurrent,
  resetCurrent,
  resetService,
  Segment,
  Settings,
  start,
  stepSlide,
  uid,
  useNow,
  useShowChannel,
} from "@/lib/show";

const QUICK_MESSAGES = [
  "Cerrá en 2 minutos",
  "Último punto",
  "Vamos a la ofrenda",
  "Cerrá con oración",
];

export default function PanelView() {
  const { state, mutate, peerOnline } = useShowChannel("panel");
  const now = useNow(500);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [msgDraft, setMsgDraft] = useState("");
  const [msgUrgent, setMsgUrgent] = useState(false);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const seg = currentSegment(state);
  const next = nextSegment(state);
  const active = state.currentIndex >= 0 && seg !== null;
  const totalMs = (seg?.minutes ?? 0) * 60000;
  const elapsed = active ? elapsedCurrent(state, now) : 0;
  const remaining = active ? totalMs - elapsed : 0;
  const overtimeMs = active ? Math.max(0, elapsed - totalMs) : 0;
  const phase = active ? phaseOf(remaining, state.settings.warningMin) : "idle";
  const live = now > 0 && active;
  const cardsOn = active && cardsActive(seg);
  const slide = cardsOn ? currentSlide(state) : null;

  /* ───────────────────────── Acciones ───────────────────────── */

  const toggleStartPause = () => {
    const s = stateRef.current;
    if (s.status === "running") mutate((p) => pause(p, Date.now()));
    else if (s.status !== "finished") mutate((p) => start(p, Date.now()));
  };
  const doAdvance = () => {
    if (stateRef.current.currentIndex >= 0 && stateRef.current.status !== "finished") {
      mutate((p) => advance(p, Date.now()));
    }
  };
  const doBack = () => mutate((p) => back(p));
  const doReset = () => {
    if (stateRef.current.currentIndex >= 0) mutate((p) => resetCurrent(p, Date.now()));
  };
  const doRestartService = () => {
    if (window.confirm("¿Reiniciar todo el culto? Se pierden los tiempos del momento actual.")) {
      mutate((p) => resetService(p));
    }
  };

  const adjustMinutes = (delta: number) => {
    const s = stateRef.current;
    const cur = currentSegment(s);
    if (!cur) return;
    mutate((p) => ({
      ...p,
      segments: p.segments.map((x) =>
        x.id === cur.id
          ? { ...x, minutes: Math.min(600, Math.max(1, x.minutes + delta)) }
          : x,
      ),
    }));
  };

  const updateSegment = (id: string, patch: Partial<Segment>) => {
    mutate((p) => ({
      ...p,
      segments: p.segments.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
  };

  const addSegment = () => {
    mutate((p) => ({
      ...p,
      segments: [
        ...p.segments,
        {
          id: uid(),
          title: "Nuevo momento",
          speaker: "",
          minutes: 5,
          layout: "timer",
          bullets: [],
          script: "",
          color: COLOR_KEYS[p.segments.length % COLOR_KEYS.length] as ColorKey,
          cards: false,
        },
      ],
    }));
  };

  const removeSegment = (id: string) => {
    mutate((p) => {
      const idx = p.segments.findIndex((x) => x.id === id);
      if (idx < 0 || p.segments.length <= 1) return p;
      const arr = p.segments.filter((x) => x.id !== id);
      if (idx < p.currentIndex) {
        return { ...p, segments: arr, currentIndex: p.currentIndex - 1 };
      }
      if (idx === p.currentIndex) {
        const ci = Math.min(idx, arr.length - 1);
        return {
          ...p,
          segments: arr,
          currentIndex: ci,
          status: "paused",
          startedAt: null,
          elapsedBefore: 0,
        };
      }
      return { ...p, segments: arr };
    });
  };

  const moveSegment = (idx: number, dir: -1 | 1) => {
    mutate((p) => {
      const j = idx + dir;
      if (j < 0 || j >= p.segments.length) return p;
      const arr = [...p.segments];
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      let ci = p.currentIndex;
      if (ci === idx) ci = j;
      else if (ci === j) ci = idx;
      return { ...p, segments: arr, currentIndex: ci };
    });
  };

  const setSettings = (patch: Partial<Settings>) => {
    mutate((p) => ({ ...p, settings: { ...p.settings, ...patch } }));
  };

  const goCard = (i: number) => mutate((p) => goSlide(p, i));
  const stepCard = (delta: number) => mutate((p) => stepSlide(p, delta));

  const sendMessage = (text: string, urgent: boolean) => {
    const t = text.trim();
    if (!t) return;
    mutate((p) => ({ ...p, message: { id: uid(), text: t, urgent } }));
  };

  /* ────────────────────────── Teleprompter ───────────────────────── */

  const [prompterDraft, setPrompterDraft] = useState("");
  const [lastScreenText, setLastScreenText] = useState("");
  const prompterTextOnScreen = state.prompter.text;
  // Si recién se abre el panel y ya había texto en pantalla, mostrarlo acá
  if (prompterTextOnScreen !== lastScreenText) {
    setLastScreenText(prompterTextOnScreen);
    setPrompterDraft((d) => (d.trim() ? d : prompterTextOnScreen));
  }

  const prompterDirty =
    prompterDraft.trim() !== "" && prompterDraft.trim() !== prompterTextOnScreen.trim();

  const sendPrompter = () => {
    const t = prompterDraft.trim();
    if (!t) return;
    mutate((p) => prompterSend(p, t));
  };

  const clearPrompter = () => {
    setPrompterDraft("");
    mutate((p) => prompterSend(p, ""));
  };

  /** Un paso manual: avanza/retrocede el % de pantalla configurado */
  const stepPrompter = (dir: 1 | -1) =>
    mutate((p) => prompterStep(p, (dir * p.prompter.stepPct) / 100));

  const prompterTop = () => mutate((p) => prompterGo(p, 0));

  const nudgeFont = (delta: number) =>
    mutate((p) => ({
      ...p,
      prompter: {
        ...p.prompter,
        fontScale: Math.min(3, Math.max(0.5, p.prompter.fontScale + delta)),
      },
    }));

  const openPrompterWindow = () => {
    const base = window.location.href.split("#")[0];
    window.open(`${base}#teleprompter`, "culto-teleprompter", "width=1040,height=680");
  };

  /* ───────────────────── Atajos de teclado ──────────────────── */

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
      const s = stateRef.current;
      if (e.code === "Space") {
        e.preventDefault();
        if (s.status === "running") mutate((p) => pause(p, Date.now()));
        else if (s.status !== "finished") mutate((p) => start(p, Date.now()));
      } else if (e.code === "KeyN") {
        if (s.currentIndex >= 0 && s.status !== "finished") {
          mutate((p) => advance(p, Date.now()));
        }
      } else if (e.code === "KeyR") {
        if (s.currentIndex >= 0) mutate((p) => resetCurrent(p, Date.now()));
      } else if (e.code === "ArrowRight") {
        if (cardsActive(currentSegment(s))) {
          e.preventDefault();
          mutate((p) => stepSlide(p, 1));
        }
      } else if (e.code === "ArrowLeft") {
        if (cardsActive(currentSegment(s))) {
          e.preventDefault();
          mutate((p) => stepSlide(p, -1));
        }
      } else if (e.code === "ArrowUp") {
        e.preventDefault();
        mutate((p) => prompterStep(p, -p.prompter.stepPct / 100));
      } else if (e.code === "ArrowDown") {
        e.preventDefault();
        mutate((p) => prompterStep(p, p.prompter.stepPct / 100));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mutate]);

  /* ─────────────────────── Cálculos varios ──────────────────── */

  const totalMin = useMemo(
    () => state.segments.reduce((a, x) => a + x.minutes, 0),
    [state.segments],
  );

  const plannedRemain = useMemo(() => {
    if (state.status === "finished") return 0;
    if (state.currentIndex < 0) return totalMin;
    let m = 0;
    state.segments.forEach((x, i) => {
      if (i < state.currentIndex) return;
      if (i === state.currentIndex) {
        m += active ? Math.max(0, Math.ceil(remaining / 60000)) : x.minutes;
      } else {
        m += x.minutes;
      }
    });
    return m;
  }, [state, totalMin, active, remaining]);

  const upcoming = useMemo(
    () =>
      state.segments
        .map((x, i) => ({ x, i }))
        .filter(({ i }) => i > state.currentIndex)
        .slice(0, 4),
    [state.segments, state.currentIndex],
  );

  const counterColor =
    phase === "overtime"
      ? "text-red-600"
      : phase === "warning"
        ? "text-amber-500"
        : "text-foreground";

  const openStageWindow = () => {
    const base = window.location.href.split("#")[0];
    window.open(`${base}#pantalla`, "culto-pantalla", "width=1040,height=680");
  };

  const switchView = (v: "panel" | "stage") => {
    window.location.hash = v === "stage" ? "#pantalla" : "#panel";
  };

  const statusPill = (() => {
    if (state.status === "finished") {
      return (
        <Badge className="gap-1.5 bg-zinc-800 text-white">
          <span className="h-2 w-2 rounded-full bg-zinc-400" /> Finalizado
        </Badge>
      );
    }
    if (!active) {
      return (
        <Badge variant="outline" className="gap-1.5">
          <span className="h-2 w-2 rounded-full bg-zinc-400" /> En espera
        </Badge>
      );
    }
    if (phase === "overtime") {
      return (
        <Badge className="gap-1.5 bg-red-600 text-white">
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> Tiempo cumplido
        </Badge>
      );
    }
    if (state.status === "running") {
      return (
        <Badge className="gap-1.5 bg-red-600 text-white">
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> En vivo
        </Badge>
      );
    }
    return (
      <Badge className="gap-1.5 bg-amber-400 text-amber-950">
        <span className="h-2 w-2 rounded-full bg-amber-700" /> En pausa
      </Badge>
    );
  })();

  /* ─────────────────────────── Render ───────────────────────── */

  return (
    <div className="min-h-screen bg-background">
      {/* Encabezado */}
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-2 px-3 py-2.5">
          <div className="mr-1 flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Clock className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className="hidden font-semibold md:block">Tiempos del Culto</span>
          </div>
          <Input
            aria-label="Nombre del culto"
            value={state.serviceTitle}
            onChange={(e) => mutate((p) => ({ ...p, serviceTitle: e.target.value }))}
            className="h-9 w-40 sm:w-52"
          />
          <div className="ml-auto flex items-center gap-2">
            <Badge
              variant={peerOnline ? "default" : "outline"}
              className="hidden gap-1.5 lg:flex"
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  peerOnline ? "animate-pulse bg-emerald-500" : "bg-zinc-400",
                )}
              />
              {peerOnline ? "Pantalla del orador conectada" : "Pantalla del orador sin abrir"}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => switchView("stage")}>
              <MonitorPlay className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Ver pantalla</span>
            </Button>
            <Button size="sm" onClick={openStageWindow}>
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Abrir pantalla del orador</span>
            </Button>
            <HelpDialog />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1600px] gap-4 px-3 py-4 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)_minmax(300px,370px)]">
        {/* Columna central (arriba en móvil) */}
        <div className="order-1 space-y-4 lg:order-2">
          <Card className="border-2">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg">
                  {active ? `Ahora · ${seg?.title}` : "Ahora"}
                </CardTitle>
                {statusPill}
              </div>
              {active && (seg?.speaker || next) ? (
                <CardDescription>
                  {seg?.speaker ? `Orador: ${seg.speaker}` : null}
                  {seg?.speaker && next ? " · " : null}
                  {next ? `Siguiente: ${next.title} (${next.minutes} min)` : null}
                </CardDescription>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-5">
              {state.status === "finished" ? (
                <div className="py-8 text-center">
                  <div className="text-3xl font-bold">Culto finalizado</div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Reiniciá para comenzar un nuevo culto.
                  </p>
                  <Button className="mt-4" variant="outline" onClick={doRestartService}>
                    <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reiniciar todo
                  </Button>
                </div>
              ) : !active ? (
                <div className="py-6 text-center">
                  <div className="text-2xl font-semibold">El culto no comenzó</div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {state.segments.length} momentos · {fmtMin(totalMin)} planificados
                  </p>
                  <Button
                    size="lg"
                    className="mt-4 h-14 px-10 text-lg"
                    onClick={() => mutate((p) => start(p, Date.now()))}
                  >
                    <Play className="h-5 w-5" aria-hidden="true" /> Iniciar culto
                  </Button>
                </div>
              ) : (
                <>
                  <div className="text-center">
                    <div
                      className={cn(
                        "font-mono text-7xl font-bold tabular-nums tracking-tight md:text-8xl",
                        counterColor,
                      )}
                    >
                      {live
                        ? phase === "overtime"
                          ? `+${fmtHMS(Math.floor(overtimeMs / 1000))}`
                          : fmtHMS(Math.ceil(remaining / 1000))
                        : "--:--"}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {phase === "overtime"
                        ? "Tiempo cumplido — excedente"
                        : `de ${seg?.minutes} min planificados`}
                    </div>
                  </div>

                  <Progress
                    value={totalMs > 0 ? Math.min(100, (elapsed / totalMs) * 100) : 0}
                    className={cn(
                      "h-2.5",
                      phase === "overtime"
                        ? "[&>div]:bg-red-600"
                        : phase === "warning"
                          ? "[&>div]:bg-amber-500"
                          : "[&>div]:bg-zinc-900",
                    )}
                  />

                  {phase === "overtime" ? (
                    <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                      Se cumplió el tiempo hace {fmtHMS(Math.floor(overtimeMs / 1000))}.
                      Considerá pasar al siguiente momento.
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="lg"
                      className="col-span-2 h-14 text-lg"
                      onClick={toggleStartPause}
                    >
                      {state.status === "running" ? (
                        <>
                          <Pause className="h-5 w-5" aria-hidden="true" /> Pausar
                        </>
                      ) : (
                        <>
                          <Play className="h-5 w-5" aria-hidden="true" />{" "}
                          {state.elapsedBefore > 0 ? "Reanudar" : "Iniciar momento"}
                        </>
                      )}
                    </Button>
                    <Button variant="outline" className="h-11" onClick={doReset}>
                      <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reiniciar
                    </Button>
                    <Button variant="outline" className="h-11" onClick={doAdvance}>
                      <SkipForward className="h-4 w-4" aria-hidden="true" /> Siguiente
                    </Button>
                    <Button variant="ghost" className="h-10" onClick={() => adjustMinutes(-1)}>
                      <Minus className="h-4 w-4" aria-hidden="true" /> 1 min
                    </Button>
                    <Button variant="ghost" className="h-10" onClick={() => adjustMinutes(1)}>
                      <Plus className="h-4 w-4" aria-hidden="true" /> 1 min
                    </Button>
                    <Button variant="ghost" className="col-span-2 h-9" onClick={doBack}>
                      <SkipBack className="h-4 w-4" aria-hidden="true" /> Momento anterior
                    </Button>
                  </div>

                  {seg && cardsOn && slide ? (
                    <div className="space-y-2.5 rounded-xl border-2 border-dashed border-amber-400/60 bg-amber-400/5 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                          Tarjetas en pantalla · {slide.index + 1} de {slide.total}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-9 w-9"
                              aria-label="Tarjeta anterior"
                              disabled={slide.index <= 0}
                              onClick={() => stepCard(-1)}
                            >
                              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-9 w-9"
                              aria-label="Tarjeta siguiente"
                              disabled={slide.index >= slide.total - 1}
                              onClick={() => stepCard(1)}
                            >
                              <ChevronRight className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </div>
                          <Switch
                            checked={!!seg.cards}
                            onCheckedChange={(v) => updateSegment(seg.id, { cards: v })}
                            aria-label="Desactivar tarjetas grandes en este momento"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {seg.bullets.map((b, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <button
                              type="button"
                              aria-label={`Mostrar tarjeta ${i + 1}`}
                              title={`Mostrar tarjeta ${i + 1}`}
                              onClick={() => goCard(i)}
                              className={cn(
                                "mt-1 h-9 shrink-0 rounded-md border px-2.5 text-xs font-semibold transition-colors",
                                i === slide.index
                                  ? "border-foreground bg-foreground text-background"
                                  : i < slide.index
                                    ? "border-emerald-300 bg-emerald-100 text-emerald-800 line-through opacity-70 dark:border-emerald-700 dark:bg-emerald-900 dark:text-emerald-200"
                                    : "bg-card text-muted-foreground hover:border-foreground/40",
                              )}
                            >
                              {i + 1}
                            </button>
                            <Textarea
                              value={b}
                              rows={2}
                              aria-label={`Editar tarjeta ${i + 1}`}
                              placeholder={`Anuncio ${i + 1}…`}
                              className={cn(
                                "min-h-0 flex-1 rounded-xl border-2 text-base font-bold leading-snug sm:text-lg",
                                i === slide.index &&
                                  "border-amber-400 bg-amber-50 ring-2 ring-amber-400/40 dark:bg-amber-950/30",
                                i < slide.index && "opacity-60",
                              )}
                              onChange={(e) => {
                                const arr = [...seg.bullets];
                                arr[i] = e.target.value;
                                updateSegment(seg.id, { bullets: arr });
                              }}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-9 w-8 shrink-0"
                              aria-label={`Quitar tarjeta ${i + 1}`}
                              disabled={seg.bullets.length <= 1}
                              onClick={() =>
                                updateSegment(seg.id, {
                                  bullets: seg.bullets.filter((_, j) => j !== i),
                                })
                              }
                            >
                              <X className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={() =>
                            updateSegment(seg.id, { bullets: [...seg.bullets, ""] })
                          }
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Agregar
                          tarjeta
                        </Button>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Lo que escribís acá se ve al instante en la pantalla, con letra
                        gigante. Tocá un numerito para mostrar esa tarjeta; las ya
                        mostradas quedan tachadas.
                      </p>
                    </div>
                  ) : seg ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-muted-foreground/40 bg-muted/30 p-3">
                      <div className="min-w-0">
                        <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          Tarjetas en pantalla
                        </div>
                        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                          ¿Este momento tiene avisos o puntos? Mostralos de a uno, con
                          letra grande (ideal para anuncios).
                        </p>
                      </div>
                      <Switch
                        checked={false}
                        onCheckedChange={(v) => updateSegment(seg.id, { cards: v })}
                        aria-label="Activar tarjetas grandes en este momento"
                        className="shrink-0"
                      />
                    </div>
                  ) : null}

                  <p className="text-center text-xs text-muted-foreground">
                    Atajos: Espacio = iniciar/pausar · N = siguiente · R = reiniciar
                    {cardsOn ? " · ← → = tarjetas" : ""} · ↑ ↓ = teleprompter
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Tiempo restante planificado
                </div>
                <div className="text-2xl font-bold">{fmtMin(plannedRemain)}</div>
              </div>
              <div className="flex max-w-[55%] flex-wrap justify-end gap-1.5">
                {upcoming.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Último momento</span>
                ) : (
                  upcoming.map(({ x, i }) => (
                    <Badge key={x.id} variant="outline" className="gap-1.5 font-normal">
                      <span
                        className={cn("h-2 w-2 rounded-full", COLORS[x.color].dot)}
                        aria-hidden="true"
                      />
                      {i + 1}. {x.title} · {x.minutes} min
                    </Badge>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Programa */}
        <Card className="order-2 lg:order-1">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">Programa del culto</CardTitle>
                <CardDescription>
                  {state.segments.length} momentos · {fmtMin(totalMin)} en total
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 shrink-0 text-muted-foreground"
                title="Cargar de nuevo el programa sabático de ejemplo (reemplaza los momentos actuales)"
                aria-label="Cargar plantilla sabática"
                onClick={() => {
                  if (
                    window.confirm(
                      "¿Cargar de nuevo el programa sabático de ejemplo? Se reemplazan los momentos actuales.",
                    )
                  ) {
                    mutate((p) => ({ ...p, segments: defaultSegments(), slideIndex: 0 }));
                  }
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Plantilla
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="max-h-[62vh] space-y-1.5 overflow-y-auto pr-1 scrollbar-thin">
              {state.segments.map((x, i) => {
                const isCurrent = i === state.currentIndex && state.status !== "finished";
                const isDone = state.currentIndex >= 0 && i < state.currentIndex;
                return (
                  <div
                    key={x.id}
                    className={cn(
                      "rounded-lg border p-2 transition-colors",
                      isCurrent ? "border-foreground/25 bg-muted/70" : "bg-card",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn("h-2.5 w-2.5 shrink-0 rounded-full", COLORS[x.color].dot)}
                        aria-hidden="true"
                      />
                      {isDone ? (
                        <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                      ) : isCurrent ? (
                        <Play className="h-4 w-4 shrink-0" aria-hidden="true" />
                      ) : (
                        <span className="w-4 shrink-0 text-center text-xs text-muted-foreground">
                          {i + 1}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div
                          className={cn(
                            "truncate text-sm font-medium",
                            isDone && "line-through opacity-50",
                          )}
                        >
                          {x.title}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {x.minutes} min
                          {x.speaker ? ` · ${x.speaker}` : ""}
                          {x.cards && x.bullets.length > 0
                            ? " · tarjetas grandes"
                            : x.layout === "script"
                              ? " · con guion"
                              : ""}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        aria-label={`Editar ${x.title}`}
                        onClick={() => setEditingId(editingId === x.id ? null : x.id)}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                      <div className="flex flex-col">
                        <button
                          type="button"
                          aria-label={`Subir ${x.title}`}
                          disabled={i === 0}
                          onClick={() => moveSegment(i, -1)}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Bajar ${x.title}`}
                          disabled={i === state.segments.length - 1}
                          onClick={() => moveSegment(i, 1)}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    {editingId === x.id ? (
                      <div className="mt-2 border-t pt-3">
                        <SegmentEditor
                          seg={x}
                          canDelete={state.segments.length > 1}
                          onUpdate={(patch) => updateSegment(x.id, patch)}
                          onDelete={() => removeSegment(x.id)}
                          onJump={() => mutate((p) => jumpTo(p, i))}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <Button variant="outline" className="w-full" onClick={addSegment}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Agregar momento
            </Button>
          </CardContent>
        </Card>

        {/* Columna derecha */}
        <div className="order-3 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4" aria-hidden="true" /> Mensajes al orador
              </CardTitle>
              <CardDescription>Aparecen grandes en la pantalla del orador</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {QUICK_MESSAGES.map((q) => (
                  <Button
                    key={q}
                    size="sm"
                    variant="secondary"
                    className="h-8"
                    onClick={() => sendMessage(q, false)}
                  >
                    {q}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  aria-label="Mensaje personalizado"
                  placeholder="Escribir mensaje…"
                  value={msgDraft}
                  onChange={(e) => setMsgDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      sendMessage(msgDraft, msgUrgent);
                      setMsgDraft("");
                    }
                  }}
                />
                <Button
                  size="icon"
                  aria-label="Enviar mensaje"
                  className="h-10 w-10 shrink-0"
                  onClick={() => {
                    sendMessage(msgDraft, msgUrgent);
                    setMsgDraft("");
                  }}
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="msg-urgent"
                  checked={msgUrgent}
                  onCheckedChange={setMsgUrgent}
                />
                <Label htmlFor="msg-urgent" className="text-sm font-normal">
                  Urgente (rojo, para llamar la atención)
                </Label>
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 text-xs text-muted-foreground">
                  {state.message ? (
                    <span className="line-clamp-2">
                      En pantalla: <b>“{state.message.text}”</b>
                    </span>
                  ) : (
                    "Sin mensaje en pantalla"
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 shrink-0"
                  disabled={!state.message}
                  onClick={() => mutate((p) => ({ ...p, message: null }))}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" /> Limpiar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ScrollText className="h-4 w-4" aria-hidden="true" /> Teleprompter
              </CardTitle>
              <CardDescription>
                Pantalla exclusiva para leer: letra gigante y avance manual desde acá
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                aria-label="Texto para el teleprompter"
                placeholder={
                  "Escribí acá lo que alguien va a leer.\nDejá un renglón en blanco para separar ideas."
                }
                className="min-h-[88px]"
                value={prompterDraft}
                onChange={(e) => setPrompterDraft(e.target.value)}
              />
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  className="h-8"
                  disabled={!prompterDraft.trim()}
                  onClick={sendPrompter}
                >
                  <Send className="h-3.5 w-3.5" aria-hidden="true" /> Enviar al
                  teleprompter
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  disabled={!prompterTextOnScreen.trim() && !prompterDraft.trim()}
                  onClick={clearPrompter}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" /> Vaciar
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8"
                  onClick={openPrompterWindow}
                >
                  <MonitorPlay className="h-3.5 w-3.5" aria-hidden="true" /> Abrir
                  pantalla
                </Button>
              </div>

              <Separator />

              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-medium text-muted-foreground">
                  Avance del scroll (manual)
                </div>
                <div className="font-mono text-xs tabular-nums text-muted-foreground">
                  {Math.round(state.prompter.offset * 100)}%
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-10 w-10 shrink-0"
                  aria-label="Volver al inicio del texto"
                  onClick={prompterTop}
                >
                  <SkipBack className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-10 w-10 shrink-0"
                  aria-label="Retroceder un paso"
                  onClick={() => stepPrompter(-1)}
                >
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-10 w-10 shrink-0"
                  aria-label="Avanzar un paso"
                  onClick={() => stepPrompter(1)}
                >
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Slider
                  aria-label="Posición del texto"
                  className="min-w-0 flex-1"
                  value={[Math.round(state.prompter.offset * 100)]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(v) =>
                    mutate((p) => prompterGo(p, (v[0] ?? 0) / 100))
                  }
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="shrink-0">Paso:</span>
                <Select
                  value={String(state.prompter.stepPct)}
                  onValueChange={(v) =>
                    mutate((p) => ({
                      ...p,
                      prompter: { ...p.prompter, stepPct: Number(v) },
                    }))
                  }
                >
                  <SelectTrigger className="h-8 w-[108px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 25, 33, 50].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}% de pantalla
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex shrink-0 items-center gap-2">
                  <span>Letra:</span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    aria-label="Letra más chica"
                    onClick={() => nudgeFont(-0.15)}
                  >
                    <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                  <span className="w-10 text-center font-mono tabular-nums">
                    {Math.round(state.prompter.fontScale * 100)}%
                  </span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    aria-label="Letra más grande"
                    onClick={() => nudgeFont(0.15)}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                En la pantalla de teleprompter no hay botones: todo se maneja desde
                acá, también con las flechas <b>↑ ↓</b> del teclado. Si cerraste la
                ventana, volvé a abrirla o entrá con <b>#teleprompter</b> al final de
                la dirección.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ajustes de la pantalla</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="warning-min" className="text-sm font-normal">
                  Aviso amarillo
                </Label>
                <Select
                  value={String(state.settings.warningMin)}
                  onValueChange={(v) => setSettings({ warningMin: Number(v) })}
                >
                  <SelectTrigger id="warning-min" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sin aviso</SelectItem>
                    <SelectItem value="1">1 min antes</SelectItem>
                    <SelectItem value="2">2 min antes</SelectItem>
                    <SelectItem value="3">3 min antes</SelectItem>
                    <SelectItem value="5">5 min antes</SelectItem>
                    <SelectItem value="10">10 min antes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="set-blink" className="text-sm font-normal">
                  Parpadear cuando el tiempo está cumplido
                </Label>
                <Switch
                  id="set-blink"
                  checked={state.settings.blink}
                  onCheckedChange={(v) => setSettings({ blink: v })}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="set-auto" className="text-sm font-normal">
                  Auto-iniciar el siguiente momento
                </Label>
                <Switch
                  id="set-auto"
                  checked={state.settings.autoAdvance}
                  onCheckedChange={(v) => setSettings({ autoAdvance: v })}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="set-bullets" className="text-sm font-normal">
                  Mostrar puntos clave en modo contador
                </Label>
                <Switch
                  id="set-bullets"
                  checked={state.settings.showBulletsOnTimer}
                  onCheckedChange={(v) => setSettings({ showBulletsOnTimer: v })}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Cada momento puede mostrarse en modo “Contador grande” o “Guion + contador
                abajo” (se cambia en la edición del momento).
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

/* ─────────────────────── Editor de momento ─────────────────────── */

function SegmentEditor({
  seg,
  onUpdate,
  onDelete,
  onJump,
  canDelete,
}: {
  seg: Segment;
  onUpdate: (patch: Partial<Segment>) => void;
  onDelete: () => void;
  onJump: () => void;
  canDelete: boolean;
}) {
  const [bulletDraft, setBulletDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const addBullet = () => {
    const t = bulletDraft.trim();
    if (!t) return;
    onUpdate({ bullets: [...seg.bullets, t] });
    setBulletDraft("");
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 space-y-1">
          <Label htmlFor={`t-${seg.id}`} className="text-xs">
            Título
          </Label>
          <Input
            id={`t-${seg.id}`}
            value={seg.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`s-${seg.id}`} className="text-xs">
            Orador
          </Label>
          <Input
            id={`s-${seg.id}`}
            value={seg.speaker}
            placeholder="Ej.: Anunciador"
            onChange={(e) => onUpdate({ speaker: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`m-${seg.id}`} className="text-xs">
            Duración (min)
          </Label>
          <Input
            id={`m-${seg.id}`}
            type="number"
            min={1}
            max={600}
            value={seg.minutes}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v)) onUpdate({ minutes: Math.min(600, Math.max(1, Math.round(v))) });
            }}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Cómo se muestra en la pantalla</Label>
        <Select
          value={seg.layout}
          onValueChange={(v) => onUpdate({ layout: v === "script" ? "script" : "timer" })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="timer">Contador grande</SelectItem>
            <SelectItem value="script">Guion + contador abajo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-start justify-between gap-2 rounded-lg border p-2.5">
        <div className="min-w-0">
          <Label htmlFor={`c-${seg.id}`} className="text-xs font-medium">
            Tarjetas grandes en pantalla
          </Label>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            Muestra cada punto como una tarjeta sola, con letra grande, y se pasa de una
            desde el panel. Ideal para los anuncios (anula el guion y el contador grande).
          </p>
        </div>
        <Switch
          id={`c-${seg.id}`}
          checked={seg.cards}
          onCheckedChange={(v) => onUpdate({ cards: v })}
          className="mt-0.5 shrink-0"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">
          {seg.cards ? "Tarjetas (una por pantalla)" : "Puntos clave"}
        </Label>
        {seg.bullets.map((b, i) => (
        <div key={i} className="flex gap-1.5">
            {seg.cards ? (
              <Textarea
                value={b}
                rows={2}
                aria-label={`Tarjeta ${i + 1}`}
                onChange={(e) => {
                  const arr = [...seg.bullets];
                  arr[i] = e.target.value;
                  onUpdate({ bullets: arr });
                }}
              />
            ) : (
              <Input
                value={b}
                aria-label={`Punto ${i + 1}`}
                onChange={(e) => {
                  const arr = [...seg.bullets];
                  arr[i] = e.target.value;
                  onUpdate({ bullets: arr });
                }}
              />
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-9 shrink-0 self-start"
              aria-label={`Quitar punto ${i + 1}`}
              onClick={() => onUpdate({ bullets: seg.bullets.filter((_, j) => j !== i) })}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ))}
        <div className="flex gap-1.5">
          <Input
            value={bulletDraft}
            placeholder={seg.cards ? "Agregar tarjeta…" : "Agregar punto…"}
            aria-label={seg.cards ? "Nueva tarjeta" : "Nuevo punto clave"}
            onChange={(e) => setBulletDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addBullet();
            }}
          />
          <Button
            size="icon"
            variant="outline"
            className="h-10 w-9 shrink-0"
            aria-label={seg.cards ? "Agregar tarjeta" : "Agregar punto"}
            onClick={addBullet}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">
          Guion extendido (teleprompter)
          {seg.cards ? " — queda anulado mientras las tarjetas estén activas" : ""}
        </Label>
        <Textarea
          value={seg.script}
          rows={4}
          placeholder="Texto más largo que el orador puede leer en la pantalla exclusiva…"
          onChange={(e) => onUpdate({ script: e.target.value })}
        />
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <Button size="sm" variant="secondary" onClick={onJump}>
          <SkipForward className="h-3.5 w-3.5" aria-hidden="true" /> Ir a este momento
        </Button>
        {canDelete ? (
          confirmDelete ? (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                onDelete();
                setConfirmDelete(false);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Confirmar
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:text-red-600"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Eliminar
            </Button>
          )
        ) : null}
      </div>
    </div>
  );
}

/* ────────────────────────── Ayuda ─────────────────────────────── */

function HelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="Ayuda de uso">
          <HelpCircle className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cómo usar con el proyector</DialogTitle>
          <DialogDescription>
            Sistema de control de tiempos para el culto: contador, teleprompter y mensajes
            al orador.
          </DialogDescription>
        </DialogHeader>
        <ol className="list-decimal space-y-2.5 pl-5 text-sm">
          <li>
            Tocá <b>“Abrir pantalla del orador”</b>: se abre una segunda ventana con el
            contador y el guion (también podés abrir una pestaña nueva y tocar “Ver
            pantalla”).
          </li>
          <li>
            Arrastrá esa ventana al monitor del proyector y ponela en pantalla completa
            con el botón <MaximizeIcon /> o con <b>F11</b>. En Windows:{" "}
            <b>Win + Shift + →</b> para moverla a la otra pantalla.
          </li>
          <li>
            Volvé a esta ventana y manejá el culto: <b>Iniciar / Pausar / Siguiente</b>,
            editá el guion de cada momento y enviá mensajes al orador.
          </li>
        </ol>
        <Separator />
        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <b>Anuncios grandes, de a uno:</b> en la sección <b>“Ahora”</b> activá el
          interruptor <b>Tarjetas</b> y escribí cada anuncio ahí mismo, en su tarjeta:
          se ve al instante en la pantalla con letra gigante. Pasás de una con los
          botones o con <b>← →</b>, y lo ya mostrado queda tachado. Los avisos de un
          momento futuro se preparan con el lápiz en “Programa del culto”.
        </div>
        <Separator />
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          <li>· Las dos ventanas se sincronizan solas, en tiempo real.</li>
          <li>
            · El contador pasa de blanco a amarillo en los minutos finales y a rojo cuando
            se cumple el tiempo.
          </li>
          <li>· Los datos quedan guardados en este navegador.</li>
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function MaximizeIcon() {
  return (
    <span className="inline-flex translate-y-0.5 items-center">
      <MonitorPlay className="h-3.5 w-3.5" aria-hidden="true" />
    </span>
  );
}
