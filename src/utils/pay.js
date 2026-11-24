// Korean minimum wage (won per hour), by year. The government announces next year's rate every August.
// Every January: add the new year here AND in public/script.js (MIN_WAGE_BY_YEAR), then deploy.
// MIN_WAGE in the environment overrides the table (emergency fix without a code change).
export const MIN_WAGE_BY_YEAR = { 2025: 10030, 2026: 10320 };

const koreaYear = (now = new Date()) => new Date(now.getTime() + 9 * 3600 * 1000).getUTCFullYear();

// the rate for the current year in Korea; if the year isn't in the table yet, the latest known rate
export function minWage(now = new Date()) {
  if (process.env.MIN_WAGE) return Number(process.env.MIN_WAGE);
  const y = koreaYear(now);
  if (MIN_WAGE_BY_YEAR[y]) return MIN_WAGE_BY_YEAR[y];
  const known = Object.keys(MIN_WAGE_BY_YEAR).map(Number).filter(k => k <= y);
  return MIN_WAGE_BY_YEAR[known.length ? Math.max(...known) : Math.min(...Object.keys(MIN_WAGE_BY_YEAR).map(Number))];
}

// "" when this year's rate is in the table (or MIN_WAGE is set), otherwise a warning for the logs
export function minWageWarning(now = new Date()) {
  if (process.env.MIN_WAGE) return "";
  const y = koreaYear(now);
  return MIN_WAGE_BY_YEAR[y] ? "" : `The ${y} minimum wage is missing from src/utils/pay.js; using ₩${minWage(now)}/hour. Add it (and in public/script.js) or set MIN_WAGE.`;
}
