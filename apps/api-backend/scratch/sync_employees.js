const dbKepegawaian = require('../src/config/db/kepegawaian');
const employeesService = require('../src/modules/kepegawaian/employees/service');

const rawData = [
  { no: 1, nip: "19201002", nama: "Ade Rifai S.Pd.", panggilan: "", nuptk: "", nrg: "", tglMulai: "01/07/2019", bagian: "Non Akademik", status: "", aktif: 1, jk: "l", tempatLahir: "Bogor", tglLahir: "25/05/1977", nikah: "menikah", agama: "Islam", suku: "Sunda", noId: "", alamat: "", telpon: "81511416911", hp: "81511416911", email: "" },
  { no: 2, nip: "24252020", nama: "Ahmad Sodik", panggilan: "Sodik", nuptk: "", nrg: "", tglMulai: "01/06/2025", bagian: "Non Akademik", status: "SWASTA", aktif: 1, jk: "L", tempatLahir: "Bogor", tglLahir: "05/06/1994", nikah: "menikah", agama: "Belum Ada Data", suku: "Sunda", noId: "", alamat: "Kp Tapos Tengah RT 002/Rw 005 Tapos II Tenjolaya", telpon: "", hp: "85817608941", email: "" },
  { no: 3, nip: "22232031", nama: "Aji Amirudin M.Pd.", panggilan: "Ustadz", nuptk: "", nrg: "", tglMulai: "01/07/2022", bagian: "Akademik", status: "", aktif: 1, jk: "l", tempatLahir: "Jakarta", tglLahir: "18/06/1995", nikah: "menikah", agama: "Islam", suku: "Sunda", noId: "3,20135E+15", alamat: "Kp.Pasir Sake Rt.004/Rw.002, Desa/Keluhuran Kiarapandak, Kec.Sukaraja, Kab. Bogor- Jawa Barat,16661", telpon: "85838843593", hp: "85838843593", email: "ajamsapputra@gmail.com" },
  { no: 4, nip: "24252003", nama: "Aji Mustopa S.Pd., M.E.", panggilan: "Ustadz", nuptk: "", nrg: "", tglMulai: "01/07/2024", bagian: "Akademik", status: "", aktif: 1, jk: "l", tempatLahir: "Subang", tglLahir: "01/01/1996", nikah: "menikah", agama: "Islam", suku: "Sunda", noId: "3,21326E+15", alamat: "Jl. Kp. CimanglidRT 5RW 1, Kp. Cimanglid, Ds. Sukamantri, Kec. Tamansari, Kab. Bogor - Jawa Barat, 16610", telpon: "81314558492", hp: "81314558492", email: "ajimustopa@gmail.com" },
  { no: 5, nip: "23242014", nama: "Andriansyah S.Pd.", panggilan: "Ustadz", nuptk: "", nrg: "", tglMulai: "01/01/2022", bagian: "Akademik", status: "", aktif: 1, jk: "l", tempatLahir: "Gunung Megang", tglLahir: "01/01/1995", nikah: "menikah", agama: "Islam", suku: "Melayu", noId: "1,60304E+14", alamat: "", telpon: "82321760938", hp: "82321760938", email: "andriyansyahfitri16.@gmail.com" },
  { no: 6, nip: "25262009", nama: "Arqom Ramadhan", panggilan: "Arqom", nuptk: "", nrg: "", tglMulai: "01/01/2026", bagian: "Akademik", status: "PNS", aktif: 1, jk: "l", tempatLahir: "Bekasi", tglLahir: "16/02/1995", nikah: "menikah", agama: "Belum Ada Data", suku: "Jawa", noId: "", alamat: "Griya KAtulampa Blok B8 No 14 RT 10.RW 10", telpon: "", hp: "85780001695", email: "arqomramadhan33@gmail.com" },
  { no: 7, nip: "26272006", nama: "Asrul Hadi S.Pd.", panggilan: "Asrul", nuptk: "", nrg: "", tglMulai: "01/07/2026", bagian: "Akademik", status: "SWASTA", aktif: 1, jk: "l", tempatLahir: "Sontang", tglLahir: "06/06/1987", nikah: "menikah", agama: "Islam", suku: "Minang", noId: "", alamat: "Perum Cikeas Gardenia Blok L1/1 RT 003/021 Cikeas Udik Gunung Putri", telpon: "", hp: "85157274711", email: "" },
  { no: 8, nip: "26272003", nama: "Azaria Fabiola Zaini S.Pd.", panggilan: "Aza", nuptk: "", nrg: "", tglMulai: "01/07/2026", bagian: "Akademik", status: "SWASTA", aktif: 1, jk: "p", tempatLahir: "Solok", tglLahir: "30/07/2002", nikah: "belum", agama: "Islam", suku: "Minang", noId: "", alamat: "Jl. DI Perpatih Nan Sabatang No 30-32 Air mati `Kota solok` RT 05/RW 03 Perum bumi cikembang asri, Sukabumi", telpon: "", hp: "85314238576", email: "azzariafabiolazaini@gmail.com" },
  { no: 9, nip: "19202012", nama: "Baharudin S.Pd.", panggilan: "Ustadz", nuptk: "", nrg: "", tglMulai: "01/01/2022", bagian: "Akademik", status: "", aktif: 1, jk: "l", tempatLahir: "Bogor", tglLahir: "04/10/1993", nikah: "menikah", agama: "Islam", suku: "Sunda", noId: "3,2014E+15", alamat: "", telpon: "82111916553", hp: "82111916553", email: "" },
  { no: 10, nip: "24252001", nama: "Desi Yulianti", panggilan: "", nuptk: "", nrg: "", tglMulai: "07/05/2024", bagian: "Non Akademik", status: "", aktif: 1, jk: "l", tempatLahir: "Bogor", tglLahir: "10/02/2006", nikah: "belum", agama: "Islam", suku: "Sunda", noId: "3,20141E+15", alamat: "Kp Cibitung Desa Gunung Malang RT 04 Rw 06 Tenjolaya Bogor", telpon: "85779448056", hp: "85779448056", email: "yuliantidesi437@gmail.com" },
  { no: 11, nip: "23242001", nama: "Fahrurozi", panggilan: "Fahru", nuptk: "", nrg: "", tglMulai: "10/01/2023", bagian: "Akademik", status: "SWASTA", aktif: 1, jk: "L", tempatLahir: "Pandeglang", tglLahir: "11/10/2001", nikah: "belum", agama: "Islam", suku: "Sunda", noId: "", alamat: "Kp Cikaduen RT 002/RW 001 Kec Cipeucang Pandeglang", telpon: "", hp: "", email: "realfahru09@gmail.com" },
  { no: 12, nip: "25262003", nama: "Fikriyani Fauziah", panggilan: "Fikri", nuptk: "", nrg: "", tglMulai: "08/07/2025", bagian: "Akademik", status: "SWASTA", aktif: 1, jk: "p", tempatLahir: "Tasikmalaya", tglLahir: "21/05/2002", nikah: "belum", agama: "Islam", suku: "Sunda", noId: "", alamat: "Kp Tanjung RT 002/005 TanjungPura Rajapolah Tasikmalaya", telpon: "", hp: "82218530389", email: "fikriyanifauziah@gmail.com" },
  { no: 13, nip: "24252004", nama: "Hamdani Abdurakhman S.Pd., M.E.", panggilan: "Ustadz", nuptk: "", nrg: "", tglMulai: "", bagian: "Akademik", status: "", aktif: 1, jk: "l", tempatLahir: "Gowa", tglLahir: "19/02/1992", nikah: "menikah", agama: "Islam", suku: "Sunda", noId: "3,20415E+15", alamat: "", telpon: "", hp: "82280437686", email: "ahamraihan@gmail.com" },
  { no: 14, nip: "24252012", nama: "Septari Handayani", panggilan: "Handay", nuptk: "", nrg: "", tglMulai: "15/07/2024", bagian: "Akademik", status: "PNS", aktif: 1, jk: "P", tempatLahir: "Bogor", tglLahir: "23/09/2000", nikah: "belum", agama: "Islam", suku: "Sunda", noId: "", alamat: "Kp. Tapos Tengah RT 02 RW 05 Tapos II Tenjolaya", telpon: "", hp: "83813669271", email: "handayaniseptari@gmail.com" },
  { no: 15, nip: "24252019", nama: "Hidayatullah", panggilan: "Dayat", nuptk: "", nrg: "", tglMulai: "14/05/2025", bagian: "Akademik", status: "SWASTA", aktif: 1, jk: "l", tempatLahir: "Tangerang", tglLahir: "03/03/1998", nikah: "belum", agama: "Islam", suku: "Sunda", noId: "", alamat: "Kp Ranca Ilat RT 011 Rw 03 Kresek Tangerang Banten", telpon: "", hp: "81291060822", email: "hidayatullahhkanglik@gmail.com" },
  { no: 16, nip: "24252016", nama: "Irawati", panggilan: "Ira", nuptk: "", nrg: "", tglMulai: "01/03/2025", bagian: "Akademik", status: "PNS", aktif: 1, jk: "P", tempatLahir: "Bogor", tglLahir: "05/08/1984", nikah: "menikah", agama: "Islam", suku: "Sunda", noId: "", alamat: "Kp Tapos Tengah Rt 02/05 Tapos 2 Tenjolaya", telpon: "", hp: "85288345727", email: "ira071567@gmail.com" },
  { no: 17, nip: "26272005", nama: "Laila Kamiliya S.Hum", panggilan: "Laila", nuptk: "", nrg: "", tglMulai: "01/07/2026", bagian: "Akademik", status: "PNS", aktif: 1, jk: "p", tempatLahir: "Tangerang", tglLahir: "23/04/2001", nikah: "belum", agama: "Islam", suku: "Sunda", noId: "", alamat: "Kp Gunung Menyan RT 003/002 Pamijahan Bogor", telpon: "", hp: "83147376112", email: "kamiliyalaila01@gmail.com" },
  { no: 18, nip: "19202010", nama: "Mamuri", panggilan: "", nuptk: "", nrg: "", tglMulai: "01/08/2019", bagian: "Non Akademik", status: "", aktif: 1, jk: "l", tempatLahir: "Bogor", tglLahir: "03/04/1984", nikah: "menikah", agama: "Islam", suku: "Sunda", noId: "3,20115E+15", alamat: "Jl.Abdul Fatah,Kp.Cibuntu Kaum Rt/Rw 01/01,Kecamatan Ciampea.Kab.Bogor-Jawa Barat", telpon: "85890221019", hp: "85890221019", email: "mamuriujun@gmail.com" },
  { no: 19, nip: "22232033", nama: "Maryanto", panggilan: "", nuptk: "", nrg: "", tglMulai: "01/03/2022", bagian: "Non Akademik", status: "", aktif: 1, jk: "l", tempatLahir: "Klaten", tglLahir: "06/05/1976", nikah: "menikah", agama: "Islam", suku: "Jawa", noId: "3,2014E+16", alamat: "Jl.Abdul Fatah,Kp.Tapos Tengah,Rt/Rw 01/05,Kecamatan Tenjolaya.Kab.Bogor-Jawa Barat", telpon: "85810767701", hp: "85810767701", email: "maryanto040576@gmail.com" },
  { no: 20, nip: "19202014", nama: "Maryogi", panggilan: "", nuptk: "", nrg: "", tglMulai: "01/01/2022", bagian: "Non Akademik", status: "", aktif: 1, jk: "l", tempatLahir: "Bogor", tglLahir: "20/11/1990", nikah: "menikah", agama: "Islam", suku: "Sunda", noId: "3,21402E+14", alamat: "", telpon: "8571002375", hp: "8571002375", email: "maryogi.052@gmail.com" },
  { no: 21, nip: "19202015", nama: "Moh.Wahyudin S.Pd.I.", panggilan: "Ustadz", nuptk: "", nrg: "", tglMulai: "01/01/2022", bagian: "Akademik", status: "", aktif: 1, jk: "l", tempatLahir: "Bogor", tglLahir: "03/07/1978", nikah: "menikah", agama: "Islam", suku: "Sunda", noId: "3,2014E+15", alamat: "Jln.Abdul Fatah,Tapos Tengah,Rt/Rw 01/06 Tapos Tenjolaya", telpon: "8159790259", hp: "8159790259", email: "mohwahyudin@gmail.com" },
  { no: 22, nip: "22232032", nama: "Mohamad Gojali S.Pd.", panggilan: "Ustadz", nuptk: "", nrg: "", tglMulai: "01/01/2022", bagian: "Akademik", status: "", aktif: 1, jk: "l", tempatLahir: "Bogor", tglLahir: "14/12/1995", nikah: "menikah", agama: "Islam", suku: "Sunda", noId: "3,2013E+15", alamat: "Kp.Cilubang 003/002 Desa. Sukadamai,Kec.Dramaga Kab. Bogor- Jawa Barat, 16680", telpon: "8990050661", hp: "8990050661", email: "al.ghazalimg@gmail.com" },
  { no: 23, nip: "25262005", nama: "Muhammad Swiki Ilham", panggilan: "Swiki", nuptk: "", nrg: "", tglMulai: "01/01/2025", bagian: "Akademik", status: "PNS", aktif: 1, jk: "L", tempatLahir: "Bogor", tglLahir: "30/01/2001", nikah: "menikah", agama: "Islam", suku: "Sunda", noId: "", alamat: "Kp Cibuntu Ali Odah RT 004/006 Cicadas Ciampea", telpon: "", hp: "", email: "bumypertaniangenz@gmail.com" },
  { no: 24, nip: "23242003", nama: "Muhammad Syahrul Lael", panggilan: "", nuptk: "", nrg: "", tglMulai: "01/03/2023", bagian: "Non Akademik", status: "", aktif: 1, jk: "l", tempatLahir: "Bogor", tglLahir: "13/09/2000", nikah: "belum", agama: "Islam", suku: "Sunda", noId: "3,20117E+14", alamat: "Kp.Ciasepan,Pamijahan kab.Bogor-Jawa Barat", telpon: "85693494880", hp: "85693494880", email: "muridea@gmail.com" },
  { no: 25, nip: "19202011", nama: "Muhtar", panggilan: "", nuptk: "", nrg: "", tglMulai: "01/08/2019", bagian: "Non Akademik", status: "", aktif: 1, jk: "l", tempatLahir: "Bogor", tglLahir: "01/10/1993", nikah: "menikah", agama: "Islam", suku: "Sunda", noId: "3,2014E+15", alamat: "Jl.Abdul Fatah,Kp.Suka Betah,Rt/Rw 01/09,Kecamatan Ciampea.Kab.Bogor-Jawa Barat", telpon: "85894308523", hp: "85894308523", email: "mentaripagi78910@gmail.com" },
  { no: 26, nip: "26272004", nama: "Nurudz Salmi S.Pd.", panggilan: "Salmi", nuptk: "", nrg: "", tglMulai: "01/07/2026", bagian: "Akademik", status: "SWASTA", aktif: 1, jk: "p", tempatLahir: "Arasoe", tglLahir: "23/09/2003", nikah: "belum", agama: "Islam", suku: "Belum Ada Data", noId: "", alamat: "Arasoe RT 000/000 Arasoe Kecamatan Cina", telpon: "", hp: "85719505075", email: "salminurudz@gmail.com" },
  { no: 27, nip: "25262004", nama: "Penita Ayu", panggilan: "Peni", nuptk: "", nrg: "", tglMulai: "08/07/2025", bagian: "Akademik", status: "SWASTA", aktif: 1, jk: "p", tempatLahir: "Pendopo", tglLahir: "24/02/2003", nikah: "belum", agama: "Islam", suku: "Minang", noId: "", alamat: "Jl Pangkalan Brandan RT 001/008 Talang Ubi Barat Palembang", telpon: "", hp: "83805520285", email: "penitaayubudiyanti@gmail.com" },
  { no: 28, nip: "23242008", nama: "Putri Mahardhika Pertiwi", panggilan: "Ustadzah", nuptk: "", nrg: "", tglMulai: "01/07/2023", bagian: "Akademik", status: "", aktif: 1, jk: "p", tempatLahir: "Bogor", tglLahir: "22/10/1986", nikah: "menikah", agama: "Islam", suku: "Sunda", noId: "3,27104E+15", alamat: "Kp. Tapos Tengah, Rt/Rw 001/005, Tapos II,Tenjolaya", telpon: "85782832304", hp: "85782832304", email: "putrizhafran23@gmail.com" },
  { no: 29, nip: "24252021", nama: "Rendi Priyatna", panggilan: "Rendi", nuptk: "", nrg: "", tglMulai: "10/06/2025", bagian: "Non Akademik", status: "SWASTA", aktif: 1, jk: "L", tempatLahir: "Sukabumi", tglLahir: "15/12/1993", nikah: "belum", agama: "Belum Ada Data", suku: "Jawa", noId: "", alamat: "Lemah Duhur RT 004/RW 001 Mulyaharja Bogor Selatan", telpon: "", hp: "81384194153", email: "" },
  { no: 30, nip: "26272010", nama: "Robby Setiawan Wibowo", panggilan: "Robby", nuptk: "", nrg: "", tglMulai: "12/07/2026", bagian: "Akademik", status: "PNS", aktif: 1, jk: "L", tempatLahir: "Bogor", tglLahir: "15/09/2002", nikah: "belum", agama: "Islam", suku: "Sunda", noId: "", alamat: "Kp Nambo RT 003/002 Sukajaya Tamansari", telpon: "", hp: "85882299603", email: "robbysetiawanwibowo.123@gmail.com" },
  { no: 31, nip: "20212015", nama: "Sali", panggilan: "", nuptk: "", nrg: "", tglMulai: "01/08/2019", bagian: "Non Akademik", status: "", aktif: 1, jk: "l", tempatLahir: "Bogor", tglLahir: "04/01/1978", nikah: "menikah", agama: "Islam", suku: "Sunda", noId: "3,2014E+15", alamat: "Jl.Abdul Fatah,Kp.Tapos Tengah,Rt/Rw 02/05,Kecamatan Tenjolaya.Kab.Bogor-Jawa Barat", telpon: "83811658244", hp: "83811658244", email: "salipasali0178@gmail.com" },
  { no: 32, nip: "24252015", nama: "Heri Shobikan S.Sos", panggilan: "HERI", nuptk: "", nrg: "", tglMulai: "26/02/2025", bagian: "Akademik", status: "PNS", aktif: 1, jk: "l", tempatLahir: "Jepara", tglLahir: "28/10/1994", nikah: "menikah", agama: "Islam", suku: "Jawa", noId: "", alamat: "Kp Warung Loa Rt 01/12 Sukaluyu Tamansari Bogor", telpon: "", hp: "85288345727", email: "herishobikan94@gmail.com" },
  { no: 33, nip: "24252010", nama: "Siti Hazami Nur Firdaus", panggilan: "Ustadzah", nuptk: "", nrg: "", tglMulai: "01/01/2022", bagian: "Akademik", status: "", aktif: 1, jk: "p", tempatLahir: "Bogor", tglLahir: "17/06/2005", nikah: "belum", agama: "Islam", suku: "Sunda", noId: "3,20141E+15", alamat: "", telpon: "0895604000000", hp: "0895604000000", email: "hazamiunlimited@gmail.com" },
  { no: 34, nip: "23242007", nama: "Siti Mardhiyah S.Si.", panggilan: "Ustadzah", nuptk: "", nrg: "", tglMulai: "01/01/2022", bagian: "Akademik", status: "", aktif: 1, jk: "l", tempatLahir: "Jakarta", tglLahir: "12/06/1983", nikah: "menikah", agama: "Islam", suku: "Betawi", noId: "3,17409E+15", alamat: "ASR ZIPUR 7,Serengseng Sawah,Agakarsa,Akarta Selatan,DKI Jakarta", telpon: "87805794933", hp: "87805794933", email: "siti.mardiyah12@gmail.com" },
  { no: 35, nip: "26272007", nama: "Siti Novania Yumanti S.Pd.", panggilan: "Nova", nuptk: "", nrg: "", tglMulai: "01/07/2026", bagian: "Akademik", status: "SWASTA", aktif: 1, jk: "p", tempatLahir: "Bogor", tglLahir: "25/11/1998", nikah: "menikah", agama: "Islam", suku: "Sunda", noId: "", alamat: "Kelapa Tujuh RT 02/01 Desa Sukadamai Kec. Dramaga Bogor", telpon: "", hp: "85773356683", email: "Novania25.nn@gmail.com" },
  { no: 36, nip: "24252011", nama: "Vinka Mentari Pratiwi", panggilan: "", nuptk: "", nrg: "", tglMulai: "02/09/2024", bagian: "Non Akademik", status: "", aktif: 1, jk: "p", tempatLahir: "Lebak", tglLahir: "30/09/2002", nikah: "belum", agama: "Islam", suku: "Sunda", noId: "", alamat: "", telpon: "", hp: "", email: "" },
  { no: 37, nip: "25262002", nama: "Zefani Ifanka S.Pd.", panggilan: "Zefa", nuptk: "", nrg: "", tglMulai: "01/07/2025", bagian: "Akademik", status: "SWASTA", aktif: 1, jk: "p", tempatLahir: "Bogor", tglLahir: "28/05/2001", nikah: "belum", agama: "Islam", suku: "Sunda", noId: "", alamat: "Kp Cibitung Gunung Malanbg RT 001/006 Tenjolaya", telpon: "", hp: "81282224645", email: "zefani2017ifanka@gmail.com" },
  { no: 38, nip: "99999999", nama: "[guru tamu]", panggilan: "[guru tamu]", nuptk: "", nrg: "", tglMulai: "01/01/2000", bagian: "Akademik", status: "HONORER", aktif: 1, jk: "L", tempatLahir: "Bogor", tglLahir: "01/01/2000", nikah: "menikah", agama: "Belum Ada Data", suku: "Jawa", noId: "", alamat: "", telpon: "", hp: "", email: "" },
  { no: 39, nip: "24252005", nama: "Ainul Mahrus S.Si.", panggilan: "", nuptk: "", nrg: "", tglMulai: "01/01/2024", bagian: "Akademik", status: "", aktif: 0, jk: "l", tempatLahir: "Tuban", tglLahir: "10/10/1971", nikah: "tak_ada", agama: "Islam", suku: "Jawa", noId: "3,20101E+15", alamat: "", telpon: "8568518740", hp: "8568518740", email: "ainulmahrus@gmail.com" },
  { no: 40, nip: "25262001", nama: "Dewi Nurhalizah S.Pd.", panggilan: "Dewi", nuptk: "", nrg: "", tglMulai: "07/07/2025", bagian: "Akademik", status: "SWASTA", aktif: 0, jk: "p", tempatLahir: "Tangerang", tglLahir: "01/11/2001", nikah: "menikah", agama: "Islam", suku: "Jawa", noId: "", alamat: "TAPOS 2 LEBAK RT 03/RW 02", telpon: "", hp: "85770574890", email: "dewinurhalizah56@gmail.com" },
  { no: 41, nip: "24252008", nama: "Jihan Syahirah Zaini S.Sos.", panggilan: "", nuptk: "", nrg: "", tglMulai: "01/01/2024", bagian: "Akademik", status: "", aktif: 0, jk: "p", tempatLahir: "Solok", tglLahir: "13/01/2001", nikah: "belum", agama: "Islam", suku: "Minang", noId: "1,37203E+15", alamat: "Jl. DI Perpatih Nan Sabatang No 30-32 Air mati `Kota solok` RT 05/RW 03 Perum bumi cikembang asri, Sukabumi", telpon: "81363165533", hp: "81363165533", email: "" },
  { no: 42, nip: "24252006", nama: "Jovial Arief S.Sos.", panggilan: "", nuptk: "", nrg: "", tglMulai: "01/01/2024", bagian: "Akademik", status: "", aktif: 0, jk: "l", tempatLahir: "Jakarta", tglLahir: "14/01/2002", nikah: "belum", agama: "Islam", suku: "Minang", noId: "3,67403E+15", alamat: "", telpon: "82117069869", hp: "82117069869", email: "" },
  { no: 43, nip: "24252009", nama: "Milky Septiani S.Sos.", panggilan: "", nuptk: "", nrg: "", tglMulai: "01/01/2024", bagian: "Akademik", status: "", aktif: 0, jk: "l", tempatLahir: "Bogor", tglLahir: "20/09/2000", nikah: "belum", agama: "Islam", suku: "Sunda", noId: "3,20128E+15", alamat: "", telpon: "85894941692", hp: "85894941692", email: "milkyseptiani.0292@gmail.com" },
  { no: 44, nip: "20212024", nama: "Muhamad Badrudin", panggilan: "", nuptk: "", nrg: "", tglMulai: "01/01/2022", bagian: "Non Akademik", status: "", aktif: 0, jk: "l", tempatLahir: "Bogor", tglLahir: "12/11/1972", nikah: "menikah", agama: "Islam", suku: "Sunda", noId: "3,17503E+15", alamat: "", telpon: "85774416771", hp: "85774416771", email: "mbarudin1771@gmail.com" }
];

