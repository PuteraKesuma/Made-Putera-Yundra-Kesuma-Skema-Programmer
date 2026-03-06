const Models = (() => {

  function genId(prefix='ID') {
    return prefix + Math.random().toString(16).slice(2, 6).toUpperCase();
  }

  class Entity {
    constructor(id) {
      this._id = id || genId('X');
      this._createdAt = new Date().toISOString();
    }
    get id(){ return this._id; }
    set id(v){ this._id = v; }
    get createdAt(){ return this._createdAt; }

    /** Polymorphism */
    statusLabel(){ return '–'; }

    toObject(){
      return { id:this._id, createdAt:this._createdAt };
    }
  }

  class User extends Entity {
    constructor(d){
      super(d.id);
      this._nama = d.nama || d.username;
      this._username = d.username;
      this._password = d.password;
      this._role = d.role; // admin / petugas / anggota
      this._aktif = (d.aktif ?? true);
    }
    get nama(){ return this._nama; }
    get username(){ return this._username; }
    get password(){ return this._password; }
    get role(){ return this._role; }
    get aktif(){ return this._aktif; }
    set aktif(v){ this._aktif = !!v; }

    /** override */
    statusLabel(){
      const map = { admin:'admin', petugas:'petugas', anggota:'anggota' };
      const cls = map[this._role] || 'admin';
      return `<span class="badge ${cls}">${this._role}</span>`;
    }

    toObject(){
      return { ...super.toObject(), nama:this._nama, username:this._username, password:this._password, role:this._role, aktif:this._aktif };
    }
  }

  class Alat extends Entity {
    constructor(d){
      super(d.id);
      this._kode = d.kode;
      this._nama = d.nama;
      this._kategori = d.kategori || 'Umum';
      this._stok = parseInt(d.stok) || 0;
      this._dipinjam = parseInt(d.dipinjam) || 0;
      this._kondisi = d.kondisi || 'Baik';
      this._lokasi = d.lokasi || '-';
    }

    get kode(){ return this._kode; }
    get nama(){ return this._nama; }
    get kategori(){ return this._kategori; }
    get stok(){ return this._stok; }
    set stok(v){ this._stok = parseInt(v) || 0; }
    get dipinjam(){ return this._dipinjam; }
    set dipinjam(v){ this._dipinjam = parseInt(v) || 0; }
    get kondisi(){ return this._kondisi; }
    set kondisi(v){ this._kondisi = v || 'Baik'; }
    get lokasi(){ return this._lokasi; }
    set lokasi(v){ this._lokasi = v || '-'; }

    /** @returns {number} jumlah tersedia */
    get tersedia(){ return this._stok - this._dipinjam; }

    /** override */
    statusLabel(){
      if (this.tersedia <= 0) return `<span class="badge bad">Habis</span>`;
      return `<span class="badge ok">Tersedia</span>`;
    }

    toObject(){
      return { ...super.toObject(), kode:this._kode, nama:this._nama, kategori:this._kategori, stok:this._stok, dipinjam:this._dipinjam, kondisi:this._kondisi, lokasi:this._lokasi };
    }
  }

  class Peminjaman extends Entity {
    constructor(d){
      super(d.id);
      this._memberId = d.memberId;     // id anggota (string)
      this._memberNama = d.memberNama; // nama anggota (string)
      this._alatId = d.alatId;         // id alat (string)
      this._alatNama = d.alatNama;     // nama alat (string)
      this._alatKode = d.alatKode;     // kode alat (string)
      this._jumlah = parseInt(d.jumlah) || 1;
      this._tglPinjam = d.tglPinjam;   // YYYY-MM-DD
      this._durasi = parseInt(d.durasi) || 1;
      this._tglJatuhTempo = d.tglJatuhTempo;
      this._tglKembali = d.tglKembali || '';
      this._status = d.status || 'Aktif'; // Aktif / Dikembalikan
      this._penilaian = d.penilaian || ''; // opsional
      this._catatan = d.catatan || '';
    }

    get memberId(){ return this._memberId; }
    get memberNama(){ return this._memberNama; }
    get alatId(){ return this._alatId; }
    get alatNama(){ return this._alatNama; }
    get alatKode(){ return this._alatKode; }
    get jumlah(){ return this._jumlah; }
    get tglPinjam(){ return this._tglPinjam; }
    get durasi(){ return this._durasi; }
    get tglJatuhTempo(){ return this._tglJatuhTempo; }
    get tglKembali(){ return this._tglKembali; }
    set tglKembali(v){ this._tglKembali = v; }
    get status(){ return this._status; }
    set status(v){ this._status = v; }
    get penilaian(){ return this._penilaian; }
    set penilaian(v){ this._penilaian = v; }
    get catatan(){ return this._catatan; }
    set catatan(v){ this._catatan = v; }

    /** computed - keterlambatan */
    get isTerlambat(){
      if (this._status === 'Dikembalikan') return false;
      return new Date() > new Date(this._tglJatuhTempo);
    }

    /** override */
    statusLabel(){
      if (this._status === 'Dikembalikan') return `<span class="badge ok">Dikembalikan</span>`;
      if (this.isTerlambat) return `<span class="badge bad">Terlambat</span>`;
      return `<span class="badge warn">Aktif</span>`;
    }

    toObject(){
      return {
        ...super.toObject(),
        memberId:this._memberId, memberNama:this._memberNama,
        alatId:this._alatId, alatNama:this._alatNama, alatKode:this._alatKode,
        jumlah:this._jumlah, tglPinjam:this._tglPinjam, durasi:this._durasi,
        tglJatuhTempo:this._tglJatuhTempo, tglKembali:this._tglKembali,
        status:this._status, penilaian:this._penilaian, catatan:this._catatan
      };
    }
  }

  return { Entity, User, Alat, Peminjaman, genId };

})();