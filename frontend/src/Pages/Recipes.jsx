import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { clearCurrent, fetchRecipe, fetchRecipes, removeRecipe, saveRecipe } from "../Redux/Slices/recipesSlice.js";
import { fetchIngredients } from "../Redux/Slices/ingredientsSlice.js";
import { num } from "../Utils/format.js";
import useMoney from "../Hooks/useMoney.js";
import Button from "../Components/ui/Button.jsx";
import { ConfirmDialog } from "../Components/ui/Modal.jsx";
import { Input, SearchInput, Select, Textarea } from "../Components/ui/Fields.jsx";
import { Badge, Card, EmptyState, PageHeader, Spinner } from "../Components/ui/Display.jsx";

export default function Recipes() {
  const dispatch = useDispatch();
  const fmt = useMoney();
  const { list, current, currentLoading, loading } = useSelector((s) => s.recipes);
  const ingredients = useSelector((s) => s.ingredient.items).filter((i) => i.isActive);
  const [selected, setSelected] = useState(null); // menu item من القائمة
  const [rows, setRows] = useState([]);
  const [notes, setNotes] = useState("");
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => { dispatch(fetchRecipes()); dispatch(fetchIngredients()); }, [dispatch]);

  const pick = (m) => { setSelected(m); setRows([]); setNotes(""); dispatch(m.hasRecipe ? fetchRecipe(m._id) : clearCurrent()); };

  useEffect(() => {
    if (selected && current && current.menuItem._id === selected._id) {
      setRows(current.items.map((i) => ({ ingredient: i.ingredient, quantity: String(i.quantity) })));
      setNotes(current.notes || "");
    }
  }, [current, selected]);

  const byId = useMemo(() => new Map(ingredients.map((i) => [i._id, i])), [ingredients]);
  const lines = rows.map((r) => ({ ...r, ing: byId.get(r.ingredient), cost: (byId.get(r.ingredient)?.costPerUnit || 0) * (Number(r.quantity) || 0) }));
  const totalCost = lines.reduce((s, l) => s + l.cost, 0);
  const price = selected?.price || 0;
  const profit = price - totalCost;
  const margin = price ? (profit / price) * 100 : 0;

  const setRow = (i, patch) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const save = async () => {
    const items = rows.filter((r) => r.ingredient && Number(r.quantity) > 0).map((r) => ({ ingredient: r.ingredient, quantity: Number(r.quantity) }));
    if (!items.length) return toast.error("Add at least one ingredient with a quantity");
    setSaving(true);
    try {
      await dispatch(saveRecipe({ menuItemId: selected._id, data: { items, notes } })).unwrap();
      toast.success("Recipe saved. Cost updated");
      const fresh = await dispatch(fetchRecipes()).unwrap();
      setSelected(fresh.find((m) => m._id === selected._id) || selected);
    } catch (err) { toast.error(err); }
    setSaving(false);
  };

  const remove = async () => {
    setSaving(true);
    try {
      await dispatch(removeRecipe(selected._id)).unwrap();
      toast.success("Recipe deleted");
      setConfirm(false); setSelected(null); setRows([]); dispatch(clearCurrent()); dispatch(fetchRecipes());
    } catch (err) { toast.error(err); }
    setSaving(false);
  };

  const filtered = list.filter((m) => m.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader title="Recipes & costs" subtitle="Each dish's ingredients drive its cost, margin and automatic stock deduction" />
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Card className="p-3">
          <SearchInput value={q} onChange={setQ} placeholder="Find a dish" className="mb-3" />
          <div className="max-h-[70dvh] space-y-1 overflow-y-auto">
            {loading && !list.length && <div className="grid place-items-center py-8"><Spinner /></div>}
            {filtered.map((m) => (
              <button key={m._id} onClick={() => pick(m)} className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition ${selected?._id === m._id ? "bg-saffron-soft" : "hover:bg-primary-soft"}`}>
                <span className="min-w-0"><span className="block truncate text-sm font-semibold">{m.name}</span><span className="text-xs text-muted">{fmt(m.price)}</span></span>
                {m.hasRecipe ? <Badge tone={m.margin >= 50 ? "success" : m.margin >= 25 ? "warn" : "danger"}>{m.margin}%</Badge> : <Badge>No recipe</Badge>}
              </button>
            ))}
          </div>
        </Card>

        {!selected ? (
          <Card><EmptyState icon={BookOpen} title="Pick a dish" hint="Choose a dish on the left to build or edit its recipe." /></Card>
        ) : (
          <Card className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-extrabold">{selected.name}</h2>
              {selected.hasRecipe && <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setConfirm(true)}>Delete recipe</Button>}
            </div>
            {currentLoading ? <div className="grid place-items-center py-10"><Spinner /></div> : (
              <>
                <div className="space-y-2">
                  {lines.map((l, i) => (
                    <div key={i} className="grid grid-cols-[1fr_110px_90px_36px] items-end gap-2">
                      <Select label={i === 0 ? "Ingredient" : undefined} value={l.ingredient} onChange={(e) => setRow(i, { ingredient: e.target.value })} placeholder="Select…" options={ingredients.map((x) => ({ value: x._id, label: x.name }))} />
                      <Input label={i === 0 ? `Quantity${l.ing ? ` (${l.ing.unit})` : ""}` : undefined} type="number" min={0} step="any" value={l.quantity} onChange={(e) => setRow(i, { quantity: e.target.value })} placeholder={l.ing?.unit} />
                      <p className="pb-2 text-right text-sm font-semibold">{fmt(l.cost)}</p>
                      <button onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))} aria-label="Remove" className="mb-1 grid size-9 place-items-center rounded-lg text-muted hover:bg-brick-soft hover:text-brick"><Trash2 className="size-4" /></button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" icon={Plus} onClick={() => setRows((rs) => [...rs, { ingredient: "", quantity: "" }])}>Add ingredient</Button>
                </div>
                <Textarea label="Preparation notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
                <div className="grid grid-cols-3 gap-3 rounded-2xl bg-bg p-4 text-center">
                  <div><p className="text-xs text-muted">Cost</p><p className="text-lg font-extrabold">{fmt(totalCost)}</p></div>
                  <div><p className="text-xs text-muted">Profit</p><p className={`text-lg font-extrabold ${profit < 0 ? "text-brick" : "text-brand"}`}>{fmt(profit)}</p></div>
                  <div><p className="text-xs text-muted">Margin</p><p className={`text-lg font-extrabold ${margin < 25 ? "text-brick" : "text-brand"}`}>{num(margin, 1)}%</p></div>
                </div>
                <Button loading={saving} onClick={save}>Save recipe</Button>
              </>
            )}
          </Card>
        )}
      </div>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={remove} danger loading={saving} title="Delete this recipe?" confirmLabel="Delete"
        message="The dish will stop deducting stock and its cost resets to zero." />
    </>
  );
}
