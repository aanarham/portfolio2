import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp, setLogLevel } from 'firebase/firestore';

// --- CONFIGURASI WAJIB FIREBASE ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Menggunakan tipe data yang ketat (TypeScript style via JSDoc)
/**
 * @typedef {Object} Project
 * @property {string} title
 * @property {string} description
 * @property {string[]} technologies
 * @property {string} link
 */

// Data Proyek dari portfolio aanarham
/** @type {Project[]} */
const mockProjects = [
  {
    title: "Manajemen Katalog Produk",
    description: "Aplikasi web untuk mengelola katalog produk secara efisien.",
    technologies: ["Web App"],
    link: "https://vip-six-blue.vercel.app/",
  },
  {
    title: "Katalog Toko Zeta",
    description: "Aplikasi katalog produk toko berbasis web, dibuat dengan Next.js dan Vercel.",
    technologies: ["Next.js", "Vercel"],
    link: "https://katalog-toko-zeta.vercel.app/",
  },
  {
    title: "VIP AI Cek",
    description: "Aplikasi berbasis AI untuk pengecekan otomatis, dibangun dengan Streamlit.",
    technologies: ["AI", "Streamlit"],
    link: "https://vip-ai-cek.streamlit.app/",
  },
];

// Data Profil
const profile = {
  name: "Arham Nugraha",
  nickname: "Aan",
  job: "SPV di PT Valor Inspiration Pesona",
  location: "Makassar, Sulawesi Selatan",
  address: "Btn Andi Tonro Permai Blok B15 No 20 Sungguminasa, Kabupaten Gowa",
  hobbies: ["Bermusik", "Bernyanyi", "Futsal"],
  photo: "https://aanarham-portfolio.netlify.app/images/profil.jpg",
};

// Data Keahlian
const skills = [
  "Supervisi & Manajemen",
  "Sales & Marketing",
  "Analisis data",
  "Manajemen Tim",
];

// Data Layanan
const services = [
  "Supervisi Distribusi",
  "Sales & Marketing",
  "Manajemen Tim",
  "Konsultasi Produk",
];

// Data Pendidikan
const education = [
  {
    level: "Sekolah Menengah Atas (SMA)",
    description: "Pendidikan menengah atas",
  },
];

// Data Pengalaman
const experiences = [
  {
    title: "SPV",
    company: "PT Valor Inspiration Pesona",
    description: "Mengelola dan mengawasi distribusi alat salon dan kosmetika. Bertanggung jawab atas operasional distribusi, manajemen tim, dan pencapaian target perusahaan.",
  },
  {
    title: "Sales Marketing",
    company: "Berbagai Perusahaan",
    description: "Pengalaman dalam bidang sales marketing untuk berbagai produk: Crocodile Garment PT Sinta Pertiwi Mks, Kosmetik, produk bayi & klontongan UD Balijaya, Produk Kosmetik, Bahan bangunan.",
  },
  {
    title: "Sales Promotion Boy",
    company: "Matahari Department Store",
    description: "Bertugas sebagai sales promotion untuk meningkatkan penjualan produk di department store.",
  },
];

// Data Portofolio
const portfolioItems = [
  {
    title: "Distribusi Produk Salon & Kosmetika",
    description: "Mengelola distribusi produk di PT VALOR INSPIRATION PESONA",
  },
  {
    title: "Sales & Marketing Campaign",
    description: "Berbagai kampanye pemasaran untuk produk konsumen",
  },
];

// Data Kontak
const contact = {
  officeEmail: "spv.valorinspirationpesona@gmail.com",
  personalEmail: "aan_croco@yahoo.com",
  whatsapp: "082393654513",
  tiktok: "https://www.tiktok.com/@aanarham333",
  github: "https://github.com/aanarham",
  address: profile.address,
};

// Komponen Card Proyek
/**
 * @param {Project} project
 * @returns {JSX.Element}
 */
const ProjectCard = ({ project }) => (
  <div className="bg-neutral-800 p-6 rounded-xl shadow-2xl hover:shadow-cyan-500/30 transition-shadow duration-300 transform hover:-translate-y-1">
    <h3 className="text-xl font-bold text-white mb-2">{project.title}</h3>
    <p className="text-neutral-400 mb-4 text-sm">{project.description}</p>
    <div className="flex flex-wrap gap-2 mb-4">
      {project.technologies.map((tech) => (
        <span key={tech} className="text-xs font-medium px-3 py-1 bg-cyan-700/30 text-cyan-300 rounded-full">
          {tech}
        </span>
      ))}
    </div>
    <a
      href={project.link}
      className="inline-flex items-center text-cyan-400 hover:text-cyan-300 transition-colors font-semibold text-sm"
    >
      Lihat Proyek &rarr;
    </a>
  </div>
);

