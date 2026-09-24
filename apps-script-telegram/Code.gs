/**
 * CoachFlow – new signup → Telegram notifier
 * Account used Dinkhir on Google Apps Script
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

function formatDate(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function addMonths(date, months) {
  var result = new Date(date.getTime());
  var originalDay = result.getDate();
  result.setMonth(result.getMonth() + months);
  if (result.getDate() !== originalDay) result.setDate(0);
  return result;
}

function doPost(e) {
  try {
    var props = PropertiesService.getScriptProperties();
    var botToken = props.getProperty("TELEGRAM_BOT_TOKEN");
    var chatId = props.getProperty("TELEGRAM_CHAT_ID");
    if (!botToken || !chatId) {
      return ContentService.createTextOutput(
        "Missing TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID script properties."
      );
    }

    var data = JSON.parse((e.postData && e.postData.contents) || "{}");
    var v = function (val) {
      return val === undefined || val === null || val === "" ? "-" : val;
    };

    var startDate = data.startDate || formatDate(new Date());
    var packageMonths = String(data.package || "").toLowerCase() === "special promo" ? 3 : 1;
    var endDate = data.endDate || formatDate(addMonths(new Date(), packageMonths));

    var lines = [
      "🥇 New CoachFlow signup",
      "",
      "👤 Name: " + v(data.name),
      "📧 Email: " + v(data.email),
      "📱 Phone: " + v(data.phone),
      "🎂 Age: " + v(data.age),
      "⚧ Gender: " + v(data.gender),
      "📏 Height: " + v(data.height),
      "⚖️ Weight: " + v(data.weight),
      "🎯 Goal: " + v(data.goal),
      "🥜 Allergies: " + v(data.allergies),
      "🩺 Health notes: " + v(data.health),
      "📦 Package: " + v(data.package),
      "📅 Start date: " + startDate,
      "🏁 End date: " + endDate,
      "⏱️ Duration: " + packageMonths + " month" + (packageMonths === 1 ? "" : "s"),
      "",
      "🕒 Signed up: " + new Date().toLocaleString("en-GB", { timeZone: "UTC" }) + " UTC"
    ];

    var telegramResponse = UrlFetchApp.fetch("https://api.telegram.org/bot" + botToken + "/sendMessage", {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ chat_id: chatId, text: lines.join("\n") }),
      muteHttpExceptions: true
    });

    var code = telegramResponse.getResponseCode();
    var body = telegramResponse.getContentText();
    if (code < 200 || code >= 300) {
      throw new Error("Telegram API HTTP " + code + ": " + body);
    }

    var result = JSON.parse(body);
    if (!result.ok) {
      throw new Error("Telegram API rejected message: " + body);
    }

    return ContentService.createTextOutput("OK");
  } catch (err) {
    return ContentService.createTextOutput("Error: " + err);
  }
}
