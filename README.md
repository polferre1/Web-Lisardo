# Web-Lisardo

Página web para **El Cafè d'en Lisardo**, bar-restaurante situado en Vinyoles d'Orís (Les Masies de Voltregà, Osona), especializado en cocina gallega y de brasa.

## Contenido

- `index.html` — página única con inicio, sobre el restaurante, carta, galería, ubicación y contacto.
- `assets/css/styles.css` — estilos.
- `assets/js/script.js` — menú móvil y formulario de contacto (demo).
- `assets/js/menu-loader.js` — si hay un backend configurado (ver más abajo), carga la carta dinámicamente.
- `server/` — backend opcional con panel de admin: pega el link de un producto y extrae automáticamente sus características para añadirlo a la carta. Ver [`server/README.md`](server/README.md).

## Cómo verla

Abre `index.html` en el navegador, o sirve la carpeta con cualquier servidor estático:

```bash
python3 -m http.server 8000
```

y visita `http://localhost:8000`.

## Datos del restaurante

- **Dirección:** Passatge Sant Josep, 4 — Vinyoles d'Orís, 08508 Les Masies de Voltregà (Barcelona)
- **Teléfono:** 938 59 34 52
- **Horario:** Martes a domingo, 8:00–00:00 (lunes cerrado)

La información se ha recopilado de directorios públicos (Ajuntament de les Masies de Voltregà, Guiacat, RestaurantGuru). Este es un sitio no oficial creado con fines demostrativos; conviene validar los datos con el restaurante antes de publicarlo.