function parseDate(str) {
  if (!str) return null;
  const parts = str.trim().split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return str;
}

function parsePhone(phone, hp) {
  let val = hp || phone || null;
  if (!val) return null;
  val = String(val).trim();
  if (val.startsWith('8')) val = '0' + val;
  return val;
}

function parseGender(jk) {
  if (!jk) return 'male';
  const val = jk.trim().toLowerCase();
  return (val === 'p' || val === 'female' || val === 'perempuan') ? 'female' : 'male';
}

function parseMarital(status) {
  if (!status) return 'single';
  const val = status.trim().toLowerCase();
  if (val.includes('menikah') || val.includes('kawin')) return 'married';
  if (val.includes('cerai')) return 'divorced';
  return 'single';
}

function parseEmploymentStatus(status, bagian) {
  if (!status) {
    if (bagian && bagian.toLowerCase().includes('non')) return 'pty';
    return 'gty';
  }
  const val = status.trim().toLowerCase();
  if (val.includes('pns')) return 'pns';
  if (val.includes('swasta')) return 'gty';
  if (val.includes('honorer')) return 'honorer';
  if (val.includes('gtt')) return 'gtt';
  if (val.includes('ptt')) return 'ptt';
  return 'kontrak';
}

async function run() {
  try {
    let insertedCount = 0;
    let updatedCount = 0;

    for (const item of rawData) {
      const empNumber = item.nip.trim();
      const fullName = item.nama.trim();
      const birthDate = parseDate(item.tglLahir);
      const phone = parsePhone(item.telpon, item.hp);
      const gender = parseGender(item.jk);
      const marital = parseMarital(item.nikah);
      const religion = (item.agama && !item.agama.includes('Belum')) ? item.agama.trim() : 'Islam';
      const empStatus = parseEmploymentStatus(item.status, item.bagian);
      const accountStatus = item.aktif === 1 ? 'active' : 'inactive';
      const address = item.alamat ? item.alamat.trim() : null;
      const email = item.email ? item.email.trim() : null;

      // Cek apakah pegawai sudah ada berdasarkan employee_number atau full_name
      let existing = await dbKepegawaian('employees')
        .where('employee_number', empNumber)
        .first();

      if (!existing) {
        // Cek jika ada nama yang mirip/sama persis
        const nameClean = fullName.split(',')[0].split('S.P')[0].split('M.P')[0].trim();
        existing = await dbKepegawaian('employees')
          .where('full_name', 'like', `%${nameClean}%`)
          .first();
      }

      if (existing) {
        // UPDATE DATA
        const updatePayload = {
          employee_number: empNumber,
          full_name: fullName,
          birth_place: item.tempatLahir || existing.birth_place,
          birth_date: birthDate || existing.birth_date,
          gender: gender,
          religion: religion,
          marital_status: marital,
          address: address || existing.address,
          phone_number: phone || existing.phone_number,
          email: email || existing.email,
          employment_status: empStatus || existing.employment_status,
          account_status: accountStatus,
          updated_at: dbKepegawaian.fn.now()
        };

        await dbKepegawaian('employees').where({ id: existing.id }).update(updatePayload);

        // Update address table jika ada alamat
        if (address) {
          const existAddr = await dbKepegawaian('employee_addresses')
            .where({ employee_id: existing.id, address_type: 'domisili' })
            .first();
          if (existAddr) {
            await dbKepegawaian('employee_addresses')
              .where({ id: existAddr.id })
              .update({ street: address, updated_at: dbKepegawaian.fn.now() });
          } else {
            await dbKepegawaian('employee_addresses').insert({
              employee_id: existing.id,
              address_type: 'domisili',
              street: address,
              created_at: dbKepegawaian.fn.now(),
              updated_at: dbKepegawaian.fn.now()
            });
          }
        }

        console.log(`[UPDATED] ID: ${existing.id} | NIP/EmpNo: ${empNumber} | ${fullName}`);
        updatedCount++;
      } else {
        // INSERT DATA BARU
        const [newId] = await dbKepegawaian('employees').insert({
          school_unit_id: 1, // Default ke Unit SMP/Umum
          employee_number: empNumber,
          nip: empNumber,
          full_name: fullName,
          birth_place: item.tempatLahir || null,
          birth_date: birthDate || null,
          gender: gender,
          religion: religion,
          marital_status: marital,
          address: address || null,
          phone_number: phone || null,
          email: email || null,
          employment_status: empStatus,
          account_status: accountStatus,
          citizenship: 'Indonesia',
          created_at: dbKepegawaian.fn.now(),
          updated_at: dbKepegawaian.fn.now()
        });

        if (address) {
          await dbKepegawaian('employee_addresses').insert({
            employee_id: newId,
            address_type: 'domisili',
            street: address,
            created_at: dbKepegawaian.fn.now(),
            updated_at: dbKepegawaian.fn.now()
          });
        }

        console.log(`[INSERTED] ID: ${newId} | NIP/EmpNo: ${empNumber} | ${fullName}`);
        insertedCount++;
      }
    }

    console.log(`\n========================================`);
    console.log(`TOTAL PROCESSED: ${rawData.length}`);
    console.log(`INSERTED: ${insertedCount} PEGAWAI BARU`);
    console.log(`UPDATED: ${updatedCount} PEGAWAI LAMA`);
    console.log(`========================================`);

  } catch (err) {
    console.error('ERROR SYNCING EMPLOYEES:', err);
  } finally {
    process.exit(0);
  }
}

run();
