/* ==========================================================================
   CONFIGURACIÓN — EDITAR MANUALMENTE
   Usa la API de GitHub para leer el contenido real de tu repositorio y
   armar las tarjetas solo, sin tocar el HTML cada vez que subís un juego.
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

function nombreLegible(nombreArchivo) {
    return nombreArchivo
        .replace(/\.html?$/i, "")
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

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

// Si subís un archivo de texto "mismo-nombre.txt" junto al juego, se usa
// como tooltip (title). Si no existe, el tooltip es solo el nombre.
async function buscarDescripcion(archivos, baseNombre, carpeta) {
    const base = baseNombre.replace(/\.html?$/i, "").toLowerCase();
    const encontrado = archivos.find(
        (f) => f.type === "file" && f.name.toLowerCase() === `${base}.txt`
    );
    if (!encontrado) return null;
    try {
        const res = await fetch(encontrado.download_url);
        if (!res.ok) return null;
        return (await res.text()).trim();
    } catch {
        return null;
    }
}

/* ===== Fila de Estrenos / Trailers ===== */
async function cargarFilaDestacados() {
    const fila = document.getElementById("fila-destacados-tr");

    const [archivosEstrenos, archivosTrailer] = await Promise.all([
        listarCarpeta(CARPETA_ESTRENOS),
        listarCarpeta(CARPETA_TRAILER),
    ]);

    const estrenosHtml = archivosEstrenos
        .filter((f) => f.type === "file" && /\.html?$/i.test(f.name))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((f) => ({ archivo: f, archivos: archivosEstrenos, carpeta: CARPETA_ESTRENOS, tipo: "estreno" }));

    const trailerHtml = archivosTrailer
        .filter((f) => f.type === "file" && /\.html?$/i.test(f.name))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((f) => ({ archivo: f, archivos: archivosTrailer, carpeta: CARPETA_TRAILER, tipo: "trailer" }));

    const items = [...estrenosHtml, ...trailerHtml];
    fila.innerHTML = "";

    if (items.length === 0) {
        document.getElementById("fila-destacados").style.display = "none";
        return;
    }

    for (const item of items) {
        const desc = await buscarDescripcion(item.archivos, item.archivo.name, item.carpeta);
        const nombre = nombreLegible(item.archivo.name);
        const img = buscarMiniatura(item.archivos, item.archivo.name) || "";

        const td = document.createElement("td");
        td.className = "celda-destacado";
        td.innerHTML = `
            <div class="headercategorias ${item.tipo}">${item.tipo}</div>
            <a href="${item.carpeta}/${item.archivo.name}" class="titulojuegoindex" target="_blank" title="${desc || nombre}">
                <img src="${img}" width="120" height="120" alt="${nombre}">
                ${nombre}
            </a>
        `;
        fila.appendChild(td);
    }
}

/* ===== Grilla principal de juegos ===== */
async function cargarGrillaPrincipal() {
    const tabla = document.getElementById("grilla-juegos");
    const archivos = await listarCarpeta(CARPETA_JUEGOS);
    const htmls = archivos
        .filter((f) => f.type === "file" && /\.html?$/i.test(f.name))
        .sort((a, b) => a.name.localeCompare(b.name));

    tabla.innerHTML = "";

    if (htmls.length === 0) {
        tabla.innerHTML = `<tr><td class="msg-cargando">No se encontraron juegos en la carpeta "${CARPETA_JUEGOS}".</td></tr>`;
        return;
    }

    for (let i = 0; i < htmls.length; i += JUEGOS_POR_FILA) {
        const fila = document.createElement("tr");
        const grupo = htmls.slice(i, i + JUEGOS_POR_FILA);

        for (const archivo of grupo) {
            const desc = await buscarDescripcion(archivos, archivo.name, CARPETA_JUEGOS);
            const nombre = nombreLegible(archivo.name);
            const img = buscarMiniatura(archivos, archivo.name) || "";

            const td = document.createElement("td");
            td.className = "celda-juego";
            td.innerHTML = `
                <a href="${CARPETA_JUEGOS}/${archivo.name}" class="titulojuegoindex" target="_blank" title="${desc || nombre}">
                    <img src="${img}" width="100" height="100" alt="${nombre}">
                    ${nombre}
                </a>
            `;
            fila.appendChild(td);
        }

        tabla.appendChild(fila);
    }
}

cargarFilaDestacados();
cargarGrillaPrincipal();
