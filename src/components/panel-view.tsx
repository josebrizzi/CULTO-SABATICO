"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Clock,
  FolderOpen,
  HelpCircle,
  MessageSquare,
  Minus,
  MonitorSpeaker,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
  Send,
  SkipBack,
  SkipForward,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  advance,
  back,
  COLOR_KEYS,
  ColorKey,
  currentSegment,
  defaultSegments,
  elapsedCurrent,
  fmtHMS,
  fmtMin,
  jumpTo,
  nextSegment,
  pause,
  phaseOf,
  remainingCurrent,
  resetCurrent,
  resetService,
  Segment,
  Settings,
  ShowState,
  start,
  uid,
  useNow,
  useShowChannel,
} from "@/lib/show";
import { VERSION_APP } from "@/lib/version";

/* ═══════════════════════════════════════════════════════════════════════
   Tema "Crema Elegante" — consola clara, sobria y delicada para la
   Iglesia Adventista del Séptimo Día. Fondo crema #F6F1E7, tarjetas
   blancas y letras oscuras (negro cálido #241E16, marrón #6B4A2F,
   blanco sobre los botones marrones), acentos dorado #B08D57. Orden del
   culto en vertical con conectores de minutos entre los bloques.
   Tipografías: Playfair Display (títulos), Lato (cuerpo), Roboto Mono
   (números y relojes). Todo scoping bajo .cns para NO tocar la pantalla
   del predicador.
   ═══════════════════════════════════════════════════════════════════════ */
const ESTILO_CONSOLA = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Lato:wght@400;700;900&family=Roboto+Mono:wght@500;600;700&display=swap');

/* Las variables se definen también en .cns-modal, .cns-pop y .cns-menu porque
   los modales y desplegables se renderizan en un portal FUERA del div .cns,
   y sin las variables los colores caerían al tema oscuro por defecto.
   Tema "Crema Elegante": fondo crema, tarjetas blancas, letras oscuras
   (negro cálido, marrón, blanco) y acentos dorado y marrón. */
