import type { APIRoute } from 'astro';

export const prerender = false;

// 👇 Yahan aapka naya Webhook URL daalein
const WEBHOOK = 'https://script.google.com/macros/s/AKfycbyFBUjNWku0RbHD28ySUnd6A5GY7Rspmo4Dez_kF67MjxYd3gR0d2uLR_8bij-6mA/exec';

// ==========================================
// GOOGLE ADS API CREDENTIALS (Vercel se aayenge)
// ==========================================
const CLIENT_ID = import.meta.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = import.meta.env.GOOGLE_REFRESH_TOKEN;
const CUSTOMER_ID = import.meta.env.GOOGLE_CUSTOMER_ID; // 9357094741
const MCC_ID = '5273808005'; // Aapki MCC ID

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { fp, clicks, gclid } = data;

    // Agar normal user hai (GCLID nahi hai), toh kuch mat karo
    if (!gclid) {
      return new Response(JSON.stringify({ ok: true, message: "Normal user ignored" }), { status: 200 });
    }

    // IP nikalna
    const ip = request.headers.get('cf-connecting-ip')?.trim()
            || request.headers.get('x-real-ip')?.trim()
            || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || 'unknown';

    let isBlocked = false;

    // 1. Google Sheet (Webhook) ko data bhejo aur check karo
    try {
      const res = await fetch(WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: ip, fp: fp, clicks: clicks, gclid: gclid, url: data.url, ua: data.ua, ts: Date.now()
        })
      });
      
      const textResponse = await res.text();
      let result = { blocked: false };
      try {
        result = JSON.parse(textResponse);
      } catch (e) {
        console.error("Webhook JSON Error:", textResponse.substring(0, 100));
      }

      // ✅ Agar Google Sheet bolti hai ki 2 clicks ho gaye hain (blocked: true)
      if (result.blocked === true) {
        isBlocked = true;
      }

    } catch (sheetError) {
      console.error("Sheet Error:", sheetError);
    }

    // 2. Google Ads API Call (Agar block karna hai)
    if (isBlocked && ip !== 'unknown') {
      console.log("Block condition met. Calling API for IP:", ip);

      // OAuth Token Generate karein
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          refresh_token: REFRESH_TOKEN,
          grant_type: 'refresh_token',
        }),
      });

      const tokenText = await tokenResponse.text();
      let tokenData;
      try {
        tokenData = JSON.parse(tokenText);
      } catch (e) {
        console.error("OAuth Error:", tokenText.substring(0, 200));
      }

      if (tokenData && tokenData.access_token) {
        try {
          // ✅ API v26 use kar rahe hain, developer-token header nahi hai
          const adsResponse = await fetch(`https://googleads.googleapis.com/v26/customers/${CUSTOMER_ID}/customerNegativeCriteria:mutate`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
              'login-customer-id': MCC_ID,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              operations: [{ create: { ipBlock: { ipAddress: ip } } }]
            })
          });

          if (!adsResponse.ok) {
            const adsErrorText = await adsResponse.text();
            console.error("========== GOOGLE ADS API ERROR ==========");
            console.error(adsErrorText);
            console.error("==========================================");
          } else {
            console.log("Success: IP blocked in Google Ads:", ip);
          }
        } catch (adError) {
          console.error("Fetch Error:", adError);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, blocked: isBlocked }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error("Server Error:", err);
    return new Response(JSON.stringify({ ok: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({ status: "API is active" }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  });
};
