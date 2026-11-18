const roundTo = (n, d) => {
  const f = 10 ** d;
  return Math.round((Number(n) + Number.EPSILON) * f) / f;
};

export const round2 = (n) => roundTo(n, 2);
export const round3 = (n) => roundTo(n, 3);
export const round4 = (n) => roundTo(n, 4);