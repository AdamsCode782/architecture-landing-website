(function (global) {
  "use strict";

  // ---------- small helpers ----------
  const toNodes = (input) => {
    if (!input) return [];
    if (typeof input === "string") return Array.from(document.querySelectorAll(input));
    if (input instanceof Element || input === window || input === document) return [input];
    if (NodeList.prototype.isPrototypeOf(input) || Array.isArray(input)) return Array.from(input);
    return [];
  };

  const parseBoolAttr = (el, name, fallback = false) => {
    if (!el) return fallback;
    if (!el.hasAttribute(name)) return fallback;
    const val = el.getAttribute(name);
    if (val === "" || val === null) return true;
    return /^(true|1)$/i.test(val);
  };
  const parseNumAttr = (el, name, fallback) => {
    if (!el) return fallback;
    const v = el.getAttribute(name);
    if (v === null || v === undefined) return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const offset = (el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left + window.pageXOffset, top: r.top + window.pageYOffset };
  };

  // ---------- per-element instance factory ----------
  function makeInstance(el, opts = {}) {
    if (el.__vanilla_tilt__) return el.__vanilla_tilt__; // already created

    // merge settings: data-attrs override defaults, explicit opts override attrs
    const settings = {
      maxTilt: parseNumAttr(el, "data-tilt-max", 20),
      perspective: parseNumAttr(el, "data-tilt-perspective", 300),
      easing: el.getAttribute("data-tilt-easing") || "cubic-bezier(.03,.98,.52,.99)",
      scale: el.hasAttribute("data-tilt-scale") ? parseFloat(el.getAttribute("data-tilt-scale")) : 1,
      speed: parseNumAttr(el, "data-tilt-speed", 400),
      transition: el.hasAttribute("data-tilt-transition") ? parseBoolAttr(el, "data-tilt-transition", true) : true,
      disableAxis: el.getAttribute("data-tilt-disable-axis") || null,
      axis: el.getAttribute("data-tilt-axis") || null,
      reset: el.hasAttribute("data-tilt-reset") ? parseBoolAttr(el, "data-tilt-reset", true) : true,
      glare: el.hasAttribute("data-tilt-glare") ? parseBoolAttr(el, "data-tilt-glare", false) : false,
      glarePrerender: el.hasAttribute("data-tilt-glare-prerender") ? parseBoolAttr(el, "data-tilt-glare-prerender", false) : false,
      maxGlare: parseNumAttr(el, "data-tilt-maxglare", 1),
      ...opts,
    };

    // backward compat
    if (settings.axis !== null) {
      console.warn("Tilt.js: the axis setting has been renamed to disableAxis.");
      settings.disableAxis = settings.axis;
    }

    const state = {
      settings,
      mouse: { x: 0, y: 0 },
      ticking: false,
      transforms: { tiltX: 0, tiltY: 0, percentageX: 50, percentageY: 50, angle: 0 },
      reset: false,
      timeoutId: null,
      handlers: [],
      glare: { wrapper: null, inner: null },
    };

    // ensure container can have absolutely positioned glare
    if (getComputedStyle(el).position === "static") {
      el.style.position = "relative";
    }

    // ---------- glare (if enabled) ----------
    function prepareGlare() {
      if (!state.settings.glare) return;
      if (state.settings.glarePrerender) {
        state.glare.wrapper = el.querySelector(".js-tilt-glare");
        state.glare.inner = state.glare.wrapper && state.glare.wrapper.querySelector(".js-tilt-glare-inner");
        return;
      }
      const wrapper = document.createElement("div");
      wrapper.className = "js-tilt-glare";
      const inner = document.createElement("div");
      inner.className = "js-tilt-glare-inner";
      wrapper.appendChild(inner);
      el.appendChild(wrapper);
      state.glare.wrapper = wrapper;
      state.glare.inner = inner;

      // minimal inline styles so the effect works without external CSS
      Object.assign(wrapper.style, {
        position: "absolute",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        pointerEvents: "none",
      });
      Object.assign(inner.style, {
        position: "absolute",
        top: "50%",
        left: "50%",
        "backgroundImage": "linear-gradient(0deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 100%)",
        transform: "rotate(180deg) translate(-50%, -50%)",
        transformOrigin: "0 0",
        opacity: "0",
      });

      updateGlareSize();
    }

    function updateGlareSize() {
      if (!state.glare.inner) return;
      const w = el.getBoundingClientRect().width;
      state.glare.inner.style.width = `${w * 2}px`;
      state.glare.inner.style.height = `${w * 2}px`;
    }

    // ---------- mouse math ----------
    function getMousePositions(e) {
      if (!e || typeof e.pageX === "undefined") {
        const o = offset(el);
        const r = el.getBoundingClientRect();
        return { x: o.left + r.width / 2, y: o.top + r.height / 2 };
      }
      return { x: e.pageX, y: e.pageY };
    }

    function getValues() {
      const rect = el.getBoundingClientRect();
      const o = offset(el);
      const percentageX = (state.mouse.x - o.left) / rect.width;
      const percentageY = (state.mouse.y - o.top) / rect.height;

      const tiltX = (state.settings.maxTilt / 2 - percentageX * state.settings.maxTilt).toFixed(2);
      const tiltY = (percentageY * state.settings.maxTilt - state.settings.maxTilt / 2).toFixed(2);

      const angle =
        Math.atan2(
          state.mouse.x - (o.left + rect.width / 2),
          -(state.mouse.y - (o.top + rect.height / 2))
        ) *
        (180 / Math.PI);

      return {
        tiltX,
        tiltY,
        percentageX: percentageX * 100,
        percentageY: percentageY * 100,
        angle,
      };
    }

    function updateTransforms() {
      state.transforms = getValues();

      if (state.reset) {
        state.reset = false;
        el.style.transform = `perspective(${state.settings.perspective}px) rotateX(0deg) rotateY(0deg)`;
        if (state.settings.glare && state.glare.inner) {
          state.glare.inner.style.transform = `rotate(180deg) translate(-50%, -50%)`;
          state.glare.inner.style.opacity = "0";
        }
        state.ticking = false;
        return;
      }

      const rotateX = state.settings.disableAxis === "x" ? 0 : state.transforms.tiltY;
      const rotateY = state.settings.disableAxis === "y" ? 0 : state.transforms.tiltX;

      el.style.transform = `perspective(${state.settings.perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${state.settings.scale},${state.settings.scale},${state.settings.scale})`;

      if (state.settings.glare && state.glare.inner) {
        state.glare.inner.style.transform = `rotate(${state.transforms.angle}deg) translate(-50%, -50%)`;
        state.glare.inner.style.opacity = `${(state.transforms.percentageY * state.settings.maxGlare) / 100}`;
      }

      // emit change event with transforms
      el.dispatchEvent(new CustomEvent("change", { detail: state.transforms }));

      state.ticking = false;
    }

    function requestTick() {
      if (state.ticking) return;
      requestAnimationFrame(updateTransforms);
      state.ticking = true;
    }

    // ---------- transitions ----------
    function setTransition() {
      if (state.timeoutId) clearTimeout(state.timeoutId);
      el.style.transition = `${state.settings.speed}ms ${state.settings.easing}`;
      if (state.settings.glare && state.glare.inner) {
        state.glare.inner.style.transition = `opacity ${state.settings.speed}ms ${state.settings.easing}`;
      }
      // clear transition after a moment so mousemove isn't slowed
      state.timeoutId = setTimeout(() => {
        el.style.transition = "";
        if (state.settings.glare && state.glare.inner) state.glare.inner.style.transition = "";
      }, state.settings.speed);
    }

    // ---------- event handlers ----------
    const onMouseEnter = (e) => {
      state.ticking = false;
      el.style.willChange = "transform";
      setTransition();
      el.dispatchEvent(new CustomEvent("tilt.mouseEnter"));
    };

    const onMouseMove = (e) => {
      state.mouse = getMousePositions(e);
      requestTick();
    };

    const onMouseLeave = (e) => {
      setTransition();
      state.reset = true;
      requestTick();
      el.dispatchEvent(new CustomEvent("tilt.mouseLeave"));
    };

    // ---------- init ----------
    prepareGlare();

    // store listeners so we can remove them on destroy
    el.addEventListener("mouseenter", onMouseEnter);
    el.addEventListener("mousemove", onMouseMove);
    if (state.settings.reset) el.addEventListener("mouseleave", onMouseLeave);
    if (state.settings.glare) {
      window.addEventListener("resize", updateGlareSize);
      state.handlers.push({ target: window, type: "resize", fn: updateGlareSize });
    }
    state.handlers.push({ target: el, type: "mouseenter", fn: onMouseEnter });
    state.handlers.push({ target: el, type: "mousemove", fn: onMouseMove });
    if (state.settings.reset) state.handlers.push({ target: el, type: "mouseleave", fn: onMouseLeave });

    // set initial center so getValues() returns center before first move
    state.mouse = getMousePositions();

    // expose control methods via element property
    const instance = {
      destroy() {
        // remove glare if created
        if (state.glare.wrapper && state.glare.wrapper.parentNode) state.glare.wrapper.parentNode.removeChild(state.glare.wrapper);
        // remove handlers
        state.handlers.forEach(({ target, type, fn }) => target.removeEventListener(type, fn));
        // clear styles
        el.style.willChange = "";
        el.style.transform = "";
        if (state.timeoutId) clearTimeout(state.timeoutId);
        delete el.__vanilla_tilt__;
      },
      getValues() {
        // ensure center fallback if no mouse recorded
        state.mouse = state.mouse && state.mouse.x && state.mouse.y ? state.mouse : getMousePositions();
        return getValues();
      },
      reset() {
        setTransition();
        state.reset = true;
        requestAnimationFrame(() => {
          el.style.transform = `perspective(${state.settings.perspective}px) rotateX(0deg) rotateY(0deg)`;
          if (state.settings.glare && state.glare.inner) {
            state.glare.inner.style.transform = `rotate(180deg) translate(-50%, -50%)`;
            state.glare.inner.style.opacity = "0";
          }
        });
        setTimeout(() => (state.reset = false), state.settings.transition ? state.settings.speed : 0);
      },
    };

    el.__vanilla_tilt__ = instance;
    return instance;
  }

  // ---------- public API ----------
  const Tilt = {
    init(selectorOrElement, options) {
      const nodes = selectorOrElement ? toNodes(selectorOrElement) : Array.from(document.querySelectorAll("[data-tilt]"));
      nodes.forEach((el) => makeInstance(el, options));
    },

    destroy(selectorOrElement) {
      const nodes = selectorOrElement ? toNodes(selectorOrElement) : Array.from(document.querySelectorAll("[data-tilt]"));
      nodes.forEach((el) => {
        if (el.__vanilla_tilt__ && el.__vanilla_tilt__.destroy) el.__vanilla_tilt__.destroy();
      });
    },

    getValues(selectorOrElement) {
      const nodes = selectorOrElement ? toNodes(selectorOrElement) : Array.from(document.querySelectorAll("[data-tilt]"));
      return nodes.map((el) => (el.__vanilla_tilt__ ? el.__vanilla_tilt__.getValues() : null));
    },

    reset(selectorOrElement) {
      const nodes = selectorOrElement ? toNodes(selectorOrElement) : Array.from(document.querySelectorAll("[data-tilt]"));
      nodes.forEach((el) => el.__vanilla_tilt__ && el.__vanilla_tilt__.reset());
    },
  };

  // auto-init
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => Tilt.init());
  } else {
    Tilt.init();
  }

  // expose globally for debugging & control
  global.Tilt = Tilt;
})(typeof window !== "undefined" ? window : this);
