# MEC E Open House 2026 Website

The visitor guide for the University of Alberta Mechanical Engineering Open House on **Saturday, October 17, 2026**. Visitors use it on their phones to see the schedule, browse the stalls, find their way around campus and the MEC E building, and collect a digital sticker at every station.

**Live site:** https://mec-e-open-house-2026.vercel.app

It is a static website with no backend: all event content is stored as JSON in this repository, and each visitor's sticker passport is saved only in their own browser.


## Which document do I need?

| I want to… | Read |
|---|---|
| Brief the volunteers at each station | [Station Host Quick Guide](https://docs.google.com/document/d/1q0dWXF9ZX2IGdxLyXDiVBTovxEG_TUkOxF3tGb8bFRk/edit?usp=sharing) |
| Print the QR codes and prepare the stations | [Department Setup Guide](https://docs.google.com/document/d/1wleCXd1_4nOhqn1zOPcxqd6zih4JhQ8sUR0O7bWTrS8/edit?usp=sharing) |
| Change stalls, the schedule, the FAQ or other content | [Content Update Guide](https://docs.google.com/document/d/1mWMM4hSkUSuMufRrYU7qwkyQ_AnNF1F4zc4taXDF-Ho/edit?usp=sharing) |
| Publish a change, undo one, or transfer the accounts | [Deployment and Access Handover](https://docs.google.com/document/d/1xsvPscjd77KE7eV3kxzQGmGxuXcL6TKUWVGV8OZ2nPM/edit?usp=sharing) |
| Understand the code, or prepare the site for 2027 | [Developer Guide for Next Year's Students](https://docs.google.com/document/d/1JeamnZt7Qv_V-xw01iuG80skNcYn3ahHo3Bs52Uqy04/edit?usp=sharing) |


## What the site does

- **Home:** a live countdown to opening, and a reminder before the program presentation.
- **Schedule:** what's on now and next, with "add to calendar" and "show on map" for each event.
- **Stalls:** a searchable list of every station, with descriptions and logos.
- **Map:** walking directions across campus, nearby food, parking and transit, and a floor-by-floor guided tour of the MEC E building.
- **Passport:** visitors scan the QR code at each of the 14 stations to collect a sticker. Codes can also be typed in by hand.
- **Help:** a searchable FAQ.

## Quick start

You need [Node.js 24](https://nodejs.org) (see `.nvmrc`) and Git.

```bash
git clone https://github.com/aniketh1409/MEC-E-Open-House-2026.git
cd MEC-E-Open-House-2026
npm install
npm run dev
```

Then open http://localhost:5173. The terminal also shows a QR code for opening the site on your phone.

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm test` | Run all tests, including checks on the content files |
| `npm run lint` | Check code style |
| `npm run build` | Build the production site into `dist/` |
| `npm run preview` | Serve the production build locally |

Add `?now=10:15` to any page address to preview the site as it will look at that time on the event day.

## Project structure

```text
src/
├── data/         Event content as JSON (stalls, schedule, maps, FAQ)
├── lib/          Logic: joining the data, time zones, routing, the passport
├── hooks/        Connects the logic to time, GPS, storage and browser history
├── pages/        One folder or file per page
├── components/   Shared interface pieces, grouped by feature
└── styles/       Custom CSS
assets/           Logos, floor plan images and the printed tour map
scripts/          Python scripts that generate the map data
```

## Built with

React 19, TypeScript, Vite, Mantine, React Router, Leaflet with OpenStreetMap, and Vitest. Hosted on Vercel, which publishes every change merged into `main` automatically.

## Team

Built by University of Alberta students for the Mechanical Engineering Open House 2026.

Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), available under the ODbL.