export async function mintToken({ store, clientId, clientSecret }) {
  const r = await fetch(`https://${store}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`Shopify token error: ${JSON.stringify(j)}`);
  return j.access_token;
}

export function parseCatalogProducts(products, refsSet) {
  const map = new Map();
  for (const p of products) {
    const tags = Array.isArray(p.tags) ? p.tags : String(p.tags || '').split(',');
    const hit = tags.map((t) => t.trim()).find((t) => refsSet.has(t));
    if (hit && !map.has(hit)) {
      map.set(hit, { title: p.title, handle: p.handle, image: p.featuredImage?.url || null });
    }
  }
  return map;
}

export async function fetchCatalogMap({ store, apiVersion, token }, refsSet) {
  const endpoint = `https://${store}/admin/api/${apiVersion}/graphql.json`;
  const nodes = [];
  let cursor = null;
  do {
    const query = `query($cursor:String){ products(first:250, after:$cursor){ pageInfo{hasNextPage endCursor} nodes{ title handle tags featuredImage{url} } } }`;
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
      body: JSON.stringify({ query, variables: { cursor } }),
    });
    const j = await r.json();
    const conn = j.data?.products;
    if (!conn) throw new Error(`Shopify GraphQL: ${JSON.stringify(j.errors || j)}`);
    nodes.push(...conn.nodes);
    cursor = conn.pageInfo.hasNextPage ? conn.pageInfo.endCursor : null;
  } while (cursor);
  return parseCatalogProducts(nodes, refsSet);
}
