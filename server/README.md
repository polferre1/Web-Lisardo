# Admin server — El Cafè d'en Lisardo

Backend ligero que da vida al panel de admin: pegas el link de un producto/plato y extrae automáticamente su nombre, descripción, precio e imagen (usando datos estructurados JSON-LD y metadatos Open Graph de la página), para que los revises y los guardes en la carta con un clic.

No usa IA ni servicios de pago: la extracción es 100% basada en los metadatos que la propia página publica. Si una web no tiene buenos metadatos, algunos campos pueden salir vacíos y tocará rellenarlos a mano.

## Poner en marcha

```bash
cd server
npm install
cp .env.example .env
```

Edita `.env` y define un `ADMIN_TOKEN` fuerte (por ejemplo con `openssl rand -hex 24`). Este token es la única protección del panel — sin él, cualquiera podría añadir o borrar platos.

```bash
npm start
```

- Panel de admin: `http://localhost:4000/admin`
- API pública de la carta: `http://localhost:4000/api/menu`

## Cómo se usa

1. Entra en `/admin` e introduce el `ADMIN_TOKEN`.
2. Pega la URL del producto en "Extraer producto desde un link" y pulsa **Extraer características**.
3. Revisa/edita nombre, descripción, precio, categoría e imagen.
4. Pulsa **Guardar en la carta**.

Los platos guardados quedan en `server/data/menu.json`.

## Endpoints

| Método | Ruta               | Auth | Descripción                                  |
|--------|---------------------|------|-----------------------------------------------|
| GET    | `/api/menu`          | No   | Lista los platos guardados (los usa la web pública) |
| POST   | `/api/extract`       | Sí   | `{ "url": "..." }` → datos extraídos del producto |
| POST   | `/api/menu`          | Sí   | Crea un plato                                 |
| PUT    | `/api/menu/:id`      | Sí   | Edita un plato                                |
| DELETE | `/api/menu/:id`      | Sí   | Elimina un plato                              |
| GET    | `/api/admin/ping`    | Sí   | Comprueba que el token es válido              |

Las rutas protegidas requieren la cabecera `x-admin-token: <ADMIN_TOKEN>`.

## Conectar la web pública

La página principal (`../index.html`) tiene un atributo `data-api-base` en el `<body>`. Si lo dejas vacío, la carta se muestra con el contenido estático de siempre. Si despliegas este backend y pones ahí su URL pública:

```html
<body data-api-base="https://api.tu-dominio.com">
```

la sección "La Carta" se pintará dinámicamente a partir de `/api/menu`, agrupando los platos por categoría. Si la API no responde, la web cae de vuelta al contenido estático (no rompe nada).

## Seguridad

- El endpoint de extracción bloquea URLs que apunten a `localhost` o IPs privadas (protección básica contra SSRF), limita el tamaño de la respuesta y aplica un timeout de 10s.
- Todas las rutas de escritura requieren el `ADMIN_TOKEN`.
- El token se guarda en `sessionStorage` del navegador (se pierde al cerrar la pestaña), no en `localStorage`.
- `.env` está en `.gitignore`: nunca lo subas al repositorio.

## Desplegar

Este servidor necesita Node.js corriendo, así que **no puede alojarse en GitHub Pages** (solo sirve estáticos). Opciones sencillas: Render, Railway, Fly.io o un VPS con PM2/systemd. Recuerda configurar `ADMIN_TOKEN` como variable de entorno en el hosting, y `ALLOWED_ORIGIN` con el dominio real de la web pública para restringir CORS en producción.
