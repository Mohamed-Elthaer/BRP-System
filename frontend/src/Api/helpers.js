// الباك بيرجّع { status, data } فبنفك الغلاف هنا
export const unwrap = (res) => res.data.data;

// بيبني FormData (للصور والإيصالات). القيم الفاضية بتتتجاهل
export const toFormData = (obj = {}) => {
  const fd = new FormData();
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    if (Array.isArray(v)) v.forEach((x) => fd.append(k, x));
    else fd.append(k, v);
  });
  return fd;
};

export const params = (obj = {}) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== "" && v !== undefined && v !== null));
