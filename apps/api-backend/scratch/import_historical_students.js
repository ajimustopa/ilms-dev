/**
 * Importer Data Siswa Riwayat (Angkatan 2019 - 2026)
 * Modul Akademik Aldepos
 */
const dbAkademik = require('../src/config/db/akademik');

const rawData = [
  // --- ANGKATAN 2019 ---
  {
    name: 'Arli Putra Pratama',
    gender: 'L',
    nipd: '292007001',
    nisn: '0071761380',
    nik: '3272021303070001',
    cohortYear: 2019,
    status: 'lulus',
    history: [
      { year: '2019/2020', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2020/2021', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2021/2022', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Detas Ripalad',
    gender: 'L',
    nipd: '292007002',
    nisn: '3057107421',
    nik: '3276051412050005',
    cohortYear: 2019,
    status: 'lulus',
    history: [
      { year: '2019/2020', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2020/2021', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2021/2022', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Dherill Adri Muhamad Candra',
    gender: 'L',
    nipd: '292007003',
    nisn: '0071634521',
    nik: '3201173101070003',
    cohortYear: 2019,
    status: 'lulus',
    history: [
      { year: '2019/2020', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2020/2021', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2021/2022', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Fikri Rahmadan',
    gender: 'L',
    nipd: '292007004',
    nisn: '0068857601',
    nik: '3201070110060012',
    cohortYear: 2019,
    status: 'lulus',
    history: [
      { year: '2019/2020', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2020/2021', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2021/2022', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Khiaril Fallah Faqih Rabbani',
    gender: 'L',
    nipd: '292007005',
    nisn: '0085662753',
    nik: '3201151304080003',
    cohortYear: 2019,
    status: 'lulus',
    history: [
      { year: '2019/2020', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2020/2021', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2021/2022', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Muhamad Azwar Julhan',
    gender: 'L',
    nipd: '292007006',
    nisn: '0078401079',
    nik: '3201402903070003',
    cohortYear: 2019,
    status: 'lulus',
    history: [
      { year: '2019/2020', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2020/2021', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2021/2022', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Muhamad Bilal Agnia',
    gender: 'L',
    nipd: '292007007',
    nisn: '0062728283',
    nik: '3201402605060001',
    cohortYear: 2019,
    status: 'lulus',
    history: [
      { year: '2019/2020', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2020/2021', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2021/2022', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Muhamad Fahri Al Habsyi',
    gender: 'L',
    nipd: '292007008',
    nisn: '0071278191',
    nik: '3201401305070005',
    cohortYear: 2019,
    status: 'lulus',
    history: [
      { year: '2019/2020', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2020/2021', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2021/2022', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Muhamad Ikhsan Ar-Razi',
    gender: 'L',
    nipd: '292007009',
    nisn: '0074825990',
    nik: '3201122302070005',
    cohortYear: 2019,
    status: 'lulus',
    history: [
      { year: '2019/2020', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2020/2021', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2021/2022', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Muhammad Nafis Mumtaz Mukhlis',
    gender: 'L',
    nipd: '292007010',
    nisn: '0078253716',
    nik: '3201101301070002',
    cohortYear: 2019,
    status: 'lulus',
    history: [
      { year: '2019/2020', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2020/2021', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2021/2022', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Muhammad Raihan Sidik',
    gender: 'L',
    nipd: '292007011',
    nisn: '0073285695',
    nik: '3174090504070002',
    cohortYear: 2019,
    status: 'lulus',
    history: [
      { year: '2019/2020', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2020/2021', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2021/2022', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Muhammad Vikri Ramdhani',
    gender: 'L',
    nipd: '292007012',
    nisn: '3069137621',
    nik: '3201400810060001',
    cohortYear: 2019,
    status: 'lulus',
    history: [
      { year: '2019/2020', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2020/2021', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2021/2022', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Rafiv Fauzi Muhammad',
    gender: 'L',
    nipd: '292007013',
    nisn: '0061657796',
    nik: '3173022309061003',
    cohortYear: 2019,
    status: 'lulus',
    history: [
      { year: '2019/2020', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2020/2021', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2021/2022', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Satrio Utomo',
    gender: 'L',
    nipd: '292007014',
    nisn: '0072436854',
    nik: '3271021506070009',
    cohortYear: 2019,
    status: 'lulus',
    history: [
      { year: '2019/2020', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2020/2021', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2021/2022', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Sultan Hakim',
    gender: 'L',
    nipd: '292007015',
    nisn: '0062030901',
    nik: '3201170208060004',
    cohortYear: 2019,
    status: 'lulus',
    history: [
      { year: '2019/2020', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2020/2021', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2021/2022', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },

  // --- ANGKATAN 2020 ---
  {
    name: 'Ahmad Adam Anandya Darmawan',
    gender: 'L',
    nipd: '202107001',
    nisn: '0089454764',
    nik: '3175100303080005',
    cohortYear: 2020,
    status: 'lulus',
    history: [
      { year: '2020/2021', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2021/2022', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2022/2023', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Ahmad Ghofur Ibrahim',
    gender: 'L',
    nipd: '202107002',
    nisn: '0087717206',
    nik: '3276021709080007',
    cohortYear: 2020,
    status: 'lulus',
    history: [
      { year: '2020/2021', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2021/2022', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2022/2023', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Bagas Putra Pratama',
    gender: 'L',
    nipd: '202107003',
    nisn: '0089748830',
    nik: '3172021505080005',
    cohortYear: 2020,
    status: 'lulus',
    history: [
      { year: '2020/2021', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2021/2022', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2022/2023', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Choky Hasher Barreeq Tambunan',
    gender: 'L',
    nipd: '202107004',
    nisn: '0083154119',
    nik: '3173020302081002',
    cohortYear: 2020,
    status: 'lulus',
    history: [
      { year: '2020/2021', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2021/2022', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2022/2023', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Defachri Bagja Zein',
    gender: 'L',
    nipd: '202107005',
    nisn: '0086385563',
    nik: '3603282405080012',
    cohortYear: 2020,
    status: 'lulus',
    history: [
      { year: '2020/2021', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2021/2022', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2022/2023', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Denadhif Azka Keandra',
    gender: 'L',
    nipd: '202107006',
    nisn: '0089709876',
    nik: '3674031111070007',
    cohortYear: 2020,
    status: 'lulus',
    history: [
      { year: '2020/2021', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2021/2022', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2022/2023', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Ikhwan Dwi Haqiqi',
    gender: 'L',
    nipd: '202107007',
    nisn: '0075891720',
    nik: '3171081812070004',
    cohortYear: 2020,
    status: 'lulus',
    history: [
      { year: '2020/2021', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2021/2022', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2022/2023', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Muhamad Akbar',
    gender: 'L',
    nipd: '202107008',
    nisn: '0071523884',
    nik: '3201171301070003',
    cohortYear: 2020,
    status: 'lulus',
    history: [
      { year: '2020/2021', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2021/2022', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2022/2023', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Muhammad Akmal Raditya Suharyanto',
    gender: 'L',
    nipd: '202107009',
    nisn: '0078099319',
    nik: '3174052408070001',
    cohortYear: 2020,
    status: 'lulus',
    history: [
      { year: '2020/2021', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2021/2022', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2022/2023', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Muhammad Al-Farizqi Fauzi',
    gender: 'L',
    nipd: '202107010',
    nisn: '0088445628',
    nik: '3201400102080002',
    cohortYear: 2020,
    status: 'lulus',
    history: [
      { year: '2020/2021', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2021/2022', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2022/2023', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Muhammad Syaifullah Al Ghifari',
    gender: 'L',
    nipd: '202107011',
    nisn: '0084317633',
    nik: '3173050809080007',
    cohortYear: 2020,
    status: 'lulus',
    history: [
      { year: '2020/2021', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2021/2022', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2022/2023', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Muhammad Zidane Rizkiqo',
    gender: 'L',
    nipd: '202107012',
    nisn: '0074167438',
    nik: '3603200911070005',
    cohortYear: 2020,
    status: 'lulus',
    history: [
      { year: '2020/2021', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2021/2022', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2022/2023', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Raffi Alrajaani',
    gender: 'L',
    nipd: '202107013',
    nisn: '0086151737',
    nik: '1871022102080004',
    cohortYear: 2020,
    status: 'lulus',
    history: [
      { year: '2020/2021', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2021/2022', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2022/2023', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Raffi Najib Attarmidzi',
    gender: 'L',
    nipd: '202107014',
    nisn: '0076230628',
    nik: '3201111104070004',
    cohortYear: 2020,
    status: 'lulus',
    history: [
      { year: '2020/2021', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2021/2022', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2022/2023', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Rangga Ibadillah',
    gender: 'L',
    nipd: '202107015',
    nisn: '0099198802',
    nik: '3208041503090001',
    cohortYear: 2020,
    status: 'lulus',
    history: [
      { year: '2020/2021', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2021/2022', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2022/2023', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Sultan Muhammad Naufal Rezfan',
    gender: 'L',
    nipd: '202107016',
    nisn: '0073313638',
    nik: '3275090612070003',
    cohortYear: 2020,
    status: 'lulus',
    history: [
      { year: '2020/2021', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2021/2022', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2022/2023', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Syahrisat Putra Birdian',
    gender: 'L',
    nipd: '202107017',
    nisn: '0089960090',
    nik: '3174010803080003',
    cohortYear: 2020,
    status: 'lulus',
    history: [
      { year: '2020/2021', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2021/2022', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2022/2023', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },

  // --- ANGKATAN 2021 ---
  {
    name: 'Fadzli Arif',
    gender: 'L',
    nipd: '212207001',
    nisn: '0088818390',
    nik: '1671041611080006',
    cohortYear: 2021,
    status: 'lulus',
    history: [
      { year: '2021/2022', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2022/2023', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2023/2024', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Muhamad Ibnu Aqil',
    gender: 'L',
    nipd: '212207002',
    nisn: '0089971346',
    nik: '3671082012080004',
    cohortYear: 2021,
    status: 'lulus',
    history: [
      { year: '2021/2022', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2022/2023', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2023/2024', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Muhammad Affan Emerald Lubis',
    gender: 'L',
    nipd: '212207003',
    nisn: '0094467967',
    nik: '2171033010090001',
    cohortYear: 2021,
    status: 'lulus',
    history: [
      { year: '2021/2022', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2022/2023', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2023/2024', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: "Muhammad Al'Abyan Mulki",
    gender: 'L',
    nipd: '212207004',
    nisn: '0089909191',
    nik: '3204132612080006',
    cohortYear: 2021,
    status: 'lulus',
    history: [
      { year: '2021/2022', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2022/2023', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2023/2024', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Muhammad Fauzan Hariyanto',
    gender: 'L',
    nipd: '212207005',
    nisn: '0084351176',
    nik: '5171033012080003',
    cohortYear: 2021,
    status: 'lulus',
    history: [
      { year: '2021/2022', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2022/2023', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2023/2024', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Muhammad Raihan Rizqi Ramadan',
    gender: 'L',
    nipd: '212207006',
    nisn: '0098259114',
    nik: '3275010209090002',
    cohortYear: 2021,
    status: 'lulus',
    history: [
      { year: '2021/2022', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2022/2023', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2023/2024', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Muhammad Tegar Cadmiesa Saputra',
    gender: 'L',
    nipd: '212207007',
    nisn: '0097118563',
    nik: '3201250407090001',
    cohortYear: 2021,
    status: 'lulus',
    history: [
      { year: '2021/2022', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2022/2023', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2023/2024', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Narendra Hutama Putra',
    gender: 'L',
    nipd: '212207008',
    nisn: '0091943083',
    nik: '3175092204091007',
    cohortYear: 2021,
    status: 'lulus',
    history: [
      { year: '2021/2022', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2022/2023', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2023/2024', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },

  // --- ANGKATAN 2022 ---
  {
    name: 'Abdu Rasyid Nasution',
    gender: 'L',
    nipd: '222307001',
    nisn: '0109043934',
    nik: '3201301301100003',
    cohortYear: 2022,
    status: 'lulus',
    history: [
      { year: '2022/2023', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2023/2024', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2024/2025', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Ahnaf Satria Khotib',
    gender: 'L',
    nipd: '222307003',
    nisn: '0107963388',
    nik: '3674070503100001',
    cohortYear: 2022,
    status: 'lulus',
    history: [
      { year: '2022/2023', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2023/2024', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2024/2025', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Fauzy Alzidansyah',
    gender: 'L',
    nipd: '222307005',
    nisn: '0098759899',
    nik: '3201402207090001',
    cohortYear: 2022,
    status: 'lulus',
    history: [
      { year: '2022/2023', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2023/2024', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2024/2025', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Febrian Alvito Fahrezi',
    gender: 'L',
    nipd: '222307006',
    nisn: '0101460614',
    nik: '3173050102101004',
    cohortYear: 2022,
    status: 'lulus',
    history: [
      { year: '2022/2023', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2023/2024', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2024/2025', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Ferdian Alvito Fahrezi',
    gender: 'L',
    nipd: '222307007',
    nisn: '0108376347',
    nik: '3173050102101005',
    cohortYear: 2022,
    status: 'lulus',
    history: [
      { year: '2022/2023', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2023/2024', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2024/2025', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Hanif Zaidan Wahyu Rizqillah',
    gender: 'L',
    nipd: '222307008',
    nisn: '3100900286',
    nik: '3275060307100003',
    cohortYear: 2022,
    status: 'lulus',
    history: [
      { year: '2022/2023', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2023/2024', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2024/2025', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Kennard Aljabbar',
    gender: 'L',
    nipd: '222307009',
    nisn: '0105255538',
    nik: '3175040804100000',
    cohortYear: 2022,
    status: 'lulus',
    history: [
      { year: '2022/2023', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2023/2024', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2024/2025', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Muhammad Rasya Fadhil',
    gender: 'L',
    nipd: '222307012',
    nisn: '0109085683',
    nik: '3174092703100003',
    cohortYear: 2022,
    status: 'lulus',
    history: [
      { year: '2022/2023', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2023/2024', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2024/2025', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Muhammad Yasir',
    gender: 'L',
    nipd: '222307013',
    nisn: '0104006930',
    nik: '3201101605100002',
    cohortYear: 2022,
    status: 'lulus',
    history: [
      { year: '2022/2023', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2023/2024', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2024/2025', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Rafa Zahran Raditya',
    gender: 'L',
    nipd: '222307014',
    nisn: '0101895365',
    nik: '3201312202100000',
    cohortYear: 2022,
    status: 'lulus',
    history: [
      { year: '2022/2023', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2023/2024', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2024/2025', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Rafif Alandi Zahfran',
    gender: 'L',
    nipd: '222307015',
    nisn: '0091535879',
    nik: '3276012908090001',
    cohortYear: 2022,
    status: 'lulus',
    history: [
      { year: '2022/2023', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2023/2024', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2024/2025', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Rafka Putra Pratama',
    gender: 'L',
    nipd: '222307016',
    nisn: '0106040702',
    nik: '3271010503100004',
    cohortYear: 2022,
    status: 'lulus',
    history: [
      { year: '2022/2023', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2023/2024', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2024/2025', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Nafa Zalalatifah Manap',
    gender: 'P',
    nipd: '242509054',
    nisn: '3103848815',
    nik: '3271025307100002',
    cohortYear: 2022,
    status: 'lulus',
    history: [
      { year: '2022/2023', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2023/2024', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2024/2025', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },

  // --- ANGKATAN 2023 ---
  {
    name: 'Ahmad Izzul Auliya Sougi',
    gender: 'L',
    nipd: '232407001',
    nisn: '0111845190',
    nik: '3174082910111008',
    cohortYear: 2023,
    status: 'lulus',
    history: [
      { year: '2023/2024', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2024/2025', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2025/2026', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Ahmad Zhafif Prayata',
    gender: 'L',
    nipd: '242508053',
    nisn: '0109344929',
    nik: '3216020509100013',
    cohortYear: 2023,
    status: 'lulus',
    history: [
      { year: '2023/2024', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2024/2025', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2025/2026', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Calvin Farezky Putra',
    gender: 'L',
    nipd: '232407002',
    nisn: '0118622903',
    nik: '3201400201110001',
    cohortYear: 2023,
    status: 'lulus',
    history: [
      { year: '2023/2024', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2024/2025', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2025/2026', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Darvesh Arfa Sura Amrizal',
    gender: 'L',
    nipd: '232407003',
    nisn: '0102850520',
    nik: '3671130410100002',
    cohortYear: 2023,
    status: 'lulus',
    history: [
      { year: '2023/2024', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2024/2025', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2025/2026', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Fadlin Azzaman Harahap',
    gender: 'L',
    nipd: '232407004',
    nisn: '0113428128',
    nik: '3276031301110003',
    cohortYear: 2023,
    status: 'lulus',
    history: [
      { year: '2023/2024', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2024/2025', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2025/2026', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Kenzo Shevano Sarkies',
    gender: 'L',
    nipd: '232407005',
    nisn: '0105246301',
    nik: '6471062009100001',
    cohortYear: 2023,
    status: 'lulus',
    history: [
      { year: '2023/2024', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2024/2025', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2025/2026', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Muhamad Nabhan Fatur Maulana',
    gender: 'L',
    nipd: '232407007',
    nisn: '0112434921',
    nik: '3201402501110003',
    cohortYear: 2023,
    status: 'lulus',
    history: [
      { year: '2023/2024', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2024/2025', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2025/2026', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Muhamad Arkana Nahl Ramazan',
    gender: 'L',
    nipd: '232407009',
    nisn: '0106791643',
    nik: '3174101708101011',
    cohortYear: 2023,
    status: 'lulus',
    history: [
      { year: '2023/2024', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2024/2025', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2025/2026', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Muhammad Dwi Aprianto',
    gender: 'L',
    nipd: '232407010',
    nisn: '0111607063',
    nik: '3201251904110001',
    cohortYear: 2023,
    status: 'lulus',
    history: [
      { year: '2023/2024', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2024/2025', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2025/2026', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Muhammad Yudistira Nupriyanto',
    gender: 'L',
    nipd: '232407008',
    nisn: '0107229449',
    nik: '3174092112101006',
    cohortYear: 2023,
    status: 'lulus',
    history: [
      { year: '2023/2024', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2024/2025', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2025/2026', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Muhammad Zaki Kusuma Raharjo',
    gender: 'L',
    nipd: '232407011',
    nisn: '0105365061',
    nik: '3275042212100002',
    cohortYear: 2023,
    status: 'lulus',
    history: [
      { year: '2023/2024', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2024/2025', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2025/2026', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Raditya Pratama',
    gender: 'L',
    nipd: '232407012',
    nisn: '0108471804',
    nik: '3201170211100001',
    cohortYear: 2023,
    status: 'lulus',
    history: [
      { year: '2023/2024', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2024/2025', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2025/2026', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Sehha Alfiro',
    gender: 'L',
    nipd: '232407013',
    nisn: '0114394827',
    nik: '3201401701110001',
    cohortYear: 2023,
    status: 'lulus',
    history: [
      { year: '2023/2024', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2024/2025', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2025/2026', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Syafiq Hannan Purba',
    gender: 'L',
    nipd: '232407014',
    nisn: '3107243021',
    nik: '3201172608100003',
    cohortYear: 2023,
    status: 'lulus',
    history: [
      { year: '2023/2024', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2024/2025', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2025/2026', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Wildan Rayyan Sunhara',
    gender: 'L',
    nipd: '232407015',
    nisn: '0111814798',
    nik: '3275040302110006',
    cohortYear: 2023,
    status: 'lulus',
    history: [
      { year: '2023/2024', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2024/2025', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2025/2026', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },
  {
    name: 'Muhamad Fadlan Satibi',
    gender: 'L',
    nipd: '242508056',
    nisn: '0101401829',
    nik: '3273152812100004',
    cohortYear: 2023,
    status: 'lulus',
    history: [
      { year: '2023/2024', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2024/2025', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2025/2026', class: '9-A', status: 'lulus', decision: 'graduated', type: 'promotion' }
    ]
  },

  // --- ANGKATAN 2024 ---
  {
    name: 'Muhamad Alfi Rizkiyansah',
    gender: 'L',
    nipd: '242507001',
    nisn: '3122534898',
    nik: '3201400401120001',
    cohortYear: 2024,
    status: 'aktif',
    history: [
      { year: '2024/2025', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2025/2026', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2026/2027', class: '9-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Muhammad Daffa Alfaridzi',
    gender: 'L',
    nipd: '242507002',
    nisn: '0115499777',
    nik: '3374110810110001',
    cohortYear: 2024,
    status: 'aktif',
    history: [
      { year: '2024/2025', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2025/2026', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2026/2027', class: '9-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Muhammad Dzulfiqar Athaillah',
    gender: 'L',
    nipd: '242507003',
    nisn: '0124481291',
    nik: '3173021407121005',
    cohortYear: 2024,
    status: 'aktif',
    history: [
      { year: '2024/2025', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2025/2026', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2026/2027', class: '9-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Muhamad Nizar Irfan Asshidiiq',
    gender: 'L',
    nipd: '242507004',
    nisn: '0128101213',
    nik: '3671052001120004',
    cohortYear: 2024,
    status: 'aktif',
    history: [
      { year: '2024/2025', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2025/2026', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2026/2027', class: '9-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Nur Ardhy Prabu Airlangga',
    gender: 'L',
    nipd: '242507005',
    nisn: '0111430552',
    nik: '3671080205110001',
    cohortYear: 2024,
    status: 'aktif',
    history: [
      { year: '2024/2025', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2025/2026', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2026/2027', class: '9-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Zhahir Ahmad Al-Ghifari',
    gender: 'L',
    nipd: '242507006',
    nisn: '0118000887',
    nik: '3172030103111011',
    cohortYear: 2024,
    status: 'aktif',
    history: [
      { year: '2024/2025', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2025/2026', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2026/2027', class: '9-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Nafis Al Anshari',
    gender: 'L',
    nipd: '242507053',
    nisn: '3111038059',
    nik: '3201311805110003',
    cohortYear: 2024,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'transfer_in' },
      { year: '2026/2027', class: '9-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Sulaiman Abdul Wahid',
    gender: 'L',
    nipd: '252608001',
    nisn: '0116099887',
    nik: '3201310412110003',
    cohortYear: 2024,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'transfer_in' },
      { year: '2026/2027', class: '9-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Muhammad Faizzul Azzam',
    gender: 'L',
    nipd: '252608002',
    nisn: '0112702102',
    nik: '3175070411111001',
    cohortYear: 2024,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'transfer_in' },
      { year: '2026/2027', class: '9-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Muhamma Zafri Rais Ichwanul Fikri',
    gender: 'L',
    nipd: '252608003',
    nisn: '0125413170',
    nik: '3276050905120004',
    cohortYear: 2024,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'transfer_in' },
      { year: '2026/2027', class: '9-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'M. Salman Alfarizi',
    gender: 'L',
    nipd: '252608004',
    nisn: '3121907925',
    nik: '3201402502120003',
    cohortYear: 2024,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '8-A', status: 'naik_kelas', decision: 'promoted', type: 'transfer_in' },
      { year: '2026/2027', class: '9-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Alexandra Lovely',
    gender: 'P',
    nipd: '242507007',
    nisn: '0117767124',
    nik: '3171085210111004',
    cohortYear: 2024,
    status: 'aktif',
    history: [
      { year: '2024/2025', class: '7-B', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2025/2026', class: '8-B', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2026/2027', class: '9-B', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Bilbina Adara P Musy',
    gender: 'P',
    nipd: '242507008',
    nisn: '0127786553',
    nik: '8201016002120001',
    cohortYear: 2024,
    status: 'aktif',
    history: [
      { year: '2024/2025', class: '7-B', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2025/2026', class: '8-B', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2026/2027', class: '9-B', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Fika Sulistia',
    gender: 'P',
    nipd: '242507009',
    nisn: '0117241184',
    nik: '3201406705130002',
    cohortYear: 2024,
    status: 'aktif',
    history: [
      { year: '2024/2025', class: '7-B', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2025/2026', class: '8-B', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2026/2027', class: '9-B', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Muflikha Aulia Achmad',
    gender: 'P',
    nipd: '242507010',
    nisn: '0115348554',
    nik: '3173064511111007',
    cohortYear: 2024,
    status: 'aktif',
    history: [
      { year: '2024/2025', class: '7-B', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2025/2026', class: '8-B', status: 'naik_kelas', decision: 'promoted', type: 'promotion' },
      { year: '2026/2027', class: '9-B', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },

  // --- ANGKATAN 2025 ---
  {
    name: 'Abdul Wahab Al Akbar',
    gender: 'L',
    nipd: '252607001',
    nisn: '0122918360',
    nik: '3404122105120004',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Albani Musthafa',
    gender: 'L',
    nipd: '252607002',
    nisn: '3129386998',
    nik: '3275030111120009',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Alvan Al-Mahally',
    gender: 'L',
    nipd: '252607003',
    nisn: '3130053717',
    nik: '3174102002131009',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Muhammad Arya Wicaksana Raharjo',
    gender: 'L',
    nipd: '252607005',
    nisn: '3128928092',
    nik: '3275041412120001',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Aufa Nararya',
    gender: 'L',
    nipd: '252607006',
    nisn: '3126173146',
    nik: '3275030807120001',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Azam Amirrudin',
    gender: 'L',
    nipd: '252607007',
    nisn: '3125450802',
    nik: '3201071002120001',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Dzakwan Faidlurahman',
    gender: 'L',
    nipd: '252607010',
    nisn: '3129937641',
    nik: '3271041408120001',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Feyza Attaya Devan',
    gender: 'L',
    nipd: '252607011',
    nisn: '0123006451',
    nik: '3171030808121010',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Ghaza Al Azzam',
    gender: 'L',
    nipd: '252607012',
    nisn: '3124086932',
    nik: '3201021812120009',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Ghiffari Ahmad Furqan',
    gender: 'L',
    nipd: '252607013',
    nisn: '0131523140',
    nik: '3175090302131006',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Gifahri Khaerul Azam',
    gender: 'L',
    nipd: '252607014',
    nisn: '3133108844',
    nik: '3604221804130002',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Mohammad Rahadian Akbar',
    gender: 'L',
    nipd: '252607018',
    nisn: '0136795418',
    nik: '3271040304130005',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Muhammad Dzaky Alkhalifi',
    gender: 'L',
    nipd: '252607019',
    nisn: '3135105882',
    nik: '3374111602130001',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Muhammad Reagan Haziq Al-Arkana',
    gender: 'L',
    nipd: '252607020',
    nisn: '3136159527',
    nik: '3216090203130006',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Muhammad Rifki Firdaus',
    gender: 'L',
    nipd: '252607021',
    nisn: '3136632942',
    nik: '3201392201130004',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Muhammad Daibbara Erlangga',
    gender: 'L',
    nipd: '252607022',
    nisn: '3137288922',
    nik: '3201402806131001',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Muhammad Fathan Nugraha',
    gender: 'L',
    nipd: '252607023',
    nisn: '3131655567',
    nik: '3172021003131011',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Muhammad Izza Hasbi Rabbani',
    gender: 'L',
    nipd: '252607024',
    nisn: '3132594636',
    nik: '3276030404130005',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Muhammad Reza Rasyid',
    gender: 'L',
    nipd: '252607025',
    nisn: '0135404723',
    nik: '3215090309130003',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Narendra Adelio Putra',
    gender: 'L',
    nipd: '252607026',
    nisn: '0127593365',
    nik: '3674066007120002',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Raffan Arya Abimanyu Nugroho',
    gender: 'L',
    nipd: '252607029',
    nisn: '0116976467',
    nik: '3173082309111005',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Raja Anaqi Luthfi',
    gender: 'L',
    nipd: '252607031',
    nisn: '3129696513',
    nik: '3201010709120006',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Sayyid Muhammad Daud Al Rasyid',
    gender: 'L',
    nipd: '252607032',
    nisn: '3137744000',
    nik: '3674021205130002',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Wildan Hafidz',
    gender: 'L',
    nipd: '252607035',
    nisn: '3120890114',
    nik: '3175063012121016',
    cohortYear: 2025,
    status: 'keluar',
    history: [
      { year: '2025/2026', class: '7-A', status: 'pindah', decision: 'dropped_out', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Zaidan Rasyid Afianto',
    gender: 'L',
    nipd: '252607037',
    nisn: '3135684390',
    nik: '3271032005130001',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-A', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-A', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Mercy Audrey Hadi',
    gender: 'L',
    nipd: '262707092',
    nisn: '3130676854',
    nik: null,
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '8-A', status: 'aktif', decision: 'active', type: 'transfer_in' }
    ]
  },
  {
    name: 'Arsha Syakira Syamsudin',
    gender: 'P',
    nipd: '252607004',
    nisn: '3135110692',
    nik: '3671026408130002',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-B', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-B', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Cinta Az-Zahra Tuahuns',
    gender: 'P',
    nipd: '252607008',
    nisn: '3139100235',
    nik: '3275036202130004',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-B', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-B', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Denaya Elvaretta Shahia Rizqullah',
    gender: 'P',
    nipd: '252607009',
    nisn: '0132644715',
    nik: '3202336108130002',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-B', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-B', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Haura Nafiatul Usman',
    gender: 'P',
    nipd: '252607015',
    nisn: '3133151528',
    nik: '3313176001130002',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-B', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-B', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Karenza Aisyah Rahman',
    gender: 'P',
    nipd: '252607016',
    nisn: '3130134794',
    nik: '3171044603131004',
    cohortYear: 2025,
    status: 'keluar',
    history: [
      { year: '2025/2026', class: '7-B', status: 'pindah', decision: 'dropped_out', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Khaira Talita Sakhi',
    gender: 'P',
    nipd: '252607017',
    nisn: '3136130724',
    nik: '3202155803130001',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-B', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-B', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Nayla Metya Dwi Pangestri',
    gender: 'P',
    nipd: '252607027',
    nisn: '3138348476',
    nik: '3171034605131010',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-B', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-B', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Nessya Putri Falecia',
    gender: 'P',
    nipd: '252607028',
    nisn: '0121605929',
    nik: '3674062007120009',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-B', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-B', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Raihana Jauza Anwar',
    gender: 'P',
    nipd: '252607030',
    nisn: '3139166331',
    nik: '3174084802131007',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-B', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-B', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Shina Almahyra Qiana',
    gender: 'P',
    nipd: '252607033',
    nisn: '3126220970',
    nik: '3201136709120002',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-B', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-B', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Three Aulia Adha',
    gender: 'P',
    nipd: '252607034',
    nisn: '3128568997',
    nik: '3674016510120004',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-B', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-B', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Yumna Aqila Rahmah',
    gender: 'P',
    nipd: '252607036',
    nisn: '0122938817',
    nik: '3174090106121009',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-B', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-B', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },
  {
    name: 'Zaskia Salsabila Assafa',
    gender: 'P',
    nipd: '252607038',
    nisn: '0121746128',
    nik: '3174076309121001',
    cohortYear: 2025,
    status: 'aktif',
    history: [
      { year: '2025/2026', class: '7-B', status: 'naik_kelas', decision: 'promoted', type: 'initial_enrollment' },
      { year: '2026/2027', class: '8-B', status: 'aktif', decision: 'active', type: 'promotion' }
    ]
  },

  // --- ANGKATAN 2026 ---
  {
    name: 'Abdan Tsabit Muhammad Aurum Disaputra',
    gender: 'L',
    nipd: '262707001',
    nisn: '3142864240',
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-A', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Akhdan Wafi As Sakha',
    gender: 'L',
    nipd: '262707002',
    nisn: '0134146201',
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-A', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Albiruni Raihan Rahman',
    gender: 'L',
    nipd: '262707003',
    nisn: '3130019537',
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-A', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Alrayyan Oktiariza Munap',
    gender: 'L',
    nipd: '262707004',
    nisn: '3133763034',
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-A', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Atabika Ihsan Alfaruk',
    gender: 'L',
    nipd: '262707005',
    nisn: '3137578189',
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-A', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Faezya Muhammad Zayyan',
    gender: 'L',
    nipd: '262707006',
    nisn: '3131328986',
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-A', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Farel Kyafri Alkhalifa Rozi',
    gender: 'L',
    nipd: '262707007',
    nisn: '3133635670',
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-A', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Galang Zafran Zaidan',
    gender: 'L',
    nipd: '262707008',
    nisn: '0133488197',
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-A', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Ibrahim Ahnaf Abdullah',
    gender: 'L',
    nipd: '262707009',
    nisn: '0132982702',
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-A', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Khalil Al Ghifari',
    gender: 'L',
    nipd: '262707010',
    nisn: '0148599928',
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-A', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Lius Berwin Chandra',
    gender: 'L',
    nipd: '262707011',
    nisn: '3134312525',
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-A', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Muhammad Azka Kaindra',
    gender: 'L',
    nipd: '262707012',
    nisn: '0136376520',
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-A', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Muhammad Hamim Al Biruni',
    gender: 'L',
    nipd: '262707013',
    nisn: '0134840462',
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-A', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Muhammad Rayyan Eldiaz',
    gender: 'L',
    nipd: '262707014',
    nisn: '3138560134',
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-A', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Muhammad Wildan Rae Narendra',
    gender: 'L',
    nipd: '262707015',
    nisn: '0137804837',
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-A', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Muhammad Zaidan Nuryaafi',
    gender: 'L',
    nipd: '262707016',
    nisn: '3141232817',
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-A', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Nabhan Az Zuhdi',
    gender: 'L',
    nipd: '262707017',
    nisn: '3142057540',
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-A', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Paris Aska Mustakin',
    gender: 'L',
    nipd: '262707018',
    nisn: '3135596747',
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-A', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Rafardhan Hanan Al khalifi',
    gender: 'L',
    nipd: '262707019',
    nisn: '0142558027',
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-A', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Uray Muhammad Azka Prasraya',
    gender: 'L',
    nipd: '262707020',
    nisn: '0146261648',
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-A', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Alysa Wardatul Zhahira',
    gender: 'P',
    nipd: '262707021',
    nisn: '0136789465',
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-B', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Anindita Nadhifa Putri',
    gender: 'P',
    nipd: '262707022',
    nisn: '0138163805',
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-B', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Aqillatisha Nurlaeca',
    gender: 'P',
    nipd: '262707023',
    nisn: '3139772513',
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-B', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Azzahra Nadhifa Qolbi',
    gender: 'P',
    nipd: '262707024',
    nisn: '0135457166',
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-B', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Channeyzha Al-Myrha Diaga',
    gender: 'P',
    nipd: '262707025',
    nisn: '0149220174',
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-B', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Farisha Shanum',
    gender: 'P',
    nipd: '262707026',
    nisn: '3147805746',
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-B', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Firyal Ayra Hifzhiya',
    gender: 'P',
    nipd: '262707027',
    nisn: '3133802999',
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-B', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Keisa Ivana Sakhi',
    gender: 'P',
    nipd: '262707028',
    nisn: '3142831886',
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-B', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Khanza Alifia Sabilah',
    gender: 'P',
    nipd: '262707029',
    nisn: '3146031868',
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-B', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Nadhifa Qalbi Hernovika',
    gender: 'P',
    nipd: '262707030',
    nisn: '3135804760',
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-B', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Sayyidati Noor Kummala Najwa',
    gender: 'P',
    nipd: '262707031',
    nisn: '3131744890',
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-B', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Sheeyna Khumaira Sativa',
    gender: 'P',
    nipd: '262707032',
    nisn: '3149679104',
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-B', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Zeevhanya Ramadhania',
    gender: 'P',
    nipd: '262707033',
    nisn: '3148210451',
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-B', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Rumni Syahira Ramdan',
    gender: 'P',
    nipd: '262707034',
    nisn: null,
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-B', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  },
  {
    name: 'Khayla Anindhiya Setya',
    gender: 'P',
    nipd: '262707035',
    nisn: null,
    nik: null,
    cohortYear: 2026,
    status: 'aktif',
    history: [
      { year: '2026/2027', class: '7-B', status: 'aktif', decision: 'active', type: 'initial_enrollment' }
    ]
  }
];

async function runImport() {
  console.log('================================================================');
  console.log('STARTING IMPORT DATA SISWA RIWAYAT 2019 - 2026');
  console.log('================================================================\n');

  const schoolUnitId = 1; // SMP Aldepos

  // 1. Pastikan seluruh Academic Years (2019/2020 s/d 2026/2027) ada
  const requiredYears = [
    { name: '2019/2020', start: '2019-07-15', end: '2020-06-20', isActive: 0 },
    { name: '2020/2021', start: '2020-07-15', end: '2021-06-20', isActive: 0 },
    { name: '2021/2022', start: '2021-07-15', end: '2022-06-20', isActive: 0 },
    { name: '2022/2023', start: '2022-07-15', end: '2023-06-20', isActive: 0 },
    { name: '2023/2024', start: '2023-07-15', end: '2024-06-20', isActive: 0 },
    { name: '2024/2025', start: '2024-07-01', end: '2025-06-30', isActive: 0 },
    { name: '2025/2026', start: '2025-07-15', end: '2026-06-20', isActive: 0 },
    { name: '2026/2027', start: '2026-07-15', end: '2027-06-20', isActive: 1 }
  ];

  const yearMap = {}; // name -> id
  for (const y of requiredYears) {
    let exist = await dbAkademik('academic_years')
      .where({ satuan_pendidikan_id: schoolUnitId, name: y.name })
      .first();

    if (!exist) {
      const [newId] = await dbAkademik('academic_years').insert({
        satuan_pendidikan_id: schoolUnitId,
        name: y.name,
        start_date: y.start,
        end_date: y.end,
        is_active: y.isActive,
        minutes_per_jp: 40
      });
      yearMap[y.name] = newId;
      console.log(`[+] Created Academic Year: ${y.name} (ID: ${newId})`);
    } else {
      yearMap[y.name] = exist.id;
    }
  }

  // 2. Pastikan seluruh Cohorts (2019 s/d 2026) ada
  const cohortMap = {}; // year -> id
  const requiredCohorts = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
  for (const cYear of requiredCohorts) {
    let exist = await dbAkademik('cohorts')
      .where({ satuan_pendidikan_id: schoolUnitId, year: String(cYear) })
      .first();

    if (!exist) {
      const [newId] = await dbAkademik('cohorts').insert({
        satuan_pendidikan_id: schoolUnitId,
        year: String(cYear),
        name: `Angkatan ${cYear}`,
        is_active: 1
      });
      cohortMap[cYear] = newId;
      console.log(`[+] Created Cohort: Angkatan ${cYear} (ID: ${newId})`);
    } else {
      cohortMap[cYear] = exist.id;
    }
  }

  // 3. Pastikan Grade Levels (Kelas 7, Kelas 8, Kelas 9) ada
  const gradeMap = {}; // '7' -> id, '8' -> id, '9' -> id
  const gradeLevels = await dbAkademik('grade_levels').where({ satuan_pendidikan_id: schoolUnitId });
  gradeLevels.forEach(g => {
    if (g.name.includes('7')) gradeMap['7'] = g.id;
    if (g.name.includes('8')) gradeMap['8'] = g.id;
    if (g.name.includes('9')) gradeMap['9'] = g.id;
  });

  // 4. Helper get or create Class Group (Rombel)
  const classMap = {}; // `${yearName}_${className}` -> id
  async function getClassGroupId(yearName, className) {
    const key = `${yearName}_${className}`;
    if (classMap[key]) return classMap[key];

    const academicYearId = yearMap[yearName];
    if (!academicYearId) throw new Error(`Academic Year not found for ${yearName}`);

    const gradeOrder = className.startsWith('7') ? '7' : className.startsWith('8') ? '8' : '9';
    const gradeLevelId = gradeMap[gradeOrder] || 1;

    let exist = await dbAkademik('class_groups')
      .where({
        satuan_pendidikan_id: schoolUnitId,
        academic_year_id: academicYearId,
        name: className
      })
      .first();

    if (!exist) {
      const [newId] = await dbAkademik('class_groups').insert({
        satuan_pendidikan_id: schoolUnitId,
        academic_year_id: academicYearId,
        grade_level_id: gradeLevelId,
        name: className,
        capacity: 35,
        type: 'reguler'
      });
      classMap[key] = newId;
      console.log(`[+] Created Class Group ${className} for TA ${yearName} (ID: ${newId})`);
      return newId;
    } else {
      classMap[key] = exist.id;
      return exist.id;
    }
  }

  // 5. Loop & Import Students
  let insertedCount = 0;
  let updatedCount = 0;
  let skippedDuplicates = 0;

  for (const s of rawData) {
    const cohortId = cohortMap[s.cohortYear];
    const cleanNipd = s.nipd ? s.nipd.trim() : null;
    const cleanNisn = s.nisn ? s.nisn.trim() : null;
    const cleanNik = s.nik ? s.nik.trim() : null;

    // Cek keberadaan siswa berdasar NIPD atau NISN atau Nama + Cohort
    let existing = null;
    if (cleanNipd) {
      existing = await dbAkademik('students')
        .where('satuan_pendidikan_id', schoolUnitId)
        .where(function() {
          this.where('nipd', cleanNipd).orWhere('nis', cleanNipd);
        })
        .first();
    }
    if (!existing && cleanNisn) {
      existing = await dbAkademik('students')
        .where({ satuan_pendidikan_id: schoolUnitId, nisn: cleanNisn })
        .first();
    }
    if (!existing) {
      existing = await dbAkademik('students')
        .where({ satuan_pendidikan_id: schoolUnitId, cohort_id: cohortId, full_name: s.name.trim() })
        .first();
    }

    let studentId;
    if (existing) {
      studentId = existing.id;
      await dbAkademik('students')
        .where({ id: studentId })
        .update({
          full_name: s.name.trim(),
          gender: s.gender,
          nipd: cleanNipd || existing.nipd,
          nis: cleanNipd || existing.nis,
          nisn: cleanNisn || existing.nisn,
          nik: cleanNik || existing.nik,
          cohort_id: cohortId,
          cohort_name: `Angkatan ${s.cohortYear}`,
          status: s.status || existing.status,
          data_entry_mode: 'ringkas_riwayat',
          updated_at: dbAkademik.fn.now()
        });
      updatedCount++;
      console.log(`[UPDATE] ${s.name} (NIPD: ${cleanNipd}) -> ID: ${studentId}`);
    } else {
      const [newId] = await dbAkademik('students').insert({
        satuan_pendidikan_id: schoolUnitId,
        cohort_id: cohortId,
        cohort_name: `Angkatan ${s.cohortYear}`,
        full_name: s.name.trim(),
        gender: s.gender,
        nipd: cleanNipd,
        nis: cleanNipd || `TEMP-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        nisn: cleanNisn,
        nik: cleanNik,
        status: s.status || 'aktif',
        data_entry_mode: 'ringkas_riwayat'
      });
      studentId = newId;
      insertedCount++;
      console.log(`[INSERT] ${s.name} (NIPD: ${cleanNipd}) -> New ID: ${studentId}`);
    }

    // 6. Proses Class Enrollments & History
    for (const h of s.history) {
      const academicYearId = yearMap[h.year];
      if (!academicYearId) continue;

      const classGroupId = await getClassGroupId(h.year, h.class);
      const gradeOrder = h.class.startsWith('7') ? '7' : h.class.startsWith('8') ? '8' : '9';
      const gradeLevelId = gradeMap[gradeOrder] || 1;

      // Check existing enrollment
      const existingEnrollment = await dbAkademik('student_class_enrollments')
        .where({
          student_id: studentId,
          class_group_id: classGroupId,
          academic_year_id: academicYearId
        })
        .first();

      if (!existingEnrollment) {
        await dbAkademik('student_class_enrollments').insert({
          satuan_pendidikan_id: schoolUnitId,
          student_id: studentId,
          class_group_id: classGroupId,
          academic_year_id: academicYearId,
          status: h.status
        });
      } else {
        await dbAkademik('student_class_enrollments')
          .where({ id: existingEnrollment.id })
          .update({
            status: h.status,
            updated_at: dbAkademik.fn.now()
          });
      }

      // Check existing history
      const existingHistory = await dbAkademik('student_class_history')
        .where({
          student_id: studentId,
          academic_year_id: academicYearId,
          class_group_id: classGroupId
        })
        .first();

      if (!existingHistory) {
        await dbAkademik('student_class_history').insert({
          student_id: studentId,
          academic_year_id: academicYearId,
          class_group_id: classGroupId,
          grade_level_id: gradeLevelId,
          enrollment_type: h.type || 'manual',
          decision: h.decision || 'promoted',
          recorded_at: dbAkademik.fn.now(),
          recorded_by: 'system_historical_import'
        });
      }
    }
  }

  console.log('\n================================================================');
  console.log(`IMPORT COMPLETED SUCCESSFULLY:`);
  console.log(`- Total Siswa di Data: ${rawData.length}`);
  console.log(`- Siswa Baru Ditambahkan: ${insertedCount}`);
  console.log(`- Siswa Lama Diperbarui: ${updatedCount}`);
  console.log('================================================================');

  process.exit(0);
}

runImport().catch(err => {
  console.error('Fatal Import Error:', err);
  process.exit(1);
});
