const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../../core-portal/src/apps/akademik/pages/Kurikulum.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Update quickAssignForm initial state in Kurikulum component
const oldInitialState = `  const [quickAssignForm, setQuickAssignForm] = useState({
    assign_mode: 'single', // 'single' | 'split'
    teacher_employee_id: '',
    allocated_hours: 2,
    role_description: 'Guru Pengampu',
    teacher_employee_id_1: '',
    allocated_hours_1: 2,
    role_description_1: 'Guru Pengampu 1',
    teacher_employee_id_2: '',
    allocated_hours_2: 2,
    role_description_2: 'Guru Pengampu 2',
    sk_number: '',
    reason: '',
    notes: ''
  });`;

const newInitialState = `  const [quickAssignForm, setQuickAssignForm] = useState({
    assign_mode: 'single', // 'single' | 'split'
    teacher_employee_id: '',
    allocated_hours: 2,
    role_description: 'Guru Pengampu',
    teacher_employee_id_1: '',
    allocated_hours_1: 2,
    role_description_1: 'Guru Pengampu 1',
    teacher_employee_id_2: '',
    allocated_hours_2: 2,
    role_description_2: 'Guru Pengampu 2',
    elective_teachers: [{ teacher_employee_id: '', role_description: 'Guru Pengampu' }],
    sk_number: '',
    reason: '',
    notes: ''
  });

  const handleAddElectiveTeacher = () => {
    setQuickAssignForm(prev => ({
      ...prev,
      elective_teachers: [...prev.elective_teachers, { teacher_employee_id: '', role_description: 'Guru Pengampu' }]
    }));
  };

  const handleRemoveElectiveTeacher = (index) => {
    setQuickAssignForm(prev => ({
      ...prev,
      elective_teachers: prev.elective_teachers.filter((_, idx) => idx !== index)
    }));
  };

  const handleElectiveTeacherChange = (index, field, val) => {
    setQuickAssignForm(prev => {
      const updated = [...prev.elective_teachers];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, elective_teachers: updated };
    });
  };`;

if (content.includes(oldInitialState)) {
  content = content.replace(oldInitialState, newInitialState);
  console.log('1. Added elective_teachers state and helpers!');
}

// 2. Update handleOpenQuickAssign
const oldHandleOpenQuick = `    const isElective = pair.type === 'mapel' && (pair.subject?.is_elective == 1 || pair.subject?.is_elective === true || pair.subject?.is_elective === '1');
    const splitJp1 = isElective
      ? curriculumJp
      : (teacher1?.allocated_hours !== undefined && teacher1?.allocated_hours !== null ? teacher1.allocated_hours : Math.ceil(curriculumJp / 2));
    const splitJp2 = isElective
      ? curriculumJp
      : (teacher2?.allocated_hours !== undefined && teacher2?.allocated_hours !== null ? teacher2.allocated_hours : Math.max(1, curriculumJp - splitJp1));

    setQuickAssignForm({
      assign_mode: isMulti ? 'split' : 'single',
      // Single mode
      teacher_employee_id: teacher1 ? String(teacher1.teacher_employee_id) : '',
      allocated_hours: teacher1?.allocated_hours || curriculumJp,
      role_description: teacher1?.role_description || 'Guru Pengampu',
      // Split mode (2 guru)
      teacher_employee_id_1: teacher1 ? String(teacher1.teacher_employee_id) : '',
      allocated_hours_1: splitJp1,
      role_description_1: teacher1?.role_description || 'Guru Pengampu 1',
      teacher_employee_id_2: teacher2 ? String(teacher2.teacher_employee_id) : '',
      allocated_hours_2: splitJp2,
      role_description_2: teacher2?.role_description || 'Guru Pengampu 2',
      sk_number: teacher1?.sk_number || '',
      reason: duties.length > 0 ? 'Penyesuaian / pembagian tugas mengajar' : 'Penetapan tugas guru pengampu',
      notes: teacher1?.notes || ''
    });`;

