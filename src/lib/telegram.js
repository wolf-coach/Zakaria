// Sends new-signup details to a Google Apps Script web app, which forwards
// them to your Telegram bot. This keeps the Telegram bot token out of the
// browser bundle (never call the Telegram API directly from client code).
//
// Setup:
// 1. Deploy apps-script-telegram/Code.gs as a Web App (see that file's header).
// 2. Copy the deployment's /exec URL into VITE_TELEGRAM_WEBHOOK_URL in .env.
// 3. Restart Vite.
//
// If VITE_TELEGRAM_WEBHOOK_URL is not set, this silently does nothing —
// it never blocks or breaks the signup flow.

const WEBHOOK_URL = import.meta.env.VITE_TELEGRAM_WEBHOOK_URL;

export async function notifySignup(profile) {
  if (!WEBHOOK_URL) return;
  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      // text/plain avoids a CORS preflight request, which Apps Script web apps don't handle.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(profile),
    });
  } catch (err) {
    console.error("Telegram signup notification failed", err);
  }
}
