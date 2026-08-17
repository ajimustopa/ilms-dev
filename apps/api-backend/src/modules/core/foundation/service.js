/**
 * Foundation Service Implementation
 * Fitur #6: Profil Yayasan (Singleton)
 */
const db = require('../../../config/db/core');

class FoundationService {
  /**
   * Mengambil data profil Yayasan (singleton)
   */
  async getProfile() {
    let profile = await db('foundation_profiles').first();

    // Jika belum ada data profil, buat record default
    if (!profile) {
      const [id] = await db('foundation_profiles').insert({
        name: 'Yayasan Pendidikan Al-Depok',
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
      profile = await db('foundation_profiles').where({ id }).first();
    }

    return profile;
  }

  /**
   * Memperbarui data profil Yayasan dan mencatat audit log admin
   */
  async updateProfile(payload, adminUser, ipAddress) {
    // 1. Validasi field wajib
    if (!payload.name || typeof payload.name !== 'string' || !payload.name.trim()) {
      const error = new Error("Field 'name' (Nama Yayasan) wajib diisi");
      error.statusCode = 422;
      throw error;
    }

    // 2. Ambil profil saat ini untuk snapshot data_before
    let currentProfile = await db('foundation_profiles').first();
    let profileId;

    if (!currentProfile) {
      const [id] = await db('foundation_profiles').insert({
        name: payload.name.trim(),
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
      profileId = id;
      currentProfile = null;
    } else {
      profileId = currentProfile.id;
    }

    // 3. Siapkan data pembaruan
    const updateData = {
      name: payload.name.trim(),
      address: payload.address !== undefined ? payload.address : (currentProfile?.address || null),
      phone_number: payload.phone_number !== undefined ? payload.phone_number : (currentProfile?.phone_number || null),
      email: payload.email !== undefined ? payload.email : (currentProfile?.email || null),
      chairman_name: payload.chairman_name !== undefined ? payload.chairman_name : (currentProfile?.chairman_name || null),
      logo: payload.logo !== undefined ? payload.logo : (currentProfile?.logo || null),
      updated_at: db.fn.now()
    };

    // 4. Update data di database
    await db('foundation_profiles').where({ id: profileId }).update(updateData);

    const updatedProfile = await db('foundation_profiles').where({ id: profileId }).first();

    // 5. Catat ke activity_logs dengan log_type='admin_action'
    await db('activity_logs').insert({
      log_type: 'admin_action',
      user_id: adminUser?.id || null,
      school_unit_id: null, // Level Yayasan
      application: 'core',
      module: 'foundation',
      action: 'update',
      ip_address: ipAddress || null,
      data_before: currentProfile ? JSON.stringify(currentProfile) : null,
      data_after: JSON.stringify(updatedProfile),
      occurred_at: db.fn.now()
    });

    return updatedProfile;
  }
}

module.exports = new FoundationService();
