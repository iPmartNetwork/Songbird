import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createAdminBackup,
  deleteAdminBackup,
  deleteAdminChat,
  deleteAdminFile,
  deleteAdminUser,
  deleteAdminUserSession,
  deleteAdminUserSessions,
  fetchAdminAuditLogs,
  fetchAdminBackups,
  fetchAdminChats,
  fetchAdminFiles,
  fetchAdminOverview,
  fetchAdminSettings,
  fetchAdminUserDetail,
  fetchAdminUsers,
  getAdminBackupDownloadUrl,
  resetAdminUserPassword,
  updateAdminUser,
} from "../api/chatApi.js";
import {
  Ban,
  Chat,
  Database,
  Download,
  File,
  Lock,
  Moon,
  Refresh,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Trash,
  User,
  Users,
} from "../icons/lucide.js";

const PAGE_SIZE = 25;

const tabs = [
  { id: "overview", label: "Overview", icon: Database },
  { id: "users", label: "Users", icon: Users },
  { id: "chats", label: "Chats", icon: Chat },
  { id: "files", label: "Files", icon: File },
  { id: "audit", label: "Audit", icon: ShieldCheck },
  { id: "maintenance", label: "Maintenance", icon: Settings },
];

async function readJsonResponse(response) {
  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  if (!response.ok) {
    throw new Error(data?.error || `Request failed (${response.status})`);
  }
  return data;
}

function StatCard({ label, value, detail, icon: Icon }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-2 truncate text-2xl font-bold text-slate-950 dark:text-white">
            {value}
          </p>
          {detail ? (
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              {detail}
            </p>
          ) : null}
        </div>
        {Icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-200">
            <Icon size={20} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-medium text-slate-500 dark:border-white/10 dark:bg-slate-950 dark:text-slate-400">
      {text}
    </div>
  );
}

function Pager({ pagination, onPage }) {
  if (!pagination || Number(pagination.totalPages || 1) <= 1) return null;
  const page = Number(pagination.page || 1);
  const totalPages = Number(pagination.totalPages || 1);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-950">
      <span className="font-medium text-slate-500 dark:text-slate-400">
        Page {page} of {totalPages} / {pagination.total} items
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-40 dark:border-white/10"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-40 dark:border-white/10"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function ActionModal({ action, onClose, onConfirm, busy }) {
  const [value, setValue] = useState("");
  if (!action) return null;
  const needsInput = action.inputLabel;
  const canSubmit = !needsInput || value.length >= (action.minLength || 1);
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-slate-950">
        <h2 className="text-lg font-bold text-slate-950 dark:text-white">{action.title}</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{action.body}</p>
        {needsInput ? (
          <label className="mt-4 block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {action.inputLabel}
            </span>
            <input
              type={action.inputType || "text"}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-400 dark:border-white/10 dark:bg-slate-900"
              autoFocus
            />
          </label>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 dark:border-white/10 dark:text-slate-300"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit || busy}
            onClick={() => onConfirm(value)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
              action.danger ? "bg-rose-500 hover:bg-rose-600" : "bg-emerald-500 hover:bg-emerald-600"
            }`}
          >
            {busy ? "Working..." : action.confirmLabel || "Confirm"}
          </button>
        </div>
      </section>
    </div>
  );
}

function UserDetailDrawer({ detail, onClose, onRevokeSession, onRevokeAllSessions }) {
  if (!detail) return null;
  return (
    <div className="fixed inset-0 z-[420] bg-slate-950/40 backdrop-blur-sm">
      <aside className="ml-auto flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950">
        <header className="border-b border-slate-200 p-5 dark:border-white/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                User detail
              </p>
              <h2 className="mt-1 text-xl font-bold">{detail.user.nickname || detail.user.username}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">@{detail.user.username}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold dark:border-white/10"
            >
              Close
            </button>
          </div>
        </header>
        <div className="app-scroll flex-1 space-y-4 overflow-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard label="Messages" value={detail.stats.messages} icon={Database} />
            <StatCard label="Chats" value={detail.stats.chats} icon={Chat} />
            <StatCard label="Files" value={detail.stats.files} detail={detail.stats.storageLabel} icon={File} />
            <StatCard label="Sessions" value={detail.stats.sessions} icon={Lock} />
          </div>

          <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold">Active sessions</h3>
              <button
                type="button"
                onClick={() => onRevokeAllSessions(detail.user)}
                className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 dark:border-rose-500/30"
              >
                Logout all
              </button>
            </div>
            <div className="mt-3 divide-y divide-slate-100 dark:divide-white/10">
              {detail.sessions.length ? (
                detail.sessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div>
                      <p className="font-semibold">Session #{session.id}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Created {session.created_at} / Last seen {session.last_seen}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRevokeSession(detail.user, session)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 dark:border-white/10 dark:text-slate-300"
                    >
                      Revoke
                    </button>
                  </div>
                ))
              ) : (
                <p className="py-3 text-sm text-slate-500">No active sessions.</p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
            <h3 className="text-sm font-bold">Recent chats</h3>
            <div className="mt-3 divide-y divide-slate-100 dark:divide-white/10">
              {detail.chats.length ? (
                detail.chats.map((chat) => (
                  <div key={chat.id} className="py-3 text-sm">
                    <p className="font-semibold">{chat.name || `${chat.type} #${chat.id}`}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {chat.type} / role {chat.role} / {chat.message_count} messages
                    </p>
                  </div>
                ))
              ) : (
                <p className="py-3 text-sm text-slate-500">No chats found.</p>
              )}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

