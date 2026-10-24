/* ============================================================
   semakan-kelayakan-data.js
   ------------------------------------------------------------
   Program data + eligibility rules, transcribed from
   TVETMARA BROCHURE EDISI BKT 1.1 / 2026 (38 pages).

   This file is INLINED into semakan-kelayakan.html at build
   time. It is kept separate in the repo so the dataset can be
   proofread against the brochure without scrolling past the
   layout CSS.
   ============================================================ */


/* ------------------------------------------------------------
   SPM GRADES
   ------------------------------------------------------------
   Best to worst. Position in this array is what lets us compare
   two grades: a LOWER index is a BETTER grade.

       A+  A  A-  B+  B  C+  C  |  D  E  G
       \________ kredit ________/  \__ tiada kredit __/

   There is no "C-" in SPM. C is the lowest credit grade.
   (Same logic as admin.js:525-555 in this repo.)
   ------------------------------------------------------------ */
const SPM_GRADES = ["A+", "A", "A-", "B+", "B", "C+", "C", "D", "E", "G"];
const CREDIT_GRADE = "C";

/* ------------------------------------------------------------
   SPM SUBJECTS, grouped
   ------------------------------------------------------------
   Grouped rather than one flat list for two reasons: the dropdown
   is driven live while talking, so the groups make the right line
   findable in one glance; and the technical group matters to the
   result, not just the UI.

   The technical subjects in particular were missing before, which
   quietly under-reported eligibility: a candidate from a technical
   stream with a credit in Lukisan Kejuruteraan had no way to enter
   it, so it never counted toward the "Kumpulan Sains / Vokasional
   & Teknologi" requirement that DTP, DTS and DTL depend on.
   ------------------------------------------------------------ */
const SPM_KUMPULAN = [
  { nama: "Teras", subjek: [
    "Bahasa Melayu", "Bahasa Inggeris", "Matematik", "Sejarah",
    "Pendidikan Islam", "Pendidikan Moral",
  ]},
  { nama: "Sains", subjek: [
    "Sains", "Fizik", "Kimia", "Biologi",
    "Sains Tambahan", "Matematik Tambahan",
  ]},
  { nama: "Teknikal & Vokasional", subjek: [
    "Lukisan Kejuruteraan", "Teknologi Kejuruteraan",
    "Grafik Komunikasi Teknikal", "Reka Cipta", "Sains Komputer",
    "Mata Pelajaran Vokasional (MPV)",
  ]},
  { nama: "Perdagangan", subjek: [
    "Prinsip Perakaunan", "Perniagaan", "Ekonomi",
  ]},
  { nama: "Kemanusiaan & Seni", subjek: [
    "Geografi", "Pendidikan Seni Visual", "Kesusasteraan Melayu",
    "Kesusasteraan Inggeris", "Sains Sukan", "Pendidikan Muzik",
  ]},
  { nama: "Pengajian Islam", subjek: [
    "Pendidikan Al-Quran dan As-Sunnah", "Pendidikan Syariah Islamiah",
    "Tasawwur Islam", "Bahasa Arab",
  ]},
  { nama: "Bahasa Lain", subjek: [
    "Bahasa Cina", "Bahasa Tamil", "Bahasa Iban", "Bahasa Kadazandusun",
  ]},
  { nama: "Lain-lain", subjek: [ "Lain-lain" ]},
];

/* Flat list, derived - nothing should maintain two copies. */
const SPM_SUBJECTS = SPM_KUMPULAN.reduce(function(semua, k){
  return semua.concat(k.subjek);
}, []);

/* The brochure's "Kumpulan Sains / Kumpulan Vokasional &
   Teknologi / MPV / MPAV" bucket - the whole Sains group plus the
   whole Teknikal & Vokasional group. */
const KUMPULAN_SAINS_TEK = SPM_KUMPULAN
  .filter(function(k){ return k.nama === "Sains" || k.nama === "Teknikal & Vokasional"; })
  .reduce(function(semua, k){ return semua.concat(k.subjek); }, []);

/* The narrower pure-science bucket, used only by Bioteknologi
   (brochure p.36: "Kimia/Biologi/Fizik/Sains"). */
const KUMPULAN_SAINS_TULEN = ["Kimia", "Biologi", "Fizik", "Sains", "Sains Tambahan"];


/* ------------------------------------------------------------
   RULE TEMPLATES
   ------------------------------------------------------------
   The ~125 brochure rows collapse to these recurring patterns.

     kredit        : minimum number of credits in ANY subject
     kreditWajib   : these subjects must each be a credit
     kreditDari    : must hold >=1 credit from this subject group
     lulusWajib    : these subjects must each be a pass (not G)
     lulusSPM      : just needs to have sat and passed something
     lanjutan      : NOT reachable from SPM - needs SKM3 / a prior
                     diploma / a PW competency certificate
   ------------------------------------------------------------ */
