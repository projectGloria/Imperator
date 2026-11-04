# Imperator

Personal Clash of Clans companion for Windows. Tauri 2 + React 19 + TypeScript. Local only: no server, no accounts, no telemetry.

All Supercell API calls run in Rust. The webview never sees the API key.

## Prerequisites

- Node.js 20+ and npm
- Rust (stable) with the MSVC toolchain. `cargo` must be on your PATH. If it isn't, add `%USERPROFILE%\.cargo\bin`.
- WebView2 (ships with Windows 11)

## Setup (dev)

```powershell
npm install
copy .env.example .env
```

Edit `.env` in the project root:

```
COC_API_KEY=<your key from developer.clashofclans.com>
COC_PLAYER_TAG="#XXXXXXXX"
```

The key is bound to your public IP. If your IP changes, the app shows your current IP and a link to update the key.

```powershell
npm run tauri dev
```

### Testing the Setup screen in dev

In dev builds the Setup form won't overwrite your root `.env`. To exercise the form, point the app at a throwaway folder:

```powershell
$env:IMPERATOR_CONFIG_DIR = "$env:TEMP\imperator-test"; npm run tauri dev
```

This override is compiled out of release builds.

## Build the installer

```powershell
npm run tauri build
```

The NSIS installer ends up in `src-tauri/target/release/bundle/nsis/`.

The packaged app does **not** contain your `.env`. On first launch it shows a setup screen and writes the file to:

```
%APPDATA%\com.imperator.app\.env
```

## Game data

`data/game-data.json` holds the max level for each unit at each Town Hall, as a sparse step map (`"TH": cap`). It was written from memory and is **unverified**. Every entry marked `_todo` needs checking against the game. Edit it and click Refresh to apply the changes.

- If a unit has no entry, its bar uses the API's global `maxLevel` and is flagged **unknown cap**.
- If your level is above the listed cap, the card is flagged **check cap data**.
- If a unit is listed for your TH but the API doesn't return it, it shows as *Not unlocked* and counts as level 0.
- Packaged builds copy the file to `%APPDATA%\com.imperator.app\data\` on first run. Edit that copy.
- `ids` maps the numeric IDs in the village export to names. IDs listed in `ids.unverified` are guesses and show a **?** badge. IDs with no name show as *Unknown #id*. Add them as you identify them.

## Village import

The API has no upgrade timers. They come from the game's own village export JSON, pasted on the Village page.
- The paste is validated in Rust and saved as `data/village.json` (dev) or `%APPDATA%\com.imperator.app\data\village.json` (packaged), together with the import time. The file is gitignored.
- It's a **snapshot**. Countdowns run from the export's timestamp, so anything you started or finished in-game after exporting isn't shown until you import again.
- The export has no stored gold, elixir or dark elixir, so the app doesn't show resources.

## Planner

The planner is computed from the last village snapshot and `game-data.json`. It covers levels only, with no costs or times.
- Your Town Hall level comes from the snapshot, not the API.
- **Buildings and traps** use `buildings` in game-data.json, keyed by export ID. `caps` gives the max level per TH and `counts` gives how many you can build per TH. Every entry is `_todo: verify`.
- **Heroes and Laboratory** reuse `caps.heroes`, `caps.troops`, `caps.spells` and `caps.siegeMachines`, matched through `ids.names`. Units listed for your TH but missing from the export appear as *not unlocked* and aren't counted.
- Items with no cap for your TH are listed under "No cap data" and are never counted as maxed.
- Category priority is set on the Planner page by dragging or with the arrows. It's saved to `data/planner.json` (gitignored). `planner.defaultOrder` in game-data.json is used until you reorder.
- Builder Base isn't planned (there's no cap data for it).

## Completion %

Completion is calculated over home-village heroes, troops, spells and siege machines:

```
Σ min(level, TH cap) / Σ TH cap
```

Builder Base units, pets, super troops and hero equipment are left out. Builder Base data is still kept in memory for a later section.

## Artwork

Every picture comes from `ImageSlot` (`src/components/ImageSlot.tsx`), in this order:
1. **Your file in `art/`**: official unit, hero, spell and building art from Supercell's Fan Kit (fankit.supercell.com), which you download yourself. Files work with their original names (`Icon_HV_Hog_Rider.png`, `Building_HV_Cannon_level_12.png`); the mapping is in `src/lib/fanKit.ts`. You can also name files yourself (`hog-rider.png`). [art/README.md](art/README.md) has step-by-step download instructions.
2. **Official images from the API**: clan badges (Clan, War, Dashboard) and league icons (Dashboard, Profile, member list). These load from `https://api-assets.clashofclans.com`, the only remote host the CSP allows for images. Rust also drops any image URL from the API that points elsewhere.
3. **Otherwise**, a styled tile with a line icon. No emoji are used. This is also what you see when you're offline and an official image can't load.

Files are bundled at build time (`import.meta.glob`), so the app needs no filesystem permission and the CSP still only allows local images. In dev, a new file appears after a reload. For the installed app, rebuild. Images in `art/` are gitignored.

## Security notes

- Capabilities (`src-tauri/capabilities/default.json`) cover only the window controls and opening `https://developer.clashofclans.com/*`. Nothing else: no shell, no fs, no http plugin.
- The `ApiKey` type has a redacted `Debug` and no `Display`. `.env` parse errors are never passed through, because they can contain the raw line.
- API responses are cached in memory for 60 s. Refresh skips the cache.
- CSP `img-src` is `'self' data: https://api-assets.clashofclans.com`. Official badges and league icons are fetched by the webview straight from Supercell's CDN, with no referrer. They're the only requests the webview makes outside the app.

## Layout

```
src-tauri/src/   commands/ api/ cache.rs config.rs errors.rs state.rs
src/             components/ pages/ hooks/ lib/ types/
data/            game-data.json (editable), cache/ (gitignored)
```
