const dbAkademik = require('../src/config/db/akademik');
const studentsService = require('../src/modules/akademik/students/service');

const studentsData = [
  {
    fullName: "Kevin Alfiana Rahman",
    nipd: "252610002",
    nisn: "3100366127",
    nik: "3201300000000000",
    birthPlace: "Bogor",
    birthDate: "2010-01-25",
    address: "Perumahan ciampea indah",
    fatherName: "Jajang alam",
    fatherPhone: null,
    fatherEmail: "Jajang_alam@yahoo.com",
    motherName: "Neneng hotimah",
    motherPhone: null,
    motherEmail: "nenenghotimah81@gmail.com",
    guardianName: "ISTIATI.sTr keb",
    guardianNik: "3201400000000000",
    guardianBirthPlace: "Bogor",
    guardianBirthDate: "1974-02-12",
    guardianEdu: "S1",
    guardianJob: "PNS/TNI/Polri",
    guardianPhone: "085810312626",
    prevSchool: "MI AL AZKIA",
    prevSchoolAddress: "Kabupaten Bogor",
    admissionDate: "2024-07-15"
  },
  {
    fullName: "Muhamad Fazri nazili",
    nipd: "252610004",
    nisn: "93775145",
    nik: "3201380000000000",
    birthPlace: "Bogor",
    birthDate: "2009-10-13",
    address: "Kp. Pasir menjul RT. 01 RW.02 Des. Pasir jaya kec. Cigombong kab. Bogor",
    fatherName: "MIFTAHUDIN",
    fatherPhone: "085797405961",
    fatherEmail: "Pajrimiptah3@gmail.com",
    motherName: "ATIM FATIMAH",
    motherPhone: "085776105367",
    motherEmail: "fatimahatim544@gmail.com",
    guardianName: "R AERIDA SEPTIANI",
    guardianNik: "3374110000000000",
    guardianBirthPlace: "Palembang",
    guardianBirthDate: "1964-09-07",
    guardianEdu: "S2",
    guardianJob: null,
    guardianPhone: "081367672920",
    prevSchool: "SD INSAN NURUL FIKRI DEPOK",
    prevSchoolAddress: "Kota Depok",
    admissionDate: "2024-07-15"
  },
  {
    fullName: "Muhammad Rakha Wirasatya Munap",
    nipd: "252610005",
    nisn: "99988644",
    nik: "3174090000000000",
    birthPlace: "Jakarta",
    birthDate: "2009-05-26",
    address: "Jl. H. KAMANG NO.15 RT 005 RW 010 PONDOK LABU CILANDAK JAKARTA SELATAN 12450",
    fatherName: "ASWAR MUNAP",
    fatherPhone: "083819362388",
    fatherEmail: "aswar.aph@gmail.com",
    motherName: "SETIA ASIH",
    motherPhone: "085924599633",
    motherEmail: "set114.asih@gmail.com",
    guardianName: "Lina Marlina",
    guardianNik: "3171020000000000",
    guardianBirthPlace: "Jakarta",
    guardianBirthDate: "1976-08-14",
    guardianEdu: null,
    guardianJob: null,
    guardianPhone: "082112016625",
    prevSchool: "Tunas Delima",
    prevSchoolAddress: "Jakarta",
    admissionDate: "2024-07-15"
  },
  {
    fullName: "Muhammad Dzikri Ihsan Ichwanul Rahmat",
    nipd: "252610006",
    nisn: "3102665792",
    nik: "3276050000000000",
    birthPlace: "Bogor",
    birthDate: "2010-03-27",
    address: null,
    fatherName: null,
    fatherPhone: null,
    fatherEmail: null,
    motherName: null,
    motherPhone: null,
    motherEmail: null,
    guardianName: "Irfan Miladi",
    guardianNik: null,
    guardianBirthPlace: "Tanggerang",
    guardianBirthDate: "1984-12-14",
    guardianEdu: "S1",
    guardianJob: "Wiraswasta",
    guardianPhone: "081317202184",
    prevSchool: "MI DARUL MA'ARIF",
    prevSchoolAddress: "Tanggerang",
    admissionDate: "2024-07-15"
  },
  {
    fullName: "Muhammad Vallen Gunawan",
    nipd: "252610007",
    nisn: "91832937",
    nik: "3271010000000000",
    birthPlace: "Bogor",
    birthDate: "2009-03-25",
    address: "Mutiara Bogor Raya Blok D9 No 19 Kel Katulampa - Kota Bogor Timur",
    fatherName: "Asep Gunawan",
    fatherPhone: "08179009605",
    fatherEmail: "asepg543@gmail.com",
    motherName: "Anita Usman",
    motherPhone: "083811124207",
    motherEmail: "vallen2503@gmail.com",
    guardianName: "Andri Setiawan",
    guardianNik: "3671080000000000",
    guardianBirthPlace: "Jakarta",
    guardianBirthDate: "1984-10-04",
    guardianEdu: null,
    guardianJob: "Wiraswasta",
    guardianPhone: null,
    prevSchool: "SDN Periuk 3",
    prevSchoolAddress: "Tanggerang",
    admissionDate: "2024-07-15"
  }
];

