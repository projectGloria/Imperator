# Artwork

Drop image files **directly in this folder** (no subfolders). Files from Supercell's Fan Kit work **with their original names**, so you don't need to rename anything.

## Getting the official images (Fan Kit)

1. Open https://fankit.supercell.com and choose **Clash of Clans**. The page can show "Something went wrong" or stay blank for a few seconds while it loads; reload if needed. Downloading means accepting Supercell's Fan Content Policy.
2. Search **`Icon_HV`**. These are the 166×166 unit, hero and spell icons the app is built for. Also search **`Icon_BB`** if you want Builder Base troops.
3. To download several at once, hover an asset and tick its **Select** checkbox in the corner, then use the Download button in the selection bar. For a single file, click it, and the **Download** button is in the right-hand panel. If the window is narrow, that panel is pushed off-screen: widen the window or scroll right.
4. For buildings, search e.g. **`Building_HV_Cannon`**. There's one file per level (`Building_HV_Cannon_level_12`), and the app picks the one matching your level, falling back to the highest level you have. `Building_HV_Town_Hall_level_9` becomes your TH9 picture.
5. Unzip or copy the PNGs into this folder. In dev they appear after a reload. For the installed app, run `npm run tauri build` again.

How Fan Kit names are understood:

| Fan Kit file | Used as |
|---|---|
| `Icon_HV_Hog_Rider.png` | Hog Rider |
| `Icon_HV_Hero_Barbarian_King.png` | Barbarian King |
| `Icon_HV_Spell_Lightning_new.png` (beats `_old`) | Lightning Spell |
| `Icon_HV_Dark_Spell_Bat.png` | Bat Spell |
| `Icon_HV_Spell_Heal.png` | Healing Spell |
| `Building_HV_Cannon_level_12.png` | Cannon at level 12 (and any level without its own file) |
| `Icon_BB_Baby_Dragon.png` | Baby Dragon, only if there's no `Icon_HV_` version |

Renders (`Troop_HV_…`) and concept art (`CAT_…`) are ignored. Pick the `Icon_` files.

Also understood: `Building_HV_Giant_Bomb_level_3&4` (one image for two levels; save the `&` as `-`, because `&` breaks the build's asset import), `hero_hall_lvl_02`, `Building_HV_Builder_Hut_Level_1` and `Building_HV_Helper_Hut` (no level).

## Your own file names

You can also name files yourself, and your own name always wins over a Fan Kit file. The rule: lowercase, drop `.` and `'`, and turn every other non-alphanumeric run into `-`. For example `P.E.K.K.A` becomes `pekka.png`, `Builder's Hut` becomes `builders-hut.png`, and a level-specific building is `cannon-12.png`. Hover any icon tile in the app to see the name it's looking for.

- Formats: `.png`, `.webp`, `.jpg`, `.svg`, `.gif`.
- Image files here are gitignored, so official art never gets pushed to GitHub by accident. Only this README is tracked.
- The API already provides clan badges and league icons; those load automatically. A file named `clan-badge.png` here overrides the API badge.

## Special slots

| File | Used for |
|---|---|
| `town-hall-9.png` (any level 1–17) | Town Hall at that level: Dashboard, Village |
| `town-hall.png` | Town Hall fallback when there's no per-level file |
| `avatar.png` | Your profile picture |
| `clan-badge.png` | Your clan's badge (Clan page, War scoreboard) |
| `opponent-badge.png` | Opponent badge on the War scoreboard |

## Heroes

`archer-queen.png`, `barbarian-king.png`, `grand-warden.png`, `minion-prince.png`, `royal-champion.png`

## Troops

`apprentice-warden.png`, `archer.png`, `baby-dragon.png`, `balloon.png`, `barbarian.png`, `bowler.png`, `dragon.png`, `dragon-rider.png`, `druid.png`, `electro-dragon.png`, `electro-titan.png`, `furnace.png`, `giant.png`, `goblin.png`, `golem.png`, `headhunter.png`, `healer.png`, `hog-rider.png`, `ice-golem.png`, `lava-hound.png`, `miner.png`, `minion.png`, `pekka.png`, `root-rider.png`, `thrower.png`, `valkyrie.png`, `wall-breaker.png`, `witch.png`, `wizard.png`, `yeti.png`

## Spells

`bat-spell.png`, `clone-spell.png`, `earthquake-spell.png`, `freeze-spell.png`, `haste-spell.png`, `healing-spell.png`, `invisibility-spell.png`, `jump-spell.png`, `lightning-spell.png`, `overgrowth-spell.png`, `poison-spell.png`, `rage-spell.png`, `recall-spell.png`, `revive-spell.png`, `skeleton-spell.png`

## Siege machines

`battle-blimp.png`, `battle-drill.png`, `flame-flinger.png`, `log-launcher.png`, `siege-barracks.png`, `stone-slammer.png`, `troop-launcher.png`, `wall-wrecker.png`

## Buildings

`air-defense.png`, `air-sweeper.png`, `archer-queen-altar.png`, `archer-tower.png`, `army-camp.png`, `barbarian-king-altar.png`, `barracks.png`, `blacksmith.png`, `bomb-tower.png`, `builder-hall.png`, `builders-hut.png`, `cannon.png`, `clan-castle.png`, `dark-barracks.png`, `dark-elixir-drill.png`, `dark-elixir-storage.png`, `dark-spell-factory.png`, `eagle-artillery.png`, `elixir-collector.png`, `elixir-storage.png`, `gold-mine.png`, `gold-storage.png`, `grand-warden-altar.png`, `helper-hut.png`, `hero-hall.png`, `hidden-tesla.png`, `inferno-tower.png`, `laboratory.png`, `mortar.png`, `pet-house.png`, `scattershot.png`, `spell-factory.png`, `wall.png`, `wall-builder-base.png`, `wizard-tower.png`, `workshop.png`, `x-bow.png`

## Traps

`air-bomb.png`, `bomb.png`, `giant-bomb.png`, `seeking-air-mine.png`, `skeleton-trap.png`, `spring-trap.png`, `tornado-trap.png`

## Builder Base troops

`beta-minion.png`, `boxer-giant.png`, `raged-barbarian.png`, `sneaky-archer.png`

Names not listed above (new units, or IDs added to `data/game-data.json` → `ids.names`) follow the same rule.
