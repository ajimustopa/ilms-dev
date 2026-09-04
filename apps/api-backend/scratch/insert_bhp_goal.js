const db = require('../src/config/db/manajemen');

async function insertBhpGoal() {
  try {
    const docs = await db('rips_documents').select('id', 'name', 'school_unit_id');
    const domainSarpras = await db('rips_domains').where({ id: 23 }).first();
    let subBhp = await db('rips_subdomains').where({ name: 'Pemenuhan Bahan Habis Pakai' }).first();

    if (!subBhp) {
      const [newSubId] = await db('rips_subdomains').insert({
        domain_id: domainSarpras.id,
        name: 'Pemenuhan Bahan Habis Pakai',
        order_index: 35.5,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });
      subBhp = await db('rips_subdomains').where({ id: newSubId }).first();
    } else {
      await db('rips_subdomains').where({ id: subBhp.id }).update({ order_index: 35.5 });
    }

    console.log('Target Domain:', domainSarpras.id, domainSarpras.name);
    console.log('Target Subdomain:', subBhp.id, subBhp.name);

    const goalTitle = 'Kebutuhan ATK bulanan sekolah terpenuhi secara tepat waktu, sesuai kebutuhan, tersedia dalam jumlah memadai, dan dikelola secara efisien sesuai anggaran.';
    const bscAspectId = 3; // Proses Bisnis Internal

    const indicatorsList = [
      {
        suffix: 'IND-01',
        name: 'Persentase kebutuhan ATK bulanan yang terpenuhi',
        unit: '%',
        baseline_percent: 0,
        target_percent: 100,
        order_index: 1,
      },
      {
        suffix: 'IND-02',
        name: 'Persentase pemenuhan ATK sesuai daftar kebutuhan yang disetujui',
        unit: '%',
        baseline_percent: 0,
        target_percent: 100,
        order_index: 2,
      },
      {
        suffix: 'IND-03',
        name: 'Persentase pemenuhan ATK tepat waktu sesuai jadwal bulanan',
        unit: '%',
        baseline_percent: 0,
        target_percent: 100,
        order_index: 3,
      },
      {
        suffix: 'IND-04',
        name: 'Persentase realisasi belanja ATK terhadap anggaran yang ditetapkan',
        unit: '%',
        baseline_percent: 0,
        target_percent: 100,
        order_index: 4,
      },
      {
        suffix: 'IND-05',
        name: 'Jumlah kejadian kekurangan ATK yang mengganggu operasional',
        unit: 'Kasus',
        baseline_percent: 0,
        target_percent: 0,
        order_index: 5,
      },
    ];

    for (const doc of docs) {
      const existing = await db('rips_goals').where({ rips_document_id: doc.id, title: goalTitle }).first();
      if (existing) {
        console.log('Goal already exists in doc', doc.id, 'with code', existing.code);
        continue;
      }

      const count = await db('rips_goals').where({ rips_document_id: doc.id }).count('* as total');
      const totalGoals = count[0].total;
      let codePrefix = 'SAS-';
      if (doc.school_unit_id === 1) codePrefix = 'SAS-U1-';
      else if (doc.school_unit_id === 2) codePrefix = 'SAS-U2-';
      else if (doc.school_unit_id) codePrefix = `SAS-U${doc.school_unit_id}-`;

      const goalCode = `${codePrefix}${String(totalGoals + 1).padStart(3, '0')}`;

      console.log('Inserting into doc', doc.id, 'Code:', goalCode);

      const [goalId] = await db('rips_goals').insert({
        rips_document_id: doc.id,
        domain_id: domainSarpras.id,
        subdomain_id: subBhp.id,
        bsc_aspect_id: bscAspectId,
        code: goalCode,
        title: goalTitle,
        indicator_name: indicatorsList[0].name,
        indicator_unit: indicatorsList[0].unit,
        baseline_percent: indicatorsList[0].baseline_percent,
        target_percent: indicatorsList[0].target_percent,
        order_index: 35.5,
        status: 'active',
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

      for (const ind of indicatorsList) {
        const indCode = `${goalCode}-${ind.suffix}`;
        await db('rips_goal_indicators').insert({
          rips_goal_id: goalId,
          code: indCode,
          name: ind.name,
          unit: ind.unit,
          baseline_percent: ind.baseline_percent,
          target_percent: ind.target_percent,
          order_index: ind.order_index,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        });
      }

      console.log('Successfully inserted goal ID:', goalId, 'with 5 indicators in Doc', doc.id);
    }

    console.log('ALL DONE!');
    process.exit(0);
  } catch (err) {
    console.error('Error inserting BHP goal:', err);
    process.exit(1);
  }
}

insertBhpGoal();
