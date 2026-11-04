import { useActionState } from "react";
import { motion } from "framer-motion";
import { Crown, KeyRound, RefreshCw } from "lucide-react";
import type { ConfigStatus } from "../types/gameData";
import { api, toAppError } from "../lib/api";

/**
 * First-run screen. Two modes:
 *  - canSave (packaged app, or dev with IMPERATOR_CONFIG_DIR): form → Rust writes .env.
 *  - dev without override: instructions + Retry (you edit the root .env by hand).
 */
export function Setup({ status, onDone }: { status: ConfigStatus; onDone: () => void }) {
  // React 19 form action: pending + error state without hand-rolled useState/try/finally.
  // The form is uncontrolled — the key never sits in React state, only in the DOM input
  // until submit, then it's sent once to Rust and the form resets.
  const [error, submit, pending] = useActionState(async (_prev: string | null, form: FormData) => {
    const key = String(form.get("apiKey") ?? "");
    const tag = String(form.get("playerTag") ?? "");
    try {
      await api.saveConfig(key, tag);
      onDone();
      return null;
    } catch (e) {
      return toAppError(e).message;
    }
  }, null);

  return (
    <div className="grid h-full place-items-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
        className="glass w-full max-w-md rounded-3xl p-8"
      >
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-gold-400/10 text-gold-300 shadow-[0_0_40px_-8px_rgb(245_197_66/0.6)]">
          <Crown size={30} />
        </div>
        <h1 className="mt-5 text-center font-display text-2xl font-bold">Welcome, Chief</h1>
        <p className="mt-1 text-center text-sm text-white/60">Connect your Clash of Clans API key to get started.</p>
        {status.reason && <p className="mt-4 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/55">{status.reason}</p>}

        {status.canSave ? (
          <form action={submit} className="mt-6 space-y-4">
            <Field label="API key" hint="From developer.clashofclans.com. Stored only on this PC.">
              <input
                name="apiKey"
                type="password"
                required
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-xl border border-white/10 bg-ink-950/70 px-3 py-2.5 font-mono text-sm outline-none focus:border-gold-400/60"
              />
            </Field>
            <Field label="Player tag" hint="Including the #, e.g. #2PP">
              <input
                name="playerTag"
                required
                defaultValue={status.playerTag ?? ""}
                placeholder="#XXXXXXXX"
                spellCheck={false}
                className="w-full rounded-xl border border-white/10 bg-ink-950/70 px-3 py-2.5 font-mono text-sm uppercase outline-none focus:border-gold-400/60"
              />
            </Field>
            {error && <p className="text-sm text-danger-400">{error}</p>}
            <button
              type="submit"
              disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-gold-300 to-gold-500 py-2.5 text-sm font-semibold text-ink-950 transition hover:brightness-110 disabled:opacity-60"
            >
              <KeyRound size={15} /> {pending ? "Saving…" : "Save & continue"}
            </button>
            <p className="text-center text-[11px] text-white/40 select-text">Saved to {status.configPath}</p>
          </form>
        ) : (
          <div className="mt-6 space-y-4 text-sm">
            <p className="text-white/70">Dev build: create this file by hand (see .env.example):</p>
            <pre className="select-text overflow-x-auto rounded-xl border border-white/10 bg-ink-950/70 p-3 font-mono text-xs text-gold-200">
{`${status.configPath}

COC_API_KEY=...
COC_PLAYER_TAG="#XXXXXXXX"   # keep the quotes`}
            </pre>
            <button
              type="button"
              onClick={onDone}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-gold-300 to-gold-500 py-2.5 text-sm font-semibold text-ink-950 transition hover:brightness-110"
            >
              <RefreshCw size={15} /> I've created it — retry
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-white/60">{label}</span>
      <div className="mt-1.5">{children}</div>
      <span className="mt-1 block text-[11px] text-white/40">{hint}</span>
    </label>
  );
}
