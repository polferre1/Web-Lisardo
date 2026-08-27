const API_BASE = window.location.origin;
const TOKEN_KEY = 'lisardo_admin_token';

const loginScreen = document.getElementById('loginScreen');
const app = document.getElementById('app');
const loginForm = document.getElementById('loginForm');
const tokenInput = document.getElementById('tokenInput');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

const extractForm = document.getElementById('extractForm');
const urlInput = document.getElementById('urlInput');
const extractBtn = document.getElementById('extractBtn');
const extractStatus = document.getElementById('extractStatus');

const reviewCard = document.getElementById('reviewCard');
const previewImage = document.getElementById('previewImage');
const noImageNote = document.getElementById('noImageNote');
const fieldName = document.getElementById('fieldName');
const fieldDescription = document.getElementById('fieldDescription');
const fieldPrice = document.getElementById('fieldPrice');
const fieldCategory = document.getElementById('fieldCategory');
const fieldImage = document.getElementById('fieldImage');
const sourceNote = document.getElementById('sourceNote');
const saveBtn = document.getElementById('saveBtn');
const saveStatus = document.getElementById('saveStatus');
const menuList = document.getElementById('menuList');

let currentSourceUrl = null;

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

function authHeaders() {
  return { 'x-admin-token': getToken() || '' };
}

async function tryEnterApp() {
  const token = getToken();
  if (!token) return;
  try {
    const res = await fetch(`${API_BASE}/api/admin/ping`, { headers: authHeaders() });
    if (!res.ok) throw new Error();
    loginScreen.hidden = true;
    app.hidden = false;
    loadMenu();
  } catch {
    sessionStorage.removeItem(TOKEN_KEY);
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  sessionStorage.setItem(TOKEN_KEY, tokenInput.value.trim());
  try {
    const res = await fetch(`${API_BASE}/api/admin/ping`, { headers: authHeaders() });
    if (!res.ok) throw new Error();
    loginScreen.hidden = true;
    app.hidden = false;
    loadMenu();
  } catch {
    sessionStorage.removeItem(TOKEN_KEY);
    loginError.textContent = 'Token incorrecto o servidor no disponible.';
  }
});

logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem(TOKEN_KEY);
  app.hidden = true;
  loginScreen.hidden = false;
  tokenInput.value = '';
});

extractForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  extractStatus.textContent = '';
  extractStatus.className = 'status';
  reviewCard.hidden = true;
  extractBtn.disabled = true;
  extractBtn.textContent = 'Extrayendo…';

  try {
    const res = await fetch(`${API_BASE}/api/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ url: urlInput.value.trim() }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo extraer la información.');

    currentSourceUrl = data.sourceUrl;
    fieldName.value = data.name || '';
    fieldDescription.value = data.description || '';
    fieldPrice.value = data.price ?? '';
    fieldImage.value = data.image || '';
    fieldCategory.value = 'Otros';
    updatePreviewImage();
    sourceNote.textContent = `Origen: ${data.sourceUrl} (detectado vía ${data.extractedFrom})`;
    reviewCard.hidden = false;
    extractStatus.textContent = 'Revisa y ajusta los campos antes de guardar.';
    extractStatus.classList.add('ok');
  } catch (err) {
    extractStatus.textContent = err.message;
    extractStatus.classList.add('error');
  } finally {
    extractBtn.disabled = false;
    extractBtn.textContent = 'Extraer características';
  }
});

fieldImage.addEventListener('input', updatePreviewImage);

function updatePreviewImage() {
  const url = fieldImage.value.trim();
  if (url) {
    previewImage.src = url;
    previewImage.hidden = false;
    noImageNote.hidden = true;
  } else {
    previewImage.hidden = true;
    noImageNote.hidden = false;
  }
}

previewImage.addEventListener('error', () => {
  previewImage.hidden = true;
  noImageNote.hidden = false;
  noImageNote.textContent = 'No se pudo cargar la imagen';
});

saveBtn.addEventListener('click', async () => {
  saveStatus.textContent = '';
  saveStatus.className = 'status';
  if (!fieldName.value.trim()) {
    saveStatus.textContent = 'El nombre es obligatorio.';
    saveStatus.classList.add('error');
    return;
  }
  saveBtn.disabled = true;
  try {
    const res = await fetch(`${API_BASE}/api/menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        name: fieldName.value.trim(),
        description: fieldDescription.value.trim(),
        price: fieldPrice.value === '' ? null : Number(fieldPrice.value),
        image: fieldImage.value.trim() || null,
        category: fieldCategory.value,
        sourceUrl: currentSourceUrl,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo guardar.');
    saveStatus.textContent = 'Guardado en la carta.';
    saveStatus.classList.add('ok');
    reviewCard.hidden = true;
    extractForm.reset();
    loadMenu();
  } catch (err) {
    saveStatus.textContent = err.message;
    saveStatus.classList.add('error');
  } finally {
    saveBtn.disabled = false;
  }
});

async function loadMenu() {
  menuList.innerHTML = '<p class="hint">Cargando…</p>';
  try {
    const res = await fetch(`${API_BASE}/api/menu`);
    const items = await res.json();
    if (!items.length) {
      menuList.innerHTML = '<p class="hint">Todavía no hay platos guardados.</p>';
      return;
    }
    menuList.innerHTML = items
      .map(
        (item) => `
      <div class="menu-row" data-id="${item.id}">
        ${item.image ? `<img src="${escapeAttr(item.image)}" alt="">` : '<div style="width:48px;height:48px"></div>'}
        <div class="info">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.category)}</span>
        </div>
        <span class="price">${item.price != null ? Number(item.price).toFixed(2) + ' €' : ''}</span>
        <button class="delete-btn" data-id="${item.id}">Eliminar</button>
      </div>`
      )
      .join('');
  } catch {
    menuList.innerHTML = '<p class="hint">No se pudo cargar la carta.</p>';
  }
}

menuList.addEventListener('click', async (e) => {
  const btn = e.target.closest('.delete-btn');
  if (!btn) return;
  if (!confirm('¿Eliminar este plato de la carta?')) return;
  await fetch(`${API_BASE}/api/menu/${btn.dataset.id}`, { method: 'DELETE', headers: authHeaders() });
  loadMenu();
});

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(str) {
  return escapeHtml(str);
}

tryEnterApp();
