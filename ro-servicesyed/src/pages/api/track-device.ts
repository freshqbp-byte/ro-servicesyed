export const prerender = false; // 👈 Ye line sabse upar add karein (Bahut Zaroori hai)

import type { APIRoute } from 'astro';

const WEBHOOK = 'https://script.google.com/macros/s/AKfycbyFBUjNWku0RbHD28ySUnd6A5GY7Rspmo4Dez_kF67MjxYd3gR0d2uLR_8bij-6mA/exec';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();

    // Real IP nikalne ka sahi tarika
    const ip = request.headers.get('cf-connecting-ip')?.trim()
            || request.headers.get('x-real-ip')?.trim()
            || request.headers.get('x-forwarded-for')?.split(',')[0].trim()
            || 'unknown';

    await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ip: ip,
        fp: data.fp,
        clicks: data.clicks,
        gclid: data.gclid,
        url: data.url,
        ua: data.ua,
        ts: Date.now()
      })
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};