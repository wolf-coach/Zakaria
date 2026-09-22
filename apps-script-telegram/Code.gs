/**
 * CoachFlow – new signup → Telegram notifier
 * Runs entirely on Google Apps Script (free, no Google Cloud billing needed).
 * The React app POSTs the signup profile here; this script formats it and
 * sends it to your Telegram bot. The bot token never touches the browser.
 *
 * SETUP
 * 1. Open https://script.google.com/ → New project. Paste this whole file
 *    in as Code.gs (replace the default content).
 * 2. Project Settings (gear icon, left sidebar) → Script Properties → Add:
 *      TELEGRAM_BOT_TOKEN = <token from @BotFather>
 *      TELEGRAM_CHAT_ID   = <your chat id>
 * 3. Deploy → New deployment → select type "Web app":
 *      Execute as: Me
 *      Who has access: Anyone
 *    Click Deploy, authorize when prompted, then copy the Web app URL
 *    (it ends in /exec).
 * 4. Put that URL in your project's .env as:
 *      VITE_TELEGRAM_WEBHOOK_URL=<the /exec URL>
 *    Restart `npm run dev` / rebuild after adding it.
 *
 * Whenever you edit this script after deploying, use
 * Deploy → Manage deployments → edit (pencil) → New version → Deploy,
 * so the existing /exec URL picks up the change.
 */

function doPost(e) {
  try {
    const props = PropertiesService.getScriptProperties();
    const botToken = props.getProperty("TELEGRAM_BOT_TOKEN");
    const chatId = props.getProperty("TELEGRAM_CHAT_ID");
    if (!botToken || !chatId) {
      return ContentService.createTextOutput(
        "Missing TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID script properties."
      );
    }

    const data = JSON.parse((e.postData && e.postData.contents) || "{}");
    const v = (val) => (val === undefined || val === null || val === "" ? "—" : val);

    const lines = [
      "🆕 New CoachFlow signup",
      "",
      `Name: ${v(data.name)}`,
      `Email: ${v(data.email)}`,
      `Phone: ${v(data.phone)}`,
      `Age: ${v(data.age)}`,
      `Gender: ${v(data.gender)}`,
      `Height: ${v(data.height)}`,
      `Weight: ${v(data.weight)}`,
      `Goal: ${v(data.goal)}`,
      `Allergies: ${v(data.allergies)}`,
      `Health notes: ${v(data.health)}`,
      `Package: ${v(data.package)}`,
      `Start date: ${v(data.startDate)}`,
      `End date: ${v(data.endDate)}`,
      "",
      `Firebase UID: ${v(data.id)}`,
      `Signed up: ${new Date().toLocaleString("en-GB", { timeZone: "UTC" })} UTC`,
    ];

    UrlFetchApp.fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ chat_id: chatId, text: lines.join("\n") }),
      muteHttpExceptions: true,
    });

    return ContentService.createTextOutput("OK");
  } catch (err) {
    return ContentService.createTextOutput("Error: " + err);
  }
}
