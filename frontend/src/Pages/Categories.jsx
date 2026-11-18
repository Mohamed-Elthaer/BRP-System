import { Tags } from "lucide-react";
import CrudPage from "../Components/ui/CrudPage.jsx";
import { Badge } from "../Components/ui/Display.jsx";
import { createCategory, deleteCategory, fetchCategories, updateCategory } from "../Redux/Slices/categoriesSlice.js";
import usePermission from "../Hooks/usePermission.js";
import { PERM } from "../Utils/constants.js";

const thunks = { fetchAll: fetchCategories, createOne: createCategory, updateOne: updateCategory, removeOne: deleteCategory };

const columns = [
  { key: "name", label: "Name", render: (c) => <span className="font-semibold">{c.name}</span> },
  { key: "description", label: "Description", className: "text-muted" },
  { key: "sortOrder", label: "Order" },
  { key: "isActive", label: "Status", render: (c) => <Badge tone={c.isActive ? "success" : "neutral"}>{c.isActive ? "Active" : "Hidden"}</Badge> },
];

const fields = [
  { name: "name", label: "Name", required: true, full: true },
  { name: "description", label: "Description", type: "textarea", full: true },
  { name: "sortOrder", label: "Sort order", type: "number" },
  { name: "isActive", label: "Active", type: "switch" },
];

export default function Categories() {
  const { can } = usePermission();
  return (
    <CrudPage
      title="Categories" subtitle="Group your dishes so the POS is easy to scan" entity="Category" sliceKey="category" thunks={thunks}
      columns={columns} fields={fields} canManage={can(PERM.MENU_MANAGE)} emptyIcon={Tags}
      removeHint="Categories that still have menu items can't be deleted."
      toPayload={(f) => ({ name: f.name, description: f.description, sortOrder: f.sortOrder === "" ? undefined : Number(f.sortOrder), isActive: f.isActive })}
    />
  );
}
