/**
 * Migration: expand_psb_registrants_status
 * Modul PSB - Mengubah kolom status psb_registrants menjadi VARCHAR(50) untuk mendukung seluruh tahapan pipeline
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.raw(`
    ALTER TABLE psb_registrants 
    MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'registered'
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.raw(`
    ALTER TABLE psb_registrants 
    MODIFY COLUMN status ENUM('registered', 'testing', 'test_passed', 'test_failed', 'placed', 'rejected', 'withdrawn') NOT NULL DEFAULT 'registered'
  `);
};
