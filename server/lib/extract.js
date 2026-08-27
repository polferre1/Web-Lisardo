import * as cheerio from 'cheerio';

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^\[?::1\]?$/,
  /^\[?fc/i,
  /^\[?fe80/i,
];

const CURRENCY_RE = /(\d+(?:[.,]\d{2})?)\s?(€|EUR|eur)/;
const MAX_BYTES = 3 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;

function assertPublicUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('La URL no es válida.');
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Solo se permiten URLs http/https.');
  }
  if (PRIVATE_HOST_PATTERNS.some((re) => re.test(url.hostname))) {
    throw new Error('No se permiten direcciones internas o privadas.');
  }
  return url;
}

function extractJsonLd($) {
  const blocks = $('script[type="application/ld+json"]').toArray();
  for (const el of blocks) {
    let data;
    try {
      data = JSON.parse($(el).contents().text());
    } catch {
      continue;
    }
    const items = Array.isArray(data) ? data : [data];
    for (const item of items) {
      const candidates = Array.isArray(item?.['@graph']) ? item['@graph'] : [item];
      for (const c of candidates) {
        const type = String(c?.['@type'] || '').toLowerCase();
        if (['product', 'menuitem', 'recipe', 'food', 'foodestablishment'].includes(type)) {
          const offer = Array.isArray(c.offers) ? c.offers[0] : c.offers;
          const price = offer?.price ?? offer?.priceSpecification?.price ?? null;
          return {
            name: c.name || null,
            description: c.description || null,
            image: Array.isArray(c.image) ? c.image[0] : c.image || null,
            price: price != null ? Number(price) : null,
          };
        }
      }
    }
  }
  return null;
}

function extractOpenGraph($) {
  const meta = (prop) =>
    $(`meta[property="${prop}"]`).attr('content') || $(`meta[name="${prop}"]`).attr('content') || null;

  const name = meta('og:title') || $('title').first().text().trim() || null;
  const description = meta('og:description') || meta('description') || null;
  const image = meta('og:image') || $('img').first().attr('src') || null;

  let price = meta('product:price:amount') || meta('og:price:amount');
  price = price ? Number(price) : null;
  if (!price) {
    const match = $('body').text().match(CURRENCY_RE);
    if (match) price = Number(match[1].replace(',', '.'));
  }

  return { name, description, image, price };
}

/**
 * Fetches a URL and extracts best-effort product data (name, description,
 * price, image) from JSON-LD structured data, falling back to Open Graph
 * tags and simple text heuristics.
 */
export async function extractProduct(rawUrl) {
  const url = assertPublicUrl(rawUrl);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LisardoAdminBot/1.0)' },
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new Error(`No se pudo acceder a la URL (HTTP ${res.status}).`);
  }
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    throw new Error('La URL no devuelve contenido HTML.');
  }

  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) {
    throw new Error('La página es demasiado grande para procesarla.');
  }

  const $ = cheerio.load(Buffer.from(buf).toString('utf-8'));
  const jsonLd = extractJsonLd($);
  const og = extractOpenGraph($);

  let image = jsonLd?.image || og.image;
  if (image && image.startsWith('/')) {
    image = `${url.protocol}//${url.host}${image}`;
  }

  let description = jsonLd?.description || og.description;
  if (description && description.length > 400) {
    description = `${description.slice(0, 400).trim()}…`;
  }

  return {
    name: jsonLd?.name || og.name || null,
    description: description || null,
    image: image || null,
    price: jsonLd?.price ?? og.price ?? null,
    sourceUrl: url.toString(),
    extractedFrom: jsonLd ? 'json-ld' : 'open-graph/heurística',
  };
}
