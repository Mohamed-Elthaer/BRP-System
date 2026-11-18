import { Truck } from "lucide-react";
import CrudPage from "../Components/ui/CrudPage.jsx";
import { Badge } from "../Components/ui/Display.jsx";
import { createSupplier, deleteSupplier, fetchSuppliers, updateSupplier } from "../Redux/Slices/suppliersSlice.js";
import usePermission from "../Hooks/usePermission.js";
import { PERM } from "../Utils/constants.js";

const thunks = { fetchAll: fetchSuppliers, createOne: createSupplier, updateOne: updateSupplier, removeOne: deleteSupplier };

const columns = [
  { key: "name", label: "Supplier", render: (s) => <span className="font-semibold">{s.name}</span> },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "address", label: "Address", className: "text-muted" },
  { key: "isActive", label: "Status", render: (s) => <Badge tone={s.isActive ? "success" : "neutral"}>{s.isActive ? "Active" : "Inactive"}</Badge> },
];

const fields = [
  { name: "name", label: "Name", required: true, full: true },
  { name: "phone", label: "Phone" },
  { name: "email", label: "Email", type: "email" },
  { name: "address", label: "Address", full: true },
  { name: "notes", label: "Notes", type: "textarea", full: true },
  { name: "isActive", label: "Active", type: "switch" },
];

export default function Suppliers() {
  const { can } = usePermission();
  return (
    <CrudPage
      title="Suppliers" subtitle="Who you buy from" entity="Supplier" sliceKey="supplier" thunks={thunks}
      columns={columns} fields={fields} canManage={can(PERM.INVENTORY_MANAGE)} emptyIcon={Truck}
      searchKeys={["name", "phone", "email"]} removeLabel="Deactivate"
      removeHint="Past purchases keep pointing to this supplier."
      toPayload={(f) => ({ name: f.name, phone: f.phone, email: f.email, address: f.address, notes: f.notes, isActive: f.isActive })}
    />
  );
}