const RULES = {
  /* 3 kredit termasuk Matematik + 1 Sains/Teknologi + 1 lain,
     DAN lulus Bahasa Inggeris. The standard 3-year ETAC gate. */
  T_ETAC3: {
    kredit: 3,
    kreditWajib: ["Matematik"],
    kreditDari: [{ nama: "Sains/Teknologi", subjek: KUMPULAN_SAINS_TEK }],
    lulusWajib: ["Bahasa Inggeris"],
  },

  /* The three Masjid Tanah Pemprosesan Bahan diplomas (brochure
     p.19). Same academic bar as T_ETAC3, but with one local
     concession: a candidate who misses the Matematik credit with
     a D is still taken, on condition of a remedial Maths class.
     Everything else still has to be met. */
  T_MQA_BAHAN: {
    kredit: 3,
    kreditWajib: ["Matematik"],
    kreditDari: [{ nama: "Sains/Teknologi", subjek: KUMPULAN_SAINS_TEK }],
    lulusWajib: ["Bahasa Inggeris"],
    pemulihan: {
      subjek: "Matematik",
      gred: "D",
      nota: "Perlu ikuti kelas REMEDIAL Matematik",
    },
  },

  /* 2 kepujian dalam mana-mana mata pelajaran. Most JPK diplomas. */
  T_JPK2: { kredit: 2 },

  /* 3 kepujian + lulus BI + lulus Matematik. MBOT computer
     diplomas and DTJ. */
  T_MBOT_KOMP: {
    kredit: 3,
    lulusWajib: ["Bahasa Inggeris", "Matematik"],
  },

  /* 3 kepujian + lulus BI + lulus Matematik, plus a portfolio or
     interview gate. Senibina / Rekabentuk. */
  T_MQA_REKA: {
    kredit: 3,
    lulusWajib: ["Bahasa Inggeris", "Matematik"],
  },

  /* 1 kepujian + lulus Matematik. SPE and the Bintulu MQA sijil. */
  T_MQA_SPE: {
    kredit: 1,
    lulusWajib: ["Matematik"],
  },

  /* 3 kepujian termasuk sains tulen + Matematik + 1 lain,
     DAN lulus BI. Bioteknologi herba. */
  T_BIOTEK: {
    kredit: 3,
    kreditWajib: ["Matematik"],
    kreditDari: [{ nama: "Kimia/Biologi/Fizik/Sains", subjek: KUMPULAN_SAINS_TULEN }],
    lulusWajib: ["Bahasa Inggeris"],
  },

  /* 2 kepujian + lulus Matematik. Diploma Kompetensi Elektrik
     entry from SPM. */
  T_DCS: {
    kredit: 2,
    lulusWajib: ["Matematik"],
  },

  /* Lulus SPM, apa-apa keputusan. Most sijil programs. */
  T_SIJIL_SPM: { lulusSPM: true },

  /* Needs SKM Tahap 3, an existing diploma, or a PW2/PW4
     competency certificate. A school leaver CANNOT enter these
     directly, so they are shown in their own dim tier and left
     out of the headline "layak" count. */
  T_LANJUTAN: { lanjutan: true },
};


/* ------------------------------------------------------------
   NON-ACADEMIC GATES
   ------------------------------------------------------------
   SPM grades cannot decide any of these, so they never block a
   result - they render as amber "syarat tambahan" badges.
   ------------------------------------------------------------ */
const GATES = {
  rabunWarna:    "Tidak rabun warna",
  temuduga:      "Lulus temuduga",
  portfolio:     "Semakan portfolio",
  psikometrik:   "Ujian kecenderungan",
  medikal:       "BMI normal, tiada asma",
  tahfiz:        "Hafazan 5 juzuk",
  kesihatanLaut: "Ujian kesihatan Jabatan Laut",
};


/* ------------------------------------------------------------
   PRIORITY ORDER
   ------------------------------------------------------------
   One single results list - Masjid Tanah is NOT split into its
   own section, it just sits at the top of the list.

   Polimer Komposit -> Seramik -> Plastik, in that exact order,
   then Aeroangkasa. These four are always shown even when the
   candidate misses them.

   DAF (Automotif) is deliberately NOT here: it is a Masjid Tanah
   programme, but it is not promoted to the top of the list. It
   falls through to the general list like any other programme.
   ------------------------------------------------------------ */
const UTAMA = ["DTP", "DTS", "DTL", "IAC"];


/* ------------------------------------------------------------
   PROGRAMS
   ------------------------------------------------------------
   One object per brochure row.
     p = peringkat ("D" diploma, "S" sijil)
     t = tempoh pengajian in years
   ------------------------------------------------------------ */
