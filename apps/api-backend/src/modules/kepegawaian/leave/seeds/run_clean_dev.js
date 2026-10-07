/**
 * Dev Cleaner Runner
 * Memuat .env.dev dan mengeksekusi reset data uji pada core_dev dan kepegawaian_dev
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../../../.env.dev') });

const dbCore = require('../../../../config/db/core');
const dbKepegawaian = require('../../../../config/db/kepegawaian');
const { cleanDataUji } = require('./clean_data_uji_hrd');

(async () => {
  try {
    await cleanDataUji(dbCore, dbKepegawaian);
    console.log('Reset completed.');
    process.exit(0);
  } catch (err) {
    console.error('Clean failed:', err.message);
    process.exit(1);
  }
})();
