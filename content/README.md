# Editing website content in Google Sheets

Event content (schedule, stalls, tour order, FAQ, nearby places and the event details) can be edited in a Google Sheet by anyone on the team, without touching code. Pressing **Website → Publish changes** rebuilds the site from the sheet; changes are live in about 2 minutes.

Before anything is published, every tab is checked: times, Yes/No values, duplicate IDs and codes, links between tabs (e.g. a tour stop that isn't a stall), files that must exist (logos, sticker images), and pins on real floors. **If anything is wrong, the site keeps its previous version**, and the build log lists each problem with its tab and row.

Not in the sheet (they stay as files in the repository): floor-plan drawings and pin routes, walking paths, buildings, logos and sticker artwork. See `src/data/README.md`.

## For editors

- Edit cells as you would in any spreadsheet, then **Website → Publish changes**.
- Yes/No columns have a dropdown. Times are 24-hour (`10:00`). Dates are `YYYY-MM-DD`.
- Several lines in one cell (paragraphs, bullet points, links): **Ctrl+Enter** (Cmd+Enter on Mac).
- Hide a stall without deleting it: set **Active?** to **No**.
- Don't change a stall's **ID** or **Code** once its QR code is printed.
- You can add your own columns for notes; the website ignores columns it doesn't know.
- **QR codes page password** (Event tab): type a new password (8+ characters) and publish to change the password for `/qr-codes`. Leave it blank to keep the current one. The website only stores a fingerprint of it, so clear the cell after publishing if you'd rather the password not sit in the sheet.
- Changes not showing after a few minutes? A cell probably has a problem. Ask an admin to check the Vercel build log, which names the tab and row.

## One-time setup (admins)

1. **Create the sheet.** Run `npm run content:template` (or use the committed `content/open-house-content.xlsx`). Upload it to the Google Drive folder, right-click → **Open with → Google Sheets**, then **File → Save as Google Sheets**. Use the Google Sheets copy from now on.
2. **Sharing.** Give **edit** access only to the people who should change the website; anyone with edit access can change the live site. For the website to read the sheet, either:
   - **Simple:** Share → General access → *Anyone with the link* → **Viewer**, or
   - **Private:** keep it restricted, create a Google Cloud service account (Drive API enabled), share the sheet with its email as **Viewer**, and use its JSON key in step 3.
3. **Vercel** (Project → Settings → Environment Variables, Production):
   - `CONTENT_SHEET_ID` = the long ID in the sheet's URL: `docs.google.com/spreadsheets/d/<THIS PART>/edit`
   - Private setup only: `GOOGLE_SERVICE_ACCOUNT_JSON` = the whole JSON key file contents.
4. **Deploy hook.** Vercel → Project → Settings → Git → **Deploy Hooks** → create one for the `main` branch. Copy its URL.
5. **Publish menu.** In the sheet: **Extensions → Apps Script**, replace everything with `content/publish-menu.gs`, Save, reload the sheet. Then **Website → Set up publishing (admins)** and paste the deploy hook URL. Approve the permissions Google asks for.
6. Try it: change something small, **Publish changes**, and check the site after ~2 minutes.

**When the Vercel project moves to the department:** repeat steps 3–5 in the new project (the environment variables and deploy hook don't move with it), and paste the new hook via **Set up publishing**.

## Prize draw

Visitors who collect every sticker see **Enter the prize draw** on their passport. They give their full name and email and tick that they agree to the terms. Entries go into a private **Prize draw entries** Google Sheet through a small script, which:

- keeps **one row per passport**: entering again updates the row, so visitors can fix a typo until the draw closes (they see **Edit entry**);
- refuses an email that's already entered from another passport, incomplete passports and entries after closing;
- flags passports completed suspiciously fast (all stickers in under 15 minutes) in the **Flags** column;
- has a hidden bot trap and a limit of 120 entries a minute;
- accepts an entry made before closing but sent up to an hour later (e.g. after a dead zone), since entries made with no signal are kept on the phone and sent when it returns.

The script can only add or update rows; it never shows the sheet to anyone. Each visitor sees an **entry code** (e.g. `3F9A-2C1E`), also in the sheet, to find their row if they email about a typo after closing.

**Running the draw:** in the Entries tab, filter out rows with Flags you're not happy with, then pick a random row, e.g. `=INDEX(D2:D, RANDBETWEEN(1, COUNTA(D2:D)))` for the email. Delete the sheet within 30 days of the draw, as the terms promise.

### Setup (once)

1. In the team's shared Drive folder, create a Google Sheet called **Prize draw entries**. Keep sharing limited to the team.
2. **Extensions → Apps Script**: replace everything with `content/draw-entries.gs`, Save.
3. **Project Settings → Script properties**, add:
   - `CLOSES_AT` = `2026-10-17T15:00:00-06:00` (3:00 PM Edmonton time)
   - `REQUIRED_STICKERS` = `16` (the number of stickers on the passport)
   - `GRACE_MINUTES` = `60` (optional)
4. **Deploy → New deployment → Web app**: *Execute as* **Me**, *Who has access* **Anyone**. Approve the permissions. Copy the **Web app URL** (`https://script.google.com/macros/s/…/exec`). Opening it in a browser should show `{"ok":true,"open":true,…}`.
5. Put that URL in the content sheet's Event tab, **Prize draw: entries web app URL**, and publish (or set `drawEndpoint` in `src/data/event.json`). The entry button appears once it's set.
6. Test with a completed passport, then delete the test row.

If you edit the script later, use **Deploy → Manage deployments → Edit → New version** so the URL stays the same. The **terms and privacy notice** visitors agree to is on the Event tab (**Prize draw: terms and privacy notice**); have it approved before the event.

## How it works

`npm run build` first runs `scripts/content/sync.mjs --if-configured`. If `CONTENT_SHEET_ID` is set, it downloads the sheet as a spreadsheet file, checks it, and writes `src/data/*.json`; with any problem it stops the build, so Vercel keeps serving the last good version. Without `CONTENT_SHEET_ID` (local builds, tests) it does nothing and the committed JSON is used.

Useful commands:

| Command | What it does |
|---|---|
| `npm run content:template` | Builds `content/open-house-content.xlsx` from the current `src/data` files |
| `npm run content:sync -- --file sheet.xlsx` | Checks a downloaded sheet and writes `src/data` (to commit the sheet's content into the repo) |
| `CONTENT_SHEET_ID=… npm run content:sync` | Same, straight from Google Sheets |

The sheet layout (tabs, columns, help text) is defined once in `scripts/content/sheetFormat.mjs`; the checks are in `validate.mjs`.
