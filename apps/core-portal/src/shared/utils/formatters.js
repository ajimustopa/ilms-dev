/**
 * Standard Number, Currency, and Percentage Formatters for Aldepos Core Portal
 */

/**
 * Format numeric value to Indonesian Rupiah (IDR) currency string
 * @param {number|string} val 
 * @returns {string} e.g. "Rp 1.500.000"
 */
export function formatCurrency(val) {
  const num = parseFloat(val || 0);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(num);
}

/**
 * Format numeric value to standard Indonesian thousands-separated integer/decimal string
 * @param {number|string} val 
 * @returns {string} e.g. "1.250"
 */
export function formatNumber(val) {
  const num = parseFloat(val || 0);
  return new Intl.NumberFormat('id-ID').format(num);
}

/**
 * Format numeric value to percentage string
 * @param {number|string} val 
 * @param {number} decimals 
 * @returns {string} e.g. "85%" or "85.5%"
 */
export function formatPercentage(val, decimals = 0) {
  const num = parseFloat(val || 0);
  return `${num.toFixed(decimals)}%`;
}

/**
 * Format date value to standard Indonesian DD/MM/YYYY string
 * @param {string|Date} dateInput 
 * @returns {string} e.g. "17/08/2026"
 */
export function formatDate(dateInput) {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

