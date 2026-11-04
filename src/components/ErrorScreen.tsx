import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  Clock, ExternalLink, Globe, Hourglass, KeyRound, RefreshCw, Search, ServerCrash, TriangleAlert, Wrench, WifiOff,
  type LucideIcon,
} from "lucide-react";
import type { AppError } from "../types/errors";
import { api } from "../lib/api";

const DEV_PORTAL = "https://developer.clashofclans.com/";

interface Copy {
  icon: LucideIcon;
  title: string;
  body: string;
}

// Exhaustive over AppError["kind"]: adding a Rust variant without a screen is a TS error.
function copyFor(e: AppError): Copy {
  switch (e.kind) {
    case "invalidIp":
      return { icon: Globe, title: "Your public IP changed", body: "Supercell API keys are locked to specific IP addresses. Add your current IP to the key's allowed list (or create a new key), then retry." };
    case "accessDenied":
      return { icon: KeyRound, title: "API key rejected", body: e.message };
    case "notFound":
      return { icon: Search, title: "Player not found", body: "No player exists with that tag. Check COC_PLAYER_TAG in your .env — tags only use 0 2 8 9 P Y L Q G R J C U V." };
    case "rateLimited":
      return { icon: Hourglass, title: "Slow down", body: "The API is rate-limiting this key. Wait a few seconds and retry." };
    case "maintenance":
      return { icon: Wrench, title: "Maintenance break", body: "Clash of Clans is under maintenance. The API comes back when the game does." };
    case "offline":
      return { icon: WifiOff, title: "No connection", body: "Couldn't reach the Clash of Clans API. Check your internet connection." };
    case "timeout":
      return { icon: Clock, title: "Request timed out", body: e.message };
    case "notConfigured":
      return { icon: KeyRound, title: "Setup required", body: e.message };
    case "parse":
      return { icon: TriangleAlert, title: "Unexpected data", body: e.message };
    case "io":
      return { icon: TriangleAlert, title: "File error", body: e.message };
    case "api":
      return { icon: ServerCrash, title: e.status ? `API error ${e.status}` : "Something went wrong", body: e.message };
  }
}

export function ErrorScreen({ error, onRetry }: { error: AppError; onRetry: () => void }) {
  const { icon: Icon, title, body } = copyFor(error);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto mt-16 max-w-lg"
    >
      <div className="glass rounded-3xl p-8 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-danger-400/10 text-danger-400 shadow-[0_0_40px_-8px_rgb(248_113_113/0.5)]">
          <Icon size={30} />
        </div>
        <h2 className="mt-5 font-display text-2xl font-bold">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/65">{body}</p>

        {error.kind === "invalidIp" && <InvalidIpDetails />}

        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-gold-300 to-gold-500 px-5 py-2.5 text-sm font-semibold text-ink-950 shadow-[0_8px_24px_-8px_rgb(245_197_66/0.7)] transition hover:brightness-110"
        >
          <RefreshCw size={15} /> Retry
        </button>
      </div>
    </motion.div>
  );
}

function InvalidIpDetails() {
  // Local state is right here: this value lives and dies with the error screen.
  const [ip, setIp] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true; // ignore the result if the screen unmounted mid-request
    api.getPublicIp().then(
      (v) => alive && setIp(v),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="mt-5 space-y-3">
      <div className="rounded-xl border border-white/10 bg-ink-950/60 px-4 py-3">
        <div className="text-[10px] uppercase tracking-widest text-white/45">Your current public IP</div>
        <div className="mt-1 select-text font-mono text-lg text-gold-300">
          {ip ?? (failed ? "Couldn't detect (ipify unreachable)" : "Detecting…")}
        </div>
      </div>
      <button
        type="button"
        // Scoped in capabilities/default.json: the opener may ONLY open this origin.
        onClick={() => openUrl(DEV_PORTAL)}
        className="inline-flex items-center gap-1.5 text-sm text-elixir-300 underline-offset-4 hover:underline"
      >
        Open developer.clashofclans.com <ExternalLink size={13} />
      </button>
    </div>
  );
}

/** Slim banner for when a refresh fails but stale data is still on screen. */
export function ErrorBanner({ error, note, onRetry }: { error: AppError; note?: string; onRetry: () => void }) {
  const { title } = copyFor(error);
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-2.5 text-sm text-amber-200">
      <span className="flex items-center gap-2">
        <TriangleAlert size={15} className="shrink-0" /> {note ?? `${title} — showing the last data that loaded.`}
      </span>
      <button type="button" onClick={onRetry} className="font-medium underline-offset-4 hover:underline">
        Retry
      </button>
    </div>
  );
}
