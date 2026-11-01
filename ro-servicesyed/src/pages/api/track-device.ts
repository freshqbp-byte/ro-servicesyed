export const prerender = false;

import type { APIRoute } from 'astro';
import { GoogleAdsApi } from 'google-ads-api';

const WEBHOOK = 'https://script.google.com/macros/s/AKfycbyFBUjNWku0RbHD28ySUnd6A5GY7Rspmo4Dez_kF67MjxYd3gR0d2uLR_8bij-6mA/exec';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { fp, clicks, gclid } = data;

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
    
    if (clicks >= 2 && ip !== 'unknown') {
      isBlocked = true;

      // Tere tokens direct add kiye hain
      const client = new GoogleAdsApi({
        client_id: '838248077339-f7frtcnlooc9ja9mckvc7m815cqia4e7.apps.googleusercontent.com',
        client_secret: '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',
        developer_token: 'n6QxLDwmz1mFMJnzYOd77w',
      });

      // Dashes (-) automatic hat jayenge, sirf numbers rahenge
      const customer = client.Customer({
        customer_id: '9357094741', 
        refresh_token: '1//04hOF9YKH2xXNCgYIARAAGAQSNwF-L9Irmzmd4a1ZRwSMmssBqC2j-QSOzsq924jbYNVQ0MzobInSO9CEubL_rQkLQpoLepgK98E',
        login_customer_id: '5273808005', // MCC ID
      });

      const campaignId = '21451236429';

      try {
        // Check karein kitni IPs already block hain
        const query = `
          SELECT campaign_criterion.resource_name 
          FROM campaign_criterion 
          WHERE campaign_criterion.type = 'IP_BLOCK' 
          AND campaign.id = ${campaignId}
        `;
        const existingCriteria = await customer.query(query);

        // Agar 400+ IPs hain, toh purani 20 delete karein
        if (existingCriteria.length >= 400) {
          const criteriaToRemove = existingCriteria.slice(0, 20).map((c: any) => ({
            resource_name: c.campaign_criterion.resource_name, 
            status: 'REMOVED'
          }));
          await customer.campaignCriteria.update(criteriaToRemove);
        }

        // Nayi IP block karein
        await customer.campaignCriteria.create([{
          campaign: `customers/9357094741/campaigns/${campaignId}`,
          negative: true, 
          ip_block: { ip_address: ip },
        }]);
        
        console.log(`Successfully blocked IP: ${ip} in Google Ads.`);

      } catch (adError: any) {
        // 👇 YAHAN MAINE DEBUG LOGIC ADD KIYA HAI
        console.error("========== GOOGLE ADS API ERROR ==========");
        // Google ka asli error object print karne ke liye
        const errorDetails = adError?.errors || adError?.message || adError;
        console.error("Full Error Details:", JSON.stringify(errorDetails, null, 2));
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
