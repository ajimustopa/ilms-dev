/**
 * Journal Service Proxy for Keuangan Module
 * Apps/api-backend/src/modules/keuangan/common/journalService.js
 * 
 * Re-exports the centralized journal engine.
 */
const { recordJournal, generateJournalNumber } = require('../bookkeeping/journalEngine');

module.exports = {
  createAutoJournal: recordJournal,
  recordJournal,
  generateJournalNumber
};
