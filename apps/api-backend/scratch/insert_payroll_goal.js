const db = require('../src/config/db/manajemen');

async function insertGoal() {
  try {
    const docs = await db('rips_documents').select('id', 'name', 'school_unit_id');
    const domainKeuangan = await db('rips_domains').where('name', 'like', '%Keuangan%').first();
    const subRealisasi = await db('rips_subdomains').where({ domain_id: domainKeuangan.id, name: 'Realisasi Keuangan' }).first();

    console.log('Target Domain:', domainKeuangan.id, domainKeuangan.name);
    console.log('Target Subdomain:', subRealisasi.id, subRealisasi.name);

    const goalTitle = 'Penggajian guru dan karyawan dilaksanakan tepat waktu, akurat, transparan, sesuai ketentuan, dan didukung administrasi yang lengkap.';
    const bscAspectId = 1; // Finansial

    const indicatorsList = [
      {
        suffix: 'IND-01',
        name: 'Persentase pembayaran gaji guru dan karyawan tepat waktu (%)',
        unit: '%',
        baseline_percent: 0,
        target_percent: 100,
        order_index: 1,
      },
      {
        suffix: 'IND-02',
        name: 'Persentase pembayaran gaji sesuai perhitungan hak pegawai (%)',
        unit: '%',
        baseline_percent: 0,
        target_percent: 100,
        order_index: 2,
      },
      {
        suffix: 'IND-03',
        name: 'Persentase data dan dokumen penggajian lengkap dan tervalidasi (%)',
        unit: '%',
        baseline_percent: 0,
        target_percent: 100,
        order_index: 3,
      },
      {
        suffix: 'IND-04',
        name: 'Persentase penggajian diproses sesuai kebijakan/ketentuan sekolah (%)',
        unit: '%',
        baseline_percent: 0,
        target_percent: 100,
        order_index: 4,
      },
      {
        suffix: 'IND-05',
        name: 'Jumlah komplain/koreksi penggajian material (kasus)',
        unit: 'kasus',
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
        domain_id: domainKeuangan.id,
        subdomain_id: subRealisasi.id,
        bsc_aspect_id: bscAspectId,
        code: goalCode,
        title: goalTitle,
        indicator_name: indicatorsList[0].name,
        indicator_unit: indicatorsList[0].unit,
        baseline_percent: indicatorsList[0].baseline_percent,
        target_percent: indicatorsList[0].target_percent,
        order_index: 51.5,
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
    console.error('Error inserting goal:', err);
    process.exit(1);
  }
}

insertGoal();
