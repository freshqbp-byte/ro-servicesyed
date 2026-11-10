import type { APIRoute } from 'astro';

export const prerender = false;

const WEBHOOK = 'https://script.google.com/macros/s/AKfycbyFBUjNWku0RbHD28ySUnd6A5GY7Rspmo4Dez_kF67MjxYd3gR0d2uLR_8bij-6mA/exec';

const CLIENT_ID = import.meta.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = import.meta.env.GOOGLE_REFRESH_TOKEN;
const CUSTOMER_ID = import.meta.env.GOOGLE_CUSTOMER_ID; 
const MCC_ID = '5273808005';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { fp, clicks, gclid } = data;

    if (!gclid) {
      return new Response(JSON.stringify({ ok: true, message: "Normal user ignored" }), { status: 200 });
    }

    const ip = request.headers.get('cf-connecting-ip')?.trim()
            || request.headers.get('x-real-ip')?.trim()
            || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || 'unknown';

    const isGoogleBot = ip.startsWith('64.233.') || ip.startsWith('66.249.') || ip.startsWith('72.14.');
    if (isGoogleBot) {
      console.log("Googlebot detected, ignoring for tracking:", ip);
      return new Response(JSON.stringify({ ok: true, message: "Bot ignored" }), { status: 200 });
    }

    let isBlocked = false;

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

      if (result.blocked === true) {
        isBlocked = true;
      }

    } catch (sheetError) {
      console.error("Sheet Error:", sheetError);
    }

    if (isBlocked && ip !== 'unknown') {
      
      console.log("Block condition met. Calling API for IP:", ip);

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
        console.error("OAuth JSON Parse Error:", tokenText.substring(0, 200));
      }

      // 👇 DEBUG LOG: Check karein ki token aaya ya error
      if (!tokenData || !tokenData.access_token) {
        console.error("🚨 OAuth Token Fail! Google ka response:", tokenData);
      } else {
        console.log("✅ OAuth Token successfully generated!");
        
        try {
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
            console.error("Status Code:", adsResponse.status);
            console.error("Error Detail:", adsErrorText);
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
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
