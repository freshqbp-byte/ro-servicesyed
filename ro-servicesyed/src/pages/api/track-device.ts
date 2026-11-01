export const prerender = false; 

import type { APIRoute } from 'astro';

const WEBHOOK = 'https://script.google.com/macros/s/AKfycbyFBUjNWku0RbHD28ySUnd6A5GY7Rspmo4Dez_kF67MjxYd3gR0d2uLR_8bij-6mA/exec';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();

    // 👇 Agar gclid nahi hai (matlab normal user hai), toh API kuch na kare
    if (!data.gclid) {
      return new Response(JSON.stringify({ ok: true, message: "Normal user" }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Real IP nikalne ka sahi tarika
    const ip = request.headers.get('cf-connecting-ip')?.trim()
            || request.headers.get('x-real-ip')?.trim()
            || request.headers.get('x-forwarded-for')?.split(',')[0].trim()
            || 'unknown';

    // 👇 Data Google Sheet (Webhook) par bhejein
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
        action: data.action || 'Visit', // 👈 Action (Call/Visit) add kiya
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
