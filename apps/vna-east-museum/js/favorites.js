const KEY = "vna-east-museum.favorites";

function storageAvailable() {
  try {
    const probe = "__fav_probe__";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(arr) {
  try {
    localStorage.setItem(KEY, JSON.stringify(arr));
    return true;
  } catch {
    return false;
  }
}

export function isAvailable() {
  return storageAvailable();
}

export function getAll() {
  return read().slice();
}

export function has(id) {
  return read().some((f) => f.id === id);
}

export function add({ id, title, artist, thumbUrl }) {
  const list = read();
  if (list.some((f) => f.id === id)) return;
  list.push({ id, title, artist, thumbUrl, addedAt: new Date().toISOString() });
  write(list);
}

export function remove(id) {
  const list = read();
  const next = list.filter((f) => f.id !== id);
  if (next.length !== list.length) write(next);
}

export function toggle({ id, title, artist, thumbUrl }) {
  const list = read();
  const idx = list.findIndex((f) => f.id === id);
  if (idx >= 0) {
    list.splice(idx, 1);
    write(list);
    return false;
  }
  list.push({ id, title, artist, thumbUrl, addedAt: new Date().toISOString() });
  write(list);
  return true;
}
