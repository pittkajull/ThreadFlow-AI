import React, { useState, useEffect, useCallback, useMemo } from "react";

const SUPABASE_URL = "https://ikwdsirpyrxwqhpwctky.supabase.co";
const SUPABASE_KEY = "sb_publishable_hhCeUy90kFijCgn_s23_Pg_fbgIrKvc";

const PILLARS = [
  { id: "pilot_pesawat", label: "Pilot & Pesawat" },
  { id: "ai_startup", label: "AI & Startup" },
  { id: "kagama_digital", label: "Kagama Digital" },
  { id: "s2_management", label: "S2 Management" },
];

const STATUS_CONFIG = {
  pending:       { label: "Menunggu Review", style: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950 dark:border-amber-800" },
  awaiting_edit: { label: "Perlu Diedit",    style: "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950 dark:border-blue-800" },
  approved:      { label: "Disetujui",       style: "text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800" },
  Approved:      { label: "Disetujui",       style: "text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800" },
  rejected:      { label: "Ditolak",         style: "text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950 dark:border-red-800" },
  Rejected:      { label: "Ditolak",         style: "text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950 dark:border-red-800" },
};

function getStatus(s) {
  return STATUS_CONFIG[s] || { label: s || "Tidak Diketahui", style: "text-gray-500 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-800 dark:border-gray-700" };
}

function isToday(ts) {
  if (!ts) return false;
  const d = new Date(ts);
  const n = new Date();
  return d.toDateString() === n.toDateString();
}

function fmtTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function sbFetch(table, query = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Gagal memuat data ${table}`);
  return res.json();
}

function useDashboardData() {
  const [drafts, setDrafts] = useState([]);
  const [threadPosts, setThreadPosts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [d, tp, h] = await Promise.all([
        sbFetch("drafts", "select=*&order=created_at.desc&limit=200"),
        sbFetch("thread_posts", "select=*&order=post_order.asc"),
        sbFetch("history", "select=*&order=published_at.desc&limit=200"),
      ]);
      setDrafts(d);
      setThreadPosts(tp);
      setHistory(h);
      setLastSync(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  return { drafts, threadPosts, history, loading, error, lastSync, reload: load };
}

/* ─── Status Badge ─── */
function StatusBadge({ status }) {
  const m = getStatus(status);
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${m.style}`}>
      {m.label}
    </span>
  );
}

/* ─── Stat Card ─── */
const STAT_VARIANTS = {
  pending:  "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800",
  edit:     "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800",
  approved: "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800",
  rejected: "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800",
};

const STAT_VALUE_COLOR = {
  pending:  "text-amber-600 dark:text-amber-400",
  edit:     "text-blue-600 dark:text-blue-400",
  approved: "text-green-600 dark:text-green-400",
  rejected: "text-red-600 dark:text-red-400",
};

function StatCard({ label, value, variant, description }) {
  return (
    <div className={`p-4 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-md ${STAT_VARIANTS[variant]}`}>
      <div className={`text-3xl font-bold tabular-nums leading-tight ${STAT_VALUE_COLOR[variant]}`}>{value}</div>
      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium">{label}</div>
      {description && <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{description}</div>}
    </div>
  );
}

