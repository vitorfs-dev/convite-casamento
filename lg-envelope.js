/*!
 * LG Envelope — abertura cinematográfica (Larissa & Gabriel)
 * Requer GSAP 3.x (core) carregado antes. Sem outras dependências.
 *
 *   var invite = LGEnvelope.init({
 *     heroSelector: '#hero',
 *     assets: { envelope: '/img/envelope-sem-selo.png', seal: '/img/selo-lg.png' }
 *   });
 *   invite.destroy();   // limpeza manual, se necessário
 */
(function (root) {
  "use strict";

  var DEFAULTS = {
    rootSelector: ".lg-envelope-root",
    heroSelector: "[data-lg-hero]", // <- informe o seletor da hero existente
    assets: {
      envelope: "assets/envelope-sem-selo.png",
      seal: "assets/selo-lg.png",
    },
    gsap: null, // usa window.gsap se omitido
    lockScroll: true,
    removeOnComplete: true,
    heroPushIn: 1.04, // escala inicial da hero (1 = desliga)
    readyTimeout: 4000,
    onOpen: null, // clique em "Abrir convite"
    onHeroReveal: null, // instante em que o papel começa a virar a hero
    onComplete: null,
    // tempos (s) medidos no vídeo de referência, relativos ao clique
    t: {
      ui: 0.45,
      sealLift: 0.35,
      sealDissolve: 1.25,
      doors: 1.7,
      doorsDur: 2.6,
      expand: 4.8,
      expandDur: 1.5,
      fade: 5.55,
      fadeDur: 0.75,
    },
  };

  function merge(base, extra) {
    var out = {},
      k;
    for (k in base) out[k] = base[k];
    for (k in extra || {}) {
      out[k] =
        extra[k] &&
        typeof extra[k] === "object" &&
        !Array.isArray(extra[k]) &&
        base[k] &&
        typeof base[k] === "object"
          ? merge(base[k], extra[k])
          : extra[k];
    }
    return out;
  }

  function init(userOptions) {
    var o = merge(DEFAULTS, userOptions);
    var gsap = o.gsap || root.gsap;
    var el = document.querySelector(o.rootSelector);
    if (!el) {
      console.warn("[LGEnvelope] root não encontrado:", o.rootSelector);
      return null;
    }

    var q = function (s) {
      return el.querySelector(s);
    };
    var sheet = q(".lg-envelope-sheet"),
      stage = q(".lg-envelope-stage"),
      drop = q(".lg-envelope-drop");
    var doorL = q(".lg-envelope-door--left"),
      doorR = q(".lg-envelope-door--right");
    var doorShades = el.querySelectorAll(".lg-envelope-door-shade");
    var shL = q(".lg-envelope-shade--left"),
      shR = q(".lg-envelope-shade--right"),
      shC = q(".lg-envelope-shade--center");
    var seal = q(".lg-envelope-seal"),
      sealImg = q(".lg-envelope-seal-img"),
      sealShadow = q(".lg-envelope-seal-shadow");
    var ui = q(".lg-envelope-curved-text");

    var goldGradient = q("#lg-gold-gradient");
    var goldAnimation = null;

    if (goldGradient) {
      goldAnimation = gsap.fromTo(
        goldGradient,
        {
          attr: { x1: "-100%", x2: "0%" },
        },
        {
          attr: { x1: "100%", x2: "200%" },
          duration: 4,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        },
      );
    }

    var hero = document.querySelector(o.heroSelector);
    if (!hero)
      console.warn(
        "[LGEnvelope] hero não encontrada:",
        o.heroSelector,
        "— a animação roda, mas não há o que revelar.",
      );

    var state = {
      ready: false,
      busy: false,
      done: false,
      destroyed: false,
      expanding: false,
    };
    var tl = null,
      readyTimer = null,
      prevOverflow = null;
    var listeners = [];
    function on(target, type, fn, opts) {
      target.addEventListener(type, fn, opts);
      listeners.push([target, type, fn, opts]);
    }

    /* ---------- assets ---------- */
    doorL.style.setProperty(
      "--lg-envelope-img",
      'url("' + o.assets.envelope + '")',
    );
    doorR.style.setProperty(
      "--lg-envelope-img",
      'url("' + o.assets.envelope + '")',
    );
    sealImg.src = o.assets.seal;

    function decoded(src) {
      return new Promise(function (res) {
        var i = new Image();
        i.onload = i.onerror = function () {
          res();
        };
        i.src = src;
        if (i.decode) i.decode().then(res, res);
      });
    }
    var ready = Promise.race([
      Promise.all([decoded(o.assets.envelope), decoded(o.assets.seal)]),
      new Promise(function (res) {
        readyTimer = setTimeout(res, o.readyTimeout);
      }),
    ]).then(function () {
      if (!state.destroyed) {
        state.ready = true;
        el.classList.add("lg-envelope-is-ready");
        try {
          el.focus({ preventScroll: true });
        } catch (e) {}
      }
    });

    /* ---------- bloqueio de scroll ---------- */
    function lock() {
      if (!o.lockScroll) return;
      try {
        if ("scrollRestoration" in history)
          history.scrollRestoration = "manual";
      } catch (e) {}
      root.scrollTo(0, 0);
      prevOverflow = [
        document.documentElement.style.overflow,
        document.body.style.overflow,
      ];
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    }
    function unlock() {
      if (!o.lockScroll || !prevOverflow) return;
      document.documentElement.style.overflow = prevOverflow[0];
      document.body.style.overflow = prevOverflow[1];
      prevOverflow = null;
    }
    lock();

    /* ---------- janela do papel (clip-path) ---------- */
    function measure() {
      var r = stage.getBoundingClientRect(),
        w = root.innerWidth,
        h = root.innerHeight;
      // 1px para dentro: evita vazamento de papel nas bordas das abas fechadas
      return {
        t: r.top + 1,
        r: w - r.right + 1,
        b: h - r.bottom + 1,
        l: r.left + 1,
      };
    }
    function setClip(from, p) {
      var k = 1 - p,
        rad = (2 * k).toFixed(2) + "px";
      sheet.style.clipPath =
        "inset(" +
        (from.t * k).toFixed(2) +
        "px " +
        (from.r * k).toFixed(2) +
        "px " +
        (from.b * k).toFixed(2) +
        "px " +
        (from.l * k).toFixed(2) +
        "px round " +
        rad +
        ")";
    }
    var rect0 = measure();
    setClip(rect0, 0);
    function onResize() {
      if (!state.expanding && !state.done) {
        rect0 = measure();
        setClip(rect0, 0);
      }
    }
    on(root, "resize", onResize);

    /* ---------- foco preso ao botão enquanto o overlay existe ---------- */
    on(el, "keydown", function (e) {
      if (e.key === "Tab") e.preventDefault();
    });

    /* ---------- cena inicial (estado base das camadas) ---------- */
    gsap.set(seal, { transformOrigin: "50% 50%" });
    gsap.set([doorL, doorR], { rotateY: 0, transformPerspective: 0 });
    gsap.set([shL, shR, shC, doorShades], { opacity: 0 });

    /* ---------- timeline ---------- */
    function build() {
      var T = o.t,
        reduce =
          root.matchMedia &&
          root.matchMedia("(prefers-reduced-motion: reduce)").matches;
      var line = gsap.timeline({
        onComplete: finish,
        defaults: { overwrite: "auto" },
      });

      line.to(ui, { opacity: 0, duration: T.ui, ease: "power2.out" }, 0);

      if (reduce) {
        // sem 3D: só dissolve
        line
          .call(heroReveal, null, 0.2)
          .to(el, { opacity: 0, duration: 0.7, ease: "power1.inOut" }, 0.2);
        return line;
      }

      var prog = { p: 0 };
      var rotDir = 1;

      // 1) selo "levanta" (sombra se afasta) e depois se dissolve
      line
        .to(
          seal,
          { scale: 1.07, y: -4, duration: 0.9, ease: "power2.out" },
          T.sealLift,
        )
        .to(
          sealShadow,
          {
            scale: 1.28,
            y: 9,
            opacity: 0.9,
            duration: 0.9,
            ease: "power2.out",
          },
          T.sealLift,
        )
        .to(
          seal,
          {
            opacity: 0,
            scale: 1.15,
            filter: "blur(2px)",
            duration: 0.7,
            ease: "power1.in",
          },
          T.sealDissolve,
        );

      // 2) abas giram em torno das bordas externas, em direção ao observador
      line
        .to(
          doorL,
          { rotateY: -95 * rotDir, duration: T.doorsDur, ease: "power1.inOut" },
          T.doors,
        )
        .to(
          doorR,
          { rotateY: 95 * rotDir, duration: T.doorsDur, ease: "power1.inOut" },
          T.doors,
        )
        .to(
          doorShades,
          { opacity: 1, duration: T.doorsDur * 0.8, ease: "power1.in" },
          T.doors,
        );

      // 3) sombras projetadas no papel: fenda central escura -> laterais -> suaves
      line
        .to(
          shC,
          { opacity: 1, duration: 0.45, ease: "power1.out" },
          T.doors + 0.05,
        )
        .to(
          shC,
          { opacity: 0, duration: 1.7, ease: "power1.inOut" },
          T.doors + 0.6,
        )
        .to(
          [shL, shR],
          { opacity: 1, duration: 1.5, ease: "power1.inOut" },
          T.doors + 0.25,
        )
        .to(
          [shL, shR],
          { opacity: 0.18, duration: 1.2, ease: "power1.inOut" },
          T.doors + 1.85,
        );

      // 4) o papel cresce da janela do envelope até a viewport; a hero entra por baixo
      line
        .add(function () {
          state.expanding = true;
          rect0 = measure();
          heroReveal();
        }, T.expand)
        .to(
          prog,
          {
            p: 1,
            duration: T.expandDur,
            ease: "power3.inOut",
            onUpdate: function () {
              setClip(rect0, prog.p);
            },
          },
          T.expand,
        )
        .to(
          [shL, shR, drop, doorShades],
          { opacity: 0, duration: 0.7, ease: "power1.out" },
          T.expand,
        );

      if (hero && o.heroPushIn !== 1) {
        line
          .set(
            hero,
            {
              scale: o.heroPushIn,
              transformOrigin: "50% " + Math.round(root.innerHeight / 2) + "px",
              willChange: "transform",
            },
            0,
          )
          .to(
            hero,
            { scale: 1, duration: T.expandDur + 0.6, ease: "power2.out" },
            T.expand,
          );
      }

      // 5) papel (já em tela cheia) dissolve sobre a hero
      line.to(
        el,
        { opacity: 0, duration: T.fadeDur, ease: "power1.inOut" },
        T.fade,
      );
      return line;
    }

    var revealed = false;
    function heroReveal() {
      if (revealed) return;
      revealed = true;
      document.dispatchEvent(
        new CustomEvent("lg-envelope:hero-reveal", { detail: { hero: hero } }),
      );
      if (typeof o.onHeroReveal === "function") o.onHeroReveal(hero);
    }

    /* ---------- ações ---------- */
    function open() {
      if (state.busy || state.done || state.destroyed || !state.ready) return;
      state.busy = true;
      el.setAttribute("aria-busy", "true");
      root.scrollTo(0, 0);
      document.dispatchEvent(new CustomEvent("lg-envelope:open"));
      if (typeof o.onOpen === "function") o.onOpen();
      tl = build();
    }
    on(el, "click", open);
    el.setAttribute("tabindex", "0");
    on(el, "keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });

    function finish() {
      if (state.done) return;
      state.done = true;
      state.busy = false;
      if (hero) {
        gsap.set(hero, {
          clearProps: "transform,transformOrigin,scale,willChange",
        });
      }
      unlock();
      document.dispatchEvent(new CustomEvent("lg-envelope:complete"));
      if (typeof o.onComplete === "function") o.onComplete();
      if (o.removeOnComplete) destroy();
    }

    function destroy() {
      if (state.destroyed) return;
      state.destroyed = true;
      clearTimeout(readyTimer);
      if (tl) tl.kill();

      // Encerra a animação dourada quando o envelope é removido
      if (goldAnimation) goldAnimation.kill();
      gsap.killTweensOf(
        [el, seal, sealShadow, doorL, doorR, shL, shR, shC, drop, ui, hero]
          .concat([].slice.call(doorShades))
          .filter(Boolean),
      );
      listeners.forEach(function (l) {
        l[0].removeEventListener(l[1], l[2], l[3]);
      });
      listeners = [];
      if (!state.done) {
        if (hero)
          gsap.set(hero, {
            clearProps: "transform,transformOrigin,scale,willChange",
          });
        unlock();
      }
      if (el.parentNode) el.parentNode.removeChild(el);
    }

    return {
      open: open,
      destroy: destroy,
      ready: ready,
      get timeline() {
        return tl;
      },
    };
  }

  root.LGEnvelope = { init: init, defaults: DEFAULTS };
})(typeof window !== "undefined" ? window : this);
