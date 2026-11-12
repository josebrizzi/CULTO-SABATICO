# ☁️ Opción 2 — Subir a GitHub (link gratis para abrir desde cualquier lado)

Con esta opción tu app queda publicada **gratis para siempre** en una dirección tipo:

```
https://TU-USUARIO.github.io/tiempos-del-culto/
```

La abrís en la compu de la iglesia, en tu celular o donde quieras, sin instalar nada. **GitHub lo arma y publica solo**: vos solo subís los archivos.

> ⚠️ Requisito: el repo tiene que ser **Public** (así es gratis en GitHub Pages). La app no tiene claves ni datos privados, así que no hay problema.
>
> 🍎 **Si estás en Mac:** la carpeta `.github` está oculta en el Finder. Apretá `Cmd + Shift + .` para verla antes de arrastrar todo.

## Paso a paso (sin saber de código, ~10 minutos)

### 1. Crear la cuenta
Entrá a **https://github.com** → *Sign up* → creá tu cuenta gratis.

### 2. Crear el repositorio
1. Ya dentro, tocá el botón **`+`** (arriba a la derecha) → **New repository**.
2. Poné un nombre, por ejemplo: `tiempos-del-culto`
3. Dejalo marcado como **Public**.
4. Tocá **Create repository**.

### 3. Subir los archivos
1. En la página del repo nuevo, buscá el enlace **"uploading an existing file"** (o el botón *Uploads*).
2. Abrí **esta carpeta** (`2-para-subir-a-GitHub`) en tu compu y **arrastrá TODO su contenido** a esa página:
   - las carpetas `src`, `public` y `.github`
   - todos los archivos sueltos (`package.json`, `bun.lock`, `next.config.ts`, etc.)
3. Esperá que termine la subida y tocá **Commit changes**.

### 4. Activar la publicación
1. En el repo, andá a **Settings** (arriba) → menú izquierdo **Pages**.
2. En **"Build and deployment"** → **Source** → elegí **GitHub Actions**.

### 5. Esperar 2–3 minutos
1. Andá a la pestaña **Actions** del repo.
2. Vas a ver el trabajo **"Publicar en GitHub Pages"** corriendo 🟡 → esperá que quede **verde** ✅.
3. Listo: tu app está en
   **`https://TU-USUARIO.github.io/tiempos-del-culto/`**
   (el enlace exacto también aparece en **Settings → Pages**, arriba).

## Uso en el culto

1. En la compu conectada al proyector, abrí ese enlace en el navegador.
2. Tocá **"Abrir pantalla de proyección"** y **"Abrir pantalla del predicador"**; arrastrá cada ventana a su pantalla (**Win + Shift + →**) y **F11** en cada una.
3. Manejá el culto desde el panel: la **secuencia horizontal** de arriba (tocás un momento y salta a él), el botón **Iniciar / Pausar / Siguiente**, la **tarjeta de avisos** en “Ahora” y los **mensajes** al orador.
4. 💡 Guardá el enlace en **favoritos** o creale un **acceso directo en el escritorio** para abrirlo con doble clic.

> 💡 **El anunciador y el predicador no tocan nada:** la tarjeta de avisos se
> escribe y se edita en vivo desde la vista “Ahora” del panel, y los mensajes se
> sacan desde el panel. Todo es una sola vía: del panel hacia las pantallas.
> La pantalla del predicador muestra la **letra bíblica** que el predicador elija
> en su app **Biblia Sincronizada** y, abajo, la **pastilla** con el momento y el
> **tiempo grande**, sin mensajes.

## La Biblia en la pantalla del predicador

La pantalla `#predicador` se conecta sola a tu app **Biblia Sincronizada** (el servidor que tenés en Render, ya viene cargado: `biblia-sincronizada.onrender.com`).

1. Abrí el `admin.html` de Biblia Sincronizada (la página de administrador de esa app).
2. Elegí el versículo → aparece **en vivo arriba** en la pantalla del predicador (referencia tipo `JN 3:16 · RV60` + letra completa) y el **contador sigue abajo**.
3. Con la **✕** de la esquina, el predicador quita el texto de su pantalla cuando ya no lo necesita.

> 📗 Arriba a la derecha de esa pantalla hay un indicador con forma de libro: **verde** = conectado a la Biblia, **gris** = sin conexión (reintenta solo; si Render estaba dormido, demora ~1 minuto).
>
> 🔧 El servidor se cambia con el **botón de engranaje** de la pantalla del predicador.

## Himnos con música (letra + MP3)

El panel tiene una sección **Himnos**: proyectá la letra del himno en la pantalla grande mientras suena el MP3.

**Cargar los himnos (una sola vez):**

1. Conectá el pendrive y abrí la sección **Himnos** del panel.
2. Tocá **Cargar MP3** y elegí los archivos — podés seleccionar muchos juntos.
3. El número y el título salen del nombre del archivo (ej.: `001 - Alabad al Señor.mp3` → himno **1**, “Alabad al Señor”).
4. Con el **lápiz** de cada fila escribís la letra: cada estrofa separada por una línea en blanco.

> 💾 Los MP3 **quedan guardados en el navegador** de esa computadora (no se suben a ningún lado, no hace falta Firebase). Si cambiás de compu o borrás los datos del navegador, los cargás otra vez desde el pendrive.

**En el culto:**

- Tocá **Proyectar** en el himno → la pantalla muestra “HIMNO n”, el título y la primera estrofa.
- Tocá **▶** para que suene (la primera vez, tocá una vez la pantalla de proyección para habilitar el sonido).
- Cambiá la estrofa con ‹ › o con las teclas **← →**; pausá o detengá con los botones del panel.
- El volumen se ajusta en la misma sección (100/75/50/25 %).
- Opcional: en el **lápiz de cada momento** elegí “Himno de este momento” → al llegar a él, el himno se proyecta solo. Al pasar a un momento sin himno, se quita solo.

## Para actualizar la app más adelante

Volvé a hacer el paso 3 (subir archivos): arrastrá los archivos cambiados, **Commit changes**, y GitHub lo republica solo en un par de minutos.

## ¿Problemas?

| Síntoma | Solución |
|---|---|
| En Actions sale rojo ❌ | Entrá al trabajo, fijate qué paso falló y volvé a subir los archivos completos. Lo más común: faltó arrastrar la carpeta `.github` o algún archivo suelto. |
| La página da 404 | Revisá el paso 4: **Source → GitHub Actions**. Después tocá **Re-run** en Actions. |
| Sale "blank page" | Confirmaste que el repo es **Public** y esperaste el deploy verde antes de abrir. |
| ¿Puedo usarlo con internet inestable? | Para esos casos te conviene la **Opción 1** (instalada en la PC, no necesita internet). |
