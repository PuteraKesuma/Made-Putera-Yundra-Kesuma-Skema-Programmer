const DB = (() => {
  const PREFIX = 'sipinjam_';

  function set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.error('[DB.set] Gagal menyimpan:', e);
    }
  }

  function get(key, fallback = []) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.error('[DB.get] Gagal membaca:', e);
      return fallback;
    }
  }

  function remove(key) {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch (e) {
      console.error('[DB.remove] Gagal hapus:', e);
    }
  }

  return { set, get, remove };
})();