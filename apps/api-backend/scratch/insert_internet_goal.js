const db = require('../src/config/db/manajemen');

async function addInternetGoal() {
  const docs = await db('rips_documents').select('*');
  const domainSarpras = await db('rips_domains').where({ name: 'SARPRAS' }).first();
  const subTech = await db('rips_subdomains').where({ domain_id: domainSarpras.id, name: 'Teknologi Pendidikan' }).first() 
                 || await db('rips_subdomains').where({ name: 'Teknologi Pendidikan' }).first();

  console.log('Using Domain:', domainSarpras.id, domainSarpras.name);
  console.log('Using Subdomain:', subTech.id, subTech.name);

  for (const doc of docs) {
    const isYayasan = doc.school_unit_id === null;
    const unitPrefix = doc.school_unit_id ? `U${doc.school_unit_id}-` : '';
    const goalCode = isYayasan ? 'SAS-039B' : `SAS-${unitPrefix}039B`;

    // Check if exists
    let existingGoal = await db('rips_goals').where({ rips_document_id: doc.id, code: goalCode }).first();

    if (!existingGoal) {
      const [newGoalId] = await db('rips_goals').insert({
        rips_document_id: doc.id,
        domain_id: domainSarpras.id,
        subdomain_id: subTech.id,
        bsc_aspect_id: 4, // Pembelajaran & Pertumbuhan (Teknologi & Infrastruktur)
        code: goalCode,
        title: 'Infrastruktur jaringan dan akses internet berkecepatan tinggi terpenuhi secara andal, stabil, dan aman untuk mendukung seluruh kegiatan operasional dan pembelajaran digital.',
        indicator_name: 'Persentase ketersediaan bandwidth dan keandalan jaringan internet',
        indicator_unit: '%',
        baseline_percent: 0,
        target_percent: 100,
        order_index: 39.5,
        status: 'active',
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });
      existingGoal = { id: newGoalId, code: goalCode };
      console.log('Created Goal:', goalCode, 'ID:', newGoalId, 'for Doc:', doc.name);
    } else {
      console.log('Goal already exists:', goalCode, 'ID:', existingGoal.id);
    }

    // Add indicators
    const indicatorsData = [
      {
        code: `${goalCode}-IND-01`,
        name: 'Persentase ketersediaan bandwidth internet dedicated sesuai rasio kebutuhan santri & GTK',
        unit: '%',
        baseline_percent: 0,
        target_percent: 100,
        order_index: 1,
      },
      {
        code: `${goalCode}-IND-02`,
        name: 'Persentase cakupan area Wi-Fi berkecepatan tinggi di ruang kelas, kantor, dan asrama (Wi-Fi Coverage)',
        unit: '%',
        baseline_percent: 0,
        target_percent: 100,
        order_index: 2,
      },
      {
        code: `${goalCode}-IND-03`,
        name: 'Tingkat reliabilitas koneksi internet tanpa gangguan/downtime kritis (Uptime SLA)',
        unit: '%',
        baseline_percent: 0,
        target_percent: 99.5,
        order_index: 3,
      },
      {
        code: `${goalCode}-IND-04`,
        name: 'Tingkat kepuasan santri, guru, dan tenaga kependidikan terhadap kecepatan & kestabilan internet',
        unit: '%',
        baseline_percent: 0,
        target_percent: 90,
        order_index: 4,
      },
    ];

    for (const ind of indicatorsData) {
      const existingInd = await db('rips_goal_indicators').where({ rips_goal_id: existingGoal.id, code: ind.code }).first();
      if (!existingInd) {
        await db('rips_goal_indicators').insert({
          rips_goal_id: existingGoal.id,
          code: ind.code,
          name: ind.name,
          unit: ind.unit,
          baseline_percent: ind.baseline_percent,
          target_percent: ind.target_percent,
          order_index: ind.order_index,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        });
        console.log('  + Added Indicator:', ind.code, ind.name);
      }
    }

    // Link to relevant programs
    const progCodes = isYayasan 
      ? ['PRG-366', 'PRG-374', 'PRG-375'] 
      : [`PRG-${unitPrefix}366`, `PRG-${unitPrefix}374`, `PRG-${unitPrefix}375`];
    
    const relevantPrograms = await db('rips_programs').whereIn('code', progCodes);
    for (const prog of relevantPrograms) {
      const existingLink = await db('rips_program_goal_links').where({
        rips_program_id: prog.id,
        rips_goal_id: existingGoal.id,
      }).first();

      if (!existingLink) {
        await db('rips_program_goal_links').insert({
          rips_program_id: prog.id,
          rips_goal_id: existingGoal.id,
        });
        console.log('  -> Linked Program:', prog.code, prog.name, 'to Goal:', goalCode);
      }
    }
  }

  console.log('\n=== ALL INTERNET GOALS & INDICATORS SUCCESSFULLY CONFIGURED ===');
  process.exit(0);
}

addInternetGoal().catch(e => { console.error(e); process.exit(1); });
