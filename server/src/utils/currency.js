export const toPaise = (rupees) => {
  if (typeof rupees !== "number" || isNaN(rupees)) return 0;
  return Math.round(rupees * 100);
};

export const toRupees = (paise) => {
  if (typeof paise !== "number" || isNaN(paise)) return 0;
  return Number((paise / 100).toFixed(2));
};

export const formatINR = (paise) => {
  const rupees = toRupees(paise);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
};

