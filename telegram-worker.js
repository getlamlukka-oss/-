/**
 * ROV Stock Manager -> Telegram delivery proxy
 * Deploy as a Cloudflare Worker.
 *
 * Required Worker settings:
 *   Secret: TELEGRAM_BOT_TOKEN
 *   Variable: TELEGRAM_CHAT_ID
 *   Variable: ALLOWED_ORIGIN (exact website origin, e.g. https://example.com)
 */
const json = (data, status, origin, allowedOrigin) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": origin === allowedOrigin ? origin : "null",
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  }
});

const escapeHtml = value => String(value ?? "-").replace(/[&<>"]/g, ch => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"
}[ch]));

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (!env.ALLOWED_ORIGIN || origin !== env.ALLOWED_ORIGIN) {
      return new Response("Origin not allowed", { status: 403 });
    }
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Vary": "Origin",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400"
        }
      });
    }
    if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405, origin, env.ALLOWED_ORIGIN);
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
      return json({ ok: false, error: "Telegram Worker is not configured" }, 500, origin, env.ALLOWED_ORIGIN);
    }

    try {
      const body = await request.json();
      let message;
      if (body.action === "test") {
        message = "<b>ROV STOCK MANAGER</b>\nTelegram connection test successful.";
      } else if (body.action === "sale" && body.report && body.report.id && body.report.username) {
        const r = body.report;
        const price = Number(r.price);
        if (!Number.isFinite(price) || price < 0) {
          return json({ ok: false, error: "Invalid sale price" }, 400, origin, env.ALLOWED_ORIGIN);
        }
        message = [
          "🟢 <b>ROV SALES REPORT</b>",
          "━━━━━━━━━━━━━━━━━━",
          "<b>เลขรายงาน:</b> " + escapeHtml(r.id),
          "<b>สถานะ:</b> ขายสำเร็จ",
          "<b>ผู้ขาย:</b> " + escapeHtml(r.seller || "ไม่ระบุ"),
          "<b>สินค้า:</b> " + escapeHtml(r.username),
          "<b>รายละเอียด:</b> " + escapeHtml(r.details || "-"),
          "<b>หมวดหมู่:</b> " + escapeHtml(r.category || "-"),
          "<b>ยอดเงิน:</b> " + price.toLocaleString("th-TH") + " บาท",
          "<b>ลูกค้า:</b> " + escapeHtml(r.buyer || "-"),
          "<b>ช่องทาง:</b> " + escapeHtml(r.channel || "-"),
          "<b>วันที่:</b> " + escapeHtml(r.date || "-"),
          "━━━━━━━━━━━━━━━━━━",
          "<i>รายงานจาก ROV Stock Manager</i>"
        ].join("\n");
      } else {
        return json({ ok: false, error: "Invalid request payload" }, 400, origin, env.ALLOWED_ORIGIN);
      }

      const response = await fetch("https://api.telegram.org/bot" + env.TELEGRAM_BOT_TOKEN + "/sendMessage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: true
        })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        return json({ ok: false, error: result.description || "Telegram API error" }, 502, origin, env.ALLOWED_ORIGIN);
      }
      return json({ ok: true, message_id: result.result.message_id }, 200, origin, env.ALLOWED_ORIGIN);
    } catch (error) {
      return json({ ok: false, error: "Invalid JSON or delivery failure" }, 400, origin, env.ALLOWED_ORIGIN);
    }
  }
};
