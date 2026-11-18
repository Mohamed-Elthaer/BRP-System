import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Package } from "lucide-react";
import CrudPage from "../Components/ui/CrudPage.jsx";
import { Badge } from "../Components/ui/Display.jsx";
import { createIngredient, deleteIngredient, fetchIngredients, updateIngredient } from "../Redux/Slices/ingredientsSlice.js";
import { fetchSuppliers } from "../Redux/Slices/suppliersSlice.js";
import usePermission from "../Hooks/usePermission.js";
import useMoney from "../Hooks/useMoney.js";
import { INGREDIENT_UNITS, PERM } from "../Utils/constants.js";

const thunks = { fetchAll: fetchIngredients, createOne: createIngredient, updateOne: updateIngredient, removeOne: deleteIngredient };

export default function Ingredients() {
  const dispatch = useDispatch();
  const { can } = usePermission();
  const fmt = useMoney();
  const suppliers = useSelector((s) => s.supplier.items);

  useEffect(() => { dispatch(fetchSuppliers()); }, [dispatch]);

  const columns = [
    { key: "name", label: "Ingredient", render: (i) => <span className="font-semibold">{i.name}</span> },
    { key: "unit", label: "Unit" },
    { key: "costPerUnit", label: "Cost / unit", render: (i) => fmt(i.costPerUnit) },
    { key: "minStock", label: "Alert below" },
    { key: "supplier", label: "Supplier", render: (i) => i.supplier?.name || "—" },
    { key: "isActive", label: "Status", render: (i) => <Badge tone={i.isActive ? "success" : "neutral"}>{i.isActive ? "Active" : "Inactive"}</Badge> },
  ];

  const fields = [
    { name: "name", label: "Name", required: true, full: true },
    { name: "unit", label: "Unit", type: "select", required: true, options: INGREDIENT_UNITS, hint: "Recipes use the same unit" },
    { name: "costPerUnit", label: "Cost per unit", type: "number", min: 0, default: 0 },
    { name: "minStock", label: "Low-stock alert at", type: "number", min: 0, default: 0 },
    { name: "supplier", label: "Supplier", type: "select", options: suppliers.filter((s) => s.isActive).map((s) => ({ value: s._id, label: s.name })), placeholder: "No supplier" },
    { name: "isActive", label: "Active", type: "switch" },
  ];

  return (
    <CrudPage
      title="Ingredients" subtitle="Changing a cost updates every dish that uses it" entity="Ingredient" sliceKey="ingredient" thunks={thunks}
      columns={columns} fields={fields} canManage={can(PERM.INVENTORY_MANAGE)} emptyIcon={Package} removeLabel="Deactivate"
      removeHint="Ingredients used in recipes can't be removed. Stock history is always kept."
      toForm={(i) => ({ ...i, supplier: i.supplier?._id || "" })}
      toPayload={(f) => ({
        name: f.name, unit: f.unit, costPerUnit: Number(f.costPerUnit) || 0, minStock: Number(f.minStock) || 0,
        supplier: f.supplier || undefined, isActive: f.isActive,
      })}
    />
  );
}
