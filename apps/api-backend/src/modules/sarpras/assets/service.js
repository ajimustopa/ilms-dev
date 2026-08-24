/**
 * Assets Service Implementation
 * Modul Sarpras: Inventaris (Assets, Mutations, QR Code)
 */
const db = require('../../../config/db/sarpras');
const { validateUser } = require('../utils/crossModuleHelper');

class AssetsService {
  async listAssets(schoolUnitId, query = {}) {
    let q = db('assets')
      .leftJoin('facility_rooms', 'assets.facility_room_id', 'facility_rooms.id')
      .leftJoin('facility_buildings', 'facility_rooms.facility_building_id', 'facility_buildings.id')
      .where('assets.school_unit_id', schoolUnitId)
      .select(
        'assets.*',
        'facility_rooms.room_code',
        'facility_rooms.room_name',
        'facility_buildings.name as building_name'
      );

    if (query.category) {
      q = q.where('assets.category', query.category);
    }
    if (query.condition) {
      q = q.where('assets.condition', query.condition);
    }
    if (query.status) {
      q = q.where('assets.status', query.status);
    }
    if (query.room_id) {
      q = q.where('assets.facility_room_id', query.room_id);
    }
    if (query.search) {
      const s = `%${query.search.trim()}%`;
      q = q.where(b => b.where('assets.name', 'like', s).orWhere('assets.asset_code', 'like', s));
    }

    return q.orderBy('assets.id', 'desc');
  }

  async getAssetById(schoolUnitId, id) {
    const asset = await db('assets')
      .leftJoin('facility_rooms', 'assets.facility_room_id', 'facility_rooms.id')
      .leftJoin('facility_buildings', 'facility_rooms.facility_building_id', 'facility_buildings.id')
      .where('assets.id', id)
      .where('assets.school_unit_id', schoolUnitId)
      .select(
        'assets.*',
        'facility_rooms.room_code',
        'facility_rooms.room_name',
        'facility_buildings.name as building_name'
      )
      .first();

    if (!asset) {
      const err = new Error('Aset tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }
    return asset;
  }

  async createAsset(schoolUnitId, payload) {
    // Validasi kode aset unik
    const existing = await db('assets').where({ asset_code: payload.asset_code }).first();
    if (existing) {
      const err = new Error(`Kode aset '${payload.asset_code}' sudah terdaftar`);
      err.statusCode = 409;
      throw err;
    }

    // Default QR code jika tidak ada
    const qrCode = payload.qr_code || `QR-${payload.asset_code}`;

    const [id] = await db('assets').insert({
      school_unit_id: schoolUnitId,
      facility_room_id: payload.facility_room_id || null,
      asset_code: payload.asset_code,
      name: payload.name,
      category: payload.category || null,
      acquisition_value: payload.acquisition_value || null,
      acquisition_date: payload.acquisition_date || null,
      condition: payload.condition || 'baik',
      qr_code: qrCode,
      status: payload.status || 'active',
      created_at: new Date(),
      updated_at: new Date()
    });

    return this.getAssetById(schoolUnitId, id);
  }

  async updateAsset(schoolUnitId, id, payload) {
    await this.getAssetById(schoolUnitId, id);
    const updateData = { ...payload, updated_at: new Date() };
    delete updateData.id;
    delete updateData.school_unit_id;

    await db('assets').where({ id, school_unit_id: schoolUnitId }).update(updateData);
    return this.getAssetById(schoolUnitId, id);
  }

  async deleteAsset(schoolUnitId, id) {
    await this.getAssetById(schoolUnitId, id);
    // Soft dispose atau delete fisik
    await db('assets').where({ id, school_unit_id: schoolUnitId }).update({
      status: 'disposed',
      updated_at: new Date()
    });
    return { message: 'Aset berhasil dihapus (status: disposed)' };
  }

  async mutateAssetLocation(schoolUnitId, id, payload, mutatedByUserId) {
    const asset = await this.getAssetById(schoolUnitId, id);

    // Validasi ruangan tujuan
    const toRoom = await db('facility_rooms').where({ id: payload.to_room_id, school_unit_id: schoolUnitId }).first();
    if (!toRoom) {
      const err = new Error('Ruangan tujuan (to_room_id) tidak valid');
      err.statusCode = 400;
      throw err;
    }

    // Validasi user mutasi di Core Service
    await validateUser(mutatedByUserId);

    return db.transaction(async (trx) => {
      // 1. Insert ke asset_mutations (append-only)
      const [mutationId] = await trx('asset_mutations').insert({
        asset_id: id,
        from_room_id: asset.facility_room_id || null,
        to_room_id: payload.to_room_id,
        mutated_by: mutatedByUserId,
        reason: payload.reason || null,
        mutated_at: new Date()
      });

      // 2. Update facility_room_id di assets
      await trx('assets').where({ id, school_unit_id: schoolUnitId }).update({
        facility_room_id: payload.to_room_id,
        updated_at: new Date()
      });

      const updatedAsset = await trx('assets')
        .leftJoin('facility_rooms', 'assets.facility_room_id', 'facility_rooms.id')
        .where('assets.id', id)
        .select('assets.*', 'facility_rooms.room_name')
        .first();

      return {
        mutation_id: mutationId,
        asset: updatedAsset,
        message: 'Mutasi lokasi aset berhasil dicatat'
      };
    });
  }

  async listAssetMutations(schoolUnitId, id) {
    await this.getAssetById(schoolUnitId, id);
    return db('asset_mutations')
      .leftJoin('facility_rooms as from_room', 'asset_mutations.from_room_id', 'from_room.id')
      .join('facility_rooms as to_room', 'asset_mutations.to_room_id', 'to_room.id')
      .where('asset_mutations.asset_id', id)
      .select(
        'asset_mutations.*',
        'from_room.room_name as from_room_name',
        'to_room.room_name as to_room_name'
      )
      .orderBy('asset_mutations.id', 'desc');
  }

  async generateQrCode(schoolUnitId, id) {
    const asset = await this.getAssetById(schoolUnitId, id);
    const qrCode = `QR-${asset.asset_code}`;
    await db('assets').where({ id, school_unit_id: schoolUnitId }).update({
      qr_code: qrCode,
      updated_at: new Date()
    });
    return { asset_id: id, asset_code: asset.asset_code, qr_code: qrCode };
  }

  async getQrCode(schoolUnitId, id) {
    const asset = await this.getAssetById(schoolUnitId, id);
    return {
      asset_id: id,
      asset_code: asset.asset_code,
      name: asset.name,
      qr_code: asset.qr_code || `QR-${asset.asset_code}`
    };
  }

  async scanLookupAsset(schoolUnitId, payload) {
    let q = db('assets')
      .leftJoin('facility_rooms', 'assets.facility_room_id', 'facility_rooms.id')
      .leftJoin('facility_buildings', 'facility_rooms.facility_building_id', 'facility_buildings.id')
      .where('assets.school_unit_id', schoolUnitId);

    if (payload.qr_code) {
      q = q.where('assets.qr_code', payload.qr_code);
    } else if (payload.asset_code) {
      q = q.where('assets.asset_code', payload.asset_code);
    }

    const asset = await q.select(
      'assets.*',
      'facility_rooms.room_code',
      'facility_rooms.room_name',
      'facility_buildings.name as building_name'
    ).first();

    if (!asset) {
      const err = new Error('Aset dengan barcode/QR tersebut tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }
    return asset;
  }
}

module.exports = new AssetsService();
