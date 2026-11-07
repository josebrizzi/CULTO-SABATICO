import type { NextConfig } from "next";

/**
 * Modos de compilación:
 *
 * 1) Normal (por defecto): servidor Next standalone, igual que siempre.
 *
 * 2) Export estático: STATIC_EXPORT=1  →  genera la carpeta `out/` con HTML/JS/CSS
 *    puros, lista para:
 *      - abrirse en la PC con un servidor chiquito (ver /servidor.js), o
 *      - publicarse gratis en GitHub Pages.
 *    Opcional: BASE_PATH=/nombre-del-repo  →  para GitHub Pages en subcarpeta.
 *
 *    El distDir cambia a `.next-static` para NO pisar el `.next` del servidor
 *    de desarrollo mientras la app está corriendo.
 */
const isStaticExport = process.env.STATIC_EXPORT === "1";
const basePath = process.env.BASE_PATH?.replace(/\/$/, "") || "";

const nextConfig: NextConfig = {
  ...(isStaticExport
    ? {
        output: "export" as const,
        distDir: ".next-static",
        trailingSlash: true,
        ...(basePath ? { basePath } : {}),
        images: { unoptimized: true },
      }
    : {
        output: "standalone",
      }),
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
