//! In-memory TTL cache for API responses.
//!
//! Stored as `serde_json::Value` so one cache serves every endpoint without generics
//! leaking into Tauri state. Cloning a Value per hit is cheap at our payload sizes
//! (~50 KB for a player) and keeps the lock hold time to a hash lookup.

use std::collections::HashMap;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use tokio::sync::Mutex;

pub const TTL: Duration = Duration::from_secs(60);

#[derive(Clone)]
pub struct Entry {
    pub value: serde_json::Value,
    pub stored_at: Instant,
    /// Wall-clock time for the UI ("fetched 23s ago"); Instant isn't serialisable.
    pub fetched_at_ms: u64,
}

#[derive(Default)]
pub struct ApiCache {
    // tokio Mutex: held only for lookups/inserts, never across the HTTP await,
    // so two concurrent misses may both fetch — acceptable for a single-user app
    // and avoids holding a lock across network I/O.
    inner: Mutex<HashMap<String, Entry>>,
}

impl ApiCache {
    pub async fn get_fresh(&self, key: &str) -> Option<Entry> {
        let map = self.inner.lock().await;
        map.get(key).filter(|e| e.stored_at.elapsed() < TTL).cloned()
    }

    pub async fn put(&self, key: String, value: serde_json::Value) -> Entry {
        let entry = Entry { value, stored_at: Instant::now(), fetched_at_ms: now_ms() };
        self.inner.lock().await.insert(key, entry.clone());
        entry
    }

    /// Drop everything — used when the config (key/tag) changes.
    pub async fn clear(&self) {
        self.inner.lock().await.clear();
    }
}

pub fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}