/* ─── Today's Schedule ─── */
function TodaySchedule({ pillarDrafts, pillarLabel }) {
  const todaysDrafts = useMemo(
    () =>
      pillarDrafts
        .filter((d) => isToday(d.scheduled_time))
        .sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time)),
    [pillarDrafts]
  );

  const slots = [
    { time: "08:00", label: "Pagi" },
    { time: "12:00", label: "Siang" },
    { time: "16:00", label: "Sore" },
  ];

  const todayStr = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-5 mb-6">
      <div className="flex justify-between items-center flex-wrap gap-2 mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Jadwal Posting Hari Ini</h3>
          <p className="text-sm text-gray-400 mt-0.5">{pillarLabel} — {todayStr}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {slots.map((slot, i) => {
          const match = todaysDrafts[i];
          return (
            <div
              key={slot.time}
              className={`flex items-center gap-3.5 p-3.5 rounded-lg border transition-shadow ${
                match
                  ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:shadow-sm"
                  : "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700/50"
              }`}
            >
              <div className="text-center shrink-0 w-12">
                <div className={`text-base font-bold tabular-nums ${match ? "text-gray-900 dark:text-gray-100" : "text-gray-300 dark:text-gray-600"}`}>
                  {slot.time}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{slot.label}</div>
              </div>
              <div className="min-w-0 flex-1">
                {match ? (
                  <>
                    <div className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate mb-1.5">
                      {match.topic || match.angle}
                    </div>
                    <StatusBadge status={match.status} />
                  </>
                ) : (
                  <div className="text-sm text-gray-400 italic">Belum ada draft terjadwal</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Skeleton Loading ─── */
function SkeletonRow() {
  return (
    <div className="h-17 rounded-xl bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 bg-[length:200%_100%] animate-[shimmer_1.6s_ease-in-out_infinite] border border-gray-100 dark:border-gray-700" />
  );
}

/* ─── Draft Card ─── */
function DraftCard({ draft, posts, webhookUrl, onAction, busy }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`rounded-xl bg-white dark:bg-gray-900 overflow-hidden transition-all border ${
      open
        ? "border-indigo-300 dark:border-indigo-700 shadow-lg shadow-indigo-500/5"
        : "border-gray-200 dark:border-gray-700 hover:shadow-sm"
    }`}>
      {/* Header */}
      <button
        className="flex items-center gap-3 px-4 py-3.5 w-full text-left cursor-pointer flex-wrap bg-transparent border-none"
        onClick={() => setOpen((o) => !o)}
      >
        <span className={`text-[11px] text-gray-400 shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}>
          &#9654;
        </span>

        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 truncate">
            {draft.topic || "(Belum ada topik)"}
          </div>
          <div className="text-sm text-gray-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>Sudut: {draft.angle || "—"}</span>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span>Jadwal: {fmtTime(draft.scheduled_time)}</span>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span>{posts.length} post</span>
          </div>
        </div>

        {draft.reminder_count > 0 && (
          <span
            className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-700 rounded-full px-2.5 py-0.5 whitespace-nowrap"
            title="Jumlah pengingat yang sudah terkirim"
          >
            {draft.reminder_count}x pengingat
          </span>
        )}

        <StatusBadge status={draft.status} />
      </button>

      {/* Expanded content */}
      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800">
          <div className="mt-4 mb-4">
            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2.5">
              Isi Thread ({posts.length} post)
            </h4>
            {posts.length === 0 && (
              <p className="text-gray-400 text-sm italic py-3">Belum ada isi thread untuk draft ini.</p>
            )}
            <div className="flex flex-col gap-2">
              {posts.map((p) => (
                <div
                  key={p.id}
                  className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700"
                >
                  <span className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">
                    {p.post_order}
                  </span>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed m-0">{p.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-sm text-gray-400 mr-0.5">Pilih aksi:</span>
            <button
              className="px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed text-green-700 bg-green-50 border-green-200 hover:enabled:bg-green-600 hover:enabled:text-white hover:enabled:-translate-y-0.5 dark:text-green-400 dark:bg-green-950 dark:border-green-800 dark:disabled:bg-gray-800 dark:disabled:border-gray-700 dark:disabled:text-gray-600 dark:hover:enabled:bg-green-600 dark:hover:enabled:text-white"
              disabled={!webhookUrl || busy}
              onClick={() => onAction(draft, "approve")}
            >
              Setujui
            </button>
            <button
              className="px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed text-blue-700 bg-blue-50 border-blue-200 hover:enabled:bg-blue-600 hover:enabled:text-white hover:enabled:-translate-y-0.5 dark:text-blue-400 dark:bg-blue-950 dark:border-blue-800 dark:disabled:bg-gray-800 dark:disabled:border-gray-700 dark:disabled:text-gray-600 dark:hover:enabled:bg-blue-600 dark:hover:enabled:text-white"
              disabled={!webhookUrl || busy}
              onClick={() => onAction(draft, "edit")}
            >
              Minta Edit
            </button>
            <button
              className="px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed text-red-700 bg-red-50 border-red-200 hover:enabled:bg-red-600 hover:enabled:text-white hover:enabled:-translate-y-0.5 dark:text-red-400 dark:bg-red-950 dark:border-red-800 dark:disabled:bg-gray-800 dark:disabled:border-gray-700 dark:disabled:text-gray-600 dark:hover:enabled:bg-red-600 dark:hover:enabled:text-white"
              disabled={!webhookUrl || busy}
              onClick={() => onAction(draft, "reject")}
            >
              Tolak
            </button>
            {!webhookUrl && (
              <span className="text-amber-600 dark:text-amber-400 text-sm ml-1">
                Masukkan URL Webhook di atas untuk mengaktifkan tombol aksi
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Empty State ─── */
function EmptyState({ title, text }) {
  return (
    <div className="py-12 px-6 text-center rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-200 dark:border-gray-700">
      {title && <div className="text-base font-semibold text-gray-500 dark:text-gray-400 mb-1.5">{title}</div>}
      <div className="text-sm text-gray-400 max-w-sm mx-auto leading-relaxed">{text}</div>
    </div>
  );
}

/* ─── Main Dashboard ─── */
export default function Dashboard() {
  const { drafts, threadPosts, history, loading, error, lastSync, reload } = useDashboardData();
  const [activePillar, setActivePillar] = useState("pilot_pesawat");
  const [activeTab, setActiveTab] = useState("queue");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  const pillarDrafts = useMemo(
    () => drafts.filter((d) => d.pillar_name === activePillar),
    [drafts, activePillar]
  );
  const pillarHistory = useMemo(
    () => history.filter((h) => h.pillar_name === activePillar),
    [history, activePillar]
  );

  const postsByDraft = useMemo(() => {
    const map = {};
    for (const p of threadPosts) {
      if (!map[p.draft_id]) map[p.draft_id] = [];
      map[p.draft_id].push(p);
    }
    return map;
  }, [threadPosts]);

  const counts = useMemo(() => {
    const base = { pending: 0, awaiting_edit: 0, approved: 0, rejected: 0, total: pillarDrafts.length };
    for (const d of pillarDrafts) {
      const s = (d.status || "").toLowerCase();
      if (s === "pending") base.pending++;
      else if (s === "awaiting_edit") base.awaiting_edit++;
      else if (s === "approved") base.approved++;
      else if (s === "rejected") base.rejected++;
    }
    return base;
  }, [pillarDrafts]);

  const handleAction = async (draft, action) => {
    if (!webhookUrl) return;
    setBusy(true);
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft_id: draft.id, action, pillar_name: draft.pillar_name }),
      });
      if (!res.ok) throw new Error(`Webhook gagal (${res.status})`);
      const actionLabel = action === "approve" ? "disetujui" : action === "edit" ? "diminta edit" : "ditolak";
      setToast({ type: "ok", msg: `Draft "${(draft.topic || "").slice(0, 40)}" berhasil ${actionLabel}.` });
      setTimeout(() => reload(), 1200);
    } catch (e) {
      setToast({ type: "err", msg: `Gagal mengirim aksi: ${e.message}` });
    } finally {
      setBusy(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans text-gray-700 dark:text-gray-300">

      {/* Top Bar */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-7 py-3.5 flex justify-between items-center flex-wrap gap-3 sticky top-0 z-50 shadow-xs">
        <div>
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">ThreadFlow</div>
          <div className="text-xs text-gray-400 mt-px">Dashboard Konten</div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium border ${
            error
              ? "bg-red-50 border-red-200 text-red-600 dark:bg-red-950 dark:border-red-800 dark:text-red-400"
              : "bg-green-50 border-green-200 text-green-600 dark:bg-green-950 dark:border-green-800 dark:text-green-400"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${error ? "bg-red-500" : "bg-green-500"}`} />
            {loading ? "Memuat data..." : error ? "Gagal terhubung" : "Terhubung"}
            {lastSync && !error && (
              <span className="text-gray-400 font-normal text-xs">· {fmtTime(lastSync)}</span>
            )}
          </div>
          <button
            onClick={reload}
            className="px-4 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
          >
            Muat Ulang
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-5 py-6 pb-16">

        {/* Welcome Guide */}
        {showGuide && (
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl px-7 py-7 mb-6 text-white relative animate-[slideUp_0.3s_ease]">
            <button
              onClick={() => setShowGuide(false)}
              className="absolute top-3.5 right-4 bg-white/20 border-none text-white rounded-md px-3.5 py-1 cursor-pointer text-sm font-medium hover:bg-white/30 transition-colors"
            >
              Tutup
            </button>
            <h2 className="text-xl font-bold mb-1.5 mt-0">Selamat Datang di ThreadFlow</h2>
            <p className="text-sm leading-relaxed opacity-90 mb-5 max-w-xl">
              Dashboard ini membantu Anda mengelola konten thread yang sudah digenerate otomatis.
              Berikut cara menggunakannya:
            </p>
            <div className="flex gap-2.5 flex-wrap">
              {[
                { step: "1", text: "Pilih kategori konten di bawah" },
                { step: "2", text: "Lihat draft dan jadwal posting" },
                { step: "3", text: "Setujui, edit, atau tolak draft" },
              ].map((s) => (
                <div key={s.step} className="bg-white/15 rounded-lg px-4 py-2.5 flex items-center gap-2.5 text-sm font-medium flex-1 min-w-[160px]">
                  <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold shrink-0">
                    {s.step}
                  </span>
                  <span>{s.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm mb-5 leading-relaxed">
            <strong>Terjadi masalah:</strong> {error}
          </div>
        )}

        {/* Webhook Config */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">Koneksi Webhook</span>
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 ml-1">
              Opsional
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
            Masukkan URL webhook untuk mengaktifkan tombol Setujui, Edit, dan Tolak pada setiap draft.
            URL ini biasanya dari n8n atau service automation lainnya.
          </p>
          <div className="flex gap-2 items-center">
            <input
              className="flex-1 px-3.5 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 placeholder:text-gray-400"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="Contoh: https://n8n.example.com/webhook/approval"
            />
            {webhookUrl && (
              <div className="px-3.5 py-2 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 text-sm font-semibold whitespace-nowrap">
                Tersambung
              </div>
            )}
          </div>
        </section>

        {/* Pillar Selection */}
        <section className="mb-6">
          <h3 className="text-[15px] font-semibold text-gray-500 dark:text-gray-400 mb-3">Kategori Konten</h3>
          <div className="flex gap-2 flex-wrap">
            {PILLARS.map((p) => {
              const active = p.id === activePillar;
              const pCount = drafts.filter((d) => d.pillar_name === p.id).length;
              return (
                <button
                  key={p.id}
                  onClick={() => setActivePillar(p.id)}
                  className={`px-4 py-2.5 rounded-lg border text-sm font-medium cursor-pointer flex items-center gap-2 transition-all ${
                    active
                      ? "bg-indigo-50 border-indigo-400 text-indigo-600 font-semibold dark:bg-indigo-950 dark:border-indigo-600 dark:text-indigo-400"
                      : "bg-white border-gray-200 text-gray-500 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-indigo-950 dark:hover:border-indigo-700 dark:hover:text-indigo-400"
                  }`}
                >
                  {p.label}
                  {pCount > 0 && (
                    <span className={`text-xs font-bold px-2 py-px rounded-full ${
                      active
                        ? "bg-indigo-500 text-white"
                        : "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
                    }`}>
                      {pCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Today's Schedule */}
        <TodaySchedule
          pillarDrafts={pillarDrafts}
          pillarLabel={PILLARS.find((p) => p.id === activePillar)?.label || ""}
        />

        {/* Stats Overview */}
        <section className="mb-6">
          <h3 className="text-[15px] font-semibold text-gray-500 dark:text-gray-400 mb-3">Ringkasan Status</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <StatCard label="Menunggu Review" value={counts.pending} variant="pending" description="Draft yang perlu Anda review" />
            <StatCard label="Perlu Diedit" value={counts.awaiting_edit} variant="edit" description="Draft yang sedang diedit" />
            <StatCard label="Disetujui" value={counts.approved} variant="approved" description="Draft siap untuk diposting" />
            <StatCard label="Ditolak" value={counts.rejected} variant="rejected" description="Draft yang tidak akan diposting" />
          </div>
        </section>

        {/* Tab Switch */}
        <div className="flex gap-0.5 mb-5 bg-white dark:bg-gray-900 rounded-lg p-1 border border-gray-200 dark:border-gray-700 w-fit">
          {[
            { id: "queue", label: "Antrian Draft", count: pillarDrafts.length },
            { id: "history", label: "Sudah Diposting", count: pillarHistory.length },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-5 py-2 rounded-md border-none text-sm font-medium cursor-pointer flex items-center gap-1.5 transition-all ${
                activeTab === t.id
                  ? "bg-indigo-500 text-white"
                  : "bg-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              {t.label}
              <span className={`text-xs px-1.5 py-px rounded-full font-bold ${
                activeTab === t.id
                  ? "bg-white/20"
                  : "bg-gray-100 dark:bg-gray-800"
              }`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Queue */}
        {activeTab === "queue" && (
          <div className="flex flex-col gap-2.5">
            {loading && (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            )}
            {pillarDrafts.length === 0 && !loading && (
              <EmptyState
                title="Belum Ada Draft"
                text="Draft baru akan muncul di sini setelah sistem otomatis membuat konten. Silakan tunggu atau periksa kembali nanti."
              />
            )}
            {pillarDrafts.map((d) => (
              <DraftCard
                key={d.id}
                draft={d}
                posts={postsByDraft[d.id] || []}
                webhookUrl={webhookUrl}
                onAction={handleAction}
                busy={busy}
              />
            ))}
          </div>
        )}

        {/* History */}
        {activeTab === "history" && (
          <div className="flex flex-col gap-2.5">
            {pillarHistory.length === 0 && !loading && (
              <EmptyState
                title="Belum Ada Postingan"
                text="Postingan yang sudah dipublikasi akan muncul di sini. Setujui draft terlebih dahulu untuk memulai."
              />
            )}
            {pillarHistory.map((h) => (
              <div
                key={h.id}
                className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 transition-shadow hover:shadow-sm"
              >
                <div className="flex justify-between items-center flex-wrap gap-2 mb-2">
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-0.5 rounded uppercase">
                    {h.angle}
                  </span>
                  <span className="text-sm text-gray-400">{fmtTime(h.published_at)}</span>
                </div>
                <div className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 mb-1.5">{h.topic}</div>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed m-0">
                  {(h.caption || "").slice(0, 200)}
                  {(h.caption || "").length > 200 ? "…" : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-lg text-sm font-semibold max-w-sm shadow-lg z-[200] animate-[slideUp_0.25s_ease] border ${
          toast.type === "ok"
            ? "bg-green-50 border-green-200 text-green-600 dark:bg-green-950 dark:border-green-800 dark:text-green-400"
            : "bg-red-50 border-red-200 text-red-600 dark:bg-red-950 dark:border-red-800 dark:text-red-400"
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