async function run() {
  try {
    const satuanPendidikanId = 2; // SMA Aldepos IBS
    const cohortId = 4; // Angkatan 2025 SMA
    const gradeLevelId = 8; // Kelas 11 SMA
    const academicYearId = 9; // 2026/2027 SMA

    // Cek atau buat rombel 11-A di SMA
    let classGroup = await dbAkademik('class_groups')
      .where({ satuan_pendidikan_id: satuanPendidikanId, name: '11-A' })
      .first();

    if (!classGroup) {
      const [newClassId] = await dbAkademik('class_groups').insert({
        satuan_pendidikan_id: satuanPendidikanId,
        academic_year_id: academicYearId,
        grade_level_id: gradeLevelId,
        name: '11-A',
        capacity: 32,
        type: 'reguler',
        created_at: dbAkademik.fn.now(),
        updated_at: dbAkademik.fn.now()
      });
      classGroup = { id: newClassId, name: '11-A' };
      console.log('Created Class Group 11-A with ID:', newClassId);
    } else {
      console.log('Found Class Group 11-A with ID:', classGroup.id);
    }

    for (const item of studentsData) {
      console.log('Inserting student:', item.fullName, 'NIPD:', item.nipd);

      const studentPayload = {
        satuan_pendidikan_id: satuanPendidikanId,
        cohort_id: cohortId,
        cohort_name: 'Angkatan 2025',
        nis: item.nipd,
        nisn: item.nisn,
        nipd: item.nipd,
        nik: item.nik,
        full_name: item.fullName,
        gender: 'L',
        birth_place: item.birthPlace,
        birth_date: item.birthDate,
        religion: 'islam',
        citizenship: 'WNI',
        student_address: item.address ? {
          street_address: item.address,
          full_address: item.address
        } : null,
        physical_data: {
          blood_type: 'tidak_tahu'
        },
        admission: {
          initial_grade_level_id: gradeLevelId,
          initial_class_group_id: classGroup.id,
          registration_type: 'siswa_baru',
          admission_date: item.admissionDate || '2025-07-15',
          previous_school_name: item.prevSchool,
          previous_school_address: item.prevSchoolAddress
        },
        academic_year_id: academicYearId,
        class_group_id: classGroup.id
      };

      const created = await studentsService.createStudent(studentPayload);
      console.log(`-> Student created ID: ${created.id} - ${created.full_name}`);

      // Save Father
      if (item.fatherName) {
        await studentsService.saveGuardian(created.id, {
          relationship: 'ayah',
          full_name: item.fatherName,
          phone: item.fatherPhone,
          email: item.fatherEmail
        });
      }

      // Save Mother
      if (item.motherName) {
        await studentsService.saveGuardian(created.id, {
          relationship: 'ibu',
          full_name: item.motherName,
          phone: item.motherPhone,
          email: item.motherEmail
        });
      }

      // Save Guardian / Wali
      if (item.guardianName) {
        await studentsService.saveGuardian(created.id, {
          relationship: 'wali',
          full_name: item.guardianName,
          nik: item.guardianNik,
          birth_place: item.guardianBirthPlace,
          birth_date: item.guardianBirthDate,
          education_level: item.guardianEdu,
          occupation: item.guardianJob,
          phone: item.guardianPhone
        });
      }
    }

    console.log('=== ALL 5 STUDENTS INSERTED SUCCESSFULLY ===');
  } catch (err) {
    console.error('ERROR INSERTING STUDENTS:', err);
  } finally {
    process.exit(0);
  }
}

run();
