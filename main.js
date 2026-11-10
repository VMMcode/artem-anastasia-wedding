(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Появление при скролле ---------- */
  const REVEAL_SELECTOR = [
    ".title",
    ".text",
    ".btn",
    ".hero__title",
    ".hero__label",
    ".hero__heart",
    ".week__head",
    ".sticker",
    ".timeline__icon",
    ".timeline__time",
    ".timeline__name",
    ".timeline__desc",
    ".timer__item",
    ".wishes__img",
    ".farewell__heart",
    ".farewell__names",
  ].join(",");

  const OBSERVE_SELECTOR = `${REVEAL_SELECTOR}, .arrow, .polaroid, .dresscode__hearts, .hero__lettering`;

  document.querySelectorAll(REVEAL_SELECTOR).forEach((el) => el.classList.add("reveal"));

  if (reduceMotion || !("IntersectionObserver" in window)) {
    document.querySelectorAll(OBSERVE_SELECTOR).forEach((el) => el.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        let order = 0;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const isReveal = el.classList.contains("reveal");

          // небольшая лесенка для элементов, появляющихся одновременно
          if (isReveal) el.style.setProperty("--d", `${Math.min(order++, 5) * 0.09}s`);
          el.classList.add("is-visible");
          revealObserver.unobserve(el);

          // минус задержка, чтобы она не мешала hover-переходам
          if (isReveal) setTimeout(() => el.style.removeProperty("--d"), 2000);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    document.querySelectorAll(OBSERVE_SELECTOR).forEach((el) => revealObserver.observe(el));
  }

  /* ---------- 2. Неделя: кружок прыгает и останавливается на дате свадьбы ---------- */
  const week = document.querySelector(".week");
  if (week) {
    const list = week.querySelector(".week__list");
    const days = [...week.querySelectorAll(".week__day")];
    const targetIndex = days.findIndex((d) => d.classList.contains("week__day--active"));

    const marker = document.createElement("span");
    marker.className = "week__marker";
    marker.setAttribute("aria-hidden", "true");
    list.appendChild(marker);

    const placeMarker = (index, hop) => {
      const num = days[index].querySelector(".week__num");
      const listRect = list.getBoundingClientRect();
      const numRect = num.getBoundingClientRect();
      const x = numRect.left - listRect.left + (numRect.width - marker.offsetWidth) / 2;
      const y = numRect.top - listRect.top + (numRect.height - marker.offsetHeight) / 2;
      marker.style.setProperty("--hop", `${hop}ms`);
      marker.style.translate = `${x}px ${y}px`;
    };

    const light = (index) => {
      days.forEach((d, i) => d.classList.toggle("is-lit", i === index));
    };

    let current = targetIndex;
    let finished = false;

    const buildSequence = () => {
      const seq = [];
      for (let i = 0; i < days.length; i++) seq.push(i); // 1-я итерация: пн → вс
      for (let i = 0; i <= targetIndex; i++) seq.push(i); // 2-я: пн → день свадьбы
      return seq;
    };

    const finish = () => {
      finished = true;
      current = targetIndex;
      marker.classList.add("is-final");
    };

    const startHopping = () => {
      if (targetIndex < 0) return;

      if (reduceMotion) {
        placeMarker(targetIndex, 0);
        marker.classList.add("is-on");
        light(targetIndex);
        finish();
        return;
      }

      const seq = buildSequence();
      let step = 0;
      let delay = 170;

      // первое появление без перелёта
      placeMarker(seq[0], 0);
      light(seq[0]);
      current = seq[0];
      requestAnimationFrame(() => marker.classList.add("is-on"));

      const hop = () => {
        step += 1;
        if (step >= seq.length) {
          finish();
          return;
        }
        const isLast = step === seq.length - 1;
        current = seq[step];
        marker.classList.toggle("is-landing", isLast);
        placeMarker(current, Math.min(delay * 0.75, isLast ? 520 : 300));
        light(current);
        if (isLast) {
          setTimeout(finish, 520);
          return;
        }
        if (step >= days.length) delay *= 1.18; // замедление только на втором круге
        setTimeout(hop, delay);
      };

      setTimeout(hop, delay);
    };

    if ("IntersectionObserver" in window) {
      const weekObserver = new IntersectionObserver(
        (entries, obs) => {
          if (entries.some((e) => e.isIntersecting)) {
            obs.disconnect();
            startHopping();
          }
        },
        { threshold: 0.7 }
      );
      weekObserver.observe(week);
    } else {
      startHopping();
    }

    window.addEventListener("resize", () => {
      if (marker.classList.contains("is-on")) placeMarker(finished ? targetIndex : current, 0);
    });
  }

  /* ---------- 3. Таймер обратного отсчёта ---------- */
  const timer = document.querySelector(".timer");
  if (timer && timer.dataset.date) {
    const target = new Date(timer.dataset.date).getTime();

    if (!Number.isNaN(target)) {
      const UNITS = {
        days: ["день", "дня", "дней"],
        hours: ["час", "часа", "часов"],
        minutes: ["минута", "минуты", "минут"],
        seconds: ["секунда", "секунды", "секунд"],
      };

      const plural = (n, [one, few, many]) => {
        const mod10 = n % 10;
        const mod100 = n % 100;
        if (mod10 === 1 && mod100 !== 11) return one;
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
        return many;
      };

      const cells = {};
      Object.keys(UNITS).forEach((unit) => {
        const item = timer.querySelector(`[data-unit="${unit}"]`);
        if (item) {
          cells[unit] = {
            num: item.querySelector(".timer__num"),
            label: item.querySelector(".timer__label"),
          };
        }
      });

      const render = (animate) => {
        const diff = Math.max(0, target - Date.now());
        const values = {
          days: Math.floor(diff / 86400000),
          hours: Math.floor((diff % 86400000) / 3600000),
          minutes: Math.floor((diff % 3600000) / 60000),
          seconds: Math.floor((diff % 60000) / 1000),
        };

        Object.keys(cells).forEach((unit) => {
          const { num, label } = cells[unit];
          const text = String(values[unit]).padStart(2, "0");
          if (num.textContent !== text) {
            num.textContent = text;
            if (animate && !reduceMotion) {
              num.classList.remove("is-tick");
              void num.offsetWidth; // перезапуск анимации
              num.classList.add("is-tick");
            }
          }
          const word = plural(values[unit], UNITS[unit]);
          if (label.textContent !== word) label.textContent = word;
        });

        return diff;
      };

      const loop = () => {
        const diff = render(true);
        if (diff > 0) setTimeout(loop, 1000 - (Date.now() % 1000) + 5);
      };

      render(false);
      setTimeout(loop, 1000 - (Date.now() % 1000) + 5);

      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) render(false);
      });
    }
  }

  /* ---------- 4. Тайминг: подсветка активного этапа ---------- */
const stages = [...document.querySelectorAll(".timeline__item")];
if (stages.length) {
  if (reduceMotion || !("IntersectionObserver" in window)) {
    stages.forEach((s) => s.classList.add("is-active"));
  } else {
    const inBand = new Set();
    let active = null;

    const updateActive = () => {
      if (!inBand.size) return; // между этапами остаётся предыдущий активный
      const center = window.innerHeight / 2;
      let best = null;
      let bestDist = Infinity;
      inBand.forEach((el) => {
        const r = el.getBoundingClientRect();
        const dist = Math.abs(r.top + r.height / 2 - center);
        if (dist < bestDist) {
          best = el;
          bestDist = dist;
        }
      });
      if (best && best !== active) {
        if (active) active.classList.remove("is-active");
        best.classList.add("is-active");
        active = best;
      }
    };

    const stageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => (e.isIntersecting ? inBand.add(e.target) : inBand.delete(e.target)));
        updateActive();
      },
      { rootMargin: "-35% 0px -35% 0px" } // «полоса» в центре экрана высотой 30%
    );

    stages.forEach((s) => stageObserver.observe(s));
  }
}
})();