.cns, .cns-modal, .cns-pop, .cns-menu{
  --paper:#F6F1E7; --paper-2:#F1EADC; --card:#FFFFFF; --card-soft:#FBF8F1;
  --ink:#241E16; --ink-2:#4A3E30; --ink-mut:#8A7A64;
  --marron:#6B4A2F; --marron-osc:#3A2C1A;
  --oro:#B08D57; --oro-lt:#D9C493; --oro-dim:rgba(176,141,87,.14);
  --ok:#4E7A52; --warn:#B98A2F; --danger:#B0452F;
  --line:#E4DCCB; --line-soft:#ECE5D5;
}
.cns{
  font-family:'Lato','Segoe UI',system-ui,-apple-system,sans-serif;
  color:var(--ink);
  background:
    radial-gradient(1200px 520px at 85% -10%, rgba(176,141,87,.10), transparent 60%),
    radial-gradient(900px 480px at -8% 110%, rgba(107,74,47,.07), transparent 55%),
    linear-gradient(180deg,#F8F4EC 0%,#F3EEE1 100%);
  background-attachment:fixed;
  height:100dvh;
}
.cns ::selection{ background:rgba(176,141,87,.30); }

/* ── Paneles de la consola ── */
.cns-panel{
  background:var(--card);
  border:1px solid var(--line);
  border-radius:16px;
  box-shadow:0 1px 2px rgba(90,70,40,.05), 0 10px 30px rgba(90,70,40,.07);
}
.cns-panel-active{ border-color:rgba(176,141,87,.60); }
.cns-eyebrow{
  display:flex;align-items:center;gap:8px;
  font-family:'Lato',system-ui,sans-serif;
  font-size:10.5px;font-weight:900;letter-spacing:.30em;text-transform:uppercase;
  color:#A3823F;
}
.cns-eyebrow::before{
  content:"";width:7px;height:7px;flex:none;background:var(--oro);
  border-radius:2px;
}
.cns-h2{
  font-family:'Playfair Display',Georgia,serif;
  font-size:20px;font-weight:700;letter-spacing:.01em;color:var(--ink);
  line-height:1.2;
}
.cns-sub{ font-size:12.5px;color:var(--ink-mut);line-height:1.5; }
.cns .text-muted-foreground{ color:var(--ink-mut) !important; }

/* ── Barra superior ── */
.cns-top{
  position:sticky;top:0;z-index:40;
  background:rgba(252,250,244,.94);
  backdrop-filter:blur(10px);
  border-bottom:1px solid var(--line);
  box-shadow:0 8px 24px rgba(90,70,40,.08);
}
.cns-top::after{
  content:"";display:block;height:2px;
  background:linear-gradient(90deg,transparent 4%,var(--oro-lt) 22%,var(--oro) 50%,var(--oro-lt) 78%,transparent 96%);
  opacity:.8;
}
.cns-top-in{
  max-width:1440px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;
  gap:10px;padding:12px 18px;
}
.cns-logo{
  width:42px;height:42px;flex:none;border-radius:12px;display:grid;place-items:center;
  color:#F5E9D2;background:linear-gradient(150deg,var(--marron) 0%,var(--marron-osc) 92%);
  border:1px solid var(--oro-lt);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 6px 16px rgba(58,44,26,.28);
}
.cns-iglesia{
  font-family:'Lato',system-ui,sans-serif;font-size:10px;font-weight:700;
  letter-spacing:.24em;text-transform:uppercase;color:#A3823F;
}
.cns-titulo{
  font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:700;
  letter-spacing:.08em;text-transform:uppercase;color:var(--ink);line-height:1.15;
}
.cns-lema{
  font-family:'Lato',system-ui,sans-serif;font-size:12px;color:var(--ink-mut);
}
.cns-ver{
  font-family:'Roboto Mono',ui-monospace,monospace;font-size:10px;color:var(--ink-mut);
  border:1px solid #E0D5BE;border-radius:7px;padding:3px 8px;
  background:#FFFFFF;
}

/* ── Píldoras de estado y leds ── */
.cns-pill{
  display:inline-flex;align-items:center;gap:7px;border-radius:999px;
  padding:5px 12px;font-size:11px;font-weight:800;letter-spacing:.08em;
  text-transform:uppercase;border:1px solid var(--line);
  color:var(--ink-2);background:#FFFFFF;white-space:nowrap;
}
.cns-pill-live{ background:#F6EFDD;border-color:var(--oro-lt);color:#7A5A28; }
.cns-pill-danger{ background:#F9EDE8;border-color:rgba(176,69,47,.40);color:#8A3A26; }
.cns-pill-warn{ background:#F8F0DC;border-color:#E0C98C;color:#8A6A1F; }
.cns-pill-ok{ background:#EAF0E6;border-color:#C2D0B4;color:#3E6B4A; }
.cns-pill-dim{ color:var(--ink-mut); }
.cns-led{ width:8px;height:8px;flex:none;border-radius:999px;background:#B4A78E; }
.cns-led-blink{ background:var(--danger);animation:cns-pulse 1.1s ease-in-out infinite; }
.cns-pill-live .cns-led{ background:#A3823F;animation:cns-pulse 1.1s ease-in-out infinite; }
.cns-led-ok{ background:var(--ok);animation:cns-pulse 2s ease-in-out infinite; }
.cns-led-warn{ background:var(--warn); }
@keyframes cns-pulse{ 0%,100%{opacity:1} 50%{opacity:.35} }

/* ── Botones ── */
.cns .cns-btn-gold{
  background:linear-gradient(135deg,#7A563A 0%,#5C4327 100%);color:#FFFFFF;
  border:1px solid rgba(217,196,147,.65);font-weight:800;letter-spacing:.03em;
  box-shadow:0 6px 18px rgba(92,67,39,.28), inset 0 1px 0 rgba(255,255,255,.18);
}
.cns .cns-btn-gold:hover{ background:linear-gradient(135deg,#8A6444 0%,#6B4E30 100%);color:#FFFFFF; }
.cns .cns-btn-line{
  background:#FFFFFF;border:1px solid #D5C7A9;
  color:var(--marron);font-weight:700;
}
.cns .cns-btn-line:hover{ background:#F6EFDD;border-color:#C9B68C;color:#5C4327; }
.cns .cns-btn-ghost{ color:var(--ink-mut); }
.cns .cns-btn-ghost:hover{ background:var(--paper-2);color:#5C4327; }
.cns .cns-icobtn{ color:var(--ink-mut); }
.cns .cns-icobtn:hover{ background:var(--paper-2);color:#5C4327; }

/* ── Orden del culto: cajas grandes en vertical con conectores ── */
.cns-box{
  position:relative;display:grid;grid-template-columns:auto minmax(0,1fr) minmax(0,auto) auto;
  align-items:center;gap:12px;
  border-radius:14px;border:1px solid var(--line);
  background:var(--card);padding:13px 14px 13px 12px;cursor:pointer;
  box-shadow:0 1px 2px rgba(90,70,40,.05), 0 5px 14px rgba(90,70,40,.05);
  transition:border-color .25s ease-in-out,box-shadow .25s ease-in-out;
}
.cns-box:hover{
  border-color:#D3C5A8;
  box-shadow:0 2px 4px rgba(90,70,40,.06), 0 8px 20px rgba(90,70,40,.09);
}
.cns-box-done{ opacity:.55; }
.cns-box-done .cns-box-title{ text-decoration:line-through; }
.cns-box-now{
  border-color:var(--oro);
  background:linear-gradient(180deg,#FFFDF6 0%,#FFFFFF 100%);
  box-shadow:0 0 0 1px var(--oro-lt), 0 10px 26px rgba(176,141,87,.22);
}
.cns-box-num{
  width:34px;height:34px;flex:none;display:grid;place-items:center;
  border-radius:10px;border:1px solid var(--line);
  background:var(--paper);color:var(--marron);
  font-family:'Roboto Mono',ui-monospace,monospace;font-size:13px;font-weight:700;
}
.cns-box-now .cns-box-num{ background:#F6EFDD;border-color:var(--oro-lt);color:#7A5A28; }
.cns-box-title{
  font-size:15.5px;font-weight:700;color:var(--ink);letter-spacing:.01em;line-height:1.25;
}
.cns-box-speaker{ font-size:11.5px;font-weight:400;color:var(--ink-mut); }
/* Puntos de la tarjeta, en el espacio de la derecha de cada caja: el
   operador ve de un golpe qué viene en ese momento y cuántos min tiene */
.cns-box-side{
  display:flex;min-width:0;align-items:center;justify-content:flex-end;gap:12px;
}
.cns-box-puntos{
  display:flex;flex-direction:column;gap:1px;min-width:0;max-width:300px;
}
.cns-box-punto{
  display:flex;align-items:center;gap:6px;min-width:0;
  font-size:11px;line-height:1.45;color:var(--ink-mut);
}
.cns-box-punto::before{
  content:"";width:4.5px;height:4.5px;flex:none;border-radius:999px;background:var(--oro);
}
.cns-box-punto > span{ overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
.cns-box-punto-mas{ font-size:10px;font-weight:700;letter-spacing:.05em;color:var(--oro); }
.cns-box-punto-mas::before{ display:none; }
.cns-box-now .cns-box-punto{ color:var(--ink-2); }
.cns-minchip{
  flex:none;font-family:'Roboto Mono',ui-monospace,monospace;font-size:11px;font-weight:700;
  color:var(--marron);background:var(--paper);border:1px solid #E0D5BE;border-radius:999px;
  padding:3px 9px;white-space:nowrap;
}
.cns-box-now .cns-minchip{ background:#F6EFDD;border-color:var(--oro-lt);color:#7A5A28; }
@media (max-width:880px){
  .cns-box{ grid-template-columns:auto minmax(0,1fr) auto; }
  .cns-box-side{ display:none; }
}
.cns-tipo{
  display:inline-flex;align-items:center;border-radius:999px;
  padding:2.5px 9px;font-size:9.5px;font-weight:900;
  letter-spacing:.14em;text-transform:uppercase;border:1px solid;
  white-space:nowrap;
}
.cns-tipo-inicio{ background:#F6EFDD;border-color:#E0CFA8;color:#7A5A28; }
.cns-tipo-sermon{ background:#F0E7DA;border-color:#D8C4A8;color:#5C4327; }
.cns-tipo-ninos{ background:#EBEFE3;border-color:#C9D4BA;color:#4E6647; }
.cns-tipo-general{ background:#F3EFE6;border-color:#DED4C0;color:#6B5844; }
.cns-connector{ position:relative;height:34px; }
.cns-connector::before{
  content:"";position:absolute;left:28px;top:2px;bottom:2px;width:2px;
  border-radius:2px;background:#DCD0B6;
}
.cns-connector-pill{
  position:absolute;left:28px;top:50%;transform:translate(-50%,-50%);z-index:1;
  display:inline-flex;align-items:center;
  background:var(--card);border:1px solid #E0D5BE;border-radius:999px;
  padding:3px 10px;
  font-family:'Roboto Mono',ui-monospace,monospace;font-size:10.5px;font-weight:700;
  color:var(--marron);box-shadow:0 1px 3px rgba(90,70,40,.10);white-space:nowrap;
}
.cns-box-add{
  display:flex;align-items:center;justify-content:center;gap:8px;
  border-radius:14px;border:1.5px dashed #D3C5A8;background:transparent;
  padding:12px 14px;margin-top:2px;
  font-size:12.5px;font-weight:700;color:var(--ink-mut);
  transition:border-color .25s ease-in-out,color .25s ease-in-out,background .25s ease-in-out;
}
.cns-box-add:hover{ border-color:var(--oro);color:var(--marron);background:var(--oro-dim); }

/* ── Franja horaria a la par del orden ── */
.cns-franja{
  display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;
  border:1px solid var(--line);background:var(--paper);
  border-radius:12px;padding:8px 12px;margin:4px 12px 0;
}
.cns-franja-lab{
  font-family:'Roboto Mono',ui-monospace,monospace;font-size:10px;
  letter-spacing:.10em;text-transform:uppercase;color:var(--ink-mut);
  white-space:nowrap;
}
.cns-franja-lab b{ color:var(--ink-2);font-weight:700;letter-spacing:0; }
.cns-franja input{
  font-family:'Roboto Mono',ui-monospace,monospace;font-size:12px;color:var(--ink);
  height:28px;width:88px;padding:0 6px;background:#FFFFFF;
}
.cns-franja input:focus{
  outline:none;border-color:#C9B68C;box-shadow:0 0 0 3px rgba(176,141,87,.20);
}
.cns-hora{
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
  font-family:'Roboto Mono',ui-monospace,monospace;font-size:11.5px;font-weight:700;
  color:#A3823F;white-space:nowrap;
}
.cns-hora small{
  font-size:8.5px;font-weight:900;letter-spacing:.12em;color:var(--marron);
}
.cns-hora-now span{ color:var(--marron); }
.cns-fin{
  display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;
  border:1px solid var(--line);background:var(--card-soft);
  border-radius:14px;padding:10px 14px;
}
.cns-fin-titulo{
  font-family:'Playfair Display',Georgia,serif;font-size:15px;font-weight:700;
  color:var(--ink);
}

/* ── Menú de los tres puntitos ── */
.cns-menu{
  position:absolute;top:calc(100% + 4px);right:2px;z-index:60;min-width:168px;
  width:max-content;max-width:min(260px,92vw);
  border-radius:12px;border:1px solid #E0D5BE;background:#FFFFFF;
  box-shadow:0 18px 40px rgba(60,45,25,.20);
  padding:4px;display:flex;flex-direction:column;
}
.cns-menu button{
  display:block;border-radius:8px;padding:7px 10px;
  font-size:12.5px;font-weight:700;color:var(--ink-2);text-align:left;
}
.cns-menu button:hover{ background:var(--paper-2);color:#5C4327; }
.cns-menu button:disabled{ opacity:.35;pointer-events:none; }

/* ── Etiquetas chiquitas de los ajustes en línea ── */
.cns-setlab{
  font-family:'Roboto Mono',ui-monospace,monospace;font-size:10px;
  letter-spacing:.14em;text-transform:uppercase;color:var(--ink-mut);
}

/* ── Reloj y medidor ── */
.cns-timer{
  font-family:'Roboto Mono',ui-monospace,monospace;font-weight:700;
  letter-spacing:-0.01em;line-height:.95;
}
.cns-timer-label{
  font-family:'Lato',system-ui,sans-serif;font-size:10px;font-weight:900;
  letter-spacing:.3em;text-transform:uppercase;color:#A3823F;text-align:center;
}
.cns-kbd{
  display:inline-block;font-family:'Roboto Mono',ui-monospace,monospace;font-size:10px;
  border:1px solid #E0D5BE;border-bottom-width:2px;border-radius:5px;
  padding:1px 6px;background:#FAF6EC;color:var(--ink-2);
}
.cns-alert-danger{
  display:flex;gap:10px;align-items:flex-start;border-radius:12px;
  border:1px solid rgba(176,69,47,.35);background:#F9EDE8;
  padding:12px 14px;font-size:13px;color:#7C3A26;
}

/* ── Campos ── */
.cns .cns-in, .cns-modal .cns-in{
  background:#FFFFFF;border:1px solid #DCD2BE;
  color:var(--ink) !important;border-radius:10px;
}
.cns .cns-in::placeholder, .cns-modal .cns-in::placeholder{ color:#A89878; }
.cns .cns-in:focus-visible, .cns-modal .cns-in:focus-visible,
.cns .cns-in:focus, .cns-modal .cns-in:focus{
  border-color:#C9B68C;box-shadow:0 0 0 3px rgba(176,141,87,.20);
}
.cns button[role="switch"], .cns-modal button[role="switch"]{
  border-color:#DCD2BE;
}
.cns button[role="switch"][data-state="unchecked"],
.cns-modal button[role="switch"][data-state="unchecked"]{
  background:#DDD3BC !important;border-color:#CFC3A8 !important;
}
.cns button[role="switch"][data-state="checked"],
.cns-modal button[role="switch"][data-state="checked"]{
  background:var(--marron) !important;border-color:var(--marron) !important;
}
.cns button[role="switch"] > span, .cns-modal button[role="switch"] > span{
  background:#FFFFFF !important;
}
.cns button[role="switch"][data-state="checked"] > span,
.cns-modal button[role="switch"][data-state="checked"] > span{
  background:#FFFFFF !important;
}

/* ── Modales y desplegables (se renderizan fuera de .cns, en un portal) ── */
.cns-modal{
  background:linear-gradient(180deg,#FFFFFF,#FBF7EE);
  border:1px solid #E0D5BE;color:var(--ink);border-radius:16px;
  box-shadow:0 30px 70px rgba(60,45,25,.30);
}
.cns-modal label{ color:var(--ink-2) !important;font-weight:700; }
.cns-modal .text-muted-foreground{ color:var(--ink-mut) !important; }
.cns-modal [data-slot="dialog-close"], .cns-modal button.dialog-close{ color:var(--ink-mut); }
.cns-pop{
  background:#FFFFFF;border:1px solid #E0D5BE;border-radius:12px;
  color:var(--ink);box-shadow:0 18px 40px rgba(60,45,25,.20);
  font-family:'Lato','Segoe UI',system-ui,sans-serif;
}
.cns-pop [role="option"]{ color:var(--ink-2) !important; }
.cns-pop [role="option"][data-highlighted]{ background:var(--paper-2);color:#5C4327; }

/* ── Detalles ── */
.cns-sep{ height:1px;background:var(--line-soft); }
.cns-note{
  border:1px solid var(--line);background:var(--paper);
  border-radius:12px;padding:12px 14px;font-size:13px;color:var(--ink-2);
}
.cns-rise{ animation:cns-rise .28s ease-in-out both; }
@keyframes cns-rise{ from{ opacity:0;transform:translateY(6px); } to{ opacity:1;transform:none; } }
@media (prefers-reduced-motion: reduce){
  .cns *, .cns-modal *{
    animation-duration:.01ms !important;animation-iteration-count:1 !important;
    transition-duration:.01ms !important;
  }
}
`;

/* ──────────── Tipo de momento (deducido del título) ──────────── */

/** Etiqueta del bloque al que pertenece el momento, deducida del título:
    inicio, escuela sabática, sermón de niños, sermón (adultos), alabanza,
    ofrenda, oración, avisos… Sirve para distinguir de un golpe de vista
    las partes del culto en el orden vertical. */
function tipoDeMomento(titulo: string): { label: string; tone: string } {
  const t = titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (/nin[oa]/.test(t)) {
    return /sermon|predic|mensaje|palabra|reflexion/.test(t)
      ? { label: "Sermón niños", tone: "cns-tipo-ninos" }
      : { label: "Niños", tone: "cns-tipo-ninos" };
  }
  if (/sermon|predic|mensaje|palabra|reflexion/.test(t)) {
    return { label: "Sermón adultos", tone: "cns-tipo-sermon" };
  }
  if (/escuela/.test(t)) return { label: "Escuela sabática", tone: "cns-tipo-inicio" };
  if (/inicio|bienvenida|entrada|apertura|intro/.test(t)) {
    return { label: "Inicio", tone: "cns-tipo-inicio" };
  }
  if (/alabanz|adoracion|himno|canto|musica/.test(t)) {
    return { label: "Alabanza", tone: "cns-tipo-general" };
  }
  if (/ofrend/.test(t)) return { label: "Ofrenda", tone: "cns-tipo-general" };
  if (/oracion/.test(t)) return { label: "Oración", tone: "cns-tipo-general" };
  if (/aviso|anunci/.test(t)) return { label: "Avisos", tone: "cns-tipo-general" };
  if (/bendic/.test(t)) return { label: "Bendición", tone: "cns-tipo-general" };
  return { label: "Momento", tone: "cns-tipo-general" };
}

/* ────────────────── Franja horaria (utilidades) ────────────────── */

/** "09:30" → 570 (minutos desde medianoche); null si el dato no es válido. */
function minDeHora(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** 570 → "09:30" (da la vuelta a las 24 h si el culto cruza medianoche). */
function fmtHora(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Un programa guardado: los momentos de un tipo de culto con su franja horaria. */
type ProgramaGuardado = {
  id: string;
  nombre: string;
  inicio: string;
  limite: string;
  segments: Segment[];
  creado: number;
};

export default function PanelView() {
  const { state, mutate, peerOnline } = useShowChannel("panel");
  const now = useNow(500);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [msgDraft, setMsgDraft] = useState("");
  const [msgUrgent, setMsgUrgent] = useState(false);
  const [menuIdx, setMenuIdx] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  /* Franja horaria: hora de inicio y límite (se guarda en este navegador) */
  const [franja, setFranja] = useState({ inicio: "09:30", limite: "12:00" });
  useEffect(() => {
    try {
      const raw = localStorage.getItem("culto-franja-v1");
      if (raw) {
        const p = JSON.parse(raw) as { inicio?: string; limite?: string };
        if (typeof p.inicio === "string" && typeof p.limite === "string") {
          setFranja({ inicio: p.inicio, limite: p.limite });
        }
      }
    } catch {
      /* sin datos guardados: quedan los valores por defecto */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("culto-franja-v1", JSON.stringify(franja));
    } catch {
      /* almacenamiento no disponible: la franja solo vive en esta sesión */
    }
  }, [franja]);

  /* Programas guardados: cada tipo de culto (mañana, evangelismo, jóvenes,
     oración…) con sus momentos y su franja horaria predefinida */
  const [programas, setProgramas] = useState<ProgramaGuardado[]>([]);
  const [progOpen, setProgOpen] = useState(false);
  const [progNombre, setProgNombre] = useState("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem("culto-programas-v1");
      if (raw) {
        const arr = JSON.parse(raw) as ProgramaGuardado[];
        if (Array.isArray(arr)) {
          setProgramas(
            arr.filter(
              (p) =>
                p &&
                typeof p.id === "string" &&
                typeof p.nombre === "string" &&
                Array.isArray(p.segments),
            ),
          );
        }
      }
    } catch {
      /* sin programas guardados: la lista arranca vacía */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("culto-programas-v1", JSON.stringify(programas));
    } catch {
      /* almacenamiento no disponible: los programas solo viven en esta sesión */
    }
  }, [programas]);

  /* ── Nube: los programas también se guardan en un servidor, con un
        código de sincronización. Así la lista no queda atrapada en una
        computadora: en otra máquina se pega el mismo código y aparecen
        los mismos programas. Sin internet, queda la copia local. ── */
  const NUBE_URL = "https://textdb.dev/api/data/";
  const NUBE_LSK = "culto-nube-v1";
  const [nubeCodigo, setNubeCodigo] = useState<string | null>(null);
  const [nubeEstado, setNubeEstado] = useState<
    "ok" | "conectando" | "sinconexion" | "local"
  >("local");
  const [nubeEntrada, setNubeEntrada] = useState("");
  const nubeCodigoRef = useRef<string | null>(null);

  const validarProgramas = (arr: unknown): ProgramaGuardado[] =>
    Array.isArray(arr)
      ? arr.filter(
          (p): p is ProgramaGuardado =>
            !!p &&
            typeof (p as ProgramaGuardado).id === "string" &&
            typeof (p as ProgramaGuardado).nombre === "string" &&
            Array.isArray((p as ProgramaGuardado).segments),
        )
      : [];

  const pushANube = async (codigo: string, lista: ProgramaGuardado[]) => {
    setNubeEstado("conectando");
    try {
      await fetch(`${NUBE_URL}${encodeURIComponent(codigo)}`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ app: "culto-tiempos", v: 1, programas: lista }),
      });
      setNubeEstado("ok");
    } catch {
      setNubeEstado("sinconexion");
    }
  };

  const cargarDeNube = async (codigo: string): Promise<boolean> => {
    setNubeEstado("conectando");
    try {
      const r = await fetch(`${NUBE_URL}${encodeURIComponent(codigo)}`, {
        cache: "no-store",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const txt = (await r.text()).trim();
      if (!txt) {
        /* Código nuevo, todavía vacío en el servidor: se sube lo que haya acá */
        setNubeEstado("ok");
        const local = validarProgramas(
          (() => {
            try {
              return JSON.parse(localStorage.getItem("culto-programas-v1") ?? "[]");
            } catch {
              return [];
            }
          })(),
        );
        if (local.length > 0) await pushANube(codigo, local);
        return true;
      }
      const data = JSON.parse(txt) as { programas?: unknown };
      if (Array.isArray(data?.programas)) {
        setProgramas(validarProgramas(data.programas));
      }
      setNubeEstado("ok");
      return true;
    } catch {
      setNubeEstado("sinconexion");
      return false;
    }
  };

  /* Primer código propio: se genera acá, queda en el navegador y en la
     dirección de la página (?nube=…) para poder copiarla a otra compu */
  const asegurarCodigoNube = (): string => {
    let codigo = nubeCodigoRef.current;
    if (!codigo) {
      codigo = `culto-${Math.random().toString(36).slice(2, 8)}${Date.now()
        .toString(36)
        .slice(-4)}`;
      nubeCodigoRef.current = codigo;
      try {
        localStorage.setItem(NUBE_LSK, codigo);
      } catch {
        /* sin localStorage: el código vive en esta sesión */
      }
      try {
        const u = new URL(window.location.href);
        u.searchParams.set("nube", codigo);
        window.history.replaceState(null, "", u);
      } catch {
        /* la dirección no es crítica */
      }
      setNubeCodigo(codigo);
    }
    return codigo;
  };

  /* Al abrir la página: si hay código (en la dirección o en este navegador),
     se trae del servidor la lista guardada */
  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      const deUrl = u.searchParams.get("nube");
      const guardado = localStorage.getItem(NUBE_LSK);
      const codigo = (deUrl || guardado || "").trim();
      if (!codigo) return;
      localStorage.setItem(NUBE_LSK, codigo);
      nubeCodigoRef.current = codigo;
      setNubeCodigo(codigo);
      if (!deUrl) {
        u.searchParams.set("nube", codigo);
        window.history.replaceState(null, "", u);
      }
      void cargarDeNube(codigo);
    } catch {
      /* sin URL o sin almacenamiento: queda el guardado local */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const conectarNube = async () => {
    const codigo = nubeEntrada.trim();
    if (!codigo) return;
    nubeCodigoRef.current = codigo;
    setNubeCodigo(codigo);
    setNubeEntrada("");
    try {
      localStorage.setItem(NUBE_LSK, codigo);
    } catch {
      /* sin localStorage: el código vive en esta sesión */
    }
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("nube", codigo);
      window.history.replaceState(null, "", u);
    } catch {
      /* la dirección no es crítica */
    }
    await cargarDeNube(codigo);
  };

  const copiarNubeCodigo = async () => {
    const codigo = nubeCodigoRef.current;
    if (!codigo) return;
    try {
      await navigator.clipboard.writeText(codigo);
    } catch {
      window.prompt("Copiá el código de la nube:", codigo);
    }
  };

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  /* Auto-scroll del orden del culto: centra el momento en curso */
  const currentChipRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    currentChipRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "nearest",
      block: "center",
    });
  }, [state.currentIndex]);

  const seg = currentSegment(state);
  const next = nextSegment(state);
  const active = state.currentIndex >= 0 && seg !== null;
  const totalMs = (seg?.minutes ?? 0) * 60000;
  const elapsed = active ? elapsedCurrent(state, now) : 0;
  const remaining = active ? totalMs - elapsed : 0;
  const overtimeMs = active ? Math.max(0, elapsed - totalMs) : 0;
  const phase = active ? phaseOf(remaining, state.settings.warningMin) : "idle";
  const live = now > 0 && active;

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

  const sendMessage = (text: string, urgent: boolean) => {
    const t = text.trim();
    if (!t) return;
    mutate((p) => ({ ...p, message: { id: uid(), text: t, urgent } }));
  };

  /* ─────────────── Programas guardados por tipo de culto ─────────────── */

  const guardarPrograma = () => {
    const nombre = progNombre.trim();
    if (!nombre) return;
    const lista: ProgramaGuardado[] = [
      {
        id: uid(),
        nombre,
        inicio: franja.inicio,
        limite: franja.limite,
        segments: state.segments.map((x) => ({ ...x, bullets: [...x.bullets] })),
        creado: Date.now(),
      },
      ...programas.filter((y) => y.nombre.toLowerCase() !== nombre.toLowerCase()),
    ];
    setProgramas(lista);
    setProgNombre("");
    /* El guardado viaja al servidor: si todavía no hay código, se genera uno */
    void pushANube(asegurarCodigoNube(), lista);
  };

  const cargarPrograma = (pr: ProgramaGuardado) => {
    const arr = pr.segments.map((x, i) => ({
      ...x,
      id: uid(),
      bullets: [...x.bullets],
      color: (x.color || COLOR_KEYS[i % COLOR_KEYS.length]) as ColorKey,
    }));
    mutate((p) => ({ ...resetService(p), segments: arr }));
    setFranja({ inicio: pr.inicio, limite: pr.limite });
    setProgOpen(false);
  };

  const borrarPrograma = (id: string) => {
    if (window.confirm("¿Eliminar este programa guardado?")) {
      const lista = programas.filter((y) => y.id !== id);
      setProgramas(lista);
      if (nubeCodigoRef.current) void pushANube(nubeCodigoRef.current, lista);
    }
  };

  /* ────────────── Pantalla del predicador ────────────── */

  const openPreacherWindow = () => {
    const base = window.location.href.split("#")[0];
    window.open(`${base}#predicador`, "culto-predicador", "width=1040,height=680");
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

  /* ── Franja horaria: hora de cada momento, fin planificado y margen ── */
  const enMarcha = state.currentIndex >= 0 && state.status !== "finished";
  const inicioMin = minDeHora(franja.inicio) ?? 570; // 09:30 si falta el dato
  const limiteMin = minDeHora(franja.limite) ?? 720; // 12:00 si falta el dato
  const inicios = useMemo(() => {
    const arr: number[] = [];
    let acc = inicioMin;
    for (const x of state.segments) {
      arr.push(acc);
      acc += x.minutes;
    }
    return arr;
  }, [state.segments, inicioMin]);
  const finPlanMin = inicioMin + totalMin;
  const margen = limiteMin - finPlanMin;
  const ahoraDate = now > 0 ? new Date(now) : null;
  const ahoraTxt = ahoraDate
    ? `${String(ahoraDate.getHours()).padStart(2, "0")}:${String(
        ahoraDate.getMinutes(),
      ).padStart(2, "0")}`
    : "--:--";
  const finEstMin =
    ahoraDate && enMarcha
      ? ahoraDate.getHours() * 60 + ahoraDate.getMinutes() + plannedRemain
      : null;
  const franjaEstado = (() => {
    const base = enMarcha && finEstMin !== null ? limiteMin - finEstMin : margen;
    if (base < 0) {
      return {
        text: `Te pasás ${-base} min del límite`,
        pill: "cns-pill-danger",
        led: "cns-led cns-led-blink",
      };
    }
    if (base <= 10) {
      return {
        text: `Margen ajustado: ${base} min`,
        pill: "cns-pill-warn",
        led: "cns-led cns-led-warn",
      };
    }
    return {
      text: `Margen ${base} min`,
      pill: "cns-pill-ok",
      led: "cns-led cns-led-ok",
    };
  })();

  const editingSeg = state.segments.find((x) => x.id === editingId) ?? null;

  /* Estado del guardado en el servidor, para la píldora de Programas */
  const nubePill =
    nubeEstado === "ok"
      ? "cns-pill-ok"
      : nubeEstado === "conectando"
        ? "cns-pill-warn"
        : nubeEstado === "sinconexion"
          ? "cns-pill-danger"
          : "cns-pill-dim";
  const nubeLed =
    nubeEstado === "ok"
      ? "cns-led cns-led-ok"
      : nubeEstado === "conectando"
        ? "cns-led"
        : nubeEstado === "sinconexion"
          ? "cns-led cns-led-blink"
          : "cns-led";
  const nubeTexto =
    nubeEstado === "ok"
      ? "En el servidor"
      : nubeEstado === "conectando"
        ? "Sincronizando…"
        : nubeEstado === "sinconexion"
          ? "Sin conexión: solo esta compu"
          : "Solo en esta compu";

  const counterColor =
    phase === "overtime"
      ? "text-[#B0452F]"
      : phase === "warning"
        ? "text-[#B98A2F]"
        : "text-[#241E16]";

  const statusPill = (() => {
    if (state.status === "finished") {
      return (
        <span className="cns-pill cns-pill-dim">
          <span className="cns-led" /> Finalizado
        </span>
      );
    }
    if (!active) {
      return (
        <span className="cns-pill cns-pill-dim">
          <span className="cns-led" /> En espera
        </span>
      );
    }
    if (phase === "overtime") {
      return (
        <span className="cns-pill cns-pill-danger">
          <span className="cns-led cns-led-blink" /> Tiempo cumplido
        </span>
      );
    }
    if (state.status === "running") {
      return (
        <span className="cns-pill cns-pill-live">
          <span className="cns-led cns-led-blink" /> En vivo
        </span>
      );
    }
    return (
      <span className="cns-pill cns-pill-warn">
        <span className="cns-led" /> En pausa
      </span>
    );
  })();
