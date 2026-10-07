/**
 * Dev Seed Runner
 * Memuat .env.dev dan mengeksekusi seed data uji pada core_dev dan kepegawaian_dev
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../../../.env.dev') });

const dbCore = require('../../../../config/db/core');
const dbKepegawaian = require('../../../../config/db/kepegawaian');
const { seedDataUji } = require('./seed_data_uji_hrd');

(async () => {
  try {
    await seedDataUji(dbCore, dbKepegawaian);
    const empCount = await dbKepegawaian('employees').count('id as total');
    console.log('Total employees in kepegawaian_dev:', empCount[0].total);
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
})();
