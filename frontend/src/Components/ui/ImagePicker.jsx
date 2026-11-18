import { useEffect, useMemo, useRef } from "react";
import { ImagePlus } from "lucide-react";

export default function ImagePicker({ label, file, currentUrl, onChange }) {
  const ref = useRef(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : currentUrl), [file, currentUrl]);
  useEffect(() => () => file && preview && URL.revokeObjectURL(preview), [file, preview]);

  return (
    <div>
      {label && <span className="mb-1.5 block text-xs font-semibold text-muted">{label}</span>}
      <button type="button" onClick={() => ref.current?.click()} className="group relative grid h-28 w-28 place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-line bg-bg transition hover:border-primary">
        {preview ? <img src={preview} alt="" className="size-full object-cover" /> : <ImagePlus className="size-6 text-muted group-hover:text-brand" />}
      </button>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => onChange(e.target.files?.[0] || null)} />
    </div>
  );
}
