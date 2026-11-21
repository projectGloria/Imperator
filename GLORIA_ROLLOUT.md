# GloriaSetup rollout

Pushing a tag like `v1.2.0` builds Imperator and attaches `Imperator_1.2.0_x64-setup.exe` to that release.

## Please

- Add the repository secrets `WINDOWS_PFX_BASE64` and `WINDOWS_PFX_PASSWORD`. Without them the setup is unsigned and SmartScreen may warn.
- Keep `version` in `gloria.toml`, `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml` in step with the tag. The tag wins for the setup, but the exe's own version comes from the project files.
- Check the data folders: the app keeps `.env` and `data\` under `%APPDATA%\com.imperator.app`. I also listed `%LOCALAPPDATA%\com.imperator.app` because WebView2 keeps its profile there. Remove it from `data_folders` if an uninstall should leave that alone.
- Nothing was built locally, so the first tag run is the first real test. The workflow runs `tauri build --no-bundle` and copies only `imperator.exe` and `data/game-data.json` (the bundled resource the app seeds its editable copy from).
- `legacy_names` is empty: the repo never published an NSIS/Inno/MSI build as far as I can tell. Add `legacy_names = ["Imperator"]` if it did.
- The WebView2 bootstrapper is downloaded in the workflow from Microsoft's official fwlink.
