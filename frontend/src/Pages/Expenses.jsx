import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { FileText, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import {
  createExpense,
  deleteExpense,
  fetchExpenses,
  fetchExpenseSummary,
  removeExpenseReceipt,
  updateExpense,
} from "../Redux/Slices/expensesSlice.js";
import { daysAgoISO, dOnly, fullName, toInputDate } from "../Utils/format.js";
import useMoney from "../Hooks/useMoney.js";
import useDebounce from "../Hooks/useDebounce.js";
import Button from "../Components/ui/Button.jsx";
import Modal, { ConfirmDialog } from "../Components/ui/Modal.jsx";
import DataTable, { Pagination } from "../Components/ui/DataTable.jsx";
import {
  Badge,
  Card,
  PageHeader,
  StatCard,
} from "../Components/ui/Display.jsx";
import {
  Input,
  SearchInput,
  Select,
  Textarea,
} from "../Components/ui/Fields.jsx";

const COLORS = [
  "#2F6B4F",
  "#3A8260",
  "#7FB394",
  "#B5412F",
  "#8C7B5B",
  "#4E8E73",
];
const empty = {
  amount: "",
  category: "",
  description: "",
  date: toInputDate(new Date()),
  files: [],
};

export default function Expenses() {
  const dispatch = useDispatch();
  const fmt = useMoney();
  const categories = useSelector(
    (s) => s.settings.data?.expenseCategories || [],
  );
  const { items, meta, extra, loading } = useSelector((s) => s.expenses);
  const summary = useSelector((s) => s.expenseSummary.data);
  const [range, setRange] = useState({
    from: toInputDate(daysAgoISO(30)),
    to: toInputDate(new Date()),
  });
  const [f, setF] = useState({ category: "", search: "" });
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // null | "new" | expense
  const [form, setForm] = useState(empty);
  const [toDelete, setToDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const search = useDebounce(f.search);

  const reload = () => {
    dispatch(
      fetchExpenses({
        page,
        limit: 15,
        category: f.category,
        search,
        ...range,
      }),
    );
    dispatch(fetchExpenseSummary(range));
  };
  useEffect(() => {
    reload();
  }, [page, f.category, search, range.from, range.to]); // eslint-disable-line react-hooks/exhaustive-deps

  const openNew = () => {
    setForm({ ...empty, category: categories[0] || "" });
    setEditing("new");
  };
  const openEdit = (e) => {
    setForm({
      amount: String(e.amount),
      category: e.category,
      description: e.description || "",
      date: toInputDate(e.date),
      files: [],
    });
    setEditing(e);
  };

  const save = async () => {
    if (!(Number(form.amount) > 0) || !form.category)
      return toast.error("Amount and category are required");
    setSaving(true);
    const data = {
      amount: Number(form.amount),
      category: form.category,
      description: form.description,
      date: form.date,
      receipts: form.files,
    };
    try {
      if (editing === "new") await dispatch(createExpense(data)).unwrap();
      else await dispatch(updateExpense({ id: editing._id, data })).unwrap();
      toast.success("Expense saved");
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(err);
    }
    setSaving(false);
  };

  const dropReceipt = async (publicId) => {
    try {
      await dispatch(
        removeExpenseReceipt({ id: editing._id, publicId }),
      ).unwrap();
      toast.success("Receipt removed");
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(err);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await dispatch(deleteExpense(toDelete._id)).unwrap();
      toast.success("Expense deleted");
      setToDelete(null);
      reload();
    } catch (err) {
      toast.error(err);
    }
    setSaving(false);
  };

  const columns = [
    { key: "date", label: "Date", render: (e) => dOnly(e.date) },
    {
      key: "category",
      label: "Category",
      render: (e) => <Badge className="capitalize">{e.category}</Badge>,
    },
    {
      key: "description",
      label: "Description",
      className: "max-w-[260px] truncate text-muted",
    },
    {
      key: "amount",
      label: "Amount",
      render: (e) => <span className="font-semibold">{fmt(e.amount)}</span>,
    },
    {
      key: "receipts",
      label: "Receipts",
      render: (e) =>
        e.receipts.length ? (
          <span className="inline-flex items-center gap-1 text-brand">
            <FileText className="size-4" />
            {e.receipts.length}
          </span>
        ) : (
          "—"
        ),
    },
    {
      key: "createdBy",
      label: "By",
      render: (e) => fullName(e.createdBy) || "—",
    },
    {
      key: "_a",
      label: "",
      align: "right",
      render: (e) => (
        <div className="flex justify-end gap-1">
          <button
            onClick={() => openEdit(e)}
            aria-label="Edit"
            className="rounded-lg p-2 text-muted hover:bg-primary-soft hover:text-brand"
          >
            <Pencil className="size-4" />
          </button>
          <button
            onClick={() => setToDelete(e)}
            aria-label="Delete"
            className="rounded-lg p-2 text-muted hover:bg-brick-soft hover:text-brick"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle="Everything you spend, with receipts"
        actions={
          <Button icon={Plus} onClick={openNew}>
            Add expense
          </Button>
        }
      />
      <div className="mb-4 grid max-w-md grid-cols-2 gap-3">
        <Input
          type="date"
          label="From"
          value={range.from}
          onChange={(e) => {
            setRange({ ...range, from: e.target.value });
            setPage(1);
          }}
        />
        <Input
          type="date"
          label="To"
          value={range.to}
          onChange={(e) => {
            setRange({ ...range, to: e.target.value });
            setPage(1);
          }}
        />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-[260px_1fr]">
        <StatCard
          icon={Wallet}
          label="Total in period"
          value={fmt(summary?.total || 0)}
          accent="primary"
        />
        <Card className="flex flex-wrap items-center gap-4">
          {summary?.byCategory?.length ? (
            <>
              <div className="h-36 w-36">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={summary.byCategory}
                      dataKey="total"
                      nameKey="category"
                      innerRadius={38}
                      outerRadius={64}
                      paddingAngle={2}
                    >
                      {summary.byCategory.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => fmt(v)}
                      contentStyle={{
                        background: "var(--c-surface)",
                        border: "1px solid var(--c-line)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="grid flex-1 gap-1.5 text-sm sm:grid-cols-2">
                {summary.byCategory.map((c, i) => (
                  <li key={c.category} className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
                    <span className="capitalize">{c.category}</span>
                    <span className="ml-auto font-semibold">
                      {fmt(c.total)} · {c.percent}%
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted">No expenses in this period</p>
          )}
        </Card>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_200px]">
        <SearchInput
          value={f.search}
          onChange={(v) => {
            setF({ ...f, search: v });
            setPage(1);
          }}
          placeholder="Search descriptions"
        />
        <Select
          value={f.category}
          onChange={(e) => {
            setF({ ...f, category: e.target.value });
            setPage(1);
          }}
          placeholder="All categories"
          options={categories}
        />
      </div>
      <DataTable
        columns={columns}
        rows={items}
        loading={loading}
        empty="No expenses found"
        emptyIcon={Wallet}
      />
      <div className="mt-3 flex items-center justify-between">
        <Pagination meta={meta} onChange={setPage} />
        <p className="ml-auto text-sm text-muted">
          Filtered total:{" "}
          <b className="text-ink">{fmt(extra.totalAmount || 0)}</b>
        </p>
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Add expense" : "Edit expense"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={save}>
              Save
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Amount"
            type="number"
            min={0}
            step="any"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <Select
            label="Category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            options={categories}
            placeholder="Select…"
          />
          <Input
            wrapperClass="sm:col-span-2"
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <Textarea
            wrapperClass="sm:col-span-2"
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          {editing && editing !== "new" && editing.receipts.length > 0 && (
            <div className="sm:col-span-2">
              <p className="mb-1.5 text-xs font-semibold text-muted">
                Attached receipts
              </p>
              {editing.receipts.map((r) => (
                <div
                  key={r.public_id}
                  className="flex items-center justify-between border-b border-line py-1.5 text-sm"
                >
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-brand hover:underline"
                  >
                    <FileText className="size-4" />
                    {r.resourceType === "image" ? "Image" : "Document"}
                  </a>
                  <button
                    onClick={() => dropReceipt(r.public_id)}
                    className="text-xs font-semibold text-brick"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold text-muted">
              Add receipts (JPG, PNG, WEBP or PDF, up to 5)
            </span>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) =>
                setForm({ ...form, files: [...e.target.files].slice(0, 5) })
              }
              className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:font-semibold file:text-brand"
            />
          </label>
        </div>
      </Modal>
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        danger
        loading={saving}
        title="Delete this expense?"
        confirmLabel="Delete"
        message="A copy is kept in the activity log."
      />
    </>
  );
}
