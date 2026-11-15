const audio = document.getElementById("music");
const soundBtn = document.getElementById("soundBtn");
const soundIcon = document.getElementById("soundIcon");
const soundText = document.getElementById("soundText");
function updateSound() {
  const silent = audio.muted || audio.paused;
  soundIcon.textContent = silent ? "♪̸" : "♫";
  soundText.textContent = silent ? "Ativar som" : "Silenciar";
  soundBtn.setAttribute(
    "aria-label",
    silent ? "Ativar música" : "Silenciar música",
  );
  soundBtn.setAttribute("aria-pressed", String(silent));
}
soundBtn.addEventListener("click", () => {
  if (audio.paused) {
    audio.muted = false;
    audio.play().catch(() => {});
  } else {
    audio.muted = !audio.muted;
  }
  updateSound();
});
function initEnvelope() {
  const overlay = document.querySelector(".lg-envelope-root");
  const invitation = document.getElementById("invitation");
  if (!window.gsap || !window.LGEnvelope) {
    overlay?.remove();
    document.body.classList.remove("locked");
    invitation.removeAttribute("aria-hidden");
    soundBtn.hidden = false;
    gsapRevealAll();
    return;
  }
  LGEnvelope.init({
    heroSelector: "#inicio",
    assets: {
      envelope: "assets/envelope-sem-selo.png",
      seal: "assets/selo-lg.png",
    },
    heroPushIn: 1.025,
    onOpen: () => {
      audio.volume = 0.65;
      audio.muted = false;
      audio.play().catch(() => {
        updateSound();
      });
    },
    onHeroReveal: () => {
      invitation.removeAttribute("aria-hidden");
      animateHero();
    },
    onComplete: () => {
      document.body.classList.remove("locked");
      invitation.removeAttribute("aria-hidden");
      soundBtn.hidden = false;
      updateSound();
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    },
  });
}
initEnvelope();
const weddingTime = new Date("2026-11-29T13:00:00-03:00").getTime();
function countdown() {
  const diff = Math.max(0, weddingTime - Date.now());
  const parts = [
    Math.floor(diff / 86400000),
    Math.floor(diff / 3600000) % 24,
    Math.floor(diff / 60000) % 60,
    Math.floor(diff / 1000) % 60,
  ];
  ["days", "hours", "minutes", "seconds"].forEach(
    (id, i) =>
      (document.getElementById(id).textContent = String(parts[i]).padStart(
        2,
        "0",
      )),
  );
  document.getElementById("countdownEnd").hidden = diff !== 0;
}
countdown();
setInterval(countdown, 1000);
function animateHero() {
  if (!window.gsap || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    gsapRevealAll();
    return;
  }
  if (animateHero.started) return;
  animateHero.started = true;
  gsap
    .timeline()
    .to(".hero-logo", {
      autoAlpha: 1,
      scale: 1,
      y: 0,
      duration: 1.3,
      ease: "power2.out",
    })
    .fromTo(
      ".hero-names",
      { autoAlpha: 0, y: 35 },
      { autoAlpha: 1, y: 0, duration: 1.1, ease: "power2.out" },
      "-=.5",
    )
    .fromTo(
      ".hero .reveal",
      { autoAlpha: 0, y: 18 },
      { autoAlpha: 1, y: 0, stagger: 0.16, duration: 0.7 },
      "-=.45",
    );
}
function gsapRevealAll() {
  document.body.classList.remove("js-motion");
}
window.addEventListener("load", () => {
  if (
    !window.gsap ||
    !window.ScrollTrigger ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    gsapRevealAll();
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  gsap.utils.toArray(".section:not(.hero) .reveal").forEach((el) => {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: "top 92%", once: true },
      opacity: 0,
      y: 28,
      duration: 0.85,
      ease: "power2.out",
    });
  });
  gsap.timeline({
    scrollTrigger: { trigger: "#links", start: "top 88%", once: true }
  })
    .fromTo(".interactions-eyebrow", { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.65, ease: "power2.out" })
    .fromTo(".interactions-title", { autoAlpha: 0, y: 25 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: "power2.out" }, "-=0.35")
    .fromTo(".link-card", { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.75, stagger: 0.13, ease: "power2.out" }, "-=0.35");
});
