/**
 * Helper untuk mengidentifikasi wewenang dan jabatan guru dari data Auth / JWT
 */

export function parseTeacherRoles(user) {
  if (!user) {
    return {
      isSuperAdmin: false,
      isAdminYayasan: false,
      isHomeroom: false,
      isCounselor: false,
      isCurriculum: false,
      isSubjectTeacher: false,
      primaryRoleName: 'Tamu',
      allowedRoles: [],
    };
  }

  // Kumpulkan roles dari berbagai format JWT/Auth context
  const rawRoles = [];
  if (Array.isArray(user.roles)) {
    rawRoles.push(...user.roles);
  }
  if (user.active_role) {
    rawRoles.push(user.active_role);
  }
  if (user.role) {
    rawRoles.push(user.role);
  }
  if (Array.isArray(user.school_units)) {
    user.school_units.forEach((unit) => {
      if (Array.isArray(unit.roles)) {
        rawRoles.push(...unit.roles);
      }
    });
  }

  const roleSet = new Set(rawRoles.map((r) => (typeof r === 'string' ? r.toLowerCase() : r?.name?.toLowerCase() || '')));

  const isSuperAdmin = roleSet.has('super_admin') || roleSet.has('superadmin');
  const isAdminYayasan = roleSet.has('admin_yayasan');
  const isCounselor = roleSet.has('guru_bk') || roleSet.has('bk') || roleSet.has('counselor') || isSuperAdmin;
  const isHomeroom = roleSet.has('wali_kelas') || roleSet.has('homeroom_teacher') || isSuperAdmin;
  const isCurriculum = roleSet.has('waka_kurikulum') || roleSet.has('kurikulum') || isSuperAdmin;
  const isSubjectTeacher = roleSet.has('guru') || roleSet.has('guru_mapel') || roleSet.has('teacher') || isHomeroom || isCounselor || isCurriculum;

  // Nama jabatan utama untuk tampilan badge
  let primaryRoleName = 'Guru';
  if (isSuperAdmin) primaryRoleName = 'Super Admin';
  else if (isAdminYayasan) primaryRoleName = 'Admin Yayasan';
  else if (isCurriculum) primaryRoleName = 'Waka Kurikulum';
  else if (isCounselor) primaryRoleName = 'Guru BK';
  else if (isHomeroom) primaryRoleName = 'Wali Kelas';
  else if (roleSet.has('pelatih_ekskul')) primaryRoleName = 'Pelatih Ekskul';

  return {
    isSuperAdmin,
    isAdminYayasan,
    isHomeroom,
    isCounselor,
    isCurriculum,
    isSubjectTeacher,
    primaryRoleName,
    allowedRoles: Array.from(roleSet),
  };
}
