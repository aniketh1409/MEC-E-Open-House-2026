/**
 * "Website" menu for the MEC E Open House content sheet.
 *
 * Paste this into the sheet: Extensions > Apps Script, replace everything with this file, Save.
 * Reload the sheet; a "Website" menu appears. Use "Set up publishing" once to store the Vercel
 * deploy hook (it's kept in the script's private properties, not in the sheet).
 */

const SITE_URL = "https://mec-e-open-house-2026.vercel.app";
const HOOK_PROPERTY = "VERCEL_DEPLOY_HOOK";

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Website")
    .addItem("Publish changes", "publishWebsite")
    .addItem("Open the website", "openWebsite")
    .addSeparator()
    .addItem("Set up publishing (admins)", "setUpPublishing")
    .addToUi();
}

function publishWebsite() {
  const ui = SpreadsheetApp.getUi();
  const hook = PropertiesService.getScriptProperties().getProperty(HOOK_PROPERTY);
  if (!hook) {
    ui.alert("Publishing isn't set up yet", "Ask an admin to use Website > Set up publishing.", ui.ButtonSet.OK);
    return;
  }
  const confirm = ui.alert(
    "Publish to the website?",
    "The website checks every tab first. If something is wrong, nothing changes on the site.\n\nPublish now?",
    ui.ButtonSet.YES_NO,
  );
  if (confirm !== ui.Button.YES) return;

  // Make sure the latest edits are saved before the website downloads the sheet.
  SpreadsheetApp.flush();
  const response = UrlFetchApp.fetch(hook, { method: "post", muteHttpExceptions: true });
  if (response.getResponseCode() >= 300) {
    ui.alert("Couldn't start publishing", `Vercel answered ${response.getResponseCode()}. Ask an admin to check the deploy hook.`, ui.ButtonSet.OK);
    return;
  }
  ui.alert(
    "Publishing started",
    `The website is rebuilding. Your changes should be live in about 2 minutes at\n${SITE_URL}\n\n` +
      "If they don't appear, a cell may have a problem (for example a time like 25:00 or a duplicate code). " +
      "The site keeps the previous version until it's fixed; an admin can see the exact tab and row in Vercel's build log.",
    ui.ButtonSet.OK,
  );
}

function openWebsite() {
  const html = HtmlService.createHtmlOutput(`<script>window.open(${JSON.stringify(SITE_URL)});google.script.host.close();</script>`);
  SpreadsheetApp.getUi().showModalDialog(html, "Opening the website…");
}

function setUpPublishing() {
  const ui = SpreadsheetApp.getUi();
  const answer = ui.prompt(
    "Set up publishing",
    "Paste the Vercel deploy hook URL (Vercel > Project > Settings > Git > Deploy Hooks):",
    ui.ButtonSet.OK_CANCEL,
  );
  if (answer.getSelectedButton() !== ui.Button.OK) return;
  const hook = answer.getResponseText().trim();
  if (!/^https:\/\/api\.vercel\.com\/v1\/integrations\/deploy\//.test(hook)) {
    ui.alert("That doesn't look like a Vercel deploy hook URL. Nothing was saved.");
    return;
  }
  PropertiesService.getScriptProperties().setProperty(HOOK_PROPERTY, hook);
  ui.alert("Saved. Editors can now use Website > Publish changes.");
}
