// reset-password.html: read ?token=…, check the rules live, send the new password to the server.
(() => {
  const $ = id => document.getElementById(id);

  // same light/dark choice as the main site
  try { const t = JSON.parse(localStorage.getItem("wah_theme") || '"dark"'); document.documentElement.dataset.theme = t === "light" ? "light" : "dark"; }
  catch { document.documentElement.dataset.theme = "dark"; }

  const token = new URLSearchParams(location.search).get("token") || "";
  history.replaceState(null, "", location.pathname);            // keep the token out of history / screenshots

  const form = $("resetForm"), pw1 = $("pw1"), pw2 = $("pw2"), err = $("err"), btn = $("saveBtn");
  const NEW_LINK = ' <a href="/">Ask for a new link</a> (Log in → “Forgot password?”).';

  function showErr(text, withLink) {
    err.textContent = text;
    if (withLink) err.insertAdjacentHTML("beforeend", NEW_LINK);
    err.classList.add("show");
  }

  if (!/^[a-f0-9]{64}$/.test(token)) { showErr("This reset link is not complete or has expired.", true); btn.disabled = true; }

  // show / hide password
  document.querySelectorAll(".eye").forEach(b => b.addEventListener("click", () => {
    const i = $(b.dataset.for), show = i.type === "password";
    i.type = show ? "text" : "password";
    b.textContent = show ? "🙈" : "👁️";
    b.setAttribute("aria-label", show ? "Hide password" : "Show password");
  }));

  // live rules
  const rules = {
    len: () => pw1.value.length >= 8 && pw1.value.length <= 72,
    letter: () => /[A-Za-z]/.test(pw1.value),
    num: () => /\d/.test(pw1.value),
    same: () => pw1.value !== "" && pw1.value === pw2.value,
  };
  const check = () => { let all = true; for (const [k, f] of Object.entries(rules)) { const ok = f(); all &&= ok; document.querySelector(`[data-r="${k}"]`).classList.toggle("ok", ok); } return all; };
  pw1.addEventListener("input", check); pw2.addEventListener("input", check);

  form.addEventListener("submit", async e => {
    e.preventDefault();
    err.classList.remove("show");
    if (!check()) { showErr(pw1.value !== pw2.value && rules.len() ? "The two passwords don't match." : "Please follow the rules below the boxes."); return; }
    btn.disabled = true; btn.textContent = "Saving…";
    try {
      const r = await fetch("/api/fb/auth/reset", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password: pw1.value }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { $("formBox").hidden = true; $("doneBox").hidden = false; return; }
      if (d.code === "auth/expired-action-code") { showErr(d.error || "This reset link has expired.", true); return; }   // button stays off
      showErr(d.error || "Something went wrong. Please try again.");
      btn.disabled = false;
    } catch {
      showErr("Can't reach the server. Check your internet and try again.");
      btn.disabled = false;
    } finally { btn.textContent = "Save new password"; }
  });
})();
