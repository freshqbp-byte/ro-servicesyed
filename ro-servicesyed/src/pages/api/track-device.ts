export const prerender = false;

import type { APIRoute } from 'astro';
import { GoogleAdsApi } from 'google-ads-api';

// 👇 YAHAN APNI GOOGLE SHEET KA URL DAALEIN
const WEBHOOK = 'https://script.google.com/macros/s/AKfycbyFBUjNWku0RbHD28ySUnd6A5GY7Rspmo4Dez_kF67MjxYd3gR0d2uLR_8bij-6mA/exec';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { fp, clicks, gclid } = data;

    // Normal user check (Agar gclid nahi hai, toh ignore karo)
    if (!gclid) {
      return new Response(JSON.stringify({ ok: true, message: "Normal user ignored" }), { status: 200 });
    }

    // IP nikalna
    const ip = request.headers.get('cf-connecting-ip')?.trim()
            || request.headers.get('x-real-ip')?.trim()
            || request.headers.get('x-forwarded-for')?.split(',')[0].trim()
            || 'unknown';

    // Google Sheet me log karna
    try {
      await fetch(WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: ip, fp: fp, clicks: clicks, gclid: gclid, url: data.url, ua: data.ua, ts: Date.now()
        })
      });
    } catch (sheetError) {
      console.error("Sheet Error:", sheetError);
    }

    // 🔥 GOOGLE ADS BLOCKING LOGIC 🔥
    let isBlocked = false;
    
    // Agar 2 ya usse zyada clicks ho gaye hain
    if (clicks >= 2 && ip !== 'unknown') {
      isBlocked = true;

      // Vercel Environment Variables se details uthana
      const client = new GoogleAdsApi({
        client_id: process.env.GOOGLE_CLIENT_ID as string,
        client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
        developer_token: process.env.GOOGLE_DEVELOPER_TOKEN as string,
      });

      const customer = client.Customer({
        customer_id: process.env.GOOGLE_CUSTOMER_ID as string,
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN as string,
      });

      const campaignId = process.env.GOOGLE_CAMPAIGN_ID;

      try {
        // Check karein kitni IPs already block hain
        const query = `
          SELECT campaign_criterion.resource_name 
          FROM campaign_criterion 
          WHERE campaign_criterion.type = 'IP_BLOCK' 
          AND campaign.id = ${campaignId}
        `;
        const existingCriteria = await customer.query(query);

        // Agar 400+ IPs hain, toh purani 20 delete karein (500 limit se bachne ke liye)
        if (existingCriteria.length >= 400) {
          const criteriaToRemove = existingCriteria.slice(0, 20).map((c: any) => ({
            resource_name: c.campaign_criterion.resource_name, 
            status: 'REMOVED'
          }));
          await customer.campaignCriteria.update(criteriaToRemove);
        }

        // Nayi IP block karein
        await customer.campaignCriteria.create([{
          campaign: `customers/${process.env.GOOGLE_CUSTOMER_ID}/campaigns/${campaignId}`,
          negative: true, 
          ip_block: { ip_address: ip },
        }]);
        
        console.log(`Successfully blocked IP: ${ip} in Google Ads.`);

      } catch (adError: any) {
        // 👇 YAHAN ASLI ERROR PRINT HOGA 👇
        console.error("========== GOOGLE ADS API ERROR ==========");
        console.error("Error Message:", adError?.message || adError);
        console.error("Error Details:", JSON.stringify(adError, null, 2));
        console.error("==========================================");
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
