export const MIN_WAGE = Number(process.env.MIN_WAGE || 10320);

export function hourlyEquivalent({ payType, pay, payHours }) {
  if (payType === "daily")   return pay / (payHours || 8);
  if (payType === "monthly") return pay / (payHours || 209);
  return pay;
}