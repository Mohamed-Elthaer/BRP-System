import { NavLink } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard, ShoppingCart, ClipboardList, Flame, UtensilsCrossed, Tags, BookOpen, Boxes, Package,
  Truck, Wallet, Receipt, CreditCard, Users, ScrollText, Settings, RefreshCw, LogOut, ChefHat, X, Sparkles,
} from "lucide-react";
import usePermission from "../../Hooks/usePermission.js";
import { PERM, ROLE_META } from "../../Utils/constants.js";
import { fullName, initials } from "../../Utils/format.js";
import { logoutUser } from "../../Redux/Slices/authSlice.js";
import { setSidebar } from "../../Redux/Slices/uiSlice.js";

const NAV = [
  { title: "Operations", items: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, perm: [PERM.DASHBOARD_VIEW] },
    { to: "/pos", label: "POS", icon: ShoppingCart, perm: [PERM.POS_USE] },
    { to: "/orders", label: "Orders", icon: ClipboardList, perm: [PERM.ORDERS_VIEW] },
    { to: "/kitchen", label: "Kitchen", icon: Flame, perm: [PERM.KITCHEN_VIEW] },
  ] },
  { title: "Menu", items: [
    { to: "/menu", label: "Menu items", icon: UtensilsCrossed, perm: [PERM.MENU_MANAGE] },
    { to: "/categories", label: "Categories", icon: Tags, perm: [PERM.MENU_MANAGE] },
    { to: "/recipes", label: "Recipes & costs", icon: BookOpen, perm: [PERM.MENU_MANAGE] },
  ] },
  { title: "Inventory", items: [
    { to: "/inventory", label: "Stock", icon: Boxes, perm: [PERM.INVENTORY_VIEW] },
    { to: "/ingredients", label: "Ingredients", icon: Package, perm: [PERM.INVENTORY_VIEW] },
    { to: "/suppliers", label: "Suppliers", icon: Truck, perm: [PERM.INVENTORY_VIEW] },
  ] },
  { title: "Finance", items: [
    { to: "/expenses", label: "Expenses", icon: Wallet, perm: [PERM.EXPENSES_MANAGE] },
    { to: "/invoices", label: "Invoices", icon: Receipt, perm: [PERM.ORDERS_VIEW] },
    { to: "/payments", label: "Payments", icon: CreditCard, perm: [PERM.ORDERS_VIEW] },
  ] },
  { title: "Admin", items: [
    { to: "/employees", label: "Employees", icon: Users, perm: [PERM.EMPLOYEES_MANAGE] },
    { to: "/activity", label: "Activity log", icon: ScrollText, perm: [PERM.LOGS_VIEW] },
    { to: "/sync", label: "Sync", icon: RefreshCw, perm: [PERM.POS_USE] },
    { to: "/ai-assistant", label: "AI Assistant", icon: Sparkles, perm: [PERM.AI_USE] },
    { to: "/settings", label: "Settings", icon: Settings, perm: [PERM.SETTINGS_MANAGE] },
  ] },
];

function Content({ onNavigate }) {
  const dispatch = useDispatch();
  const { can, user } = usePermission();
  const restaurant = useSelector((s) => s.settings.data?.restaurant);

  return (
    <div className="flex h-full flex-col border-r border-line bg-surface text-ink">
      <div className="flex items-center gap-3 border-b border-line/70 px-5 py-5">
        {restaurant?.logo?.url ? (
          <img src={restaurant.logo.url} alt="" className="size-10 rounded-xl object-cover" />
        ) : (
          <img src="./logo.png" alt="Mat3amy" className="h-11 w-auto max-w-[52px] object-contain" />
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-ink">{restaurant?.name && restaurant.name !== "My Restaurant" ? restaurant.name : "Mat3amy"}</p>
          <p className="text-xs font-medium text-muted">{ROLE_META[user?.role]?.label}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV.map((group) => {
          const items = group.items.filter((i) => can(...i.perm));
          if (!items.length) return null;
          return (
            <div key={group.title}>
              <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted/80">{group.title}</p>
              {items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `mb-0.5 flex items-center gap-3 rounded-xl border-l-4 px-3 py-2.5 text-sm font-semibold transition-colors ${
                      isActive
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-transparent text-muted hover:bg-primary-soft/60 hover:text-primary"
                    }`
                  }
                >
                  <Icon className="size-[18px]" />
                  {label}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-line p-3">
        <NavLink to="/profile" onClick={onNavigate} className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-primary-soft/60">
          {user?.avatar?.url ? (
            <img src={user.avatar.url} alt="" className="size-9 rounded-full object-cover" />
          ) : (
            <span className="grid size-9 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">{initials(user)}</span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink">{fullName(user)}</span>
            <span className="block truncate text-xs text-muted">{user?.email}</span>
          </span>
        </NavLink>
        <button onClick={() => dispatch(logoutUser())} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-brick-soft/60 hover:text-brick">
          <LogOut className="size-[18px]" /> Sign out
        </button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const dispatch = useDispatch();
  const open = useSelector((s) => s.ui.sidebarOpen);
  const close = () => dispatch(setSidebar(false));

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block"><Content /></aside>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/50" onClick={close} />
            <motion.aside className="relative h-full w-72 max-w-[85vw]" initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: "spring", damping: 30, stiffness: 320 }}>
              <button onClick={close} aria-label="Close menu" className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-muted hover:bg-primary-soft hover:text-primary"><X className="size-5" /></button>
              <Content onNavigate={close} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
