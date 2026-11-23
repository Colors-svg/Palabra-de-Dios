#!/usr/bin/env node
/* ==========================================================================
   PALABRA VISUAL — SERVIDOR MCP (Zero-Dependency Node.js stdio JSON-RPC 2.0)
   Permite a cualquier IA listar, leer, crear y editar libros, diapositivas,
   figuras/iconos, encuadres, imágenes y desbloqueos programados.
   ========================================================================== */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const ASSETS_IMG_DIR = path.join(ROOT_DIR, "assets", "images");
const CATALOG_PATH = path.join(DATA_DIR, "libros.json");

const VALID_TIPOS = ["portada", "versiculo", "reflexion", "imagen-completa", "dividida", "lista", "pregunta", "comparador", "cierre"];
const VALID_LAYOUTS = ["centrado", "izquierda", "derecha", "inferior"];
const VALID_ANIMS = ["fade", "slide-up", "zoom-lento", "parallax", "revelar-palabras"];
const VALID_ICONS = ["corazon", "ancla", "luz", "camino", "agua", "libro", "semilla", "balanza", "corona", "escudo", "paloma", "llama", "reloj", "llave", "olivo", "monte", "mano"];
const VALID_MODES = ["oscuro", "claro", "sepia"];

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJSON(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

function sanitizeKey(key) {
  return String(key || "").toLowerCase().replace(/[^a-z0-9-_]/g, "");
}

function updateCatalogCount(key, bookObj) {
  const catalog = fs.existsSync(CATALOG_PATH) ? readJSON(CATALOG_PATH) : [];
  const idx = catalog.findIndex(b => b.key === key);
  const entry = {
    key,
    titulo: bookObj.libro || key,
    archivo: `data/${key}.json`,
    version: bookObj.version || "Reina-Valera 1960",
    slides: (bookObj.slides || []).length
  };
  if (idx >= 0) catalog[idx] = entry;
  else catalog.push(entry);
  writeJSON(CATALOG_PATH, catalog);
}

const TOOLS = [
  {
    name: "listar_libros",
    description: "Lista todos los libros bíblicos registrados en data/libros.json.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "leer_libro",
    description: "Lee el contenido JSON completo de un libro (data/<libro>.json).",
    inputSchema: {
      type: "object",
      required: ["libroKey"],
      properties: {
        libroKey: { type: "string", description: "Clave del libro (ej. 'oseas', 'salmos23', 'filipenses4')." }
      }
    }
  },
  {
    name: "crear_libro",
    description: "Crea un nuevo libro bíblico en data/<libroKey>.json y lo registra en data/libros.json.",
    inputSchema: {
      type: "object",
      required: ["libroKey", "libro"],
      properties: {
        libroKey: { type: "string", description: "Identificador URL-friendly (ej. 'juan3', 'romanos8')." },
        libro: { type: "string", description: "Nombre visible del libro (ej. 'Romanos 8')." },
        version: { type: "string", default: "Reina-Valera 1960" },
        modo: { type: "string", enum: VALID_MODES, default: "oscuro" },
        tituloPortada: { type: "string" },
        subtituloPortada: { type: "string" }
      }
    }
  },
  {
    name: "agregar_diapositiva",
    description: "Agrega una nueva diapositiva validada a un libro existente.",
    inputSchema: {
      type: "object",
      required: ["libroKey", "slide"],
      properties: {
        libroKey: { type: "string" },
        posicion: { type: "number", description: "Índice 0-based opcional donde insertar. Por defecto al final." },
        slide: {
          type: "object",
          required: ["tipo", "layout", "animacion"],
          properties: {
            tipo: { type: "string", enum: VALID_TIPOS },
            layout: { type: "string", enum: VALID_LAYOUTS },
            animacion: { type: "string", enum: VALID_ANIMS },
            imagen: { type: "string" },
            overlay: { type: "number", minimum: 0, maximum: 1 },
            encuadre: {
              type: "object",
              properties: { x: { type: "number" }, y: { type: "number" }, zoom: { type: "number" } }
            },
            titulo: { type: "string" },
            subtitulo: { type: "string" },
            versiculo: {
              type: "object",
              properties: { texto: { type: "string" }, referencia: { type: "string" } }
            },
            reflexion: { type: "string" },
            recuadros: {
              type: "array",
              items: {
                type: "object",
                required: ["icono", "titulo", "texto"],
                properties: {
                  icono: { type: "string", enum: VALID_ICONS },
                  titulo: { type: "string" },
                  texto: { type: "string" }
                }
              }
            }
          }
        }
      }
    }
  },
  {
    name: "actualizar_diapositiva",
    description: "Actualiza parcialmente una diapositiva existente por índice (0-based).",
    inputSchema: {
      type: "object",
      required: ["libroKey", "index", "cambios"],
      properties: {
        libroKey: { type: "string" },
        index: { type: "number" },
        cambios: { type: "object", description: "Campos a actualizar (titulo, imagen, encuadre, versiculo, recuadros, offsetX, offsetY, fontScale, etc.)." }
      }
    }
  },
  {
    name: "eliminar_diapositiva",
    description: "Elimina una diapositiva de un libro por índice (0-based).",
    inputSchema: {
      type: "object",
      required: ["libroKey", "index"],
      properties: {
        libroKey: { type: "string" },
        index: { type: "number" }
      }
    }
  },
  {
    name: "reordenar_diapositivas",
    description: "Mueve una diapositiva de fromIndex a toIndex.",
    inputSchema: {
      type: "object",
      required: ["libroKey", "fromIndex", "toIndex"],
      properties: {
        libroKey: { type: "string" },
        fromIndex: { type: "number" },
        toIndex: { type: "number" }
      }
    }
  },
  {
    name: "registrar_imagen",
    description: "Guarda una imagen en assets/images/<nombreArchivo> desde una ruta local o base64 y devuelve la ruta relativa lista para usar en slide.imagen.",
    inputSchema: {
      type: "object",
      required: ["nombreArchivo"],
      properties: {
        nombreArchivo: { type: "string", description: "Ej. 'oseas-desierto.jpg'" },
        origenRutaLocal: { type: "string", description: "Ruta absoluta a un archivo local existente en la máquina." },
        contenidoBase64: { type: "string", description: "Cadena base64 (opcional si no se usa origenRutaLocal)." }
      }
    }
  },
  {
    name: "programar_desbloqueo",
    description: "Configura o limpia la fecha/hora de Revelado Dinámico de un libro.",
    inputSchema: {
      type: "object",
      required: ["libroKey"],
      properties: {
        libroKey: { type: "string" },
        desbloqueo: { type: "string", description: "Fecha ISO local 'YYYY-MM-DDTHH:mm' o '' para quitar el bloqueo." },
        bloqueoMensaje: { type: "string" }
      }
    }
  }
];

const RESOURCES = [
  { uri: "palabra://guia", name: "Guía de Palabra Visual para IAs", mimeType: "text/markdown" },
  { uri: "palabra://schema", name: "JSON Schema de Libros y Diapositivas", mimeType: "application/json" },
  { uri: "palabra://libros", name: "Catálogo de Libros (data/libros.json)", mimeType: "application/json" }
];

function handleToolCall(name, args = {}) {
  if (name === "listar_libros") {
    return readJSON(CATALOG_PATH);
  }

  if (name === "leer_libro") {
    const key = sanitizeKey(args.libroKey);
    const file = path.join(DATA_DIR, `${key}.json`);
    if (!fs.existsSync(file)) throw new Error(`No existe data/${key}.json`);
    return readJSON(file);
  }

  if (name === "crear_libro") {
    const key = sanitizeKey(args.libroKey);
    if (!key) throw new Error("libroKey inválido");
    const file = path.join(DATA_DIR, `${key}.json`);
    const newBook = {
      libro: args.libro,
      version: args.version || "Reina-Valera 1960",
      tema: {
        paleta: key,
        fuenteTitulo: "Cormorant Garamond",
        fuenteTexto: "Inter",
        modo: VALID_MODES.includes(args.modo) ? args.modo : "oscuro"
      },
      slides: [
        {
          tipo: "portada",
          imagen: "",
          overlay: 0.55,
          titulo: args.tituloPortada || args.libro,
          subtitulo: args.subtituloPortada || "Recorrido visual contemplativo",
          versiculo: { texto: "", referencia: "" },
          reflexion: "",
          recuadros: [],
          animacion: "fade",
          layout: "centrado"
        }
      ]
    };
    writeJSON(file, newBook);
    updateCatalogCount(key, newBook);
    return { ok: true, archivo: `data/${key}.json`, book: newBook };
  }

  if (name === "agregar_diapositiva") {
    const key = sanitizeKey(args.libroKey);
    const file = path.join(DATA_DIR, `${key}.json`);
    const book = readJSON(file);
    const s = args.slide;
    if (!VALID_TIPOS.includes(s.tipo)) throw new Error(`tipo inválido: ${s.tipo}`);
    if (!VALID_LAYOUTS.includes(s.layout)) throw new Error(`layout inválido: ${s.layout}`);
    if (!VALID_ANIMS.includes(s.animacion)) throw new Error(`animacion inválida: ${s.animacion}`);
    if (Array.isArray(s.recuadros)) {
      for (const r of s.recuadros) {
        if (!VALID_ICONS.includes(r.icono)) throw new Error(`icono inválido: ${r.icono}. Válidos: ${VALID_ICONS.join(", ")}`);
      }
    }
    const pos = typeof args.posicion === "number" ? Math.max(0, Math.min(book.slides.length, args.posicion)) : book.slides.length;
    book.slides.splice(pos, 0, s);
    writeJSON(file, book);
    updateCatalogCount(key, book);
    return { ok: true, index: pos, totalSlides: book.slides.length };
  }

  if (name === "actualizar_diapositiva") {
    const key = sanitizeKey(args.libroKey);
    const file = path.join(DATA_DIR, `${key}.json`);
    const book = readJSON(file);
    const idx = Number(args.index);
    if (idx < 0 || idx >= book.slides.length) throw new Error(`Índice fuera de rango: ${idx}`);
    book.slides[idx] = { ...book.slides[idx], ...args.cambios };
    writeJSON(file, book);
    return { ok: true, index: idx, slide: book.slides[idx] };
  }

  if (name === "eliminar_diapositiva") {
    const key = sanitizeKey(args.libroKey);
    const file = path.join(DATA_DIR, `${key}.json`);
    const book = readJSON(file);
    if (book.slides.length <= 1) throw new Error("Debe permanecer al menos 1 diapositiva.");
    const idx = Number(args.index);
    if (idx < 0 || idx >= book.slides.length) throw new Error(`Índice fuera de rango: ${idx}`);
    book.slides.splice(idx, 1);
    writeJSON(file, book);
    updateCatalogCount(key, book);
    return { ok: true, totalSlides: book.slides.length };
  }

  if (name === "reordenar_diapositivas") {
    const key = sanitizeKey(args.libroKey);
    const file = path.join(DATA_DIR, `${key}.json`);
    const book = readJSON(file);
    const [moved] = book.slides.splice(args.fromIndex, 1);
    book.slides.splice(args.toIndex, 0, moved);
    writeJSON(file, book);
    return { ok: true, totalSlides: book.slides.length };
  }

  if (name === "registrar_imagen") {
    fs.mkdirSync(ASSETS_IMG_DIR, { recursive: true });
    const safeName = path.basename(args.nombreArchivo).replace(/[^a-zA-Z0-9._-]/g, "_");
    const dest = path.join(ASSETS_IMG_DIR, safeName);
    if (args.origenRutaLocal) {
      fs.copyFileSync(args.origenRutaLocal, dest);
    } else if (args.contenidoBase64) {
      const cleanB64 = args.contenidoBase64.replace(/^data:image\/\w+;base64,/, "");
      fs.writeFileSync(dest, Buffer.from(cleanB64, "base64"));
    } else {
      throw new Error("Debes proporcionar origenRutaLocal o contenidoBase64.");
    }
    return { ok: true, rutaImagen: `assets/images/${safeName}` };
  }

  if (name === "programar_desbloqueo") {
    const key = sanitizeKey(args.libroKey);
    const file = path.join(DATA_DIR, `${key}.json`);
    const book = readJSON(file);
    book.desbloqueo = args.desbloqueo || "";
    if (typeof args.bloqueoMensaje === "string") book.bloqueoMensaje = args.bloqueoMensaje;
    writeJSON(file, book);
    return { ok: true, desbloqueo: book.desbloqueo };
  }

  throw new Error(`Herramienta desconocida: ${name}`);
}

function handleResourceRead(uri) {
  if (uri === "palabra://guia") {
    return { contents: [{ uri, mimeType: "text/markdown", text: fs.readFileSync(path.join(ROOT_DIR, "AI_GUIDE.md"), "utf8") }] };
  }
  if (uri === "palabra://schema") {
    return { contents: [{ uri, mimeType: "application/json", text: fs.readFileSync(path.join(__dirname, "schema.json"), "utf8") }] };
  }
  if (uri === "palabra://libros") {
    return { contents: [{ uri, mimeType: "application/json", text: fs.readFileSync(CATALOG_PATH, "utf8") }] };
  }
  throw new Error(`Recurso no encontrado: ${uri}`);
}

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on("line", (line) => {
  if (!line.trim()) return;
  let req;
  try {
    req = JSON.parse(line);
  } catch {
    return;
  }
  const { id, method, params } = req;
  if (id === undefined) return; // Notificación sin respuesta requerida

  try {
    if (method === "initialize") {
      send({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {}, resources: {} },
          serverInfo: { name: "palabra-visual-mcp", version: "1.0.0" }
        }
      });
    } else if (method === "tools/list") {
      send({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
    } else if (method === "tools/call") {
      const output = handleToolCall(params?.name, params?.arguments || {});
      send({
        jsonrpc: "2.0",
        id,
        result: { content: [{ type: "text", text: JSON.stringify(output, null, 2) }] }
      });
    } else if (method === "resources/list") {
      send({ jsonrpc: "2.0", id, result: { resources: RESOURCES } });
    } else if (method === "resources/read") {
      send({ jsonrpc: "2.0", id, result: handleResourceRead(params?.uri) });
    } else {
      send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Método no soportado: ${method}` } });
    }
  } catch (err) {
    send({ jsonrpc: "2.0", id, error: { code: -32000, message: err.message } });
  }
});
