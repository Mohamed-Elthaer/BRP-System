import { useDispatch, useSelector } from "react-redux";
import { Moon, Sun } from "lucide-react";
import { toggleTheme } from "../../Redux/Slices/uiSlice.js";

export default function ThemeToggle({ className = "" }) {
  const dispatch = useDispatch();
  const theme = useSelector((s) => s.ui.theme);
  return (
    <button
      onClick={() => dispatch(toggleTheme())}
      aria-label="Toggle theme"
      className={`grid size-10 place-items-center rounded-xl border border-line bg-surface text-ink transition hover:bg-primary-soft ${className}`}
    >
      {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}
