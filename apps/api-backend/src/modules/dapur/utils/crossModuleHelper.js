/**
 * Cross-Module Context & Tenant Helper for Dapur
 */
function getSchoolUnitId(req) {
  if (req.query && req.query.satuan_pendidikan_id) {
    return Number(req.query.satuan_pendidikan_id);
  }
  if (req.user && req.user.school_unit_id) {
    return Number(req.user.school_unit_id);
  }
  if (req.user && req.user.satuan_pendidikan_id) {
    return Number(req.user.satuan_pendidikan_id);
  }
  return null;
}

module.exports = {
  getSchoolUnitId,
};
