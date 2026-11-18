import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { UtensilsCrossed } from "lucide-react";
import CrudPage from "../Components/ui/CrudPage.jsx";
import { Badge } from "../Components/ui/Display.jsx";
import { Switch } from "../Components/ui/Fields.jsx";
import { fetchCategories } from "../Redux/Slices/categoriesSlice.js";
import { createMenuItem, deleteMenuItem, fetchMenu, toggleAvailability, updateMenuItem } from "../Redux/Slices/menuSlice.js";
import usePermission from "../Hooks/usePermission.js";
import useMoney from "../Hooks/useMoney.js";
import { PERM } from "../Utils/constants.js";


const thunks = { fetchAll: fetchMenu, createOne: createMenuItem, updateOne: updateMenuItem, removeOne: deleteMenuItem };

export default function MenuItems() {
  const dispatch = useDispatch();
  const { can } = usePermission();
  const fmt = useMoney();
  const categories = useSelector((s) => s.category.items);

  useEffect(() => { dispatch(fetchCategories()); }, [dispatch]);

  const columns = [
    {
      key: "name", label: "Dish",
      render: (m) => (
        <div className="flex items-center gap-3">
          {m.image?.url ? <img src={m.image.url} alt="" className="size-11 rounded-xl object-cover" /> : <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-brand"><UtensilsCrossed className="size-5" /></span>}
          <span className="font-semibold">{m.name}</span>
          
        </div>
      ),
    },
    { key: "category", label: "Category", render: (m) => m.category?.name || "—" },
    { key: "price", label: "Price", render: (m) => <span className="font-semibold text-brand">{fmt(m.price)}</span> },
    { key: "cost", label: "Cost / margin", render: (m) => (m.cost ? <span>{fmt(m.cost)} <Badge tone={m.margin >= 50 ? "success" : m.margin >= 25 ? "warn" : "danger"}>{m.margin}%</Badge></span> : <span className="text-xs text-muted">No recipe yet</span>) },
    {
      key: "isAvailable", label: "Available",
      render: (m, { reload, dispatch: d }) => (
        <Switch
          checked={m.isAvailable}
          onChange={async (v) => {
            try { await d(toggleAvailability({ id: m._id, isAvailable: v })).unwrap(); reload(); } catch (err) { toast.error(err); }
          }}
        />
      ),
    },
  ];

  const fields = [
    { name: "name", label: "Name", required: true },
    { name: "category", label: "Category", type: "select", required: true, options: categories.filter((c) => c.isActive).map((c) => ({ value: c._id, label: c.name })) },
    { name: "price", label: "Price", type: "number", required: true, min: 0 },
    { name: "sortOrder", label: "Sort order", type: "number" },
    { name: "description", label: "Description", type: "textarea", full: true },
    { name: "image", label: "Photo", type: "image", currentUrl: (m) => m?.image?.url||"" },
    { name: "isAvailable", label: "Available for ordering", type: "switch" },
  ];

  return (
    <CrudPage 
      title="Menu items" subtitle="Cost and margin update automatically from each recipe" entity="Dish" sliceKey="menu" thunks={thunks}
      columns={columns} fields={fields} canManage={can(PERM.MENU_MANAGE)} emptyIcon={UtensilsCrossed}
      searchKeys={["name", "description"]} removeLabel="Remove"
      removeHint="The dish disappears from the menu. Past orders and invoices keep their original data."
      toForm={(m) => ({ ...m, category: m.category?._id || "", image: null })}
      toPayload={(f) => ({
        name: f.name, description: f.description, category: f.category, price: Number(f.price),
        isAvailable: f.isAvailable, sortOrder: f.sortOrder === "" ? undefined : Number(f.sortOrder),
        image: f.image instanceof File ? f.image : undefined,
      })}
    />
  );
}
