/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. Akun Pendapatan Pemeliharaan Sarpras (Header)
  let revHeader = await knex('chart_of_accounts').where({ account_code: '6051' }).first();
  if (!revHeader) {
    const [id] = await knex('chart_of_accounts').insert({
      school_unit_id: 0,
      account_code: '6051',
      account_name: 'Pendapatan Pemeliharaan Sarpras',
      account_group: 'pendapatan',
      normal_balance: 'credit',
      level: 1,
      is_active: 1
    });
    revHeader = { id };
  }

  // Pendapatan SMP & SMA
  const revChildren = [
    { account_code: '60511', account_name: 'Pendapatan Pemeliharaan Sarpras SMP', parent_account_id: revHeader.id },
    { account_code: '60512', account_name: 'Pendapatan Pemeliharaan Sarpras SMA', parent_account_id: revHeader.id }
  ];
  for (const item of revChildren) {
    const exist = await knex('chart_of_accounts').where({ account_code: item.account_code }).first();
    if (!exist) {
      await knex('chart_of_accounts').insert({
        school_unit_id: 0,
        account_code: item.account_code,
        account_name: item.account_name,
        account_group: 'pendapatan',
        normal_balance: 'credit',
        parent_account_id: item.parent_account_id,
        level: 2,
        is_active: 1
      });
    }
  }

  // 2. Akun Piutang Pemeliharaan Sarpras (Header)
  let piutangHeader = await knex('chart_of_accounts').where({ account_code: '2051' }).first();
  if (!piutangHeader) {
    const [id] = await knex('chart_of_accounts').insert({
      school_unit_id: 0,
      account_code: '2051',
      account_name: 'Piutang Pemeliharaan Sarpras',
      account_group: 'piutang',
      normal_balance: 'debit',
      level: 1,
      is_active: 1
    });
    piutangHeader = { id };
  }

  // Piutang SMP & SMA
  const piutangChildren = [
    { account_code: '20511', account_name: 'Piutang Pemeliharaan Sarpras SMP', parent_account_id: piutangHeader.id },
    { account_code: '20512', account_name: 'Piutang Pemeliharaan Sarpras SMA', parent_account_id: piutangHeader.id }
  ];
  for (const item of piutangChildren) {
    const exist = await knex('chart_of_accounts').where({ account_code: item.account_code }).first();
    if (!exist) {
      await knex('chart_of_accounts').insert({
        school_unit_id: 0,
        account_code: item.account_code,
        account_name: item.account_name,
        account_group: 'piutang',
        normal_balance: 'debit',
        parent_account_id: item.parent_account_id,
        level: 2,
        is_active: 1
      });
    }
  }

  // 3. Diskon Pemeliharaan Sarpras (Kontra Pendapatan)
  const parentDiskon = await knex('chart_of_accounts').where({ account_code: '690' }).first();
  const existDiskon = await knex('chart_of_accounts').where({ account_code: '69008' }).first();
  if (!existDiskon) {
    await knex('chart_of_accounts').insert({
      school_unit_id: 0,
      account_code: '69008',
      account_name: 'Diskon Pemeliharaan Sarpras',
      account_group: 'pendapatan',
      normal_balance: 'debit',
      parent_account_id: parentDiskon ? parentDiskon.id : null,
      level: 2,
      is_active: 1
    });
  }

  // 4. Beban Pemeliharaan & Perbaikan Sarpras SMP & SMA
  const parentBeban = await knex('chart_of_accounts').where({ account_code: '760' }).first();
  const bebanItems = [
    { account_code: '76001', account_name: 'Beban Pemeliharaan & Perbaikan Sarpras SMP', parent_account_id: parentBeban ? parentBeban.id : null },
    { account_code: '76002', account_name: 'Beban Pemeliharaan & Perbaikan Sarpras SMA', parent_account_id: parentBeban ? parentBeban.id : null }
  ];
  for (const item of bebanItems) {
    const exist = await knex('chart_of_accounts').where({ account_code: item.account_code }).first();
    if (!exist) {
      await knex('chart_of_accounts').insert({
        school_unit_id: 0,
        account_code: item.account_code,
        account_name: item.account_name,
        account_group: 'biaya',
        normal_balance: 'debit',
        parent_account_id: item.parent_account_id,
        level: 2,
        is_active: 1
      });
    }
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const codes = ['6051', '60511', '60512', '2051', '20511', '20512', '69008', '76001', '76002'];
  await knex('chart_of_accounts').whereIn('account_code', codes).del();
};
