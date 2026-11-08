"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Conexión con "Biblia Sincronizada" (misma cuenta de GitHub del usuario).
 *
 * El predicador elige versículos en admin.html de esa app; su servidor
 * (Node + WebSocket, alojado en Render) los difunde a TODOS los clientes
 * conectados con mensajes { type: "projection", data }.
 *
 * La pantalla del predicador se conecta como un cliente más y así puede
 * mostrar la letra bíblica arriba, con el contador del culto abajo,
 * sin tocar para nada la app de la Biblia ni la proyección proyeccion.html.
 */

export const BIBLIA_URL_DEFECTO = "https://biblia-sincronizada.onrender.com";
const LS_URL = "bibliaServidorUrl";

/* ─────────────────────────── Tipos ─────────────────────────── */

export interface VersoBiblia {
  bookName: string;
  chapter: number;
  verse: number;
  version: string;
  words: string[];
}

export type MensajeBiblia =
  | { kind: "verso"; verso: VersoBiblia }
  | { kind: "cita"; html: string }
  | null;

export type EstadoBiblia = "conectando" | "conectado" | "desconectado";

/* ─────────────── Abreviaturas (igual que proyeccion.html) ─────────────── */

function normalizar(s: string): string {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

const LIBRO_ABBR: Record<string, string> = {
  genesis: "Gn", exodo: "Ex", levitico: "Lv", numeros: "Nm", deuteronomio: "Dt",
  josue: "Js", jueces: "Jz", rut: "Rt", "1 samuel": "1S", "2 samuel": "2S",
  "1 reyes": "1R", "2 reyes": "2R", "1 cronicas": "1Cr", "2 cronicas": "2Cr",
  esdras: "Esd", nehemias: "Neh", ester: "Est", job: "Job", salmos: "Sal", salmo: "Sal",
  proverbios: "Pr", eclesiastes: "Ec", cantares: "Ct", "cantar de los cantares": "Ct",
  isaias: "Is", jeremias: "Jr", lamentaciones: "Lm", ezequiel: "Ez", daniel: "Dn",
  oseas: "Os", joel: "Jl", amos: "Am", obadias: "Ob", jonas: "Jon", miqueas: "Mi",
  nahum: "Nah", habacuc: "Hab", sofonias: "Sof", hageo: "Hag", zacarias: "Zac", malaquias: "Mal",
  mateo: "Mt", marcos: "Mr", lucas: "Lc", juan: "Jn", hechos: "Hch", romanos: "Ro",
  "1 corintios": "1Co", "2 corintios": "2Co", galatas: "Ga", efesios: "Ef", filipenses: "Fil",
  colosenses: "Col", "1 tesalonicenses": "1Ts", "2 tesalonicenses": "2Ts",
  "1 timoteo": "1Ti", "2 timoteo": "2Ti", tito: "Tit", filemon: "Flm", hebreos: "Heb",
  santiago: "Stg", "1 pedro": "1P", "2 pedro": "2P", "1 juan": "1Jn", "2 juan": "2Jn", "3 juan": "3Jn",
  judas: "Jud", apocalipsis: "Ap",
};

const VERSION_ABBR: Record<string, string> = {
  "reina-valera 1960": "RV60",
  "reina valera 1960": "RV60",
  "nueva traduccion viviente": "NTV",
  "dios habla hoy": "DHH",
  "traduccion en lenguaje actual": "TLA",
};

export function abreviarLibro(nombre: string): string {
  return LIBRO_ABBR[normalizar(nombre)] || nombre;
}

export function abreviarVersion(v: string): string {
  const key = normalizar(v);
  if (VERSION_ABBR[key]) return VERSION_ABBR[key];
  return v
    .split(/\s+/)
    .map((p) => p[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 5);
}

export function textoDelVerso(v: VersoBiblia): string {
  return (v.words || []).join(" ").trim();
}

export function referenciaDelVerso(v: VersoBiblia): string {
  return `${abreviarLibro(v.bookName)} ${v.chapter}:${v.verse}`;
}

/* ─────────────────────── URL guardada ─────────────────────── */

export function urlBibliaGuardada(): string {
  try {
    return localStorage.getItem(LS_URL) || BIBLIA_URL_DEFECTO;
  } catch {
    return BIBLIA_URL_DEFECTO;
  }
}

export function guardarUrlBiblia(url: string): void {
  try {
    localStorage.setItem(LS_URL, url.trim());
  } catch {
    /* sin localStorage: se usa la default */
  }
}

/* Sanitizado mínimo para el texto libre ("Cita") que manda el admin */
function limpiarHtml(html: string): string {
  return String(html)
    .replace(/<\s*(script|iframe|object|embed|link|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|iframe|object|embed|link|meta)[^>]*\/?>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

/* ─────────────────────── Hook de conexión ─────────────────────── */

interface ProyeccionMsg {
  type: string;
  data?: {
    type: string;
    words?: string[];
    bookName?: string;
    chapter?: number;
    verse?: number;
    version?: string;
    html?: string;
  };
}

export function useBibliaSocket(url: string): {
  estado: EstadoBiblia;
  mensaje: MensajeBiblia;
  ocultar: () => void;
  reintentar: () => void;
} {
  const [estado, setEstado] = useState<EstadoBiblia>("conectando");
  const [mensaje, setMensaje] = useState<MensajeBiblia>(null);
  const [nonce, setNonce] = useState(0);

  // Al cambiar la URL: nueva conexión y se limpia lo mostrado
  useEffect(() => {
    setMensaje(null);
    setEstado("conectando");
    setNonce((n) => n + 1);
  }, [url]);

  useEffect(() => {
    if (!url || !nonce) return;
    let cerrado = false;
    let reintro: number | undefined;
    let ws: WebSocket | null = null;

    const conectar = () => {
      if (cerrado) return;
      setEstado((e) => (e === "conectado" ? e : "conectando"));
      try {
        const u = url.replace(/^http/, "ws").replace(/\/+$/, "");
        ws = new WebSocket(u);
      } catch {
        setEstado("desconectado");
        reintro = window.setTimeout(conectar, 3000);
        return;
      }

      ws.onopen = () => {
        if (!cerrado) setEstado("conectado");
      };
      ws.onclose = () => {
        if (cerrado) return;
        setEstado("desconectado");
        reintro = window.setTimeout(conectar, 3000);
      };
      ws.onerror = () => {
        try {
          ws?.close();
        } catch {
          /* ignorar */
        }
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as ProyeccionMsg;
          if (msg.type !== "projection" || !msg.data) return;
          const d = msg.data;
          if (d.type === "verse" && d.words && d.bookName) {
            setMensaje({
              kind: "verso",
              verso: {
                bookName: String(d.bookName),
                chapter: Number(d.chapter) || 0,
                verse: Number(d.verse) || 0,
                version: String(d.version || ""),
                words: d.words.map(String),
              },
            });
          } else if (d.type === "freeText" && typeof d.html === "string") {
            setMensaje({ kind: "cita", html: limpiarHtml(d.html) });
          }
        } catch {
          /* mensaje inválido: ignorar */
        }
      };
    };

    conectar();
    return () => {
      cerrado = true;
      if (reintro) window.clearTimeout(reintro);
      try {
        ws?.close();
      } catch {
        /* ignorar */
      }
    };
  }, [url, nonce]);

  const ocultar = () => {
    setMensaje(null);
  };

  const reintentar = () => {
    setEstado("conectando");
    setNonce((n) => n + 1);
  };

  return { estado, mensaje, ocultar, reintentar };
}
