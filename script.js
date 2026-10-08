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
    },
    onComplete: () => {
      document.body.classList.remove("locked");
      invitation.removeAttribute("aria-hidden");
      soundBtn.hidden = false;
      updateSound();
      animateHero();
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
  if (
    !window.gsap ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return;
  gsap
    .timeline()
    .from(".hero-logo", {
      opacity: 0,
      scale: 0.78,
      y: 25,
      duration: 1.3,
      ease: "power2.out",
    })
    .from(
      ".hero-names",
      { opacity: 0, y: 35, duration: 1.1, ease: "power2.out" },
      "-=.5",
    )
    .from(
      ".hero .reveal",
      { opacity: 0, y: 18, stagger: 0.16, duration: 0.7 },
      "-=.45",
    );
}
window.addEventListener("load", () => {
  if (
    !window.gsap ||
    !window.ScrollTrigger ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return;
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
});
