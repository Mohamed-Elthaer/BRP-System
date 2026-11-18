import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Menu, RefreshCw, WifiOff } from "lucide-react";
import ThemeToggle from "./ThemeToggle.jsx";
import useOnlineStatus from "../../Hooks/useOnlineStatus.js";
import { setSidebar } from "../../Redux/Slices/uiSlice.js";

export default function Topbar() {
  const dispatch = useDispatch();
  const online = useOnlineStatus();
  const pending = useSelector((s) => s.sync.queue.length);
  const syncing = useSelector((s) => s.sync.syncing);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur sm:px-6">
      <button onClick={() => dispatch(setSidebar(true))} aria-label="Open menu" className="grid size-10 place-items-center rounded-xl border border-line bg-surface lg:hidden">
        <Menu className="size-5" />
      </button>
      <div className="flex-1" />

      {!online && (
        <span className="flex items-center gap-1.5 rounded-full bg-brick-soft px-3 py-1.5 text-xs font-bold text-brick">
          <WifiOff className="size-3.5" /> Offline
        </span>
      )}
      {(pending > 0 || syncing) && (
        <Link to="/sync" className="flex items-center gap-1.5 rounded-full bg-saffron-soft px-3 py-1.5 text-xs font-bold text-saffron">
          <RefreshCw className={`size-3.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing…" : `${pending} pending`}
        </Link>
      )}
      <ThemeToggle />
    </header>
  );
}
