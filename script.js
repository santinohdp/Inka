/* ==========================================================================
   CONFIGURACIÓN — EDITAR MANUALMENTE
   Esta página está pensada para GitHub Pages: usa la API de GitHub para
   "leer" el contenido de las carpetas del repositorio y armar las tarjetas
   automáticamente, sin que tengas que tocar el HTML cada vez que subís
   un juego nuevo.
   ========================================================================== */
const GITHUB_USER   = "santinohdp";   // ej: "santinohdp"
const GITHUB_REPO   = "ink<";         // ej: "mi-inka-games"
const GITHUB_BRANCH = "main";                   // rama donde está el contenido

// Carpetas que la página va a inspeccionar
const CARPETA_JUEGOS   = "juegos";
const CARPETA_ESTRENOS = "Estrenos";
const CARPETA_TRAILER  = "Trailer";

const IMAGE_EXT = ["jpg", "jpeg", "png", "webp", "gif"];

/* ========================================================================== */

// Pide el listado de una carpeta del repo. Devuelve [] si la carpeta no existe.
async function listarCarpeta(carpeta) {
    const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${encodeURIComponent(carpeta)}?ref=${GITHUB_BRANCH}`;
    try {
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error("No se pudo leer la carpeta", carpeta, err);
        return [];
    }
}

// Convierte "obama-in-the-dark-5.html" en "Obama In The Dark 5"
function nombreLegible(nombreArchivo) {
    return nombreArchivo
        .replace(/\.html?$/i, "")
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Busca, dentro del listado de una carpeta, una imagen cuyo nombre
// coincida con el del .html (mismo nombre, distinta extensión).
function buscarMiniatura(archivos, baseNombre) {
    const base = baseNombre.replace(/\.html?$/i, "").toLowerCase();
    const encontrada = archivos.find((f) => {
        if (f.type !== "file") return false;
        const partes = f.name.split(".");
        const ext = partes.pop().toLowerCase();
        const nombreSinExt = partes.join(".").toLowerCase();
        return IMAGE_EXT.includes(ext) && nombreSinExt === base;
    });
    return encontrada ? encontrada.download_url : null;
}

// Arma una tarjeta para la grilla principal ("juegos")
function crearTarjetaJuego(archivo, archivos, carpeta) {
    const a = document.createElement("a");
    a.className = "game-card";
    a.href = `${carpeta}/${archivo.name}`;

    const img = document.createElement("img");
    img.alt = nombreLegible(archivo.name);
    img.src = buscarMiniatura(archivos, archivo.name) || "";

    const span = document.createElement("span");
    span.className = "name";
    span.textContent = nombreLegible(archivo.name);

    a.appendChild(img);
    a.appendChild(span);
    return a;
}

// Arma una tarjeta para la fila de Estrenos/Trailer, con su badge de color
function crearTarjetaDestacada(archivo, archivos, carpeta, tipo) {
    const a = document.createElement("a");
    a.className = "featured-card";
    a.href = `${carpeta}/${archivo.name}`;

    const badge = document.createElement("span");
    badge.className = `badge ${tipo}`; // "estreno" o "trailer"
    badge.textContent = tipo;

    const img = document.createElement("img");
    img.alt = nombreLegible(archivo.name);
    img.src = buscarMiniatura(archivos, archivo.name) || "";

    const span = document.createElement("span");
    span.className = "name";
    span.textContent = nombreLegible(archivo.name);

    a.appendChild(badge);
    a.appendChild(img);
    a.appendChild(span);
    return a;
}

async function cargarGrillaPrincipal() {
    const contenedor = document.getElementById("games-grid");
    const archivos = await listarCarpeta(CARPETA_JUEGOS);
    const htmls = archivos
        .filter((f) => f.type === "file" && /\.html?$/i.test(f.name))
        .sort((a, b) => a.name.localeCompare(b.name));

    contenedor.innerHTML = "";

    if (htmls.length === 0) {
        const p = document.createElement("p");
        p.className = "empty-msg";
        p.textContent = `No se encontraron juegos en la carpeta "${CARPETA_JUEGOS}".`;
        contenedor.appendChild(p);
        return;
    }

    htmls.forEach((archivo) => {
        contenedor.appendChild(crearTarjetaJuego(archivo, archivos, CARPETA_JUEGOS));
    });
}

async function cargarFilaDestacados() {
    const contenedor = document.getElementById("featured-row");

    const [archivosEstrenos, archivosTrailer] = await Promise.all([
        listarCarpeta(CARPETA_ESTRENOS),
        listarCarpeta(CARPETA_TRAILER),
    ]);

    contenedor.innerHTML = "";

    const estrenosHtml = archivosEstrenos
        .filter((f) => f.type === "file" && /\.html?$/i.test(f.name))
        .sort((a, b) => a.name.localeCompare(b.name));

    const trailerHtml = archivosTrailer
        .filter((f) => f.type === "file" && /\.html?$/i.test(f.name))
        .sort((a, b) => a.name.localeCompare(b.name));

    if (estrenosHtml.length === 0 && trailerHtml.length === 0) {
        contenedor.style.display = "none";
        return;
    }

    estrenosHtml.forEach((archivo) => {
        contenedor.appendChild(
            crearTarjetaDestacada(archivo, archivosEstrenos, CARPETA_ESTRENOS, "estreno")
        );
    });

    trailerHtml.forEach((archivo) => {
        contenedor.appendChild(
            crearTarjetaDestacada(archivo, archivosTrailer, CARPETA_TRAILER, "trailer")
        );
    });
}

cargarFilaDestacados();
cargarGrillaPrincipal();