const newHandleOpenQuick = `    const isElective = pair.type === 'mapel' && (pair.subject?.is_elective == 1 || pair.subject?.is_elective === true || pair.subject?.is_elective === '1');
    const splitJp1 = isElective
      ? curriculumJp
      : (teacher1?.allocated_hours !== undefined && teacher1?.allocated_hours !== null ? teacher1.allocated_hours : Math.ceil(curriculumJp / 2));
    const splitJp2 = isElective
      ? curriculumJp
      : (teacher2?.allocated_hours !== undefined && teacher2?.allocated_hours !== null ? teacher2.allocated_hours : Math.max(1, curriculumJp - splitJp1));

    const initialElectiveTeachers = (duties && duties.length > 0)
      ? duties.map(d => ({ teacher_employee_id: String(d.teacher_employee_id), role_description: d.role_description || 'Guru Pengampu' }))
      : [{ teacher_employee_id: '', role_description: 'Guru Pengampu' }];

    setQuickAssignForm({
      assign_mode: isMulti ? 'split' : 'single',
      // Single mode
      teacher_employee_id: teacher1 ? String(teacher1.teacher_employee_id) : '',
      allocated_hours: teacher1?.allocated_hours || curriculumJp,
      role_description: teacher1?.role_description || 'Guru Pengampu',
      // Split mode (2 guru)
      teacher_employee_id_1: teacher1 ? String(teacher1.teacher_employee_id) : '',
      allocated_hours_1: splitJp1,
      role_description_1: teacher1?.role_description || 'Guru Pengampu 1',
      teacher_employee_id_2: teacher2 ? String(teacher2.teacher_employee_id) : '',
      allocated_hours_2: splitJp2,
      role_description_2: teacher2?.role_description || 'Guru Pengampu 2',
      // Multi-guru mode untuk Mapel Pilihan
      elective_teachers: initialElectiveTeachers,
      sk_number: teacher1?.sk_number || '',
      reason: duties.length > 0 ? 'Penyesuaian / pembagian tugas mengajar' : 'Penetapan tugas guru pengampu',
      notes: teacher1?.notes || ''
    });`;

if (content.includes(oldHandleOpenQuick)) {
  content = content.replace(oldHandleOpenQuick, newHandleOpenQuick);
  console.log('2. Updated handleOpenQuickAssign for elective teachers list!');
}

// 3. Update handleSaveQuickAssign
const oldHandleSaveQuick = `      if (quickAssignForm.assign_mode === 'single') {
        payload.teacher_employee_id = Number(quickAssignForm.teacher_employee_id);
        payload.allocated_hours = parseInt(quickAssignForm.allocated_hours, 10) || curriculumJp;
        payload.role_description = quickAssignForm.role_description;
      } else {
        const teachers = [];
        const isElective = quickAssignPair.type === 'mapel' && (quickAssignPair.subject?.is_elective == 1 || quickAssignPair.subject?.is_elective === true || quickAssignPair.subject?.is_elective === '1');
        if (quickAssignForm.teacher_employee_id_1) {
          teachers.push({
            teacher_employee_id: Number(quickAssignForm.teacher_employee_id_1),
            allocated_hours: parseInt(quickAssignForm.allocated_hours_1, 10) || (isElective ? curriculumJp : Math.ceil(curriculumJp / 2)),
            role_description: quickAssignForm.role_description_1 || 'Guru Pengampu 1'
          });
        }
        if (quickAssignForm.teacher_employee_id_2) {
          teachers.push({
            teacher_employee_id: Number(quickAssignForm.teacher_employee_id_2),
            allocated_hours: parseInt(quickAssignForm.allocated_hours_2, 10) || (isElective ? curriculumJp : Math.floor(curriculumJp / 2)),
            role_description: quickAssignForm.role_description_2 || 'Guru Pengampu 2'
          });
        }
        payload.teachers = teachers;
      }`;

