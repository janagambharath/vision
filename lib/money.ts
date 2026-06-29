export function formatMoney(paise: number | null | undefined, currency = "INR") {
  if (typeof paise !== "number") return "Verified price required";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(paise / 100);
}

export function sumPaise(values: Array<number | null | undefined>) {
  return values.reduce<number>((sum, value) => sum + (typeof value === "number" ? value : 0), 0);
}
