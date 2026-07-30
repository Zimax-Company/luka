// Helpers for amount inputs. Because a native number input can't render
// thousands separators, amount fields are text/inputMode="decimal" and store a
// formatted string (e.g. "1,000,000.50"). Format on every keystroke with
// formatAmountInput and read the numeric value with parseAmount.

// Normalise raw input into a grouped, thousands-separated string while the user
// types. Keeps at most one dot and two decimal places.
export function formatAmountInput(raw: string): string {
  let s = String(raw ?? '').replace(/[^0-9.]/g, '');
  const dot = s.indexOf('.');
  if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '');
  let [i = '', d] = s.split('.');
  i = i.replace(/^0+(?=\d)/, '');
  const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return d !== undefined ? `${g || '0'}.${d.slice(0, 2)}` : g;
}

// Parse a formatted amount string (possibly containing commas) into a number.
export function parseAmount(v: string): number {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}
