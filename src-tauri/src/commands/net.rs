use tauri::State;

use crate::api::client;
use crate::errors::AppResult;
use crate::state::AppState;

/// Public IP via ipify — only called from the invalidIp error screen.
#[tauri::command]
pub async fn get_public_ip(state: State<'_, AppState>) -> AppResult<String> {
    client::public_ip(&state.http).await
}
