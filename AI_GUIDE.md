# Guía para IAs y Autores — Palabra Visual (MCP)

Este repositorio implementa una arquitectura desacoplada para construir reflexiones bíblicas visuales. Cualquier IA (conectada por MCP o editando archivos directamente) puede crear libros, añadir diapositivas, ajustar encuadres y programar desbloqueos sin tocar `index.html`, `css/` ni `js/`.

---

## 1. Conectar el Servidor MCP (Zero-dependency Node.js)

El servidor MCP vive en [mcp/server.mjs](file:///home/antigravity/Colors-svg/Palabra-de-Dios/mcp/server.mjs) y usa **JSON-RPC 2.0 sobre `stdio`** (Node.js ≥ 18, sin `npm install`).

```json
{
  "mcpServers": {
    "palabra-visual": {
      "command": "node",
      "args": ["/ruta/absoluta/a/Palabra-de-Dios/mcp/server.mjs"]
    }
  }
}
```

### Herramientas (Tools) expuestas por MCP
| Herramienta | Propósito |
| :--- | :--- |
| `listar_libros` | Lista los libros registrados en `data/libros.json`. |
| `leer_libro` | Devuelve el JSON completo de `data/<libro>.json`. |
| `crear_libro` | Crea un nuevo libro en `data/<key>.json` y lo registra en `data/libros.json`. |
| `agregar_diapositiva` | Inserta una diapositiva validada en un libro existente. |
| `actualizar_diapositiva` | Modifica campos, texto, imagen, `encuadre`, `offsetX/Y` o `recuadros` de una slide. |
| `eliminar_diapositiva` | Elimina una diapositiva por índice (`0-based`). |
| `reordenar_diapositivas` | Mueve una diapositiva de `fromIndex` a `toIndex`. |
| `registrar_imagen` | Guarda una imagen (desde ruta local o base64) en `assets/images/<nombre>` y devuelve `"assets/images/<nombre>"`. |
| `programar_desbloqueo` | Configura `desbloqueo` (ISO datetime) y `bloqueoMensaje`, o los limpia. |

### Recursos (Resources) expuestos por MCP
- `palabra://guia` — Esta guía completa.
- `palabra://schema` — El esquema formal [mcp/schema.json](file:///home/antigravity/Colors-svg/Palabra-de-Dios/mcp/schema.json).
- `palabra://libros` — Catálogo actual [data/libros.json](file:///home/antigravity/Colors-svg/Palabra-de-Dios/data/libros.json).

---

## 2. Catálogo de Tipos, Figuras y Opciones Visuales

### Tipos de Diapositiva (`tipo`)
- `portada` — Título monumental + subtítulo + versículo en tarjeta de vidrio + botón *Comenzar recorrido*.
- `versiculo` — Cita bíblica protagonista (tipográfica a pantalla completa o en vidrio si va a izquierda/derecha).
- `reflexion` — Título + versículo + reflexión pastoral + cuadrícula de `recuadros` con glassmorphism.
- `imagen-completa` — Ilustración protagonista a pantalla completa con cita en tarjeta de vidrio.
- `dividida` — Composición 50/50 (imagen limpia a un lado, texto y cita al otro; en móvil apilada).
- `lista` — Línea de tiempo / pasos numerados (`01`, `02`, `03`) usando el arreglo `recuadros`.
- `pregunta` — Panel contemplativo centrado para meditación personal o en grupo.
- `cierre` — Oración final + versículo de despedida + botón *Volver al inicio*.

### Figuras / Iconos SVG disponibles (`recuadros[].icono`)
Cero emojis; solo iconos SVG editoriales de trazo fino:
- `corazon` — Amor, misericordia, gracia, compasión.
- `ancla` — Esperanza, firmeza, justicia, fidelidad.
- `luz` — Verdad, revelación, claridad, santidad.
- `camino` — Peregrinaje, guía, retorno, obediencia.
- `agua` — Rocío, restauración, vida, Espíritu.
- `libro` — Escritura, pacto, ley, enseñanza.
- `semilla` — Fruto, crecimiento, siembra, nueva vida.

### Alineaciones (`layout`) y Animaciones (`animacion`)
- **Layouts:** `centrado`, `izquierda`, `derecha`, `inferior` (ideal para `imagen-completa` con texto abajo).
- **Animaciones GSAP:** `revelar-palabras` (palabra por palabra en versículos), `fade`, `slide-up`, `zoom-lento`, `parallax`.

### Cómo poner imágenes correctamente
1. Coloca tus ilustraciones en `assets/images/` (o usa `registrar_imagen` vía MCP) y referencia `"imagen": "assets/images/mi-escena.jpg"`. También acepta URLs HTTPS.
2. Ajusta `encuadre: { "x": 50, "y": 35, "zoom": 1.1 }` para que el personaje o detalle clave quede centrado tanto en **móvil vertical (9:16)** como en **proyector (16:9)**.
3. Ajusta `overlay` entre `0.45` y `0.72` para asegurar contraste AA sobre la imagen.

### Reglas sobre el Texto Bíblico
- Usa texto literal fiel a la `version` declarada (ej. `Reina-Valera 1960`). Si no se puede verificar literalidad, marca con `[VERIFICAR]`.
- Incluye siempre `versiculo.referencia` (`Libro capítulo:versículo`).
