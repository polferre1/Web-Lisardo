(function () {
  const apiBase = document.body.dataset.apiBase;
  if (!apiBase) return; // Sin backend configurado: se mantiene la carta estática del HTML.

  const grid = document.querySelector('.menu-grid');
  if (!grid) return;

  fetch(`${apiBase}/api/menu`)
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error('respuesta no válida'))))
    .then((items) => {
      if (Array.isArray(items) && items.length > 0) renderMenu(items);
    })
    .catch(() => {
      /* Backend no disponible: se deja el contenido estático ya renderizado. */
    });

  function renderMenu(items) {
    const byCategory = items.reduce((acc, item) => {
      (acc[item.category] ||= []).push(item);
      return acc;
    }, {});

    grid.innerHTML = Object.entries(byCategory)
      .map(
        ([category, list]) => `
      <div class="menu-card">
        <h3>${escapeHtml(category)}</h3>
        <ul>
          ${list
            .map(
              (item) => `
            <li>
              <span>${escapeHtml(item.name)}</span>
              ${item.price != null ? `<span class="menu-price">${Number(item.price).toFixed(2)} €</span>` : ''}
            </li>`
            )
            .join('')}
        </ul>
      </div>`
      )
      .join('');
  }

  function escapeHtml(str) {
    return String(str).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }
})();