const PROGRAMS = [

  /* ===== PEMPROSESAN BAHAN - MASJID TANAH (brochure p.19-20) ===== */
  { kod:"DTP", nama:"Diploma Teknologi Kejuruteraan Pemprosesan Polimer Komposit", en:"Polymer Composite Processing Engineering Technology",
    inst:["Masjid Tanah"], kluster:"Pemprosesan Bahan", t:3, kelas:"MQA", p:"D", rule:"T_MQA_BAHAN", gates:[] },
  { kod:"DTS", nama:"Diploma Teknologi Kejuruteraan Pemprosesan Seramik", en:"Ceramic Processing Engineering Technology",
    inst:["Masjid Tanah"], kluster:"Pemprosesan Bahan", t:3, kelas:"MQA", p:"D", rule:"T_MQA_BAHAN", gates:[] },
  { kod:"DTL", nama:"Diploma Teknologi Kejuruteraan Pemprosesan Plastik", en:"Plastic Processing Engineering Technology",
    inst:["Masjid Tanah"], kluster:"Pemprosesan Bahan", t:3, kelas:"MQA", p:"D", rule:"T_MQA_BAHAN", gates:[] },
  { kod:"IAC", nama:"Diploma Industri Pembuatan Komposit Aeroangkasa", en:"Industry in Aerospace Composite Manufacturing",
    inst:["Masjid Tanah"], kluster:"Pemprosesan Bahan", t:2, kelas:"JPK", p:"D", rule:"T_JPK2", gates:["rabunWarna","temuduga","medikal"] },
  /* DIC (Diploma Industri Pengeluaran Seramik Termaju) is not
     offered this intake - removed deliberately, not an omission. */

  /* ===== ALAM BINA (p.12) ===== */
  { kod:"DSB", nama:"Diploma Senibina", en:"Architecture",
    inst:["Pasir Mas"], kluster:"Alam Bina", t:3, kelas:"MQA", p:"D", rule:"T_MQA_REKA", gates:["temuduga","portfolio"] },
  { kod:"DSD", nama:"Diploma Rekabentuk Dalaman", en:"Interior Design",
    inst:["Rembau"], kluster:"Alam Bina", t:3, kelas:"MQA", p:"D", rule:"T_MQA_REKA", gates:["temuduga","portfolio"] },
  { kod:"DSJ", nama:"Diploma Senibina", en:"Architecture",
    inst:["Sungai Petani"], kluster:"Alam Bina", t:3, kelas:"MQA", p:"D", rule:"T_MQA_REKA", gates:["temuduga","portfolio"] },
  { kod:"UTL", nama:"Diploma Teknousahawan Pembinaan dan Penyelenggaraan Landskap", en:"Technopreneurship in Landscape Construction and Maintenance",
    inst:["Sik"], kluster:"Alam Bina", t:2, kelas:"MARA", p:"D", rule:"T_LANJUTAN", gates:["psikometrik","temuduga"] },

  /* ===== AUTOMOTIF (p.13-17) ===== */
  { kod:"DAF", nama:"Diploma Teknologi Kejuruteraan Automotif", en:"Automotive Engineering Technology",
    inst:["Masjid Tanah"], kluster:"Automotif", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:["rabunWarna"] },
  { kod:"DGA", nama:"Diploma Teknologi Automotif", en:"Technology in Automotive",
    inst:["Beseri","Lumut","Besut"], kluster:"Automotif", t:3, kelas:"JPK", p:"D", rule:"T_JPK2", gates:["rabunWarna"] },
  { kod:"DGP", nama:"Diploma Teknologi Automotif (Servis)", en:"Technology in Automotive (Services)",
    inst:["Jasin","Pekan"], kluster:"Automotif", t:1.5, kelas:"JPK", p:"D", rule:"T_LANJUTAN", gates:["rabunWarna"] },
  { kod:"DTX", nama:"Diploma Teknologi Automotif Pengemasan Kenderaan", en:"Technology in Automotive Refinishing",
    inst:["Kota Kinabalu"], kluster:"Automotif", t:3, kelas:"JPK", p:"D", rule:"T_SIJIL_SPM", gates:["rabunWarna"] },
  { kod:"DAE", nama:"Diploma Teknologi Kejuruteraan Automotif Komersial (Kenderaan Elektrik)", en:"Commercial Automotive Engineering Technology (Electric Vehicle)",
    inst:["Jasin"], kluster:"Automotif", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:["rabunWarna"] },
  { kod:"DTB", nama:"Diploma Teknologi Automotif Baikpulih dan Kemasan Badan Kenderaan", en:"Technology in Automotive Body Repair and Refinishing",
    inst:["Lumut"], kluster:"Automotif", t:3, kelas:"JPK", p:"D", rule:"T_JPK2", gates:["rabunWarna"] },
  { kod:"DTJ", nama:"Diploma Teknologi Automotif Jentera Berat", en:"Heavy Machinery Automotive Technology",
    inst:["Jasin"], kluster:"Automotif", t:3, kelas:"MBOT", p:"D", rule:"T_MBOT_KOMP", gates:["rabunWarna"] },
  { kod:"TAK", nama:"Diploma Teknologi Automotif Komersial", en:"Technology in Automotive Commercial",
    inst:["Jasin","Pekan"], kluster:"Automotif", t:3, kelas:"JPK", p:"D", rule:"T_JPK2", gates:["rabunWarna"] },
  { kod:"TAP", nama:"Diploma Teknologi Automotif (4WD)", en:"Technology in Automotive (4WD)",
    inst:["Kuching","Kota Kinabalu"], kluster:"Automotif", t:3, kelas:"JPK", p:"D", rule:"T_JPK2", gates:["rabunWarna"] },
  { kod:"DTK", nama:"Diploma Teknologi Marin", en:"Marine Technology",
    inst:["Beseri"], kluster:"Automotif", t:3, kelas:"JPK", p:"D",
    rule:{ kredit:2, kreditDari:[{nama:"Matematik/Sains",subjek:KUMPULAN_SAINS_TEK.concat(["Matematik"])}], lulusWajib:["Bahasa Inggeris","Matematik"] },
    gates:["rabunWarna","temuduga","kesihatanLaut"] },

  /* ===== AWAM (p.18) ===== */
  { kod:"DTC", nama:"Diploma Teknologi Kejuruteraan Pembinaan (Sistem Termaju)", en:"Construction Engineering Technology (Advanced System)",
    inst:["Sri Gading"], kluster:"Awam", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:[] },
  { kod:"DTG", nama:"Diploma Teknologi Kejuruteraan Pembinaan (Geo-Struktur)", en:"Construction Engineering Technology (Geo-Structure)",
    inst:["Sri Gading"], kluster:"Awam", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:[] },
  { kod:"DTF", nama:"Diploma Teknologi Kejuruteraan Pembinaan (Forensik Bangunan dan Penyelenggaraan)", en:"Construction Engineering Technology Building (Forensic and Maintenance)",
    inst:["Sri Gading"], kluster:"Awam", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:[] },
  { kod:"DTH", nama:"Diploma Teknologi Kejuruteraan Pembinaan (Jalanraya dan Pengangkutan)", en:"Construction Engineering Technology (Highway and Transportation)",
    inst:["Sri Gading"], kluster:"Awam", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:[] },
  { kod:"DTM", nama:"Diploma Teknologi Kejuruteraan Pembinaan (Perkhidmatan Bangunan dan Penyelenggaraan)", en:"Construction Engineering Technology (Building Services and Maintenance)",
    inst:["Sri Gading"], kluster:"Awam", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:[] },
  { kod:"DTV", nama:"Diploma Teknologi Kejuruteraan Pembinaan (Pemodelan Maklumat Bangunan)", en:"Construction Engineering Technology (Building Information Modelling)",
    inst:["Sri Gading"], kluster:"Awam", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:[] },
  { kod:"DTE", nama:"Diploma Teknologi Kejuruteraan Pembinaan (Bangunan Hijau)", en:"Construction Engineering Technology (Green Buildings)",
    inst:["Sri Gading"], kluster:"Awam", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:[] },
  { kod:"DBN", nama:"Diploma Teknologi Kejuruteraan Bangunan", en:"Building Engineering Technology",
    inst:["Pasir Mas"], kluster:"Awam", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:[] },
  { kod:"DTW", nama:"Diploma Teknologi Perkhidmatan Air", en:"Technology in Water Services",
    inst:["Lumut"], kluster:"Awam", t:3, kelas:"JPK", p:"D", rule:"T_JPK2", gates:[] },
  { kod:"DTA", nama:"Diploma Teknologi Awam dan Struktur (Pemodelan Maklumat Bangunan)", en:"Technology in Civil & Structural (Building Information Modelling)",
    inst:["Sungai Petani","Kota Kinabalu"], kluster:"Awam", t:3, kelas:"JPK", p:"D", rule:"T_JPK2", gates:[] },

  /* ===== BIOPERUBATAN (p.21-22) =====
     NOTE: the brochure prints DKL with two different English
     names (p.21 vs p.22). Using the p.21 wording. */
  { kod:"DKT", nama:"Diploma Kejuruteraan Elektronik Bioperubatan (Terapeutik)", en:"Biomedical Electronics Engineering (Therapeutic)",
    inst:["Ledang"], kluster:"Bioperubatan", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:["rabunWarna"] },
  { kod:"DKD", nama:"Diploma Kejuruteraan Elektronik Bioperubatan (Diagnostik)", en:"Biomedical Electronics Engineering (Diagnostic)",
    inst:["Ledang"], kluster:"Bioperubatan", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:["rabunWarna"] },
  { kod:"DKG", nama:"Diploma Kejuruteraan Elektronik Bioperubatan (Radiologi dan Pengimejan)", en:"Biomedical Electronics Engineering (Radiology and Imaging)",
    inst:["Ledang"], kluster:"Bioperubatan", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:["rabunWarna"] },
  { kod:"DKL", nama:"Diploma Kejuruteraan Elektronik Bioperubatan (Makmal)", en:"Biomedical Electronics Engineering (Laboratory)",
    inst:["Ledang"], kluster:"Bioperubatan", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:["rabunWarna"] },
  { kod:"DKB", nama:"Diploma Kejuruteraan Elektronik Bioperubatan (Teknologi Maklumat dan Komunikasi)", en:"Biomedical Electronics Engineering (Information and Communication Technology)",
    inst:["Ledang"], kluster:"Bioperubatan", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:["rabunWarna"] },

  /* ===== ELEKTRIK (p.23-25) ===== */
  { kod:"DEP", nama:"Diploma Teknologi Kejuruteraan Elektrik (Kuasa)", en:"Electrical Engineering Technology (Power)",
    inst:["Pasir Mas","Seberang Perai Utara"], kluster:"Elektrik", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:["rabunWarna"] },
  { kod:"DED", nama:"Diploma Teknologi Kejuruteraan Elektrik (Domestik dan Industri)", en:"Electrical Engineering Technology (Domestic and Industry)",
    inst:["Pasir Mas","Johor Bahru","Seberang Perai Utara"], kluster:"Elektrik", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:["rabunWarna"] },
  { kod:"DEO", nama:"Diploma Teknologi Kejuruteraan Elektrik (Operasi Loji)", en:"Electrical Engineering Technology (Plant Operation)",
    inst:["Kemaman"], kluster:"Elektrik", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:["rabunWarna"] },
  { kod:"DEE", nama:"Diploma Teknologi Kejuruteraan Pemasangan Elektrik", en:"Electrical Installation Engineering Technology",
    inst:["Bintulu"], kluster:"Elektrik", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:["rabunWarna"] },
  { kod:"DEA", nama:"Diploma Kejuruteraan Elektrik", en:"Electrical Engineering",
    inst:["Pasir Mas"], kluster:"Elektrik", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:["rabunWarna"] },
  { kod:"DCS", nama:"Diploma Kompetensi Elektrik (Domestik dan Industri)", en:"Competency in Electrical (Domestic and Industry)",
    inst:["Beseri","Lumut","Kuala Lumpur","Pekan","Kuching","Kota Kinabalu"], kluster:"Elektrik", t:3, kelas:"JPK", p:"D", rule:"T_DCS", gates:["rabunWarna"] },
  { kod:"DCP", nama:"Diploma Kompetensi Elektrik (Kuasa)", en:"Competency in Electrical (Power)",
    inst:["Sik","Lumut","Johor Bahru","Jasin","Pekan","Kuching","Kota Kinabalu"], kluster:"Elektrik", t:3, kelas:"JPK", p:"D", rule:"T_DCS", gates:["rabunWarna"] },
  { kod:"DCB", nama:"Diploma Lanjutan Kompetensi Elektrik (Penjanaan)", en:"Advanced Competency in Electrical (Generation)",
    inst:["Seberang Perai Utara","Lumut","Kuala Lumpur","Jasin","Johor Bahru","Pekan"], kluster:"Elektrik", t:1, kelas:"JPK", p:"D", rule:"T_LANJUTAN", gates:["rabunWarna"] },
  { kod:"DCA", nama:"Diploma Kompetensi Elektrik (Pengagihan)", en:"Competency in Electrical (Distribution)",
    inst:["Sik","Seberang Perai Utara","Kuala Lumpur","Jasin"], kluster:"Elektrik", t:2, kelas:"JPK", p:"D", rule:"T_LANJUTAN", gates:["rabunWarna"] },
  { kod:"DCG", nama:"Diploma Kompetensi Elektrik (Industri)", en:"Competency in Electrical (Industry)",
    inst:["Beseri","Jasin","Besut"], kluster:"Elektrik", t:1.5, kelas:"JPK", p:"D", rule:"T_LANJUTAN", gates:["rabunWarna"] },
  { kod:"DCM", nama:"Diploma Kompetensi Elektrik (Penyelenggaraan)", en:"Competency in Electrical (Maintenance)",
    inst:["Besut"], kluster:"Elektrik", t:2, kelas:"JPK", p:"D", rule:"T_LANJUTAN", gates:["rabunWarna"] },
  { kod:"UTE", nama:"Diploma Teknousahawan Elektrik", en:"Technopreneurship in Electrical",
    inst:["Seberang Perai Utara"], kluster:"Elektrik", t:2, kelas:"JPK", p:"D", rule:"T_LANJUTAN", gates:["psikometrik","temuduga","rabunWarna"] },

  /* ===== ELEKTRONIK (p.26-29) ===== */
  { kod:"DKS", nama:"Diploma Kejuruteraan Elektronik (Robotik & Automasi)", en:"Electronic Engineering (Robotic & Automation)",
    inst:["MJII Beranang"], kluster:"Elektronik", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:["rabunWarna"] },
  { kod:"DKE", nama:"Diploma Kejuruteraan Elektronik (Sistem Terbenam)", en:"Electronic Engineering (Embedded System)",
    inst:["MJII Beranang"], kluster:"Elektronik", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:["rabunWarna"] },
  { kod:"DKM", nama:"Diploma Kejuruteraan Elektronik (Mikroelektronik)", en:"Electronic Engineering (Microelectronic)",
    inst:["MJII Beranang"], kluster:"Elektronik", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:["rabunWarna"] },
  { kod:"DKC", nama:"Diploma Kejuruteraan Elektronik (Pengukuran Elektronik & Kawalan)", en:"Electronic Engineering (Electronics Measurement & Control)",
    inst:["MJII Beranang"], kluster:"Elektronik", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:["rabunWarna"] },
  { kod:"DKR", nama:"Diploma Kejuruteraan Elektronik (Transmisi Data & Rangkaian)", en:"Electronic Engineering (Data Transmission & Network)",
    inst:["MJII Beranang"], kluster:"Elektronik", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:["rabunWarna"] },
  { kod:"DEI", nama:"Diploma Teknologi Kejuruteraan Elektronik (Industri)", en:"Electronic Engineering Technology (Industry)",
    inst:["Pasir Mas"], kluster:"Elektronik", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:["rabunWarna"] },
  { kod:"DMK", nama:"Diploma Teknologi Kejuruteraan Mekatronik Industri", en:"Industrial Mechatronic Engineering Technology",
    inst:["Balik Pulau"], kluster:"Elektronik", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:["rabunWarna"] },
  { kod:"DNK", nama:"Diploma Teknologi Kejuruteraan Elektronik Gunaan", en:"Applied Electronics Engineering Technology",
    inst:["Sungai Petani"], kluster:"Elektronik", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:["rabunWarna"] },
  { kod:"DFI", nama:"Diploma Kejuruteraan Elektronik (Objek Rangkaian Internet)", en:"Electronic Engineering (Internet Of Things)",
    inst:["Petaling Jaya"], kluster:"Elektronik", t:2.5, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:["rabunWarna"] },
  { kod:"DFS", nama:"Diploma Teknologi Komputer (Sekuriti)", en:"Computer Technology (Security)",
    inst:["Sik"], kluster:"Elektronik", t:3, kelas:"MBOT", p:"D", rule:"T_MBOT_KOMP", gates:["rabunWarna"] },
  { kod:"DFK", nama:"Diploma Teknologi Komputer (Komputasi Awan)", en:"Computer Technology (Cloud Computing)",
    inst:["Besut"], kluster:"Elektronik", t:3, kelas:"MBOT", p:"D", rule:"T_MBOT_KOMP", gates:["rabunWarna"] },
  { kod:"DFD", nama:"Diploma Teknologi Komputer (Analisa Data Besar)", en:"Computer Technology (Big Data)",
    inst:["Lumut"], kluster:"Elektronik", t:3, kelas:"MBOT", p:"D", rule:"T_MBOT_KOMP", gates:["rabunWarna"] },
  { kod:"DCN", nama:"Diploma Kompetensi Rangkaian Komputer dan Sistem Pentadbiran", en:"Competency In Computer Networking and System Administration",
    inst:["Ledang"], kluster:"Elektronik", t:1.5, kelas:"JPK", p:"D", rule:"T_LANJUTAN", gates:["rabunWarna"] },
  { kod:"DEK", nama:"Diploma Teknologi Pembuatan Produk Elektronik", en:"Electronic Product Manufacturing Technology",
    inst:["Johor Bahru"], kluster:"Elektronik", t:3, kelas:"JPK", p:"D", rule:"T_JPK2", gates:["rabunWarna"] },
  { kod:"DGK", nama:"Diploma Teknologi Mekatronik (Sistem Kawalan)", en:"Technology in Mechatronic (Control System)",
    inst:["Pekan"], kluster:"Elektronik", t:2.5, kelas:"JPK", p:"D", rule:"T_JPK2", gates:["rabunWarna"] },

  /* ===== MEKANIKAL PEMBUATAN (p.30-31) ===== */
  { kod:"DKA", nama:"Diploma Kejuruteraan Pembuatan (Pembuatan Automotif)", en:"Manufacturing Engineering (Automotive Manufacturing)",
    inst:["Kuantan"], kluster:"Mekanikal Pembuatan", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:[] },
  { kod:"DKQ", nama:"Diploma Kejuruteraan Pembuatan (Kualiti dan Produktiviti)", en:"Manufacturing Engineering (Quality and Productivity)",
    inst:["Kuantan"], kluster:"Mekanikal Pembuatan", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:[] },
  { kod:"DKP", nama:"Diploma Kejuruteraan Pembuatan (Teknologi dan Proses)", en:"Manufacturing Engineering (Technology And Process)",
    inst:["Kuantan"], kluster:"Mekanikal Pembuatan", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:[] },
  { kod:"DKI", nama:"Diploma Kejuruteraan Pembuatan (Automasi Industri dan Robotik)", en:"Manufacturing Engineering (Industrial Automation and Robotic)",
    inst:["Kuantan"], kluster:"Mekanikal Pembuatan", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:[] },
  { kod:"DKN", nama:"Diploma Kejuruteraan Pembuatan (Rekabentuk Pembuatan)", en:"Manufacturing Engineering (Manufacturing Design)",
    inst:["Kuantan"], kluster:"Mekanikal Pembuatan", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:[] },
  { kod:"DLR", nama:"Diploma Teknologi Kejuruteraan Mekanikal Rekabentuk", en:"Mechanical Design Engineering Technology",
    inst:["Pasir Mas"], kluster:"Mekanikal Pembuatan", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:[] },
  { kod:"DPN", nama:"Diploma Teknologi Kejuruteraan Pembuatan", en:"Manufacturing Engineering Technology",
    inst:["Balik Pulau"], kluster:"Mekanikal Pembuatan", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:[] },
  { kod:"DPT", nama:"Diploma Teknologi Kejuruteraan Pembuatan (Acuan Tekan)", en:"Manufacturing Engineering Technology (Stamping Die)",
    inst:["Balik Pulau"], kluster:"Mekanikal Pembuatan", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:[] },
  { kod:"DAN", nama:"Diploma Teknologi Kejuruteraan Pembuatan (Acuan Suntikan Plastik)", en:"Manufacturing Engineering Technology (Plastic Injection Mould)",
    inst:["Balik Pulau"], kluster:"Mekanikal Pembuatan", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:[] },
  { kod:"DRP", nama:"Diploma Teknologi Kejuruteraan Pembuatan (Rekabentuk Produk)", en:"Manufacturing Engineering Technology (Product Design)",
    inst:["Balik Pulau"], kluster:"Mekanikal Pembuatan", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:[] },
  { kod:"DNS", nama:"Diploma Teknologi Kejuruteraan (Pembuatan Pintar)", en:"Engineering Technology (Smart Manufacturing)",
    inst:["Lumut"], kluster:"Mekanikal Pembuatan", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:[] },
  { kod:"DGN", nama:"Diploma Teknologi Pembuatan", en:"Technology in Manufacturing",
    inst:["Balik Pulau","Pekan"], kluster:"Mekanikal Pembuatan", t:3, kelas:"JPK", p:"D", rule:"T_JPK2", gates:[] },
  { kod:"DRM", nama:"Diploma Teknologi Lukisan Rekabentuk Mekanikal", en:"Technology In Mechanical Design Draughting",
    inst:["Kuala Lumpur","Jasin"], kluster:"Mekanikal Pembuatan", t:2.5, kelas:"JPK", p:"D", rule:"T_JPK2", gates:[] },
  { kod:"IMF", nama:"Diploma Industri Siapan Logam", en:"Industry Metal Finishing",
    inst:["Johor Bahru"], kluster:"Mekanikal Pembuatan", t:2, kelas:"JPK", p:"D", rule:"T_JPK2", gates:[] },
  { kod:"DSR", nama:"Diploma Teknologi Pembaikan Struktur Pesawat", en:"Technology in Aircraft Structure Repair",
    inst:["Kuala Lumpur"], kluster:"Mekanikal Pembuatan", t:2.5, kelas:"JPK", p:"D", rule:"T_JPK2", gates:[] },
  { kod:"ITW", nama:"Diploma Kompetensi Kimpalan", en:"Competency in Welding",
    inst:["Beseri","Lumut","Johor Bahru","Besut","Kuching"], kluster:"Mekanikal Pembuatan", t:3, kelas:"JPK", p:"D", rule:"T_JPK2", gates:["rabunWarna"] },
  { kod:"DGG", nama:"Diploma Teknologi Pembuatan (1.5 Tahun)", en:"Technology in Manufacturing (1.5 Years)",
    inst:["Balik Pulau"], kluster:"Mekanikal Pembuatan", t:1.5, kelas:"JPK", p:"D", rule:"T_LANJUTAN", gates:[] },
  { kod:"GMD", nama:"Diploma Teknologi Lukisan Rekabentuk (Mekanikal)", en:"Design Draughting Technology (Mechanical)",
    inst:["Kuala Lumpur"], kluster:"Mekanikal Pembuatan", t:1.5, kelas:"JPK", p:"D", rule:"T_LANJUTAN", gates:[] },
  { kod:"DCW", nama:"Diploma Kompetensi Kimpalan (1.5 Tahun)", en:"Competency in Welding (1.5 Years)",
    inst:["Beseri","Johor Bahru","Lumut"], kluster:"Mekanikal Pembuatan", t:1.5, kelas:"JPK", p:"D", rule:"T_LANJUTAN", gates:["rabunWarna"] },

  /* ===== MEKANIKAL SERVIS (p.32-33) ===== */
  { kod:"DPP", nama:"Diploma Teknologi Kejuruteraan Penyamanan Udara dan Penyejukan", en:"Air Conditioning and Refrigeration Engineering Technology",
    inst:["Johor Bahru"], kluster:"Mekanikal Servis", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:["rabunWarna"] },
  { kod:"DNM", nama:"Diploma Teknologi Kejuruteraan (Penyelenggaraan Industri)", en:"Engineering Technology (Industrial Maintenance)",
    inst:["Jasin"], kluster:"Mekanikal Servis", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:["rabunWarna"] },
  { kod:"PPU", nama:"Diploma Teknologi Penyejukan dan Penyamanan Udara", en:"Refrigeration and Air Conditioning Technology",
    inst:["Sik","Kuala Lumpur","Besut","Kota Kinabalu"], kluster:"Mekanikal Servis", t:2.5, kelas:"JPK", p:"D", rule:"T_JPK2", gates:["rabunWarna"] },
  { kod:"DTU", nama:"Diploma Teknologi Pengurusan dan Rekabentuk Penyamanan Udara", en:"Technology in Air Conditioning Management and Design",
    inst:["Beseri"], kluster:"Mekanikal Servis", t:1.5, kelas:"JPK", p:"D", rule:"T_LANJUTAN", gates:["rabunWarna"] },
  { kod:"UTA", nama:"Diploma Teknousahawan Penyejukan dan Penyamanan Udara", en:"Technopreneurship in Refrigeration and Air Conditioning",
    inst:["Kuala Lumpur"], kluster:"Mekanikal Servis", t:2, kelas:"JPK", p:"D", rule:"T_LANJUTAN", gates:["psikometrik","temuduga"] },

  /* ===== MINYAK DAN GAS (p.34) ===== */
  { kod:"DLP", nama:"Diploma Teknologi Kejuruteraan Loji (Perpaipan)", en:"Plant Engineering Technology (Piping)",
    inst:["Kemaman"], kluster:"Minyak dan Gas", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:[] },
  { kod:"DLM", nama:"Diploma Teknologi Kejuruteraan Loji (Mekanikal)", en:"Plant Engineering Technology (Mechanical)",
    inst:["Kemaman"], kluster:"Minyak dan Gas", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:[] },
  { kod:"DLS", nama:"Diploma Teknologi Kejuruteraan Loji (Struktur Luar Pesisir)", en:"Plant Engineering Technology (Offshore Structure)",
    inst:["Kemaman"], kluster:"Minyak dan Gas", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:[] },
  { kod:"DLI", nama:"Diploma Teknologi Kejuruteraan Loji (Instrumentasi dan Kawalan)", en:"Plant Engineering Technology (Instrumentation and Control)",
    inst:["Kemaman"], kluster:"Minyak dan Gas", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:[] },
  { kod:"DLO", nama:"Diploma Teknologi Kejuruteraan Petroleum (Operasi Pesisir)", en:"Petroleum Engineering Technology (Onshore Operation)",
    inst:["Kemaman"], kluster:"Minyak dan Gas", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:[] },
  { kod:"DGS", nama:"Diploma Teknologi Kejuruteraan Gas", en:"Gas Engineering Technology",
    inst:["Johor Bahru"], kluster:"Minyak dan Gas", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:[] },
  { kod:"DOL", nama:"Diploma Teknologi Kejuruteraan Petroleum (Operasi Loji)", en:"Petroleum Engineering Technology (Plant Operation)",
    inst:["Bintulu"], kluster:"Minyak dan Gas", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:[] },
  { kod:"DIK", nama:"Diploma Teknologi Kejuruteraan Petroleum (Instrumentasi dan Kawalan Loji)", en:"Petroleum Engineering Technology (Plant Instrumentation and Control)",
    inst:["Bintulu"], kluster:"Minyak dan Gas", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:[] },

  /* ===== SENI DAN REKABENTUK (p.35-36) ===== */
  { kod:"DSP", nama:"Diploma Rekabentuk Perabot", en:"Furniture Design",
    inst:["Rembau"], kluster:"Seni dan Rekabentuk", t:3, kelas:"MQA", p:"D", rule:"T_MQA_REKA", gates:["temuduga","portfolio"] },
  { kod:"DSF", nama:"Diploma Rekabentuk Fesyen", en:"Fashion Design",
    inst:["Rembau"], kluster:"Seni dan Rekabentuk", t:3, kelas:"MQA", p:"D", rule:"T_MQA_REKA", gates:["temuduga","portfolio"] },
  { kod:"DSV", nama:"Diploma Perfileman Digital", en:"Digital Filmmaking",
    inst:["Rembau"], kluster:"Seni dan Rekabentuk", t:3, kelas:"MQA", p:"D", rule:"T_MQA_REKA", gates:["temuduga","portfolio"] },
  { kod:"DSM", nama:"Diploma Rekabentuk Media Digital", en:"Digital Media Design",
    inst:["Rembau"], kluster:"Seni dan Rekabentuk", t:3, kelas:"MQA", p:"D", rule:"T_MQA_REKA", gates:["temuduga","portfolio"] },
  { kod:"DSK", nama:"Diploma Rekabentuk Pengiklanan Digital", en:"Digital Advertising Design",
    inst:["Sungai Petani"], kluster:"Seni dan Rekabentuk", t:3, kelas:"MQA", p:"D", rule:"T_MQA_REKA", gates:["temuduga","portfolio"] },
  { kod:"DLA", nama:"Diploma Pengeluaran Perabot", en:"Furniture Production",
    inst:["Sungai Petani","Pekan"], kluster:"Seni dan Rekabentuk", t:2.5, kelas:"JPK", p:"D", rule:"T_SIJIL_SPM", gates:["temuduga"] },
  { kod:"DTR", nama:"Diploma Teknologi Pengeluaran Perabot Kontemporari", en:"Technology in Contemporary Furniture Production",
    inst:["Lumut"], kluster:"Seni dan Rekabentuk", t:3, kelas:"JPK", p:"D", rule:"T_JPK2", gates:[] },
  { kod:"UPF", nama:"Diploma Teknousahawan Rekabentuk dan Pengeluaran Fabrik", en:"Technopreneurship in Fabric Design and Production",
    inst:["Alor Setar"], kluster:"Seni dan Rekabentuk", t:2, kelas:"MARA", p:"D", rule:"T_LANJUTAN", gates:["psikometrik","temuduga"] },
  { kod:"UTF", nama:"Diploma Teknousahawan Fesyen", en:"Technopreneurship in Fashion",
    inst:["Rembau"], kluster:"Seni dan Rekabentuk", t:2, kelas:"MARA", p:"D", rule:"T_LANJUTAN", gates:["psikometrik","temuduga"] },
  { kod:"UPP", nama:"Diploma Teknousahawan Rekabentuk dan Pengeluaran Perabot", en:"Technopreneurship in Furniture Design and Production",
    inst:["Alor Setar"], kluster:"Seni dan Rekabentuk", t:2, kelas:"JPK", p:"D", rule:"T_LANJUTAN", gates:["psikometrik","temuduga"] },
  { kod:"UTU", nama:"Diploma Teknousahawan Upholsteri", en:"Technopreneurship in Upholstery",
    inst:["Sungai Petani"], kluster:"Seni dan Rekabentuk", t:2, kelas:"MARA", p:"D", rule:"T_LANJUTAN", gates:["psikometrik","temuduga"] },

  /* ===== BIOTEKNOLOGI (p.36-37) ===== */
  { kod:"DHH", nama:"Diploma Herba dan Hasilan Semulajadi (Sains Herba)", en:"Herbal and Natural Products (Herbal Science)",
    inst:["Lenggong"], kluster:"Bioteknologi", t:3, kelas:"MQA", p:"D", rule:"T_BIOTEK", gates:[] },
  { kod:"DHM", nama:"Diploma Herba dan Hasilan Semulajadi (Pembuatan)", en:"Herbal and Natural Products (Manufacturing)",
    inst:["Lenggong"], kluster:"Bioteknologi", t:3, kelas:"MQA", p:"D", rule:"T_BIOTEK", gates:[] },
  { kod:"DPD", nama:"Diploma Teknologi Pembungkusan dan Rekabentuk", en:"Packaging Technology and Design",
    inst:["Lenggong"], kluster:"Bioteknologi", t:3, kelas:"MBOT", p:"D", rule:"T_MBOT_KOMP", gates:["rabunWarna"] },
  { kod:"DPM", nama:"Diploma Teknologi Kejuruteraan Penyelenggaraan Loji", en:"Engineering Technology Plant Maintenance",
    inst:["Lenggong"], kluster:"Bioteknologi", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:[] },
  { kod:"DFE", nama:"Diploma Teknologi Kejuruteraan Biokimia (Makanan)", en:"Biochemical Engineering Technology (Food)",
    inst:["Lenggong"], kluster:"Bioteknologi", t:3, kelas:"ETAC", p:"D", rule:"T_ETAC3", gates:[] },


  /* ============================================================
     SIJIL (brochure p.4-10)
     ============================================================ */
  { kod:"SSB", nama:"Sijil Senibina", en:"Certificate in Architecture",
    inst:["Lumut","Pekan"], kluster:"Alam Bina", t:1.5, kelas:"JPK", p:"S", rule:"T_SIJIL_SPM", gates:["temuduga","portfolio"] },
  { kod:"STB", nama:"Sijil Teknologi Baikpulih Badan Kenderaan", en:"Certificate in Automotive Body Repair Technology",
    inst:["Jasin","Pekan","Kuching"], kluster:"Automotif", t:1.5, kelas:"JPK", p:"S", rule:"T_SIJIL_SPM", gates:["rabunWarna"] },
  { kod:"SMM", nama:"Sijil Teknologi Kejuruteraan Marin", en:"Certificate in Marine Engineering Technology",
    inst:["Kuching","Johor Bahru"], kluster:"Automotif", t:1.5, kelas:"JPK", p:"S", rule:"T_SIJIL_SPM", gates:["rabunWarna"] },
  { kod:"STP", nama:"Sijil Teknologi Bekalan Air dan Pembentungan", en:"Certificate in Water Supply and Sewerage Technology",
    inst:["Sungai Petani"], kluster:"Awam", t:2, kelas:"MARA", p:"S", rule:"T_SIJIL_SPM", gates:[] },
  { kod:"SBN", nama:"Sijil Teknologi Kejuruteraan Bangunan", en:"Certificate in Building Engineering Technology",
    inst:["Lumut","Pekan"], kluster:"Awam", t:1.5, kelas:"JPK", p:"S", rule:"T_SIJIL_SPM", gates:[] },
  { kod:"STN", nama:"Sijil Teknologi Bangunan", en:"Certificate in Building Technology",
    inst:["Kuching"], kluster:"Awam", t:2, kelas:"JPK", p:"S", rule:"T_SIJIL_SPM", gates:[] },
  { kod:"SEP", nama:"Sijil Teknologi Kejuruteraan Elektrik (Kuasa)", en:"Certificate in Electrical Engineering Technology (Power)",
    inst:["Kuching"], kluster:"Elektrik", t:3, kelas:"JPK", p:"S", rule:"T_SIJIL_SPM", gates:["rabunWarna"] },
  { kod:"SPE", nama:"Sijil Teknologi Kejuruteraan Pemasangan Elektrik", en:"Certificate in Electrical Installation Engineering Technology",
    inst:["Bintulu"], kluster:"Elektrik", t:2, kelas:"MQA", p:"S", rule:"T_MQA_SPE", gates:["rabunWarna"] },
  { kod:"STF", nama:"Sijil Teknologi Foundri", en:"Certificate in Foundry Technology",
    inst:["Lumut"], kluster:"Mekanikal Pembuatan", t:1.5, kelas:"JPK", p:"S", rule:"T_SIJIL_SPM", gates:[] },
  { kod:"STK", nama:"Sijil Teknologi Kimpalan", en:"Certificate in Welding Technology",
    inst:["Kuala Lumpur","Jasin","Pekan"], kluster:"Mekanikal Pembuatan", t:1.5, kelas:"JPK", p:"S", rule:"T_SIJIL_SPM", gates:[] },
  { kod:"SPN", nama:"Sijil Teknologi Kejuruteraan Pembuatan", en:"Certificate in Manufacturing Engineering Technology",
    inst:["Kuala Lumpur","Johor Bahru"], kluster:"Mekanikal Pembuatan", t:1.5, kelas:"JPK", p:"S", rule:"T_SIJIL_SPM", gates:[] },
  { kod:"SLR", nama:"Sijil Teknologi Kejuruteraan Mekanikal (Lukisan Rekabentuk)", en:"Certificate in Mechanical Engineering Technology (Draughting Design)",
    inst:["Lumut","Besut","Pekan","Johor Bahru"], kluster:"Mekanikal Pembuatan", t:1.5, kelas:"JPK", p:"S", rule:"T_SIJIL_SPM", gates:[] },
  { kod:"SPP", nama:"Sijil Teknologi Kejuruteraan Penyamanan Udara dan Penyejukan", en:"Certificate in Air Conditioning and Refrigeration Engineering Technology",
    inst:["Beseri"], kluster:"Mekanikal Servis", t:1.5, kelas:"JPK", p:"S", rule:"T_SIJIL_SPM", gates:["rabunWarna"] },
  { kod:"SMI", nama:"Sijil Teknologi Kejuruteraan Mekanik Industri", en:"Certificate in Industrial Mechanic Engineering Technology",
    inst:["Kuala Lumpur","Johor Bahru"], kluster:"Mekanikal Servis", t:1.5, kelas:"JPK", p:"S", rule:"T_SIJIL_SPM", gates:["rabunWarna"] },
  { kod:"SFS", nama:"Sijil Teknologi Kejuruteraan Fabrikasi Struktur", en:"Certificate in Structure Fabrication Engineering Technology",
    inst:["Bintulu"], kluster:"Minyak dan Gas", t:2, kelas:"MQA", p:"S", rule:"T_MQA_SPE", gates:[] },
  { kod:"SFP", nama:"Sijil Teknologi Kejuruteraan Fabrikasi Perpaipan", en:"Certificate in Piping Fabrication Engineering Technology",
    inst:["Bintulu"], kluster:"Minyak dan Gas", t:2, kelas:"MQA", p:"S", rule:"T_MQA_SPE", gates:[] },
];
