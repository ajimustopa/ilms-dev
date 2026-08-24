/**
 * Seed: Initial Dapur Module Data
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // Disable FK checks to safely truncate / re-seed
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0');

  await knex('kitchen_staff_assignments').truncate();
  await knex('kitchen_recipe_ingredients').truncate();
  await knex('kitchen_recipes').truncate();
  await knex('kitchen_menu_items').truncate();
  await knex('kitchen_menus').truncate();
  await knex('kitchen_student_groups').truncate();
  await knex('kitchen_suppliers').truncate();
  await knex('kitchen_ingredient_allergens').truncate();
  await knex('kitchen_ingredients').truncate();
  await knex('kitchen_unit_conversions').truncate();
  await knex('kitchen_units').truncate();
  await knex('kitchen_master_data').truncate();

  await knex.raw('SET FOREIGN_KEY_CHECKS = 1');

  // 1. Master Data: Kategori Bahan
  const [catSayur, catProtein, catBumbu] = await knex('kitchen_master_data').insert([
    {
      master_type: 'ingredient_category',
      code: 'CAT-SAYUR',
      name: 'Sayuran',
      category: 'Bahan Segar',
      status: 'active',
      description: 'Aneka sayur-mayur segar harian',
    },
    {
      master_type: 'ingredient_category',
      code: 'CAT-PROTEIN',
      name: 'Protein',
      category: 'Bahan Segar/Beku',
      status: 'active',
      description: 'Daging ayam, sapi, ikan, telur, tahu, tempe',
    },
    {
      master_type: 'ingredient_category',
      code: 'CAT-BUMBU',
      name: 'Bumbu & Rempah',
      category: 'Bahan Kering',
      status: 'active',
      description: 'Garam, gula, rempah-rempah dapur',
    },
  ]);

  // 2. Units: 5 Satuan
  const [unitKg, unitGram, unitLiter, unitMl, unitPcs] = await knex('kitchen_units').insert([
    { code: 'kg', name: 'Kilogram', unit_type: 'weight', status: 'active' },
    { code: 'gram', name: 'Gram', unit_type: 'weight', status: 'active' },
    { code: 'liter', name: 'Liter', unit_type: 'volume', status: 'active' },
    { code: 'ml', name: 'Mililiter', unit_type: 'volume', status: 'active' },
    { code: 'pcs', name: 'Pieces/Buah', unit_type: 'count', status: 'active' },
  ]);

  // 3. Unit Conversions: 2 konversi
  await knex('kitchen_unit_conversions').insert([
    { from_unit_id: 1, to_unit_id: 2, factor: 1000.0 }, // 1 kg = 1000 gram
    { from_unit_id: 3, to_unit_id: 4, factor: 1000.0 }, // 1 liter = 1000 ml
  ]);

  // 4. Ingredients: 5 bahan baku
  await knex('kitchen_ingredients').insert([
    {
      code: 'ING-BERAS',
      name: 'Beras Ramos Super',
      category_id: 3, // bumbu/pokok
      base_unit_id: 1, // kg
      min_stock: 50.0,
      status: 'active',
      description: 'Beras putih pulen untuk konsumsi santri',
    },
    {
      code: 'ING-AYAM',
      name: 'Daging Ayam Fillet Segar',
      category_id: 2, // Protein
      base_unit_id: 1, // kg
      min_stock: 20.0,
      status: 'active',
      description: 'Dada ayam segar tanpa tulang',
    },
    {
      code: 'ING-WORTEL',
      name: 'Wortel Segar Berastagi',
      category_id: 1, // Sayur
      base_unit_id: 1, // kg
      min_stock: 10.0,
      status: 'active',
      description: 'Wortel manis segar untuk sup/tumisan',
    },
    {
      code: 'ING-MINYAK',
      name: 'Minyak Goreng Sawit',
      category_id: 3, // Bumbu/pokok
      base_unit_id: 3, // liter
      min_stock: 15.0,
      status: 'active',
      description: 'Minyak kelapa sawit higienis',
    },
    {
      code: 'ING-GARAM',
      name: 'Garam Dapur Beryodium',
      category_id: 3, // Bumbu
      base_unit_id: 2, // gram
      min_stock: 5000.0,
      status: 'active',
      description: 'Garam halus konsumsi beryodium',
    },
  ]);

  // 5. Suppliers: 2 supplier dummy
  await knex('kitchen_suppliers').insert([
    {
      code: 'SUP-001',
      name: 'CV Berkah Pangan Mandiri',
      contact_person: 'Haji Ahmad Fauzi',
      phone: '081234567890',
      address: 'Pasar Induk Kramat Jati Blok C No. 12, Jakarta Timur',
      status: 'active',
    },
    {
      code: 'SUP-002',
      name: 'PT Segar Utama Nusantara',
      contact_person: 'Ibu Ratna Sari',
      phone: '082198765432',
      address: 'Jl. Raya Pajajaran No. 45, Bogor',
      status: 'active',
    },
  ]);

  // 6. Student Groups: 2 kelompok dummy
  await knex('kitchen_student_groups').insert([
    {
      academic_ref_id: 1,
      name: 'Asrama Putra Umar bin Khattab (Lantai 1-2)',
      group_type: 'asrama',
      status: 'active',
    },
    {
      academic_ref_id: 2,
      name: 'Asrama Putri Aisyah (Lantai 1-2)',
      group_type: 'asrama',
      status: 'active',
    },
  ]);

  // 7. Menu: 1 Menu Utama
  const [menuId] = await knex('kitchen_menus').insert([
    {
      menu_type: 'daily',
      name: 'Menu Makan Siang Santri - Paket A (Ayam Goreng & Sayur Sop)',
      menu_date: '2026-08-18',
      version: 1,
      status: 'approved',
      is_favorite: true,
      proposed_by: 1,
    },
  ]);

  // 8. Recipe: 1 Resep Masakan
  const [recipeId] = await knex('kitchen_recipes').insert([
    {
      code: 'REC-AYAM-GORENG',
      name: 'Ayam Goreng Lengkuas Rempah',
      base_portion_qty: 100.0, // untuk 100 porsi santri
      version: 1,
      status: 'approved',
      approved_by: 1,
      approved_at: knex.fn.now(),
    },
  ]);

  // 9. Menu Items: 2 item hidangan
  await knex('kitchen_menu_items').insert([
    {
      menu_id: 1,
      dish_name: 'Ayam Goreng Lengkuas Rempah',
      recipe_id: 1,
      portion_qty: 1.0,
      portion_unit_id: 5, // pcs
    },
    {
      menu_id: 1,
      dish_name: 'Sayur Sop Wortel Segar',
      recipe_id: null,
      portion_qty: 1.0,
      portion_unit_id: 5, // pcs / mangkuk
    },
  ]);

  // 10. Recipe Ingredients: 2 bahan baku per resep
  await knex('kitchen_recipe_ingredients').insert([
    {
      recipe_id: 1,
      ingredient_id: 2, // Daging Ayam Fillet
      qty: 10.0,
      unit_id: 1, // kg
      yield_percentage: 90.0,
      is_seasoning: false,
    },
    {
      recipe_id: 1,
      ingredient_id: 5, // Garam Dapur
      qty: 250.0,
      unit_id: 2, // gram
      yield_percentage: 100.0,
      is_seasoning: true,
    },
  ]);

  // 11. Staff Assignment: 1 Admin Dapur
  await knex('kitchen_staff_assignments').insert([
    {
      core_user_id: 1,
      staff_role: 'admin_dapur',
      shift: 'pagi',
      station: 'umum',
      status: 'active',
    },
  ]);

  console.log('Dapur seed data successfully inserted!');
};
