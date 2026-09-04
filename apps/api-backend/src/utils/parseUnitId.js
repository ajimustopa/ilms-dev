/**
 * Helper to safely sanitize and parse school unit ID (satuan_pendidikan_id) from query params.
 * Returns valid positive integer, or null if 'all', '0', undefined, null, or empty string.
 */
function parseUnitId(unitId) {
  if (!unitId || unitId === 'all' || unitId === '0' || unitId === 'undefined' || unitId === 'null') {
    return null;
  }
  const parsed = parseInt(unitId, 10);
  return isNaN(parsed) || parsed <= 0 ? null : parsed;
}

module.exports = { parseUnitId };
