mod api;
mod cache;
mod commands;
mod config;
mod errors;
mod state;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let paths = config::resolve_paths(app.handle())?;
            app.manage(state::AppState::new(paths));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::player::get_player,
            commands::clan::get_clan,
            commands::war::get_current_war,
            commands::setup::get_config_status,
            commands::setup::save_config,
            commands::game_data::get_game_data,
            commands::village::import_village,
            commands::village::get_village,
            commands::net::get_public_ip,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
