import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Copy, Crown, Minus, Square, X } from "lucide-react";

// Module-level: getCurrentWindow() just wraps the label; no need to recreate per render.
const win = getCurrentWindow();

/**
 * Frameless title bar. `data-tauri-drag-region` makes Tauri call startDragging on
 * mousedown (needs core:window:allow-start-dragging) and toggle-maximize on double-click.
 * The buttons must NOT carry the attribute, or clicks would start a drag instead.
 */
export function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let alive = true;
    const sync = () => win.isMaximized().then((m) => alive && setMaximized(m));
    sync();
    // Resize covers maximize via button, double-click, Win+Up and Aero Snap alike.
    win.onResized(sync).then((fn) => {
      // If we unmounted before the listener registered, detach immediately.
      if (alive) unlisten = fn;
      else fn();
    });
    return () => {
      alive = false;
      unlisten?.();
    };
  }, []);

  return (
    <header
      data-tauri-drag-region
      className="relative z-50 flex h-9 shrink-0 items-center justify-between border-b border-white/5 bg-ink-950/60 backdrop-blur-xl"
    >
      <div data-tauri-drag-region className="flex items-center gap-2 pl-4 text-xs tracking-[0.25em] uppercase">
        <Crown size={14} className="pointer-events-none text-gold-400" />
        <span data-tauri-drag-region className="text-gold-gradient font-semibold">Imperator</span>
      </div>

      <div className="flex h-full">
        <WinButton label="Minimize" onClick={() => win.minimize()}>
          <Minus size={14} />
        </WinButton>
        <WinButton label={maximized ? "Restore" : "Maximize"} onClick={() => win.toggleMaximize()}>
          {maximized ? <Copy size={12} className="-scale-x-100" /> : <Square size={12} />}
        </WinButton>
        <WinButton label="Close" danger onClick={() => win.close()}>
          <X size={15} />
        </WinButton>
      </div>
    </header>
  );
}

function WinButton(props: { label: string; danger?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={props.label}
      title={props.label}
      onClick={props.onClick}
      className={`grid h-full w-12 place-items-center text-white/60 transition-colors hover:text-white ${
        props.danger ? "hover:bg-red-600" : "hover:bg-white/10"
      }`}
    >
      {props.children}
    </button>
  );
}
