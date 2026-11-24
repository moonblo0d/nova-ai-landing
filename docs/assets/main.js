// UI лендингу: навігація, поява блоків, демо-діалог, тарифи, форма. 3D підвантажується окремо.
const $ = (s) => document.querySelector(s);

// ---------- 3D (з запасним варіантом без WebGL) ----------
function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch { return false; }
}
if (hasWebGL()) {
  import("./scene.js")
    .then((m) => m.initScene($("#scene")))
    .catch(() => document.documentElement.classList.add("no-webgl"));
} else {
  document.documentElement.classList.add("no-webgl");
}

// ---------- Навігація ----------
const nav = $(".nav");
const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 30);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// ---------- Поява блоків ----------
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
  });
}, { threshold: 0.15 });
document.querySelectorAll(".reveal").forEach((el, i) => {
  el.style.transitionDelay = `${(i % 4) * 90}ms`;
  io.observe(el);
});

// ---------- Демо-діалог ----------
const script = [
  ["user", "Привіт! Можна записатися на стрижку на завтра зранку?"],
  ["bot", "Привіт! 👋 Звісно. Завтра є вільні вікна о 10:00, 11:30 і 12:00. Яка послуга: стрижка чи стрижка + борода?"],
  ["user", "Стрижка + борода, о 10"],
  ["bot", "Чудово! Стрижка + борода — 950 ₴, приблизно 80 хв. Підкажіть, будь ласка, ім'я та номер телефону для підтвердження."],
  ["user", "Андрій, 0501234567"],
  ["bot", "Готово, Андрію ✅ Записала вас на завтра о 10:00 до майстра Максима. Нагадаю за 2 години до візиту. До зустрічі!"],
  ["sys", "Заявка #128 передана в CRM · менеджер отримав сповіщення в Telegram"],
];
const chat = $("#chat");
const typingState = $("#typingState");
let runId = 0;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function playDialog() {
  const id = ++runId;
  chat.innerHTML = "";
  for (const [who, text] of script) {
    if (id !== runId) return;
    if (who === "bot") {
      typingState.textContent = "друкує…";
      const typing = document.createElement("div");
      typing.className = "typing";
      typing.innerHTML = "<i></i><i></i><i></i>";
      chat.appendChild(typing);
      chat.scrollTop = chat.scrollHeight;
      await wait(900 + text.length * 12);
      typing.remove();
      typingState.textContent = "онлайн";
    } else {
      await wait(who === "sys" ? 500 : 1100);
    }
    if (id !== runId) return;
    const el = document.createElement("div");
    el.className = `msg ${who}`;
    el.textContent = text;
    chat.appendChild(el);
    chat.scrollTop = chat.scrollHeight;
  }
}
const demoObserver = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) { playDialog(); demoObserver.disconnect(); }
}, { threshold: 0.4 });
demoObserver.observe($("#demo"));
$("#replay").addEventListener("click", playDialog);

// ---------- Тарифи ----------
document.querySelectorAll(".billing button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".billing button").forEach((b) => b.classList.toggle("active", b === btn));
    const period = btn.dataset.period;
    document.querySelectorAll(".cost span").forEach((el) => {
      const to = Number(el.dataset[period]);
      const from = Number(el.textContent.replace(/\D/g, ""));
      const start = performance.now();
      const step = (now) => {
        const p = Math.min((now - start) / 500, 1);
        el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))).toLocaleString("uk-UA");
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  });
});

// ---------- Форма (демо) ----------
$("#ctaForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const name = form.name.value.trim();
  const contact = form.contact.value.trim();
  form.name.classList.toggle("invalid", name.length < 2);
  form.contact.classList.toggle("invalid", contact.length < 5);
  if (name.length < 2 || contact.length < 5) {
    $("#formMsg").textContent = "Заповніть ім'я та контакт";
    return;
  }
  const btn = form.querySelector("button");
  btn.disabled = true;
  btn.textContent = "Надсилаємо…";
  await wait(700);
  $("#formMsg").textContent = `Дякуємо, ${name}! Демо-режим: у робочій версії заявка йде в CRM і менеджеру в Telegram.`;
  form.reset();
  btn.disabled = false;
  btn.textContent = "Отримати демо";
});
