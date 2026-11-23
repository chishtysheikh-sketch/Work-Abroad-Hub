// P13: the offline page reloads itself as soon as the connection is back
// (a separate file, because the Content-Security-Policy allows no inline scripts).
window.addEventListener("online", () => location.reload());
