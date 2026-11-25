// P9: admin panel (no framework). CSP-safe: no inline scripts or on…= handlers; all output is escaped.
// The server checks admin rights on EVERY /api/admin request; this page only decides what to show.
"use strict";
(() => {
  // ---------- theme (same setting as the main site) ----------
  const root = document.documentElement;
  let theme = "dark";
  try { theme = JSON.parse(localStorage.getItem("wah_theme") || '"dark"') === "light" ? "light" : "dark"; } catch { /* private mode */ }
  root.dataset.theme = theme;

  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = n => Number(n || 0).toLocaleString("en-US");
  const date = d => d ? new Date(d).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" }) : "—";
  const dateTime = d => d ? new Date(d).toLocaleString([], { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
  const won = n => "₩" + num(n);
  const STATUS = { new: "New", contacted: "Contacted", interview: "Interview", hired: "Hired", rejected: "Not selected" };
  const ACTIONS = { "user.block": "Blocked user", "user.unblock": "Unblocked user", "employer.verify": "Verified employer",
    "employer.unverify": "Removed verification", "job.hide": "Hid job", "job.unhide": "Un-hid job", "report.resolve": "Resolved report",
    "jobs.block-hide": "Hid jobs (account blocked)", "jobs.block-restore": "Restored jobs (account unblocked)" };

  function toast(msg, bad) {
    const t = $("toast"); t.textContent = msg; t.className = "toast show" + (bad ? " bad" : "");
    clearTimeout(t._h); t._h = setTimeout(() => { t.className = "toast"; }, 3000);
  }

  // ---------- API ----------
  class ApiError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
  async function api(path, body) {
    let r;
    try {
      r = await fetch("/api" + path, { method: body ? "POST" : "GET", credentials: "same-origin",
        headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
    } catch { throw new ApiError(0, "Can't reach the server. Check your connection."); }
    const d = await r.json().catch(() => ({}));
    if (r.status === 401 || r.status === 403 && path.startsWith("/admin")) { gate(r.status === 401 ? "login" : "denied"); throw new ApiError(r.status, d.error || "Not allowed"); }
    if (!r.ok) throw new ApiError(r.status, d.error || "Something went wrong.");
    return d;
  }

  // ---------- "are you sure?" dialog with an optional reason box ----------
  function ask({ title, text = "", label = "", placeholder = "", required = false, ok = "OK", danger = false }) {
    const dlg = $("dlg"), input = $("dlgInput");
    $("dlgTitle").textContent = title; $("dlgText").textContent = text;
    $("dlgLabel").textContent = label; $("dlgLabel").hidden = input.hidden = !label;
    input.value = ""; input.placeholder = placeholder; $("dlgErr").textContent = "";
    $("dlgOk").textContent = ok; $("dlgOk").className = "btn" + (danger ? " danger" : "");
    return new Promise(done => {
      const finish = v => { dlg.close(); cleanup(); done(v); };
      const onSubmit = e => {
        e.preventDefault();
        const v = input.value.trim();
        if (label && required && !v) { $("dlgErr").textContent = "Please write a reason."; input.focus(); return; }
        finish({ reason: v });
      };
      const onCancel = () => finish(null);
      const onClose = () => { cleanup(); done(null); };
      const cleanup = () => { $("dlgForm").removeEventListener("submit", onSubmit); $("dlgCancel").removeEventListener("click", onCancel); dlg.removeEventListener("cancel", onClose); };
      $("dlgForm").addEventListener("submit", onSubmit);
      $("dlgCancel").addEventListener("click", onCancel);
      dlg.addEventListener("cancel", onClose);
      dlg.showModal();
      (label ? input : $("dlgOk")).focus();
    });
  }

  // ---------- "Not allowed" / "Please log in" ----------
  function gate(kind) {
    $("tabs").hidden = true;
    $("main").innerHTML = kind === "login"
      ? `<div class="gate"><div class="big">🔐</div><h1>Please log in</h1><p>Log in with an admin account on the main site, then come back here.</p><a class="btn" href="/">Go to log in</a></div>`
      : `<div class="gate"><div class="big">🚧</div><h1>Not allowed</h1><p>This page is only for the Work Abroad Hub team. If you think you should have access, ask an admin.</p><a class="btn" href="/">Back to the site</a></div>`;
  }

  // ---------- tabs ----------
  const TABS = ["dashboard", "users", "employers", "jobs", "reports", "log"];
  const state = { tab: "dashboard", users: { q: "", filter: "", page: 1 }, employers: { status: "pending", q: "", page: 1 },
    jobs: { q: "", status: "", page: 1 }, reports: { status: "open", page: 1 }, log: { page: 1 } };
  let seq = 0;                                       // ignore answers of an older, slower request

  function show(tab) {
    state.tab = TABS.includes(tab) ? tab : "dashboard";
    if (location.hash !== "#" + state.tab) history.replaceState(null, "", "#" + state.tab);
    document.querySelectorAll("#tabs [data-tab]").forEach(b => { const on = b.dataset.tab === state.tab; b.classList.toggle("on", on); b.setAttribute("aria-current", on ? "page" : "false"); });
    render();
  }
  async function render() {
    const my = ++seq, tab = state.tab;
    if (!$("main").querySelector(`[data-view="${tab}"]`)) $("main").innerHTML = `<div class="loading">Loading…</div>`;
    try {
      const html = await VIEWS[tab]();
      if (my !== seq) return;
      $("main").innerHTML = `<section data-view="${tab}">${html}</section>`;
      AFTER[tab]?.();
    } catch (e) {
      if (my !== seq || e.status === 401 || e.status === 403) return;
      $("main").innerHTML = `<div class="empty">⚠️ ${esc(e.message)} <button class="btn ghost" data-act="retry" type="button">Try again</button></div>`;
    }
  }
  const pager = d => d.pages > 1 ? `<div class="pager"><button class="btn ghost" type="button" data-page="${d.page - 1}" ${d.page <= 1 ? "disabled" : ""}>← Prev</button><span>Page ${d.page} of ${d.pages} · ${num(d.total)}</span><button class="btn ghost" type="button" data-page="${d.page + 1}" ${d.page >= d.pages ? "disabled" : ""}>Next →</button></div>` : (d.total ? `<div class="pager">${num(d.total)} total</div>` : "");

  async function counts() {
    try {
      const [e, r] = await Promise.all([api("/admin/employers?status=pending"), api("/admin/reports?status=open")]);
      $("cntEmployers").textContent = e.total || ""; $("cntReports").textContent = r.total || "";
    } catch { /* shown elsewhere */ }
  }

  // ---------- views ----------
  const hbars = (rows, cls) => {
    const max = Math.max(1, ...rows.map(r => r[1]));
    return `<div class="hbars">${rows.map(([label, n], i) => `<div class="hbar"><span title="${esc(label)}">${esc(label)}</span><div class="track"><i class="fill ${cls ? cls[i % cls.length] : "c1"}" data-w="${(n / max * 100).toFixed(1)}"></i></div><b>${num(n)}</b></div>`).join("")}</div>`;
  };

  const VIEWS = {
    async dashboard() {
      const s = await api("/admin/stats");
      const u = s.users, verified = u.verified.verified || 0, pct = u.total ? Math.round(verified / u.total * 100) : 0;
      const appsTotal = Object.values(s.applications).reduce((a, b) => a + b, 0);
      const maxDay = Math.max(1, ...s.signups30d.map(d => d.n)), sum30 = s.signups30d.reduce((a, d) => a + d.n, 0);
      const appRows = Object.keys(STATUS).map(k => [STATUS[k], s.applications[k] || 0])
        .concat(Object.entries(s.applications).filter(([k]) => !STATUS[k]).map(([k, n]) => [k, n]));
      return `<div class="head"><div><h2>Dashboard</h2><p>The whole site at a glance.</p></div><button class="btn ghost" type="button" data-act="refresh">↻ Refresh</button></div>
        <div class="kpis">
          <div class="card kpi"><small>Users</small><b>${num(u.total)}</b><span>${num(u.blocked)} blocked · ${num(u.admins)} admin</span></div>
          <div class="card kpi"><small>Email verified</small><b>${pct}%</b><span>${num(verified)} of ${num(u.total)}</span></div>
          <div class="card kpi"><small>Open jobs</small><b>${num(s.jobs.open)}</b><span>${num(s.jobs.closed)} closed · ${num(s.jobs.hidden)} hidden</span></div>
          <div class="card kpi"><small>Applications</small><b>${num(appsTotal)}</b><span>${num(s.applications.new || 0)} new</span></div>
          <div class="card kpi"><small>Messages · 7 days</small><b>${num(s.messages7d)}</b><span>in all chats</span></div>
          <div class="card kpi ${s.reports.open ? "alert" : ""}"><small>Open reports</small><b>${num(s.reports.open)}</b><span>${num(s.reports.resolved)} resolved</span></div>
        </div>
        <div class="card mb"><h3>Sign-ups per day · last 30 days <span class="tag">${num(sum30)} total</span></h3>
          <div class="vbars" role="img" aria-label="Sign-ups per day for the last 30 days">${s.signups30d.map(d => `<div class="vbar" title="${esc(d.day)}: ${d.n}"><em>${d.n || ""}</em><i class="${d.n ? "" : "zero"}" data-h="${(d.n / maxDay * 100).toFixed(1)}"></i></div>`).join("")}</div>
          <div class="vaxis"><span>${esc(s.signups30d[0].day.slice(5))}</span><span>${esc(s.signups30d[15].day.slice(5))}</span><span>today</span></div></div>
        <div class="grid2">
          <div class="card"><h3>Users by role</h3>${hbars(Object.entries(u.byRole).sort((a, b) => b[1] - a[1]), ["c1", "c3", "c4", "c5"])}</div>
          <div class="card"><h3>Verified vs not</h3>${hbars([["Verified", verified], ["Not verified", u.verified.unverified || 0]], ["c2", "c5"])}</div>
          <div class="card"><h3>Jobs</h3>${hbars([["Open", s.jobs.open], ["Closed", s.jobs.closed], ["Hidden by admin", s.jobs.hidden]], ["c2", "c5", "c3"])}</div>
          <div class="card"><h3>Applications by status</h3>${hbars(appRows, ["c1", "c4", "c3", "c2", "c5"])}</div>
        </div>`;
    },

    async users() {
      const st = state.users, d = await api(`/admin/users?q=${encodeURIComponent(st.q)}&filter=${st.filter}&page=${st.page}`);
      return `<div class="head"><div><h2>Users</h2><p>Search by email or name. Blocking logs the person out on every device at once.</p></div></div>
        <form class="bar" data-search="users"><input type="search" name="q" placeholder="Email or name…" value="${esc(st.q)}" aria-label="Search users">
          <select name="filter" aria-label="Filter">${[["", "Everyone"], ["student", "Students"], ["employer", "Employers"], ["unverified", "Not verified"], ["blocked", "Blocked"], ["admins", "Admins"]].map(([v, l]) => `<option value="${v}" ${st.filter === v ? "selected" : ""}>${l}</option>`).join("")}</select>
          <button class="btn" type="submit">Search</button></form>
        <div class="list">${d.items.length ? d.items.map(u => `<div class="row ${u.blocked ? "blocked" : ""}">
          <div class="main"><div class="t">${esc(u.name || "—")} ${u.me ? `<span class="tag blue">you</span>` : ""}</div><div class="s">${esc(u.email)}</div>
            <div class="tags"><span class="tag">${esc(u.role)}</span>${u.verified ? `<span class="tag ok">✓ verified</span>` : `<span class="tag warn">not verified</span>`}${u.blocked ? `<span class="tag bad">⛔ blocked</span>` : ""}${u.isAdmin ? `<span class="tag blue">🛡️ admin</span>` : ""}${u.google ? `<span class="tag">Google</span>` : ""}</div>
            <dl><div><dt>Joined</dt><dd>${date(u.createdAt)}</dd></div><div><dt>Last login</dt><dd>${dateTime(u.lastLoginAt)}</dd></div>${u.blocked && u.blockedReason ? `<div><dt>Block reason</dt><dd>${esc(u.blockedReason)}</dd></div>` : ""}</dl></div>
          <div class="acts">${u.me ? "" : u.blocked
            ? `<button class="btn ok" type="button" data-act="unblock" data-id="${esc(u.id)}" data-email="${esc(u.email)}">Unblock</button>`
            : u.isAdmin ? "" : `<button class="btn danger" type="button" data-act="block" data-id="${esc(u.id)}" data-email="${esc(u.email)}">Block</button>`}</div>
        </div>`).join("") : `<div class="empty">No users found.</div>`}</div>${pager(d)}`;
    },

    async employers() {
      const st = state.employers, d = await api(`/admin/employers?status=${st.status}&q=${encodeURIComponent(st.q)}&page=${st.page}`);
      return `<div class="head"><div><h2>Employers</h2><p>Check the business registration number and contact, then verify. Students see “✓ Verified employer” on their jobs.</p></div></div>
        <div class="bar"><div class="seg" role="group" aria-label="Status"><button type="button" data-status="pending" class="${st.status === "pending" ? "on" : ""}">To verify</button><button type="button" data-status="verified" class="${st.status === "verified" ? "on" : ""}">Verified</button></div></div>
        <form class="bar" data-search="employers"><input type="search" name="q" placeholder="Company, business no. or email…" value="${esc(st.q)}" aria-label="Search employers"><button class="btn" type="submit">Search</button></form>
        <div class="list">${d.items.length ? d.items.map(e => `<div class="row">
          <div class="main"><div class="t">${esc(e.company.name)} ${e.verified ? `<span class="tag ok">✓ verified</span>` : ""}</div>
            <div class="s">${esc([e.company.city, e.company.address].filter(Boolean).join(", "))}</div>
            <dl><div><dt>Business no.</dt><dd>${esc(e.company.biz || "—")} ${e.company.biz ? (!e.bizValid ? `<span class="tag bad">not 10 digits</span>` : e.bizCheckDigit ? `<span class="tag ok">check digit OK</span>` : `<span class="tag bad" title="Allowed, but the official check digit doesn't match: check the certificate or with NTS">check digit ≠</span>`) : ""}
              ${e.ntsEnabled && e.bizValid ? `<button class="btn ghost sm" type="button" data-act="nts" data-uid="${esc(e.uid)}">Check with NTS</button><span class="nts" id="nts_${esc(e.uid)}"></span>` : ""}</dd></div><div><dt>Contact</dt><dd>${esc(e.company.contact || "—")}</dd></div>
              <div><dt>Email / phone</dt><dd>${esc([e.company.email, e.company.phone].filter(Boolean).join(" · ") || "—")}</dd></div>
              <div><dt>Account</dt><dd>${e.account ? `${esc(e.account.email)} ${e.account.verified ? "" : "(email not verified)"} ${e.account.blocked ? "⛔ blocked" : ""}` : "(deleted)"}</dd></div>
              <div><dt>Jobs</dt><dd>${num(e.openJobs)} open / ${num(e.jobs)}</dd></div><div><dt>Updated</dt><dd>${date(e.updatedAt)}</dd></div></dl></div>
          <div class="acts">${e.verified
            ? `<button class="btn ghost" type="button" data-act="unverify" data-uid="${esc(e.uid)}" data-name="${esc(e.company.name)}">Remove ✓</button>`
            : `<button class="btn ok" type="button" data-act="verify" data-uid="${esc(e.uid)}" data-name="${esc(e.company.name)}">✓ Verify</button>`}</div>
        </div>`).join("") : `<div class="empty">${st.status === "pending" ? "No employers waiting. 🎉" : "No verified employers yet."}</div>`}</div>${pager(d)}`;
    },

    async jobs() {
      const st = state.jobs, d = await api(`/admin/jobs?q=${encodeURIComponent(st.q)}&status=${st.status}&page=${st.page}`);
      return `<div class="head"><div><h2>Jobs</h2><p>Every job from every employer. Hiding closes it and takes it off the job board; the employer can't reopen it.</p></div></div>
        <form class="bar" data-search="jobs"><input type="search" name="q" placeholder="Title, company or city…" value="${esc(st.q)}" aria-label="Search jobs">
          <select name="status" aria-label="Status">${[["", "All"], ["open", "Open"], ["closed", "Closed"], ["hidden", "Hidden by admin"]].map(([v, l]) => `<option value="${v}" ${st.status === v ? "selected" : ""}>${l}</option>`).join("")}</select>
          <button class="btn" type="submit">Search</button></form>
        <div class="list">${d.items.length ? d.items.map(j => `<div class="row">
          <div class="main"><div class="t">${esc(j.title || "(no title)")}</div><div class="s">${esc(j.company)}${j.verified ? " ✓" : ""} · ${esc([j.city, j.area].filter(Boolean).join(", "))} · ${won(j.pay)} ${esc(j.payType)}</div>
            <div class="tags">${j.hidden ? `<span class="tag bad">🛡️ hidden</span>` : j.status === "open" ? `<span class="tag ok">open</span>` : `<span class="tag">closed</span>`}<span class="tag">posted ${date(j.createdAt)}</span>${j.deadline ? `<span class="tag">until ${esc(j.deadline)}</span>` : ""}</div>
            ${j.hidden && j.hiddenInfo ? `<div class="quote">Hidden ${date(j.hiddenInfo.at)}: ${esc(j.hiddenInfo.reason)}</div>` : ""}</div>
          <div class="acts">${j.hidden
            ? `<button class="btn ok" type="button" data-act="unhide" data-owner="${esc(j.ownerUid)}" data-job="${esc(j.id)}" data-title="${esc(j.title)}">Un-hide</button>`
            : `<button class="btn danger" type="button" data-act="hide" data-owner="${esc(j.ownerUid)}" data-job="${esc(j.id)}" data-title="${esc(j.title)}">Hide</button>`}</div>
        </div>`).join("") : `<div class="empty">No jobs found.</div>`}</div>${pager(d)}`;
    },

    async reports() {
      const st = state.reports, d = await api(`/admin/reports?status=${st.status}&page=${st.page}`);
      const kindTag = { job: "📋 job", user: "👤 user", message: "💬 message" };
      return `<div class="head"><div><h2>Reports</h2><p>What users flagged with “🚩 Report”. Oldest open reports first.</p></div></div>
        <div class="bar"><div class="seg" role="group" aria-label="Status"><button type="button" data-status="open" class="${st.status === "open" ? "on" : ""}">Open</button><button type="button" data-status="resolved" class="${st.status === "resolved" ? "on" : ""}">Resolved</button></div></div>
        <div class="list">${d.items.length ? d.items.map(r => `<div class="row">
          <div class="main"><div class="tags"><span class="tag blue">${kindTag[r.kind] || esc(r.kind)}</span><span class="tag">${dateTime(r.createdAt)}</span>${r.status === "resolved" ? `<span class="tag ok">resolved ${date(r.resolvedAt)}</span>` : ""}</div>
            <div class="t mt">${esc(r.snapshot || r.targetId)}</div>
            <div class="quote">${esc(r.reason)}</div>
            <dl><div><dt>Reported by</dt><dd>${esc(r.reporter ? r.reporter.email : "—")}</dd></div>
              <div><dt>${r.kind === "job" ? "Employer" : r.kind === "message" ? "Sender" : "User"}</dt><dd>${esc(r.owner ? r.owner.email : "—")}${r.owner && r.owner.blocked ? " ⛔" : ""}</dd></div>
              ${r.note ? `<div><dt>Admin note</dt><dd>${esc(r.note)}</dd></div>` : ""}</dl></div>
          <div class="acts">${r.status === "open" ? `
            ${r.kind === "job" && r.owner ? `<button class="btn danger" type="button" data-act="hide" data-owner="${esc(r.owner.uid)}" data-job="${esc(r.targetId)}" data-title="${esc(r.snapshot)}">Hide job</button>` : ""}
            ${r.owner && !r.owner.blocked && r.owner.email !== "(deleted)" ? `<button class="btn danger" type="button" data-act="block" data-id="${esc(r.owner.uid)}" data-email="${esc(r.owner.email)}">Block ${r.kind === "job" ? "employer" : "user"}</button>` : ""}
            <button class="btn" type="button" data-act="resolve" data-id="${esc(r.id)}">Resolve</button>` : ""}</div>
        </div>`).join("") : `<div class="empty">${st.status === "open" ? "No open reports. 🎉" : "Nothing resolved yet."}</div>`}</div>${pager(d)}`;
    },

    async log() {
      const d = await api(`/admin/log?page=${state.log.page}`);
      const detail = l => Object.entries(l.details || {}).filter(([, v]) => v !== "" && v != null).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join(" · ");
      return `<div class="head"><div><h2>Admin log</h2><p>Every admin action, newest first. It can't be edited from here.</p></div></div>
        <div class="list">${d.items.length ? d.items.map(l => `<div class="row"><div class="main">
          <div class="t">${esc(ACTIONS[l.action] || l.action)} <span class="tag">${esc(l.target)}</span></div>
          <div class="s">${dateTime(l.at)} · by ${esc(l.admin)}</div>${detail(l) ? `<div class="quote">${esc(detail(l))}</div>` : ""}</div></div>`).join("") : `<div class="empty">No admin actions yet.</div>`}</div>${pager(d)}`;
    },
  };

  // bar sizes are set from JS (no inline styles in the HTML), then animate in
  const AFTER = {
    dashboard() {
      requestAnimationFrame(() => {
        document.querySelectorAll("[data-w]").forEach(el => { el.style.width = el.dataset.w + "%"; });
        document.querySelectorAll("[data-h]").forEach(el => { el.style.height = Math.max(Number(el.dataset.h), 1.5) + "%"; });
      });
    },
  };

  // ---------- actions ----------
  async function act(btn) {
    const a = btn.dataset.act, D = btn.dataset;
    const run = async (fn, okMsg) => {
      btn.disabled = true;
      try { await fn(); toast(okMsg); counts(); await render(); }
      catch (e) { if (e.status !== 401 && e.status !== 403) toast(e.message, true); btn.disabled = false; }
    };
    if (a === "retry" || a === "refresh") return render();
    if (a === "block") {
      const r = await ask({ title: "Block this user?", text: `${D.email} will be logged out on every device right away and can't log in. They get an email with your reason. If they're an employer, all their open jobs are hidden too.`,
        label: "Reason (sent to the user)", placeholder: "e.g. Fake job posts asking for a deposit", required: true, ok: "Block", danger: true });
      if (r) run(async () => { const d = await api(`/admin/users/${D.id}/block`, { blocked: true, reason: r.reason }); if (d.jobsHidden) setTimeout(() => toast(`${d.jobsHidden} open job(s) hidden`), 3100); }, "User blocked and logged out");
    } else if (a === "unblock") {
      const r = await ask({ title: "Unblock this user?", text: `${D.email} can log in again. They get an email. Jobs hidden by the block come back; jobs you hid on purpose stay hidden.`, ok: "Unblock" });
      if (r) run(async () => { const d = await api(`/admin/users/${D.id}/block`, { blocked: false }); if (d.jobsRestored) setTimeout(() => toast(`${d.jobsRestored} job(s) back on the board`), 3100); }, "User unblocked");
    } else if (a === "nts") {
      const out = document.getElementById("nts_" + D.uid); out.textContent = " checking…"; btn.disabled = true;
      api(`/admin/employers/${D.uid}/nts`, {}).then(r => {
        const txt = { active: "✅ active business", suspended: "⏸ suspended", closed: "⛔ closed", invalid: "⛔ invalid number", unknown: "❓ not registered" }[r.status] || r.status;
        out.textContent = ` ${txt}${r.label ? " (" + r.label + ")" : ""}`;
      }).catch(err => { out.textContent = " " + (err.message || "lookup failed"); }).finally(() => { btn.disabled = false; });
    } else if (a === "verify" || a === "unverify") {
      const on = a === "verify";
      const r = await ask({ title: on ? "Verify this employer?" : "Remove verification?", ok: on ? "✓ Verify" : "Remove",
        text: on ? `“${D.name}” gets a “✓ Verified employer” badge on all its jobs. Only do this after checking the business registration.` : `“${D.name}” loses the badge.`, danger: !on });
      if (r) run(() => api(`/admin/employers/${D.uid}/verify`, { verified: on }), on ? "Employer verified ✓" : "Verification removed");
    } else if (a === "hide") {
      const r = await ask({ title: "Hide this job?", text: `“${D.title}” is closed and disappears from the job board. The employer sees your reason and can't reopen it.`,
        label: "Reason (the employer sees it)", placeholder: "e.g. Pay below minimum wage", required: true, ok: "Hide job", danger: true });
      if (r) run(() => api(`/admin/jobs/${D.owner}/${encodeURIComponent(D.job)}/hide`, { hidden: true, reason: r.reason }), "Job hidden");
    } else if (a === "unhide") {
      const r = await ask({ title: "Un-hide this job?", text: `“${D.title}” goes back to how it was before (open or closed).`, ok: "Un-hide" });
      if (r) run(() => api(`/admin/jobs/${D.owner}/${encodeURIComponent(D.job)}/hide`, { hidden: false }), "Job visible again");
    } else if (a === "resolve") {
      const r = await ask({ title: "Resolve this report?", label: "Note (optional, only admins see it)", placeholder: "e.g. Hid the job and warned the employer", ok: "Resolve" });
      if (r) run(() => api(`/admin/reports/${D.id}/resolve`, { note: r.reason }), "Report resolved");
    }
  }

  // ---------- events (one listener for everything) ----------
  document.addEventListener("click", e => {
    const tab = e.target.closest("#tabs [data-tab]");
    if (tab) return show(tab.dataset.tab);
    const pg = e.target.closest("[data-page]");
    if (pg && !pg.disabled) { state[state.tab].page = Number(pg.dataset.page); render(); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    const sg = e.target.closest("[data-status]");
    if (sg && state[state.tab].status !== undefined) { state[state.tab].status = sg.dataset.status; state[state.tab].page = 1; render(); return; }
    const b = e.target.closest("button[data-act]");
    if (b) act(b);
  });
  document.addEventListener("submit", e => {
    const f = e.target.closest("form[data-search]"); if (!f) return;
    e.preventDefault();
    const st = state[f.dataset.search];
    for (const el of f.elements) if (el.name) st[el.name] = el.value.trim();
    st.page = 1; render();
  });
  document.addEventListener("change", e => {
    const sel = e.target.closest("form[data-search] select");
    if (sel) sel.form.requestSubmit();
  });
  $("themeBtn").addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark"; root.dataset.theme = theme;
    try { localStorage.setItem("wah_theme", JSON.stringify(theme)); } catch { /* ignore */ }
    $("themeBtn").textContent = theme === "dark" ? "☀️" : "🌙";
  });
  window.addEventListener("hashchange", () => { const t = location.hash.slice(1); if (t !== state.tab && TABS.includes(t)) show(t); });

  // ---------- start: who am I? ----------
  document.addEventListener("DOMContentLoaded", async () => {
    $("themeBtn").textContent = theme === "dark" ? "☀️" : "🌙";
    let me = null;
    try { me = (await fetch("/api/fb/auth/me", { credentials: "same-origin" }).then(r => r.json())).user; } catch { /* offline */ }
    if (!me) return gate("login");
    if (!me.isAdmin) return gate("denied");
    $("who").textContent = me.email;
    $("tabs").hidden = false;
    show(location.hash.slice(1));
    counts();
  });
})();
