/**
 * providers/suppliers.ts — Mouser/Arrow/element14 聚合报价（经 /api/suppliers 服务端代理）
 */
export interface SupplierOffer {
  vendor: string;
  configured: boolean;
  found: boolean;
  price?: number;
  currency?: string;
  stock?: number;
  url?: string;
}

const cache = new Map<string, SupplierOffer[]>();

export async function fetchSupplierOffers(mpn: string): Promise<SupplierOffer[]> {
  if (!mpn) return [];
  const hit = cache.get(mpn);
  if (hit) return hit;
  try {
    const r = await fetch(`/api/suppliers?mpn=${encodeURIComponent(mpn)}`);
    if (!r.ok) return [];
    const j = await r.json();
    const offers: SupplierOffer[] = Array.isArray(j.offers) ? j.offers : [];
    cache.set(mpn, offers);
    return offers;
  } catch {
    return [];
  }
}

export function fmtOfferPrice(o: SupplierOffer): string {
  if (o.price == null) return '见官网';
  const sym = o.currency === 'CNY' ? '¥' : o.currency === 'USD' ? '$' : (o.currency ?? '') + ' ';
  return `${sym}${o.price < 1 ? o.price.toFixed(4) : o.price.toFixed(2)}`;
}
