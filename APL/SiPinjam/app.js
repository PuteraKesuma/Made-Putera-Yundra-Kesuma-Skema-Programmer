const App = (() => {

  // ====== SESSION ======
  const SESSION_KEY = 'session';

  function setSession(userObj){
    DB.set(SESSION_KEY, userObj);
  }
  function getSession(){
    return DB.get(SESSION_KEY, null);
  }
  function clearSession(){
    DB.remove(SESSION_KEY);
  }

  function roleBadge(role){
    const cls = role === 'admin' ? 'admin' : role === 'petugas' ? 'petugas' : 'anggota';
    return `<span class="badge ${cls}">${role}</span>`;
  }

  function todayISO(){
    const d = new Date();
    const pad = (n) => String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }

  function addDaysISO(dateISO, days){
    const d = new Date(dateISO);
    d.setDate(d.getDate() + days);
    const pad = (n) => String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }

  // ====== SEED DATA ======
  const DEFAULT_USERS = [
    { id: Models.genId('U'), nama:'Admin', username:'admin', password:'admin123', role:'admin', aktif:true },
    { id: Models.genId('U'), nama:'Petugas', username:'petugas', password:'petugas123', role:'petugas', aktif:true },
    { id: Models.genId('U'), nama:'Anggota', username:'anggota', password:'anggota123', role:'anggota', aktif:true },
  ];

  const DEFAULT_ALAT = [
    { id: Models.genId('A'), kode:'ELK-001', nama:'Laptop Dell', kategori:'Elektronik', stok:5, dipinjam:2, kondisi:'Baik', lokasi:'Lemari 1' },
    { id: Models.genId('A'), kode:'ELK-002', nama:'Proyektor Epson', kategori:'Presentasi', stok:3, dipinjam:1, kondisi:'Baik', lokasi:'Rak 2' },
    { id: Models.genId('A'), kode:'FRN-001', nama:'Kursi Lipat', kategori:'Furnitur', stok:20, dipinjam:5, kondisi:'Baik', lokasi:'Gudang' },
    { id: Models.genId('A'), kode:'ELK-003', nama:'Kamera DSLR', kategori:'Elektronik', stok:2, dipinjam:0, kondisi:'Baik', lokasi:'Laci 3' },
  ];

  function initSeed(){
    const seeded = DB.get('seeded', false);
    if (seeded) return;

    // users
    const users = DEFAULT_USERS.map(u => new Models.User(u).toObject());
    DB.set('users', users);

    // alat
    const alats = DEFAULT_ALAT.map(a => new Models.Alat(a).toObject());
    DB.set('alat', alats);

    // peminjaman sample
    const pinj = [];
    const sampleMember = users.find(u => u.role === 'anggota');
    const sampleAlat = alats[0];
    pinj.push(new Models.Peminjaman({
      id: Models.genId('P'),
      memberId: sampleMember.id,
      memberNama: sampleMember.nama,
      alatId: sampleAlat.id,
      alatNama: sampleAlat.nama,
      alatKode: sampleAlat.kode,
      jumlah: 1,
      tglPinjam: addDaysISO(todayISO(), -2),
      durasi: 3,
      tglJatuhTempo: addDaysISO(todayISO(), 1),
      status: 'Aktif',
      catatan: 'Pinjam untuk presentasi.'
    }).toObject());
    DB.set('peminjaman', pinj);

    // notifikasi sample
    DB.set('notif', [
      { id: Models.genId('N'), title:'Pengingat', msg:'Pastikan alat dikembalikan sesuai jatuh tempo.', createdAt:new Date().toISOString(), to:'all' }
    ]);

    DB.set('seeded', true);
  }

  // ====== AUTH ======
  function doLogin(){
    const uname = document.getElementById('inp-user').value.trim();
    const pass  = document.getElementById('inp-pass').value.trim();

    if(!uname || !pass){
      Swal.fire({icon:'warning', title:'Form Kosong', text:'Masukkan username dan password.'});
      return;
    }

    const users = DB.get('users', []);
    const found = users.find(u => u.username === uname && u.password === pass && u.aktif !== false);

    if(!found){
      Swal.fire({icon:'error', title:'Login Gagal', text:'Username / password salah atau akun nonaktif.'});
      return;
    }

    setSession({ id:found.id, nama:found.nama, username:found.username, role:found.role });
    Swal.fire({icon:'success', title:'Berhasil', text:`Login sebagai ${found.role}.`, timer:900, showConfirmButton:false})
      .then(()=> location.href='pages/dashboard.html');
  }

  function requireAuth(allowedRoles = []){
    const s = getSession();
    if(!s){ location.href = '../index.html'; return null; }
    if(allowedRoles.length && !allowedRoles.includes(s.role)){
      Swal.fire({icon:'error', title:'Akses Ditolak', text:'Hak akses tidak sesuai.'})
        .then(()=> location.href='dashboard.html');
      return null;
    }
    return s;
  }

  function logout(){
    clearSession();
    location.href = '../index.html';
  }

  // ====== DATA HELPERS ======
  function getUsers(){ return DB.get('users', []).map(u => new Models.User(u)); }
  function getAlat(){ return DB.get('alat', []).map(a => new Models.Alat(a)); }
  function getPinjaman(){ return DB.get('peminjaman', []).map(p => new Models.Peminjaman(p)); }

  function saveUsers(arr){ DB.set('users', arr.map(u => u.toObject())); }
  function saveAlat(arr){ DB.set('alat', arr.map(a => a.toObject())); }
  function savePinjaman(arr){ DB.set('peminjaman', arr.map(p => p.toObject())); }

  // ====== UI SHELL ======
  function mountShell(activeKey){
    const s = getSession();
    const elUser = document.getElementById('sbUser');
    const elRole = document.getElementById('sbRole');
    const elNav  = document.getElementById('nav');

    if(elUser) elUser.textContent = s?.nama || '-';
    if(elRole) elRole.innerHTML = roleBadge(s?.role || 'anggota');

    if(elNav){
      const links = [
        { key:'dashboard', label:'Beranda', href:'dashboard.html', roles:['admin','petugas','anggota'] },
        { key:'alat', label:'Data Alat', href:'alat.html', roles:['admin','petugas','anggota'] },
        { key:'peminjaman', label:'Peminjaman', href:'peminjaman.html', roles:['admin','petugas','anggota'] },
        { key:'pengembalian', label:'Pengembalian', href:'pengembalian.html', roles:['admin','petugas','anggota'] },
        { key:'laporan', label:'Laporan', href:'laporan.html', roles:['admin','petugas'] },
        { key:'notif', label:'Notifikasi', href:'notifikasi.html', roles:['admin','petugas','anggota'] },
      ];

      elNav.innerHTML = '';
      links
        .filter(l => l.roles.includes(s.role))
        .forEach(l => {
          const a = document.createElement('a');
          a.href = l.href;
          a.className = (l.key === activeKey) ? 'active' : '';
          a.textContent = l.label;
          elNav.appendChild(a);
        });
    }

    const btnOut = document.getElementById('btnLogout');
    if(btnOut) btnOut.addEventListener('click', logout);
  }

  // ====== DASHBOARD ======
  function renderDashboard(){
    const alats = getAlat();
    const pinj = getPinjaman();

    const total = alats.reduce((s,a)=> s + a.stok, 0);
    const tersedia = alats.reduce((s,a)=> s + Math.max(a.tersedia,0), 0);
    const dipinjam = alats.reduce((s,a)=> s + a.dipinjam, 0);
    const aktif = pinj.filter(p => p.status === 'Aktif').length;

    document.getElementById('kTotal').textContent = total;
    document.getElementById('kTersedia').textContent = tersedia;
    document.getElementById('kDipinjam').textContent = dipinjam;
    document.getElementById('kAktif').textContent = aktif;

    // table peminjaman aktif terbaru
    const tbody = document.getElementById('tbAktif');
    const newest = [...pinj]
      .filter(p => p.status === 'Aktif')
      .sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0,6);

    tbody.innerHTML = newest.map(p => `
      <tr>
        <td>${escapeHtml(p.memberNama)}</td>
        <td>${escapeHtml(p.alatNama)}</td>
        <td>${p.tglPinjam}</td>
        <td>${p.tglJatuhTempo}</td>
        <td>${p.statusLabel()}</td>
      </tr>
    `).join('') || `<tr><td colspan="5" class="muted">Belum ada peminjaman aktif.</td></tr>`;

    // chart donut + bar (opsional kalau ada Chart.js)
    if (window.Chart){
      renderCharts(alats, pinj);
    }
  }

  function renderCharts(alats, pinj){
    const elDonut = document.getElementById('chartDonut');
    const elBar   = document.getElementById('chartBar');
    if(!elDonut || !elBar) return;

    const tersedia = alats.reduce((s,a)=> s + Math.max(a.tersedia,0), 0);
    const dipinjam = alats.reduce((s,a)=> s + a.dipinjam, 0);

    new Chart(elDonut, {
      type:'doughnut',
      data:{ labels:['Tersedia','Dipinjam'], datasets:[{ data:[tersedia, dipinjam] }] },
      options:{ plugins:{ legend:{ labels:{ color:'#eaf0ff' } } } }
    });

    // peminjaman per kategori (aktif + dikembalikan)
    const map = {};
    const alatMap = {};
    alats.forEach(a => alatMap[a.id] = a.kategori);
    pinj.forEach(p => {
      const kat = alatMap[p.alatId] || 'Umum';
      map[kat] = (map[kat] || 0) + 1;
    });

    const labels = Object.keys(map);
    const data = labels.map(k => map[k]);

    new Chart(elBar, {
      type:'bar',
      data:{ labels, datasets:[{ label:'Jumlah Peminjaman', data }] },
      options:{
        scales:{
          x:{ ticks:{ color:'#eaf0ff' }, grid:{ color:'rgba(255,255,255,.08)' } },
          y:{ ticks:{ color:'#eaf0ff' }, grid:{ color:'rgba(255,255,255,.08)' } },
        },
        plugins:{ legend:{ labels:{ color:'#eaf0ff' } } }
      }
    });
  }

  // ====== ALAT PAGE ======
  function renderAlatPage(){
    const s = getSession();
    const canEdit = (s.role === 'admin' || s.role === 'petugas');

    const inp = document.getElementById('qAlat');
    const btnAdd = document.getElementById('btnAddAlat');
    if(btnAdd) btnAdd.style.display = canEdit ? 'inline-block' : 'none';

    const doRender = () => {
      const q = (inp?.value || '').trim().toLowerCase();
      const alats = getAlat()
        .filter(a => !q || a.nama.toLowerCase().includes(q) || a.kode.toLowerCase().includes(q));

      const tbody = document.getElementById('tbAlat');
      tbody.innerHTML = alats.map((a, i) => `
        <tr>
          <td>${i+1}</td>
          <td>${escapeHtml(a.kode)}</td>
          <td>${escapeHtml(a.nama)}</td>
          <td>${escapeHtml(a.kategori)}</td>
          <td>${escapeHtml(a.kondisi)}</td>
          <td>${escapeHtml(a.lokasi)}</td>
          <td>${a.stok}</td>
          <td>${a.tersedia}</td>
          <td>${a.statusLabel()}</td>
          <td>
            ${canEdit ? `
              <div class="actions">
                <button class="btn ghost small" data-act="edit" data-id="${a.id}">Edit</button>
                <button class="btn ghost small" data-act="del" data-id="${a.id}">Hapus</button>
              </div>
            ` : `<span class="muted">-</span>`}
          </td>
        </tr>
      `).join('') || `<tr><td colspan="10" class="muted">Data alat kosong.</td></tr>`;

      // action handlers
      tbody.querySelectorAll('button[data-act]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const act = btn.getAttribute('data-act');
          if(act === 'edit') editAlat(id);
          if(act === 'del') deleteAlat(id);
        });
      });
    };

    inp?.addEventListener('input', doRender);
    btnAdd?.addEventListener('click', () => addAlat());
    doRender();

    async function addAlat(){
      const { value: formValues } = await Swal.fire({
        title: 'Tambah Alat',
        html: `
          <div style="text-align:left">
            <label>Kode</label><input id="sw-kode" class="swal2-input" placeholder="ELK-010">
            <label>Nama</label><input id="sw-nama" class="swal2-input" placeholder="Printer Canon">
            <label>Kategori</label><input id="sw-kat" class="swal2-input" placeholder="Elektronik">
            <label>Stok</label><input id="sw-stok" class="swal2-input" type="number" value="1">
            <label>Kondisi</label><input id="sw-kond" class="swal2-input" placeholder="Baik">
            <label>Lokasi</label><input id="sw-lok" class="swal2-input" placeholder="Rak 1">
          </div>
        `,
        focusConfirm: false,
        preConfirm: () => {
          const kode = document.getElementById('sw-kode').value.trim();
          const nama = document.getElementById('sw-nama').value.trim();
          const kategori = document.getElementById('sw-kat').value.trim() || 'Umum';
          const stok = parseInt(document.getElementById('sw-stok').value) || 0;
          const kondisi = document.getElementById('sw-kond').value.trim() || 'Baik';
          const lokasi = document.getElementById('sw-lok').value.trim() || '-';
          if(!kode || !nama || stok <= 0) return Swal.showValidationMessage('Kode, Nama, dan Stok wajib diisi (stok > 0).');
          return { kode, nama, kategori, stok, kondisi, lokasi };
        }
      });

      if(!formValues) return;

      const alats = getAlat();
      if(alats.some(a => a.kode.toLowerCase() === formValues.kode.toLowerCase())){
        Swal.fire({icon:'error', title:'Kode sudah ada', text:'Gunakan kode lain.'});
        return;
      }
      alats.push(new Models.Alat({ id: Models.genId('A'), dipinjam:0, ...formValues }));
      saveAlat(alats);
      Swal.fire({icon:'success', title:'Berhasil', text:'Alat ditambahkan.'});
      doRender();
    }

    async function editAlat(id){
      const alats = getAlat();
      const a = alats.find(x => x.id === id);
      if(!a) return;

      const { value: formValues } = await Swal.fire({
        title: 'Edit Alat',
        html: `
          <div style="text-align:left">
            <label>Kode</label><input id="sw-kode" class="swal2-input" value="${escapeAttr(a.kode)}">
            <label>Nama</label><input id="sw-nama" class="swal2-input" value="${escapeAttr(a.nama)}">
            <label>Kategori</label><input id="sw-kat" class="swal2-input" value="${escapeAttr(a.kategori)}">
            <label>Stok</label><input id="sw-stok" class="swal2-input" type="number" value="${a.stok}">
            <label>Kondisi</label><input id="sw-kond" class="swal2-input" value="${escapeAttr(a.kondisi)}">
            <label>Lokasi</label><input id="sw-lok" class="swal2-input" value="${escapeAttr(a.lokasi)}">
          </div>
        `,
        focusConfirm: false,
        preConfirm: () => {
          const kode = document.getElementById('sw-kode').value.trim();
          const nama = document.getElementById('sw-nama').value.trim();
          const kategori = document.getElementById('sw-kat').value.trim() || 'Umum';
          const stok = parseInt(document.getElementById('sw-stok').value) || 0;
          const kondisi = document.getElementById('sw-kond').value.trim() || 'Baik';
          const lokasi = document.getElementById('sw-lok').value.trim() || '-';
          if(!kode || !nama || stok <= 0) return Swal.showValidationMessage('Kode, Nama, dan Stok wajib diisi (stok > 0).');
          if(stok < a.dipinjam) return Swal.showValidationMessage('Stok tidak boleh lebih kecil dari jumlah yang sedang dipinjam.');
          return { kode, nama, kategori, stok, kondisi, lokasi };
        }
      });

      if(!formValues) return;
      // kode unique
      if(alats.some(x => x.id !== id && x.kode.toLowerCase() === formValues.kode.toLowerCase())){
        Swal.fire({icon:'error', title:'Kode sudah dipakai', text:'Gunakan kode lain.'});
        return;
      }

      a._kode = formValues.kode;
      a._nama = formValues.nama;
      a._kategori = formValues.kategori;
      a.stok = formValues.stok;
      a.kondisi = formValues.kondisi;
      a.lokasi = formValues.lokasi;

      saveAlat(alats);
      Swal.fire({icon:'success', title:'Tersimpan', text:'Data alat diperbarui.'});
      doRender();
    }

    async function deleteAlat(id){
      const alats = getAlat();
      const a = alats.find(x => x.id === id);
      if(!a) return;

      if(a.dipinjam > 0){
        Swal.fire({icon:'warning', title:'Tidak bisa dihapus', text:'Masih ada peminjaman aktif untuk alat ini.'});
        return;
      }

      const ok = await Swal.fire({icon:'question', title:'Hapus alat?', text:`${a.nama} (${a.kode})`, showCancelButton:true, confirmButtonText:'Hapus'});
      if(!ok.isConfirmed) return;

      const next = alats.filter(x => x.id !== id);
      saveAlat(next);
      Swal.fire({icon:'success', title:'Terhapus', text:'Data alat dihapus.'});
      doRender();
    }
  }

  // ====== PEMINJAMAN PAGE ======
  function renderPeminjamanPage(){
    const s = getSession();

    // dropdown alat
    const selAlat = document.getElementById('selAlat');
    const alats = getAlat();

    const available = alats.filter(a => a.tersedia > 0);
    selAlat.innerHTML = `<option value="">— Pilih Alat —</option>` + available.map(a => `
      <option value="${a.id}">${a.kode} - ${a.nama} (tersedia: ${a.tersedia})</option>
    `).join('');

    // default dates
    document.getElementById('tglPinjam').value = todayISO();

    // submit
    document.getElementById('btnCatat').addEventListener('click', () => catat());

    // render list aktif
    renderListAktif();

    function renderListAktif(){
      const q = (document.getElementById('qAktif').value || '').trim().toLowerCase();
      const pinj = getPinjaman()
        .filter(p => p.status === 'Aktif')
        .filter(p => {
          if(s.role === 'anggota') return p.memberId === s.id; // anggota hanya lihat miliknya
          return true;
        })
        .filter(p => !q || p.memberNama.toLowerCase().includes(q) || p.alatNama.toLowerCase().includes(q) || p.alatKode.toLowerCase().includes(q))
        .sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));

      const tbody = document.getElementById('tbPinjAktif');
      tbody.innerHTML = pinj.map(p => `
        <tr>
          <td>${escapeHtml(p.memberId)}</td>
          <td>${escapeHtml(p.memberNama)}</td>
          <td>${escapeHtml(p.alatKode)} - ${escapeHtml(p.alatNama)}</td>
          <td>${p.jumlah}</td>
          <td>${p.tglPinjam}</td>
          <td>${p.tglJatuhTempo}</td>
          <td>${p.statusLabel()}</td>
        </tr>
      `).join('') || `<tr><td colspan="7" class="muted">Belum ada peminjaman aktif.</td></tr>`;
    }

    document.getElementById('qAktif').addEventListener('input', renderListAktif);

    async function catat(){
      // role anggota: otomatis ambil id dari session
      const memberId = s.role === 'anggota' ? s.id : (document.getElementById('memberId').value.trim() || '');
      const memberNama = s.role === 'anggota' ? s.nama : (document.getElementById('memberNama').value.trim() || '');

      const alatId = selAlat.value;
      const jumlah = parseInt(document.getElementById('jumlah').value) || 1;
      const tglPinjam = document.getElementById('tglPinjam').value;
      const durasi = parseInt(document.getElementById('durasi').value) || 1;
      const catatan = document.getElementById('catatan').value.trim();

      if(!memberId || !memberNama){
        Swal.fire({icon:'warning', title:'Data Anggota kosong', text:'Isi ID dan Nama anggota.'});
        return;
      }
      if(!alatId){
        Swal.fire({icon:'warning', title:'Pilih alat', text:'Pilih alat yang akan dipinjam.'});
        return;
      }
      if(jumlah <= 0){
        Swal.fire({icon:'warning', title:'Jumlah invalid', text:'Jumlah minimal 1.'});
        return;
      }
      if(!tglPinjam){
        Swal.fire({icon:'warning', title:'Tanggal kosong', text:'Pilih tanggal pinjam.'});
        return;
      }

      // aturan beda (biar unik): anggota max 2 alat aktif
      const allPinj = getPinjaman();
      const aktifMember = allPinj.filter(p => p.status === 'Aktif' && p.memberId === memberId);
      if(aktifMember.length >= 2){
        Swal.fire({icon:'error', title:'Batas pinjam', text:'Maksimal 2 peminjaman aktif per anggota.'});
        return;
      }

      const alatsNow = getAlat();
      const a = alatsNow.find(x => x.id === alatId);
      if(!a || a.tersedia <= 0){
        Swal.fire({icon:'error', title:'Stok habis', text:'Alat tidak tersedia.'});
        return;
      }
      if(jumlah > a.tersedia){
        Swal.fire({icon:'error', title:'Jumlah melebihi tersedia', text:`Tersedia hanya ${a.tersedia}.`});
        return;
      }

      const tglJt = addDaysISO(tglPinjam, durasi);

      const p = new Models.Peminjaman({
        id: Models.genId('P'),
        memberId, memberNama,
        alatId: a.id,
        alatNama: a.nama,
        alatKode: a.kode,
        jumlah, tglPinjam, durasi,
        tglJatuhTempo: tglJt,
        status: 'Aktif',
        catatan
      });

      // update alat dipinjam
      a.dipinjam = a.dipinjam + jumlah;

      // save
      allPinj.push(p);
      savePinjaman(allPinj);
      saveAlat(alatsNow);

      // notif
      pushNotif('Peminjaman Dicatat', `${memberNama} meminjam ${a.nama} (${a.kode}) x${jumlah}.`, 'petugas');

      Swal.fire({icon:'success', title:'Berhasil', text:'Peminjaman dicatat.'});
      // refresh dropdown & list
      renderPeminjamanPage();
    }
  }

  // ====== PENGEMBALIAN PAGE ======
  function renderPengembalianPage(){
    const s = getSession();
    const qEl = document.getElementById('qKembali');
    qEl.addEventListener('input', () => render());

    render();

    function render(){
      const q = (qEl.value || '').trim().toLowerCase();
      const all = getPinjaman()
        .filter(p => p.status === 'Aktif')
        .filter(p => {
          if(s.role === 'anggota') return p.memberId === s.id;
          return true;
        })
        .filter(p => !q || p.memberNama.toLowerCase().includes(q) || p.memberId.toLowerCase().includes(q) || p.alatNama.toLowerCase().includes(q) || p.alatKode.toLowerCase().includes(q))
        .sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));

      const tbody = document.getElementById('tbKembali');
      tbody.innerHTML = all.map(p => `
        <tr>
          <td>${escapeHtml(p.memberId)}</td>
          <td>${escapeHtml(p.memberNama)}</td>
          <td>${escapeHtml(p.alatKode)} - ${escapeHtml(p.alatNama)}</td>
          <td>${p.jumlah}</td>
          <td>${p.tglPinjam}</td>
          <td>${p.tglJatuhTempo}</td>
          <td>${p.statusLabel()}</td>
          <td>
            ${s.role === 'anggota' ? `<span class="muted">-</span>` : `<button class="btn ghost small" data-id="${p.id}">Kembalikan</button>`}
          </td>
        </tr>
      `).join('') || `<tr><td colspan="8" class="muted">Tidak ada peminjaman aktif.</td></tr>`;

      tbody.querySelectorAll('button[data-id]').forEach(btn => {
        btn.addEventListener('click', () => prosesKembali(btn.getAttribute('data-id')));
      });
    }

    async function prosesKembali(id){
      const all = getPinjaman();
      const p = all.find(x => x.id === id);
      if(!p) return;

      const ok = await Swal.fire({
        icon:'question',
        title:'Proses pengembalian?',
        html:`Peminjam: <b>${escapeHtml(p.memberNama)}</b><br>Alat: <b>${escapeHtml(p.alatNama)}</b>`,
        showCancelButton:true,
        confirmButtonText:'Kembalikan'
      });
      if(!ok.isConfirmed) return;

      // update status pinjam
      p.status = 'Dikembalikan';
      p.tglKembali = todayISO();

      // update alat (dipinjam berkurang)
      const alats = getAlat();
      const a = alats.find(x => x.id === p.alatId);
      if(a){
        a.dipinjam = Math.max(0, a.dipinjam - p.jumlah);
      }

      savePinjaman(all);
      saveAlat(alats);

      // notif
      pushNotif('Pengembalian Berhasil', `${p.memberNama} mengembalikan ${p.alatNama} (${p.alatKode}).`, 'petugas');

      Swal.fire({icon:'success', title:'Selesai', text:'Pengembalian diproses.'});
      render();
    }
  }

  // ====== LAPORAN PAGE ======
  function renderLaporanPage(){
    const q = document.getElementById('qLap');
    const btnCSV = document.getElementById('btnCSV');

    q.addEventListener('input', render);
    btnCSV.addEventListener('click', exportCSV);

    render();

    function render(){
      const term = (q.value || '').trim().toLowerCase();
      const all = getPinjaman()
        .filter(p => !term
          || p.memberNama.toLowerCase().includes(term)
          || p.alatNama.toLowerCase().includes(term)
          || p.alatKode.toLowerCase().includes(term)
          || p.status.toLowerCase().includes(term))
        .sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));

      const tbody = document.getElementById('tbLap');
      tbody.innerHTML = all.map(p => `
        <tr>
          <td>${escapeHtml(p.id)}</td>
          <td>${escapeHtml(p.memberNama)}</td>
          <td>${escapeHtml(p.alatKode)} - ${escapeHtml(p.alatNama)}</td>
          <td>${p.jumlah}</td>
          <td>${p.tglPinjam}</td>
          <td>${p.tglJatuhTempo}</td>
          <td>${p.tglKembali || '-'}</td>
          <td>${p.statusLabel()}</td>
        </tr>
      `).join('') || `<tr><td colspan="8" class="muted">Belum ada data transaksi.</td></tr>`;
    }

    function exportCSV(){
      const all = getPinjaman().sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
      if(!all.length){
        Swal.fire({icon:'info', title:'Kosong', text:'Tidak ada data untuk diexport.'});
        return;
      }
      const header = ['id','memberNama','alatKode','alatNama','jumlah','tglPinjam','tglJatuhTempo','tglKembali','status'];
      const rows = all.map(p => ([
        p.id, p.memberNama, p.alatKode, p.alatNama, p.jumlah, p.tglPinjam, p.tglJatuhTempo, p.tglKembali || '', p.status
      ]));
      const csv = [header, ...rows].map(r => r.map(cell => `"${String(cell).replaceAll('"','""')}"`).join(',')).join('\n');

      const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sipinjam_laporan_${todayISO()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      Swal.fire({icon:'success', title:'Export selesai', text:'File CSV berhasil diunduh.'});
    }
  }

  // ====== NOTIF PAGE ======
  function renderNotifPage(){
    const s = getSession();
    const canManage = (s.role === 'admin');

    const btnAdd = document.getElementById('btnAddNotif');
    btnAdd.style.display = canManage ? 'inline-block' : 'none';

    btnAdd.addEventListener('click', () => addNotif());
    render();

    function render(){
      const list = DB.get('notif', [])
        .filter(n => n.to === 'all' || n.to === s.role)
        .sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));

      const wrap = document.getElementById('notifList');
      wrap.innerHTML = list.map(n => `
        <div class="card" style="margin-bottom:10px">
          <div class="row">
            <div>
              <div style="font-weight:800">${escapeHtml(n.title)}</div>
              <div class="muted">${new Date(n.createdAt).toLocaleString()}</div>
            </div>
            <div class="badge">${escapeHtml(n.to)}</div>
          </div>
          <div style="margin-top:10px">${escapeHtml(n.msg)}</div>
        </div>
      `).join('') || `<div class="muted">Belum ada notifikasi.</div>`;
    }

    async function addNotif(){
      const { value: v } = await Swal.fire({
        title: 'Kelola Notifikasi',
        html: `
          <div style="text-align:left">
            <label>Judul</label><input id="n-title" class="swal2-input" placeholder="Pengumuman">
            <label>Pesan</label><input id="n-msg" class="swal2-input" placeholder="Isi pesan...">
            <label>Target</label>
            <select id="n-to" class="swal2-input">
              <option value="all">all</option>
              <option value="admin">admin</option>
              <option value="petugas">petugas</option>
              <option value="anggota">anggota</option>
            </select>
          </div>
        `,
        focusConfirm:false,
        preConfirm: () => {
          const title = document.getElementById('n-title').value.trim();
          const msg = document.getElementById('n-msg').value.trim();
          const to = document.getElementById('n-to').value;
          if(!title || !msg) return Swal.showValidationMessage('Judul dan pesan wajib.');
          return { title, msg, to };
        }
      });
      if(!v) return;

      const list = DB.get('notif', []);
      list.push({ id: Models.genId('N'), ...v, createdAt:new Date().toISOString() });
      DB.set('notif', list);
      Swal.fire({icon:'success', title:'Tersimpan', text:'Notifikasi ditambahkan.'});
      render();
    }
  }

  function pushNotif(title, msg, to='all'){
    const list = DB.get('notif', []);
    list.push({ id: Models.genId('N'), title, msg, to, createdAt:new Date().toISOString() });
    DB.set('notif', list);
  }

  // ====== utils ======
  function escapeHtml(str){
    return String(str ?? '')
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#039;');
  }
  function escapeAttr(str){
    return escapeHtml(str).replaceAll('\n',' ');
  }

  return {
    initSeed,
    doLogin,
    requireAuth,
    mountShell,
    logout,
    getSession,

    renderDashboard,
    renderAlatPage,
    renderPeminjamanPage,
    renderPengembalianPage,
    renderLaporanPage,
    renderNotifPage,
  };

})();