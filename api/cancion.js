// Función de servidor para Vercel: devuelve la canción que suena.
// Se ejecuta en el servidor, así que el navegador no la bloquea.
// Respuesta: { "cancion": "Artista - Título", "oyentes": 12 }

const STREAM = "https://pstnet4.shoutcastnet.com:40174/stream";
const SERVER = "https://pstnet4.shoutcastnet.com:40174";
const PROVEEDOR = "https://pstnet4.shoutcastnet.com/audio/players/player.php?url=" +
  encodeURIComponent(STREAM) + "&streamtype=icecast&historic=false&next=false";

const CABECERAS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
  "Referer": "https://pstnet4.shoutcastnet.com/audio/players/40170.php",
};

async function pedir(url, ms = 5000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url + (url.includes("?") ? "&" : "?") + "t=" + Date.now(), { headers: CABECERAS, signal: ctrl.signal });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.text();
  } finally { clearTimeout(t); }
}

const fuentes = [
  // 1) El mismo servicio que usa el reproductor oficial
  async () => {
    const d = JSON.parse(await pedir(PROVEEDOR));
    if (!d.currentSong) throw new Error("vacío");
    return { cancion: (d.currentArtist ? d.currentArtist + " - " : "") + d.currentSong };
  },
  // 2) Icecast
  async () => {
    const d = JSON.parse(await pedir(SERVER + "/status-json.xsl"));
    let s = d.icestats && d.icestats.source;
    if (Array.isArray(s)) s = s.find(x => (x.listenurl || "").endsWith("/stream")) || s[0];
    if (!s || !s.title) throw new Error("vacío");
    return { cancion: (s.artist ? s.artist + " - " : "") + s.title, oyentes: s.listeners };
  },
  // 3) Shoutcast v2
  async () => {
    const d = JSON.parse(await pedir(SERVER + "/stats?sid=1&json=1"));
    if (!d.songtitle) throw new Error("vacío");
    return { cancion: d.songtitle, oyentes: d.currentlisteners };
  },
  // 4) Shoutcast texto plano
  async () => {
    const t = (await pedir(SERVER + "/currentsong?sid=1")).trim();
    if (!t || t.startsWith("<")) throw new Error("vacío");
    return { cancion: t };
  },
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, s-maxage=5, stale-while-revalidate=10");
  try {
    const r = await Promise.any(fuentes.map(f => f()));
    const limpiar = s => String(s).replace(/&apos;|&#39;/g, "'").replace(/&amp;/g, "&").replace(/\s{2,}/g, " ").trim();
    res.status(200).json({ cancion: limpiar(r.cancion), oyentes: r.oyentes ?? null });
  } catch (e) {
    res.status(502).json({ cancion: "", oyentes: null, error: "No se pudo leer la canción" });
  }
}