export default function AdminPage({ user, isDark, onToggleTheme, onNavigate }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [chats, setChats] = useState([]);
  const [files, setFiles] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [settings, setSettings] = useState(null);
  const [backups, setBackups] = useState([]);
  const [userPagination, setUserPagination] = useState(null);
  const [chatPagination, setChatPagination] = useState(null);
  const [filePagination, setFilePagination] = useState(null);
  const [auditPagination, setAuditPagination] = useState(null);
  const [userFilters, setUserFilters] = useState({ query: "", role: "", status: "", sort: "newest", page: 1 });
  const [chatFilters, setChatFilters] = useState({ query: "", type: "", sort: "newest", page: 1 });
  const [fileFilters, setFileFilters] = useState({ query: "", kind: "", page: 1 });
  const [auditFilters, setAuditFilters] = useState({ action: "", actor: "", targetType: "", page: 1 });
  const [userDetail, setUserDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [action, setAction] = useState(null);

  const isAdmin = Boolean(user?.isAdmin || String(user?.role || "").toLowerCase() === "admin");

  const withPageSize = (params) => ({ ...params, pageSize: PAGE_SIZE });

  const loadOverview = useCallback(async () => {
    const data = await readJsonResponse(await fetchAdminOverview());
    setOverview(data);
  }, []);

  const loadUsers = useCallback(async () => {
    const data = await readJsonResponse(await fetchAdminUsers(withPageSize(userFilters)));
    setUsers(Array.isArray(data.users) ? data.users : []);
    setUserPagination(data.pagination || null);
  }, [userFilters]);

  const loadChats = useCallback(async () => {
    const data = await readJsonResponse(await fetchAdminChats(withPageSize(chatFilters)));
    setChats(Array.isArray(data.chats) ? data.chats : []);
    setChatPagination(data.pagination || null);
  }, [chatFilters]);

  const loadFiles = useCallback(async () => {
    const data = await readJsonResponse(await fetchAdminFiles(withPageSize(fileFilters)));
    setFiles(Array.isArray(data.files) ? data.files : []);
    setFilePagination(data.pagination || null);
  }, [fileFilters]);

  const loadAudit = useCallback(async () => {
    const data = await readJsonResponse(await fetchAdminAuditLogs(withPageSize(auditFilters)));
    setAuditLogs(Array.isArray(data.logs) ? data.logs : []);
    setAuditPagination(data.pagination || null);
  }, [auditFilters]);

  const loadSettings = useCallback(async () => {
    const data = await readJsonResponse(await fetchAdminSettings());
    setSettings(data.settings || null);
  }, []);

  const loadBackups = useCallback(async () => {
    const data = await readJsonResponse(await fetchAdminBackups());
    setBackups(Array.isArray(data.backups) ? data.backups : []);
  }, []);

  const loadAll = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError("");
    const tasks = [
      ["overview", loadOverview],
      ["users", loadUsers],
      ["chats", loadChats],
      ["files", loadFiles],
      ["audit", loadAudit],
      ["settings", loadSettings],
      ["backups", loadBackups],
    ];
    const results = await Promise.allSettled(tasks.map(([, loader]) => loader()));
    const failed = results
      .map((result, index) =>
        result.status === "rejected"
          ? `${tasks[index][0]}: ${result.reason?.message || "failed"}`
          : "",
      )
      .filter(Boolean);
    if (failed.length && failed.length === tasks.length) {
      setError("Unable to load admin panel.");
    } else {
      setError("");
      if (failed.length) {
        console.warn("[admin] partial load failed:", failed.join(" | "));
      }
    }
    setLoading(false);
  }, [isAdmin, loadAudit, loadBackups, loadChats, loadFiles, loadOverview, loadSettings, loadUsers]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (activeTab === "users") void loadUsers().catch((err) => setError(err.message));
  }, [activeTab, loadUsers]);
  useEffect(() => {
    if (activeTab === "chats") void loadChats().catch((err) => setError(err.message));
  }, [activeTab, loadChats]);
  useEffect(() => {
    if (activeTab === "files") void loadFiles().catch((err) => setError(err.message));
  }, [activeTab, loadFiles]);
  useEffect(() => {
    if (activeTab === "audit") void loadAudit().catch((err) => setError(err.message));
  }, [activeTab, loadAudit]);

  const runAction = async (key, handler, refresh = loadAll) => {
    setBusyKey(key);
    setError("");
    try {
      await handler();
      await refresh();
    } catch (err) {
      setError(err?.message || "Action failed.");
    } finally {
      setBusyKey("");
      setAction(null);
    }
  };

  const openUserDetail = async (item) => {
    setBusyKey(`detail-${item.id}`);
    setError("");
    try {
      const data = await readJsonResponse(await fetchAdminUserDetail(item.id));
      setUserDetail(data);
    } catch (err) {
      setError(err?.message || "Unable to load user detail.");
    } finally {
      setBusyKey("");
    }
  };

  const confirmAction = (nextAction) => setAction(nextAction);
  const stats = overview?.stats || {};
  const chatTotal = useMemo(
    () => Object.values(stats.chats || {}).reduce((sum, value) => sum + Number(value || 0), 0),
    [stats.chats],
  );

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-white">
        <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-white/10 dark:bg-slate-900">
          <ShieldCheck className="mx-auto text-amber-500" size={34} />
          <h1 className="mt-3 text-xl font-bold">Admin access required</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Your account does not have permission to open the admin panel.
          </p>
          <button
            type="button"
            onClick={() => onNavigate?.("/chat", true)}
            className="mt-5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            Back to chat
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-white">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900 md:block">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-white">
            <ShieldCheck size={22} />
          </div>
          <div>
            <p className="text-sm font-bold">BirdX Admin</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">v2.2 workspace</p>
          </div>
        </div>
        <nav className="mt-6 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
                  active
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-slate-900/90">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                Admin Panel
              </p>
              <h1 className="text-xl font-bold">System management</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void loadAll()}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200"
              >
                <Refresh size={17} />
                Refresh
              </button>
              <button
                type="button"
                onClick={onToggleTheme}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200"
                aria-label="Toggle theme"
              >
                {isDark ? <Sun size={17} /> : <Moon size={17} />}
              </button>
              <button
                type="button"
                onClick={() => onNavigate?.("/chat", true)}
                className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
              >
                Chat
              </button>
            </div>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 md:hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${
                  activeTab === tab.id
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6">
          {error ? (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
              {error}
            </div>
          ) : null}
          {loading ? <EmptyState text="Loading admin panel..." /> : null}

          {!loading && activeTab === "overview" ? (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Users" value={stats.users?.total || 0} detail={`${stats.users?.admins || 0} admins, ${stats.users?.banned || 0} banned`} icon={Users} />
                <StatCard label="Chats" value={chatTotal} detail={`${stats.chats?.group || 0} groups, ${stats.chats?.channel || 0} channels`} icon={Chat} />
                <StatCard label="Messages" value={stats.messages || 0} detail="Stored chat messages" icon={Database} />
                <StatCard label="Files" value={stats.files?.total || 0} detail={stats.files?.label || "0 B"} icon={File} />
              </div>
              <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950">
                <h2 className="text-sm font-bold">Operational snapshot</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <StatCard label="Recent users" value={stats.users?.recentlyActive || 0} detail="Active in 15 minutes" icon={User} />
                  <StatCard label="Sessions" value={stats.sessions || 0} detail="Active login sessions" icon={Lock} />
                  <StatCard label="Backups" value={backups.length} detail="Stored database backups" icon={Download} />
                </div>
              </section>
            </div>
          ) : null}

          {!loading && activeTab === "users" ? (
            <div className="space-y-4">
              <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-950 md:grid-cols-[1fr_140px_140px_160px_auto]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input value={userFilters.query} onChange={(event) => setUserFilters((prev) => ({ ...prev, query: event.target.value, page: 1 }))} placeholder="Search users" className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-400 dark:border-white/10 dark:bg-slate-900" />
                </div>
                <select value={userFilters.role} onChange={(event) => setUserFilters((prev) => ({ ...prev, role: event.target.value, page: 1 }))} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-900">
                  <option value="">All roles</option>
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                </select>
                <select value={userFilters.status} onChange={(event) => setUserFilters((prev) => ({ ...prev, status: event.target.value, page: 1 }))} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-900">
                  <option value="">All status</option>
                  <option value="active">Active</option>
                  <option value="banned">Banned</option>
                  <option value="recent">Recent</option>
                </select>
                <select value={userFilters.sort} onChange={(event) => setUserFilters((prev) => ({ ...prev, sort: event.target.value, page: 1 }))} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-900">
                  <option value="newest">Newest</option>
                  <option value="username">Username</option>
                  <option value="messages">Most messages</option>
                  <option value="chats">Most chats</option>
                  <option value="last_seen">Last seen</option>
                </select>
                <button type="button" onClick={() => void loadUsers()} className="h-10 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white">Apply</button>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Activity</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                      {users.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3">
                            <button type="button" onClick={() => void openUserDetail(item)} className="flex items-center gap-3 text-left">
                              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"><User size={17} /></span>
                              <span>
                                <span className="block font-semibold">{item.nickname || item.username}</span>
                                <span className="block text-xs text-slate-500 dark:text-slate-400">@{item.username}</span>
                              </span>
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={item.role}
                              onChange={(event) =>
                                void runAction(`role-${item.id}`, async () => {
                                  await readJsonResponse(await updateAdminUser(item.id, { role: event.target.value }));
                                }, loadUsers)
                              }
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-semibold dark:border-white/10 dark:bg-slate-900"
                            >
                              <option value="user">user</option>
                              <option value="admin">admin</option>
                            </select>
                            {item.envAdmin ? <span className="ml-2 rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">env</span> : null}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-1 text-xs font-bold ${item.banned ? "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"}`}>
                              {item.banned ? "banned" : "active"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{item.chat_count} chats / {item.message_count} messages</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button type="button" onClick={() => void openUserDetail(item)} className="h-8 rounded-lg border border-slate-200 px-2 text-xs font-semibold dark:border-white/10">Detail</button>
                              <button type="button" onClick={() => confirmAction({ title: item.banned ? "Unban user" : "Ban user", body: `Change ban status for @${item.username}?`, confirmLabel: item.banned ? "Unban" : "Ban", danger: !item.banned, run: async () => readJsonResponse(await updateAdminUser(item.id, { banned: !item.banned })), refresh: loadUsers })} className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2 text-xs font-semibold dark:border-white/10"><Ban size={14} />{item.banned ? "Unban" : "Ban"}</button>
                              <button type="button" onClick={() => confirmAction({ title: "Reset password", body: `Set a new password for @${item.username}.`, inputLabel: "New password", inputType: "password", minLength: 6, confirmLabel: "Reset", run: async (password) => readJsonResponse(await resetAdminUserPassword(item.id, password)), refresh: loadUsers })} className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2 text-xs font-semibold dark:border-white/10"><Lock size={14} />Password</button>
                              <button type="button" onClick={() => confirmAction({ title: "Delete user", body: `Delete @${item.username}? This cannot be undone.`, confirmLabel: "Delete", danger: true, run: async () => readJsonResponse(await deleteAdminUser(item.id)), refresh: loadUsers })} className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 px-2 text-xs font-semibold text-rose-600 dark:border-rose-500/30"><Trash size={14} />Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <Pager pagination={userPagination} onPage={(page) => setUserFilters((prev) => ({ ...prev, page }))} />
            </div>
          ) : null}

          {!loading && activeTab === "chats" ? (
            <div className="space-y-4">
              <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-950 md:grid-cols-[1fr_140px_160px_auto]">
                <input value={chatFilters.query} onChange={(event) => setChatFilters((prev) => ({ ...prev, query: event.target.value, page: 1 }))} placeholder="Search chats" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-400 dark:border-white/10 dark:bg-slate-900" />
                <select value={chatFilters.type} onChange={(event) => setChatFilters((prev) => ({ ...prev, type: event.target.value, page: 1 }))} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-900">
                  <option value="">All types</option><option value="dm">DM</option><option value="group">Group</option><option value="channel">Channel</option><option value="saved">Saved</option>
                </select>
                <select value={chatFilters.sort} onChange={(event) => setChatFilters((prev) => ({ ...prev, sort: event.target.value, page: 1 }))} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-900">
                  <option value="newest">Newest</option><option value="name">Name</option><option value="members">Most members</option><option value="messages">Most messages</option>
                </select>
                <button type="button" onClick={() => void loadChats()} className="h-10 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white">Apply</button>
              </div>
              <div className="grid gap-3">
                {chats.length ? chats.map((chat) => (
                  <section key={chat.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950">
                    <div>
                      <p className="font-bold">{chat.name || `${chat.type} #${chat.id}`}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{chat.type} / {chat.group_username || "no username"} / {chat.member_count} members / {chat.message_count} messages</p>
                    </div>
                    <button type="button" onClick={() => confirmAction({ title: "Delete chat", body: `Delete chat #${chat.id}? This cannot be undone.`, confirmLabel: "Delete", danger: true, run: async () => readJsonResponse(await deleteAdminChat(chat.id)), refresh: loadChats })} className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 px-3 text-sm font-semibold text-rose-600 dark:border-rose-500/30"><Trash size={15} />Delete</button>
                  </section>
                )) : <EmptyState text="No chats found." />}
              </div>
              <Pager pagination={chatPagination} onPage={(page) => setChatFilters((prev) => ({ ...prev, page }))} />
            </div>
          ) : null}

          {!loading && activeTab === "files" ? (
            <div className="space-y-4">
              <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-950 md:grid-cols-[1fr_140px_auto]">
                <input value={fileFilters.query} onChange={(event) => setFileFilters((prev) => ({ ...prev, query: event.target.value, page: 1 }))} placeholder="Search files or owner" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-400 dark:border-white/10 dark:bg-slate-900" />
                <select value={fileFilters.kind} onChange={(event) => setFileFilters((prev) => ({ ...prev, kind: event.target.value, page: 1 }))} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-900">
                  <option value="">All files</option><option value="image">Image</option><option value="video">Video</option><option value="audio">Audio</option><option value="file">File</option>
                </select>
                <button type="button" onClick={() => void loadFiles()} className="h-10 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white">Apply</button>
              </div>
              <div className="grid gap-3">
                {files.length ? files.map((file) => (
                  <section key={file.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950">
                    <div className="min-w-0"><p className="truncate font-bold">{file.original_name || file.stored_name}</p><p className="text-xs text-slate-500 dark:text-slate-400">{file.size_label} / {file.mime_type || file.kind || "file"} / @{file.owner_username || "unknown"}</p></div>
                    <button type="button" onClick={() => confirmAction({ title: "Delete file", body: `Delete ${file.original_name || file.stored_name}?`, confirmLabel: "Delete", danger: true, run: async () => readJsonResponse(await deleteAdminFile(file.id)), refresh: loadFiles })} className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 px-3 text-sm font-semibold text-rose-600 dark:border-rose-500/30"><Trash size={15} />Delete</button>
                  </section>
                )) : <EmptyState text="No files found." />}
              </div>
              <Pager pagination={filePagination} onPage={(page) => setFileFilters((prev) => ({ ...prev, page }))} />
            </div>
          ) : null}

          {!loading && activeTab === "audit" ? (
            <div className="space-y-4">
              <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-950 md:grid-cols-[1fr_180px_150px_auto]">
                <input value={auditFilters.action} onChange={(event) => setAuditFilters((prev) => ({ ...prev, action: event.target.value, page: 1 }))} placeholder="Action filter" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-900" />
                <input value={auditFilters.actor} onChange={(event) => setAuditFilters((prev) => ({ ...prev, actor: event.target.value, page: 1 }))} placeholder="Actor" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-900" />
                <select value={auditFilters.targetType} onChange={(event) => setAuditFilters((prev) => ({ ...prev, targetType: event.target.value, page: 1 }))} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-900">
                  <option value="">All targets</option><option value="user">User</option><option value="chat">Chat</option><option value="file">File</option><option value="backup">Backup</option><option value="session">Session</option>
                </select>
                <button type="button" onClick={() => void loadAudit()} className="h-10 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white">Apply</button>
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950">
                <div className="divide-y divide-slate-100 dark:divide-white/10">
                  {auditLogs.length ? auditLogs.map((log) => (
                    <div key={log.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                      <div><p className="font-bold">{log.action}</p><p className="text-xs text-slate-500 dark:text-slate-400">{log.actor_username || "system"} / {log.target_type || "-"} #{log.target_id || "-"}</p></div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{log.created_at}</span>
                    </div>
                  )) : <EmptyState text="No audit logs found." />}
                </div>
              </div>
              <Pager pagination={auditPagination} onPage={(page) => setAuditFilters((prev) => ({ ...prev, page }))} />
            </div>
          ) : null}

          {!loading && activeTab === "maintenance" ? (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Account Creation" value={settings?.accountCreation ? "Enabled" : "Disabled"} detail="Controlled by .env" icon={Settings} />
                <StatCard label="Message Limit" value={settings?.messageMaxChars || 0} detail="Maximum characters per message" icon={Database} />
                <StatCard label="Storage Encryption" value={settings?.storageEncryption ? "Enabled" : "Disabled"} detail="Server-side storage encryption" icon={Lock} />
                <StatCard label="Bootstrap Admins" value={settings?.adminUsernames?.length || 0} detail={(settings?.adminUsernames || []).join(", ") || "No env admins"} icon={ShieldCheck} />
              </div>
              <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h2 className="text-sm font-bold">Database backups</h2><p className="text-xs text-slate-500 dark:text-slate-400">Create and download safe database snapshots.</p></div>
                  <button type="button" onClick={() => void runAction("backup-create", async () => { const data = await readJsonResponse(await createAdminBackup()); setBackups(data.backups || []); }, loadBackups)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white"><Download size={16} />Create backup</button>
                </div>
                <div className="mt-4 divide-y divide-slate-100 dark:divide-white/10">
                  {backups.length ? backups.map((backup) => (
                    <div key={backup.name} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                      <div><p className="font-semibold">{backup.name}</p><p className="text-xs text-slate-500 dark:text-slate-400">{backup.sizeLabel} / {backup.createdAt}</p></div>
                      <div className="flex gap-2">
                        <a href={getAdminBackupDownloadUrl(backup.name)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2 text-xs font-bold dark:border-white/10"><Download size={14} />Download</a>
                        <button type="button" onClick={() => confirmAction({ title: "Delete backup", body: `Delete ${backup.name}?`, confirmLabel: "Delete", danger: true, run: async () => { const data = await readJsonResponse(await deleteAdminBackup(backup.name)); setBackups(data.backups || []); }, refresh: loadBackups })} className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 px-2 text-xs font-bold text-rose-600 dark:border-rose-500/30"><Trash size={14} />Delete</button>
                      </div>
                    </div>
                  )) : <p className="py-4 text-sm text-slate-500">No backups yet.</p>}
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </main>

      <ActionModal
        action={action}
        busy={Boolean(busyKey)}
        onClose={() => setAction(null)}
        onConfirm={(value) => {
          if (!action) return;
          void runAction(
            action.title || "action",
            async () => {
              await action.run(value);
            },
            action.refresh || loadAll,
          );
        }}
      />
      <UserDetailDrawer
        detail={userDetail}
        onClose={() => setUserDetail(null)}
        onRevokeSession={(detailUser, session) =>
          confirmAction({
            title: "Revoke session",
            body: `Revoke session #${session.id} for @${detailUser.username}?`,
            confirmLabel: "Revoke",
            danger: true,
            run: async () => {
              await readJsonResponse(await deleteAdminUserSession(detailUser.id, session.id));
              setUserDetail(await readJsonResponse(await fetchAdminUserDetail(detailUser.id)));
            },
            refresh: loadUsers,
          })
        }
        onRevokeAllSessions={(detailUser) =>
          confirmAction({
            title: "Logout all sessions",
            body: `Logout all active sessions for @${detailUser.username}?`,
            confirmLabel: "Logout all",
            danger: true,
            run: async () => {
              await readJsonResponse(await deleteAdminUserSessions(detailUser.id));
              setUserDetail(await readJsonResponse(await fetchAdminUserDetail(detailUser.id)));
            },
            refresh: loadUsers,
          })
        }
      />
    </div>
  );
}