const newHandleSaveQuick = `      const isElective = quickAssignPair.type === 'mapel' && (quickAssignPair.subject?.is_elective == 1 || quickAssignPair.subject?.is_elective === true || quickAssignPair.subject?.is_elective === '1');

      if (isElective) {
        const validTeachers = quickAssignForm.elective_teachers.filter(t => t.teacher_employee_id);
        if (validTeachers.length === 0) {
          setErrorMsg('Pilih minimal 1 guru pengampu untuk mapel pilihan ini');
          setSaving(false);
          return;
        }
        payload.teachers = validTeachers.map(t => ({
          teacher_employee_id: Number(t.teacher_employee_id),
          allocated_hours: curriculumJp,
          role_description: t.role_description || 'Guru Pengampu'
        }));
      } else if (quickAssignForm.assign_mode === 'single') {
        payload.teacher_employee_id = Number(quickAssignForm.teacher_employee_id);
        payload.allocated_hours = parseInt(quickAssignForm.allocated_hours, 10) || curriculumJp;
        payload.role_description = quickAssignForm.role_description;
      } else {
        const teachers = [];
        if (quickAssignForm.teacher_employee_id_1) {
          teachers.push({
            teacher_employee_id: Number(quickAssignForm.teacher_employee_id_1),
            allocated_hours: parseInt(quickAssignForm.allocated_hours_1, 10) || Math.ceil(curriculumJp / 2),
            role_description: quickAssignForm.role_description_1 || 'Guru Pengampu 1'
          });
        }
        if (quickAssignForm.teacher_employee_id_2) {
          teachers.push({
            teacher_employee_id: Number(quickAssignForm.teacher_employee_id_2),
            allocated_hours: parseInt(quickAssignForm.allocated_hours_2, 10) || Math.floor(curriculumJp / 2),
            role_description: quickAssignForm.role_description_2 || 'Guru Pengampu 2'
          });
        }
        payload.teachers = teachers;
      }`;

if (content.includes(oldHandleSaveQuick)) {
  content = content.replace(oldHandleSaveQuick, newHandleSaveQuick);
  console.log('3. Updated handleSaveQuickAssign for elective direct multi-teacher save!');
}

// 4. Update quickAssignModalOpen UI to hide mode buttons and show direct multi-teacher list for elective
const oldModeSection = `            {/* PILIHAN MODE PENUGASAN */}
            {(() => {
              const isElective = quickAssignPair.subject && (quickAssignPair.subject.is_elective == 1 || quickAssignPair.subject.is_elective === true || quickAssignPair.subject.is_elective === '1');
              return (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Model Penugasan Pengampu:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setQuickAssignForm({
                        ...quickAssignForm,
                        assign_mode: 'single',
                        allocated_hours: quickAssignPair.curriculumJp || 2
                      })}
                      className={\`py-2 px-3 rounded-xl font-black text-xs border transition flex items-center justify-center gap-1.5 \${
                        quickAssignForm.assign_mode === 'single'
                          ? 'bg-teal-600 text-white border-teal-700 shadow-sm ring-2 ring-teal-400'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }\`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>1 Guru Tunggal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickAssignForm({
                        ...quickAssignForm,
                        assign_mode: 'split',
                        allocated_hours_1: isElective ? (quickAssignPair.curriculumJp || 2) : (quickAssignForm.allocated_hours_1 || Math.ceil((quickAssignPair.curriculumJp || 4) / 2)),
                        allocated_hours_2: isElective ? (quickAssignPair.curriculumJp || 2) : (quickAssignForm.allocated_hours_2 || Math.max(1, (quickAssignPair.curriculumJp || 4) - Math.ceil((quickAssignPair.curriculumJp || 4) / 2)))
                      })}
                      className={\`py-2 px-3 rounded-xl font-black text-xs border transition flex items-center justify-center gap-1.5 \${
                        quickAssignForm.assign_mode === 'split'
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-2 ring-indigo-400'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }\`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>{isElective ? 'Multi-Guru (Beban Penuh)' : '2 Guru (Pembagian JP)'}</span>
                    </button>
                  </div>
                </div>
              );
            })()}`;

const newModeSection = `            {/* PILIHAN MODE PENUGASAN (Hanya untuk Mapel Reguler) */}
            {(() => {
              const isElective = quickAssignPair.subject && (quickAssignPair.subject.is_elective == 1 || quickAssignPair.subject.is_elective === true || quickAssignPair.subject.is_elective === '1');
              if (isElective) return null;
              return (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Model Penugasan Pengampu:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setQuickAssignForm({
                        ...quickAssignForm,
                        assign_mode: 'single',
                        allocated_hours: quickAssignPair.curriculumJp || 2
                      })}
                      className={\`py-2 px-3 rounded-xl font-black text-xs border transition flex items-center justify-center gap-1.5 \${
                        quickAssignForm.assign_mode === 'single'
                          ? 'bg-teal-600 text-white border-teal-700 shadow-sm ring-2 ring-teal-400'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }\`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>1 Guru Tunggal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickAssignForm({
                        ...quickAssignForm,
                        assign_mode: 'split',
                        allocated_hours_1: quickAssignForm.allocated_hours_1 || Math.ceil((quickAssignPair.curriculumJp || 4) / 2),
                        allocated_hours_2: quickAssignForm.allocated_hours_2 || Math.max(1, (quickAssignPair.curriculumJp || 4) - Math.ceil((quickAssignPair.curriculumJp || 4) / 2))
                      })}
                      className={\`py-2 px-3 rounded-xl font-black text-xs border transition flex items-center justify-center gap-1.5 \${
                        quickAssignForm.assign_mode === 'split'
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-2 ring-indigo-400'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }\`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>2 Guru (Pembagian JP)</span>
                    </button>
                  </div>
                </div>
              );
            })()}`;

