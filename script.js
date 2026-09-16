/* ==========================================================================
   CONFIGURACIÓN — EDITAR MANUALMENTE
   Usa jsDelivr (un CDN que espeja los repos públicos de GitHub) para leer
   el contenido real de tu repositorio y armar las tarjetas solo. A diferencia
   de la API de GitHub, jsDelivr no tiene un límite bajo de consultas por hora,
   así que no se corta con el uso normal de la página.
   ========================================================================== */
const GITHUB_USER   = "santinohdp";
const GITHUB_REPO   = "Inka";
const GITHUB_BRANCH = "main";

const CARPETA_JUEGOS   = "juegos";
const CARPETA_ESTRENOS = "Estrenos";
const CARPETA_TRAILER  = "Trailer";

const IMAGE_EXT = ["jpg", "jpeg", "png", "webp", "gif"];
const JUEGOS_POR_FILA = 5; // cuántas columnas por fila en la grilla principal

/* ========================================================================== */

const RAW_BASE = `https://cdn.jsdelivr.net/gh/${GITHUB_USER}/${GITHUB_REPO}@${GITHUB_BRANCH}`;

// Trae UNA sola vez la lista completa de archivos del repo (no una por carpeta).
async function listarTodosLosArchivos() {
    const url = `https://data.jsdelivr.com/v1/packages/gh/${GITHUB_USER}/${GITHUB_REPO}@${GITHUB_BRANCH}?structure=flat`;
    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.error("jsDelivr respondió", res.status, "al listar el repo");
            return [];
        }
        const data = await res.json();
        return Array.isArray(data.files) ? data.files : []; // [{name: "/juegos/x.html", size, hash}, ...]
    } catch (err) {
        console.error("No se pudo leer el repositorio", err);
        return [];
    }
}

// Filtra los archivos que están directamente dentro de "carpeta" (sin subcarpetas)
function archivosDeCarpeta(todos, carpeta) {
    const prefijo = `/${carpeta}/`;
    return todos
        .filter((f) => f.name.startsWith(prefijo))
        .filter((f) => !f.name.slice(prefijo.length).includes("/")) // sin subcarpetas
        .map((f) => ({ ...f, nombreArchivo: f.name.slice(prefijo.length) }));
}

function nombreLegible(nombreArchivo) {
    return nombreArchivo
        .replace(/\.html?$/i, "")
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buscarMiniatura(archivosCarpeta, nombreArchivo) {
    const base = nombreArchivo.replace(/\.html?$/i, "").toLowerCase();
    const encontrada = archivosCarpeta.find((f) => {
        const partes = f.nombreArchivo.split(".");
        const ext = partes.pop().toLowerCase();
        const nombreSinExt = partes.join(".").toLowerCase();
        return IMAGE_EXT.includes(ext) && nombreSinExt === base;
    });
    return encontrada ? `${RAW_BASE}${encontrada.name}` : null;
}

// Si subís un archivo de texto "mismo-nombre.txt" junto al juego, se usa
// como tooltip (title). Si no existe, el tooltip es solo el nombre.
async function buscarDescripcion(archivosCarpeta, nombreArchivo) {
    const base = nombreArchivo.replace(/\.html?$/i, "").toLowerCase();
    const encontrado = archivosCarpeta.find(
        (f) => f.nombreArchivo.toLowerCase() === `${base}.txt`
    );
    if (!encontrado) return null;
    try {
        const res = await fetch(`${RAW_BASE}${encontrado.name}`);
        if (!res.ok) return null;
        return (await res.text()).trim();
    } catch {
        return null;
    }
}

/* ===== Fila de Estrenos / Trailers ===== */
async function cargarFilaDestacados(todos) {
    const fila = document.getElementById("fila-destacados-tr");

    const archivosEstrenos = archivosDeCarpeta(todos, CARPETA_ESTRENOS);
    const archivosTrailer  = archivosDeCarpeta(todos, CARPETA_TRAILER);

    const estrenosHtml = archivosEstrenos
        .filter((f) => /\.html?$/i.test(f.nombreArchivo))
        .sort((a, b) => a.nombreArchivo.localeCompare(b.nombreArchivo))
        .map((f) => ({ archivo: f, archivos: archivosEstrenos, carpeta: CARPETA_ESTRENOS, tipo: "estreno" }));

    const trailerHtml = archivosTrailer
        .filter((f) => /\.html?$/i.test(f.nombreArchivo))
        .sort((a, b) => a.nombreArchivo.localeCompare(b.nombreArchivo))
        .map((f) => ({ archivo: f, archivos: archivosTrailer, carpeta: CARPETA_TRAILER, tipo: "trailer" }));

    const items = [...estrenosHtml, ...trailerHtml];
    fila.innerHTML = "";

    if (items.length === 0) {
        document.getElementById("fila-destacados").style.display = "none";
        return;
    }

    for (const item of items) {
        const desc = await buscarDescripcion(item.archivos, item.archivo.nombreArchivo);
        const nombre = nombreLegible(item.archivo.nombreArchivo);
        const img = buscarMiniatura(item.archivos, item.archivo.nombreArchivo) || "";

        const td = document.createElement("td");
        td.className = "celda-destacado";
        td.innerHTML = `
            <div class="headercategorias ${item.tipo}">${item.tipo}</div>
            <a href="${item.carpeta}/${item.archivo.nombreArchivo}" class="titulojuegoindex" target="_blank" title="${desc || nombre}">
                <img src="${img}" width="120" height="120" alt="${nombre}">
                ${nombre}
            </a>
        `;
        fila.appendChild(td);
    }
}

/* ===== Grilla principal de juegos ===== */
async function cargarGrillaPrincipal(todos) {
    const tabla = document.getElementById("grilla-juegos");
    const archivos = archivosDeCarpeta(todos, CARPETA_JUEGOS);
    const htmls = archivos
        .filter((f) => /\.html?$/i.test(f.nombreArchivo))
        .sort((a, b) => a.nombreArchivo.localeCompare(b.nombreArchivo));

    tabla.innerHTML = "";

    if (htmls.length === 0) {
        tabla.innerHTML = `<tr><td class="msg-cargando">No se encontraron juegos en la carpeta "${CARPETA_JUEGOS}".</td></tr>`;
        return;
    }

    for (let i = 0; i < htmls.length; i += JUEGOS_POR_FILA) {
        const fila = document.createElement("tr");
        const grupo = htmls.slice(i, i + JUEGOS_POR_FILA);

        for (const archivo of grupo) {
            const desc = await buscarDescripcion(archivos, archivo.nombreArchivo);
            const nombre = nombreLegible(archivo.nombreArchivo);
            const img = buscarMiniatura(archivos, archivo.nombreArchivo) || "";

            const td = document.createElement("td");
            td.className = "celda-juego";
            td.innerHTML = `
                <a href="${CARPETA_JUEGOS}/${archivo.nombreArchivo}" class="titulojuegoindex" target="_blank" title="${desc || nombre}">
                    <img src="${img}" width="100" height="100" alt="${nombre}">
                    ${nombre}
                </a>
            `;
            fila.appendChild(td);
        }

        tabla.appendChild(fila);
    }
}

(async () => {
    const todos = await listarTodosLosArchivos();
    cargarFilaDestacados(todos);
    cargarGrillaPrincipal(todos);
})();
