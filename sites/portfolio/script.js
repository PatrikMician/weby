(() => {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /* ---------- Nav: scroll stav + mobilní menu ---------- */
  const nav = $("#nav");
  const toggle = $("#navToggle");
  const links = $("#navLinks");

  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 20);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const closeMenu = () => {
    links.classList.remove("open");
    toggle.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  };
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
  });
  $$("a", links).forEach((a) => a.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (e) => e.key === "Escape" && closeMenu());

  /* ---------- Psací efekt ---------- */
  const phrases = [
    "Student IT v průmyslu",
    "Programátor",
    "Správce sítí",
    "Elektro v praxi",
  ];
  const typed = $("#typed");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion) {
    typed.textContent = phrases[0];
  } else {
    let p = 0, i = 0, deleting = false;
    const tick = () => {
      const word = phrases[p];
      typed.textContent = word.slice(0, i);
      let delay = deleting ? 40 : 85;

      if (!deleting && i === word.length) {
        deleting = true;
        delay = 1400;
      } else if (deleting && i === 0) {
        deleting = false;
        p = (p + 1) % phrases.length;
        delay = 350;
      }
      i += deleting ? -1 : 1;
      setTimeout(tick, delay);
    };
    tick();
  }

  /* ---------- Reveal při scrollu ---------- */
  const revealEls = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach((el, idx) => {
      el.style.transitionDelay = `${(idx % 4) * 70}ms`;
      io.observe(el);
    });
  } else {
    revealEls.forEach((el) => el.classList.add("visible"));
  }

  /* ---------- Počítání čísel ---------- */
  const animateCount = (el) => {
    const target = Number(el.dataset.count);
    const duration = 1200;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const counters = $$("[data-count]");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const co = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          animateCount(e.target);
          co.unobserve(e.target);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach((c) => co.observe(c));
  } else {
    counters.forEach((c) => (c.textContent = c.dataset.count));
  }

  /* ---------- Aktivní odkaz v menu ---------- */
  const sections = $$("main section[id]");
  const navAnchors = $$("a", links);
  if ("IntersectionObserver" in window) {
    const so = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          navAnchors.forEach((a) =>
            a.classList.toggle("active", a.getAttribute("href") === `#${entry.target.id}`)
          );
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach((s) => so.observe(s));
  }

  /* ---------- Kontaktní formulář (otevře e-mailového klienta) ---------- */
  const form = $("#contactForm");
  const note = $("#formNote");
  const EMAIL = "patrikmician2@gmail.com";

  const setNote = (text, type = "") => {
    note.textContent = text;
    note.className = `form-note ${type}`.trim();
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#cName");
    const email = $("#cEmail");
    const msg = $("#cMsg");
    [name, email, msg].forEach((f) => f.classList.remove("invalid"));

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
    let valid = true;
    if (!name.value.trim()) { name.classList.add("invalid"); valid = false; }
    if (!emailOk) { email.classList.add("invalid"); valid = false; }
    if (!msg.value.trim()) { msg.classList.add("invalid"); valid = false; }

    if (!valid) {
      setNote("Vyplň prosím všechna pole správně.", "error");
      return;
    }

    const subject = encodeURIComponent(`Zpráva z portfolia od ${name.value.trim()}`);
    const body = encodeURIComponent(`${msg.value.trim()}\n\n— ${name.value.trim()} (${email.value.trim()})`);
    window.location.href = `mailto:${EMAIL}?subject=${subject}&body=${body}`;
    setNote("Otevírám e-mailového klienta…", "ok");
    form.reset();
  });

  /* ---------- Rok v patičce ---------- */
  $("#year").textContent = new Date().getFullYear();
})();