if (content.includes(oldModeSection)) {
  content = content.replace(oldModeSection, newModeSection);
  console.log('4. Updated mode section to hide mode buttons for Elective Subjects!');
}

// 5. Update form inputs rendering in quickAssignModalOpen
const oldFormContent = `            <form onSubmit={handleSaveQuickAssign} className="space-y-4 text-xs">
              {/* MODE 1: GURU TUNGGAL */}
              {quickAssignForm.assign_mode === 'single' && (`;

const newFormContent = `            <form onSubmit={handleSaveQuickAssign} className="space-y-4 text-xs">
              {/* RENDERING KHUSUS MAPEL PILIHAN: LANGSUNG INPUT DAFTAR GURU PENGAMPU TANPA PEMBAGIAN JP */}
              {quickAssignPair.subject && (quickAssignPair.subject.is_elective == 1 || quickAssignPair.subject.is_elective === true || quickAssignPair.subject.is_elective === '1') ? (
                <div className="space-y-3 p-4 bg-amber-50/50 border border-amber-200/80 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-950 text-xs flex items-center gap-1">
                      <Users className="w-4 h-4 text-amber-700" />
                      <span>Daftar Guru Pengampu Mapel Pilihan</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleAddElectiveTeacher}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Guru Pengampu</span>
                    </button>
                  </div>

                  {quickAssignForm.elective_teachers.map((item, index) => (
                    <div key={index} className="p-3 bg-white border border-amber-200/90 rounded-xl space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-900">Guru Pengampu #{index + 1}</span>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded font-bold text-[10px]">
                            {quickAssignPair.curriculumJp || 2} JP Penuh (Otomatis)
                          </span>
                          {quickAssignForm.elective_teachers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveElectiveTeacher(index)}
                              className="text-red-500 hover:text-red-700 p-1 transition"
                              title="Hapus guru dari daftar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <SearchableSelect
                        options={(Array.isArray(employees) ? employees : []).map(emp => ({
                          value: String(emp.id),
                          label: emp.full_name,
                          sublabel: \`NIP/Kode: \${emp.nip || emp.employee_code || '-'}\`
                        }))}
                        value={String(item.teacher_employee_id || '')}
                        onChange={(val) => handleElectiveTeacherChange(index, 'teacher_employee_id', val)}
                        placeholder={\`-- Pilih Guru Pengampu #\${index + 1} --\`}
                        searchPlaceholder="Ketik nama guru pengampu..."
                        emptyText="Guru tidak ditemukan"
                      />

                      <input
                        type="text"
                        value={item.role_description}
                        onChange={(e) => handleElectiveTeacherChange(index, 'role_description', e.target.value)}
                        placeholder="Peran (Contoh: Guru Pengampu Mapel Pilihan)"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {/* MODE 1: GURU TUNGGAL (MAPEL REGULER) */}
                  {quickAssignForm.assign_mode === 'single' && (`;

if (content.includes(oldFormContent)) {
  content = content.replace(oldFormContent, newFormContent);
  // Also close theFragment at the end of split mode for regular subject
  const oldFormEnd = `                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Keterangan / Alasan Penetapan * <span className="text-slate-400 font-normal">(Wajib Dicatat ke Audit Log)</span>
                </label>`;

  const newFormEnd = `                    </div>
                  </div>
                );
              })()}
                </>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Keterangan / Alasan Penetapan * <span className="text-slate-400 font-normal">(Wajib Dicatat ke Audit Log)</span>
                </label>`;

  if (content.includes(oldFormEnd)) {
    content = content.replace(oldFormEnd, newFormEnd);
    console.log('5. Updated quickAssignModalOpen form rendering for direct multi-teacher elective!');
  }
}

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Kurikulum.jsx updated for direct multi-teacher elective without mode buttons successfully!');