// Komponen Utama Portofolio
const App = () => {
  // State untuk Firebase dan Auth
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // State untuk Formulir Kontak
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState(''); // success | error | loading
  const [errorMessage, setErrorMessage] = useState('');

  // --- 1. INISIALISASI FIREBASE & AUTENTIKASI ---
  useEffect(() => {
    // Setel log level ke Debug untuk melihat aktivitas Firestore di konsol
    // setLogLevel('Debug');
    try {
      if (Object.keys(firebaseConfig).length === 0) {
        console.error("Firebase config is missing or empty.");
        // Lanjutkan tanpa mencoba inisialisasi Firebase jika config hilang
        setIsAuthReady(true);
        return;
      }

      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const firebaseAuth = getAuth(app);

      setDb(firestore);
      setAuth(firebaseAuth);

      // Listener untuk perubahan status autentikasi
      const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
        if (user) {
          setUserId(user.uid);
        } else {
          // Jika tidak ada user, coba sign in anonim
          signInAnonymously(firebaseAuth).then((credentials) => {
            setUserId(credentials.user.uid);
          }).catch(error => {
            console.error("Gagal sign in anonim:", error);
          });
        }
        setIsAuthReady(true); // Tandai Auth siap setelah pemeriksaan pertama
      });

      // Lakukan sign in awal dengan Custom Token jika tersedia
      if (initialAuthToken) {
        signInWithCustomToken(firebaseAuth, initialAuthToken).catch(error => {
          console.error("Gagal sign in dengan custom token:", error);
          // Jika gagal, coba anonim sebagai fallback
          signInAnonymously(firebaseAuth).catch(err => console.error("Gagal fallback anonim:", err));
        });
      }

      return () => unsubscribe();
    } catch (error) {
      console.error("Kesalahan inisialisasi Firebase:", error);
      setIsAuthReady(true);
    }
  }, []);

  // Handler Input Form
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- 2. LOGIKA SERVER ACTION / FUNGSI FULL STACK (MENGGUNAKAN FIRESTORE) ---
  const handleSendMessage = useCallback(async (e) => {
    e.preventDefault();
    if (!db || !userId) {
      setErrorMessage("Layanan backend (Firestore) belum siap. Coba lagi.");
      setStatus('error');
      return;
    }

    if (!formData.name || !formData.email || !formData.message) {
      setErrorMessage("Semua kolom wajib diisi.");
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      // Path Firestore untuk data publik: /artifacts/{appId}/public/data/contact_messages
      const messagesCollection = collection(db, `artifacts/${appId}/public/data/contact_messages`);

      await addDoc(messagesCollection, {
        ...formData,
        userId: userId, // Menyimpan userId sebagai identifikasi pengirim
        timestamp: serverTimestamp(),
      });

      setStatus('success');
      setFormData({ name: '', email: '', message: '' }); // Reset form setelah sukses
      console.log("Pesan kontak berhasil disimpan di Firestore.");

    } catch (error) {
      console.error("Kesalahan saat menyimpan pesan:", error);
      setErrorMessage("Gagal mengirim pesan. Silakan coba lagi nanti.");
      setStatus('error');
    }
  }, [db, userId, formData]);

  // UI Komponen Portofolio
  const sectionClasses = "py-20 md:py-24 border-b border-neutral-800";
  const inputClasses = "w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:ring-cyan-500 focus:border-cyan-500 transition-all";

  // Tombol Kirim Form
  const ContactButton = useMemo(() => {
    const isFormValid = formData.name && formData.email && formData.message;
    const isDisabled = status === 'loading' || !isAuthReady || !isFormValid;

    let buttonText;
    if (status === 'loading') {
      buttonText = 'Mengirim...';
    } else if (status === 'success') {
      buttonText = 'Terkirim!';
    } else {
      buttonText = 'Kirim Pesan';
    }

    return (
      <button
        type="submit"
        className={`w-full py-3 mt-4 font-bold text-neutral-900 rounded-lg transition-all ${
          isDisabled
            ? 'bg-neutral-600 cursor-not-allowed'
            : 'bg-cyan-400 hover:bg-cyan-300 shadow-md shadow-cyan-500/50'
        }`}
        disabled={isDisabled}
      >
        {buttonText}
      </button>
    );
  }, [status, isAuthReady, formData]);

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-200 font-sans">
      <header className="fixed top-0 left-0 right-0 z-10 bg-neutral-900/90 backdrop-blur-sm shadow-lg border-b border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-extrabold text-cyan-400 tracking-wider">Arham Nugraha</h1>
          <nav className="space-x-4">
            <a href="#about" className="text-sm font-medium hover:text-cyan-400 transition-colors">Tentang</a>
            <a href="#skills" className="text-sm font-medium hover:text-cyan-400 transition-colors">Keahlian</a>
            <a href="#services" className="text-sm font-medium hover:text-cyan-400 transition-colors">Layanan</a>
            <a href="#education" className="text-sm font-medium hover:text-cyan-400 transition-colors">Pendidikan</a>
            <a href="#experience" className="text-sm font-medium hover:text-cyan-400 transition-colors">Pengalaman</a>
            <a href="#portfolio" className="text-sm font-medium hover:text-cyan-400 transition-colors">Portofolio</a>
            <a href="#projects" className="text-sm font-medium hover:text-cyan-400 transition-colors">Proyek</a>
            <a href="#contact" className="text-sm font-medium hover:text-cyan-400 transition-colors">Kontak</a>
          </nav>
        </div>
      </header>

      <main className="pt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Bagian Utama (Hero) */}
          <section id="hero" className={`${sectionClasses} pt-32 flex flex-col md:flex-row items-center gap-12`}>
            <div className="md:w-3/5">
              <p className="text-xl text-cyan-400 mb-3 font-semibold">Selamat Datang, Saya Adalah</p>
              <h2 className="text-5xl md:text-7xl font-extrabold leading-tight text-white mb-6">
                {profile.name} <span className="text-cyan-400">({profile.nickname})</span>
              </h2>
              <p className="text-neutral-400 text-lg max-w-xl mb-2">{profile.job}</p>
              <p className="text-neutral-400 text-lg max-w-xl mb-2">{profile.location}</p>
              <p className="text-neutral-400 text-lg max-w-xl mb-2">Alamat: {profile.address}</p>
              <p className="text-neutral-400 text-lg max-w-xl mb-4">Hobi: {profile.hobbies.join(", ")}</p>
              <a href="#projects" className="px-6 py-3 bg-cyan-500 text-neutral-900 font-bold rounded-lg shadow-lg hover:bg-cyan-400 transition-colors duration-200 inline-block">
                Lihat Proyek Web Apps
              </a>
            </div>
            <div className="md:w-2/5 flex justify-center">
              <img src={profile.photo} alt="Foto Profil Arham Nugraha" className="w-56 h-56 md:w-72 md:h-72 object-cover rounded-full border-4 border-cyan-400/50 shadow-xl" />
            </div>
          </section>

          {/* Bagian Tentang Saya (About) */}
          <section id="about" className={sectionClasses}>
            <h2 className="text-4xl font-bold mb-4 text-white border-b-2 border-cyan-500 inline-block pb-1">Tentang Saya</h2>
            <div className="space-y-4 text-neutral-400 text-lg max-w-4xl mt-6">
              <p>Nama saya <b>{profile.name}</b>, biasa dipanggil <b>{profile.nickname}</b>. Saya bekerja sebagai <b>{profile.job}</b>.</p>
              <p>Alamat: {profile.address}</p>
              <p>Hobi: {profile.hobbies.join(", ")}</p>
              <p>Saya memiliki pengalaman di bidang distribusi, sales marketing, dan manajemen tim di berbagai perusahaan.</p>
            </div>
          </section>

          {/* Bagian Keahlian */}
          <section id="skills" className={sectionClasses}>
            <h2 className="text-4xl font-bold mb-4 text-white border-b-2 border-cyan-500 inline-block pb-1">Keahlian</h2>
            <ul className="flex flex-wrap gap-4 mt-6">
              {skills.map((skill, idx) => (
                <li key={idx} className="px-4 py-2 bg-cyan-700/30 text-cyan-300 rounded-full text-lg font-medium">{skill}</li>
              ))}
            </ul>
          </section>

          {/* Bagian Layanan */}
          <section id="services" className={sectionClasses}>
            <h2 className="text-4xl font-bold mb-4 text-white border-b-2 border-cyan-500 inline-block pb-1">Layanan</h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {services.map((service, idx) => (
                <li key={idx} className="bg-neutral-800 p-6 rounded-xl shadow-md text-cyan-300 font-semibold text-lg">{service}</li>
              ))}
            </ul>
          </section>

          {/* Bagian Pendidikan */}
          <section id="education" className={sectionClasses}>
            <h2 className="text-4xl font-bold mb-4 text-white border-b-2 border-cyan-500 inline-block pb-1">Pendidikan</h2>
            <ul className="mt-6">
              {education.map((edu, idx) => (
                <li key={idx} className="mb-4">
                  <span className="font-bold text-cyan-400">{edu.level}</span> - <span className="text-neutral-400">{edu.description}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Bagian Pengalaman */}
          <section id="experience" className={sectionClasses}>
            <h2 className="text-4xl font-bold mb-4 text-white border-b-2 border-cyan-500 inline-block pb-1">Pengalaman Kerja</h2>
            <ul className="mt-6">
              {experiences.map((exp, idx) => (
                <li key={idx} className="mb-6">
                  <span className="font-bold text-cyan-400 text-lg">{exp.title}</span> <span className="text-neutral-300">di {exp.company}</span>
                  <div className="text-neutral-400 mt-1">{exp.description}</div>
                </li>
              ))}
            </ul>
          </section>

          {/* Bagian Portofolio */}
          <section id="portfolio" className={sectionClasses}>
            <h2 className="text-4xl font-bold mb-4 text-white border-b-2 border-cyan-500 inline-block pb-1">Portofolio</h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {portfolioItems.map((item, idx) => (
                <li key={idx} className="bg-neutral-800 p-6 rounded-xl shadow-md">
                  <span className="font-bold text-cyan-400 text-lg">{item.title}</span>
                  <div className="text-neutral-400 mt-1">{item.description}</div>
                </li>
              ))}
            </ul>
          </section>

          {/* Bagian Proyek Web Apps */}
          <section id="projects" className={sectionClasses}>
            <h2 className="text-4xl font-bold mb-10 text-white border-b-2 border-cyan-500 inline-block pb-1">Proyek Web Apps</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {mockProjects.map((project, index) => (
                <ProjectCard key={index} project={project} />
              ))}
            </div>
          </section>

          {/* Bagian Hubungi Saya (Contact) - Simulasi Full Stack */}
          <section id="contact" className={`${sectionClasses} border-none`}>
            <h2 className="text-4xl font-bold mb-10 text-white border-b-2 border-cyan-500 inline-block pb-1">Hubungi Saya</h2>
            <div className="max-w-xl mx-auto bg-neutral-800/50 p-8 rounded-xl shadow-2xl">
              <div className="mb-6">
                <p className="text-neutral-400 text-lg mb-2">Email Kantor: <a href={`mailto:${contact.officeEmail}`} className="text-cyan-400">{contact.officeEmail}</a></p>
                <p className="text-neutral-400 text-lg mb-2">Email Pribadi: <a href={`mailto:${contact.personalEmail}`} className="text-cyan-400">{contact.personalEmail}</a></p>
                <p className="text-neutral-400 text-lg mb-2">WhatsApp: <a href={`https://wa.me/${contact.whatsapp}`} className="text-cyan-400">{contact.whatsapp}</a></p>
                <p className="text-neutral-400 text-lg mb-2">Alamat: {contact.address}</p>
                <p className="text-neutral-400 text-lg mb-2">TikTok: <a href={contact.tiktok} className="text-cyan-400" target="_blank" rel="noopener noreferrer">@aanarham333</a></p>
                <p className="text-neutral-400 text-lg mb-2">GitHub: <a href={contact.github} className="text-cyan-400" target="_blank" rel="noopener noreferrer">aanarham</a></p>
              </div>
              <p className="text-neutral-400 mb-6 text-center">
                Punya proyek menarik? Kirimkan pesan, dan saya akan merespons secepatnya.
              </p>

              <form onSubmit={handleSendMessage}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-neutral-300 mb-1">Nama</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={inputClasses}
                      placeholder="Nama Anda"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-1">Email</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={inputClasses}
                      placeholder="email@contoh.com"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-neutral-300 mb-1">Pesan</label>
                    <textarea
                      id="message"
                      name="message"
                      rows="4"
                      value={formData.message}
                      onChange={handleChange}
                      className={`${inputClasses} resize-none`}
                      placeholder="Tulis pesan Anda di sini..."
                      required
                    ></textarea>
                  </div>
                </div>

                {/* Indikator Status Form */}
                {status === 'success' && (
                  <p className="mt-4 text-sm font-semibold text-green-400 text-center">Pesan berhasil dikirim! Terima kasih.</p>
                )}
                {status === 'error' && (
                  <p className="mt-4 text-sm font-semibold text-red-400 text-center">{errorMessage}</p>
                )}
                {/* Peringatan Kesiapan Backend */}
                {!isAuthReady && (
                  <p className="mt-4 text-sm text-yellow-400 text-center">
                    Menghubungkan ke layanan backend (Firestore)...
                  </p>
                )}

                {ContactButton}
              </form>
            </div>
             {/* Menampilkan UserId (Wajib untuk kolaborasi Firestore) */}
            <p className="mt-8 text-xs text-neutral-500 text-center">
                ID Sesi Pengguna: {userId || 'Authenticating...'}
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-neutral-800 text-center text-sm text-neutral-500">
        <p>&copy; {new Date().getFullYear()} Arham Nugraha. Hak Cipta ©2025 Semua hak dilindungi | Dibangun dengan Next.js dan Tailwind CSS.</p>
      </footer>
    </div>
  );
};

export default App;