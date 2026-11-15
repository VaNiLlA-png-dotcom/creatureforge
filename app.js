"use strict";

(() => {
  // Habitat and resident data are kept separate from rendering so future habitats
  // and creature types can supply their own objects and routines.
  const habitat = {
    id: "hidden-grotto",
    bounds: { minX: 100, maxX: 900, minY: 390, maxY: 485 },
    water: { x: 490, y: 493 },
    objects: {
      shelter: { name: "stone shelter", x: 750, y: 449 },
      fern: { name: "fern", x: 190, y: 447 },
      rock: { name: "mossy rock", x: 600, y: 472 }
    }
  };
  const creature = {
    position: { x: 340, y: 455 },
    wellbeing: { energy: 85, hydration: 85, enrichment: 75 },
    routine: ["explore", "drink", "explore", "rest", "shelter"],
    routineIndex: -1,
    action: null
  };
  const storageKey = "pocket-wilds.hidden-grotto.objects.v1";
  const defaults = Object.fromEntries(Object.entries(habitat.objects).map(([id, object]) => [id, { x: object.x, y: object.y }]));
  const svg = document.querySelector("#habitat");
  const dragon = document.querySelector("#dragon");
  const enrichmentArt = document.querySelector("#enrichment-art");
  const gnome = document.querySelector("#gnome-art");
  const select = document.querySelector("#object-select");
  const activity = document.querySelector("#dragon-activity");
  const detail = document.querySelector("#dragon-detail");
  const saveStatus = document.querySelector("#save-status");
  const objectElements = Object.fromEntries(Object.keys(habitat.objects).map(id => [id, document.querySelector(`#object-${id}`)]));
  const meters = Object.fromEntries(Object.keys(creature.wellbeing).map(id => [id, document.querySelector(`#${id}`)]));
  const meterLabels = Object.fromEntries(Object.keys(creature.wellbeing).map(id => [id, document.querySelector(`#${id}-label`)]));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  let selected = "shelter";
  let drag = null;
  let previousTime = null;
  let elapsed = 0;
  let gnomeElapsed = 0;
  let gnomeIndex = -1;

  function boundedPosition(x, y) {
    const b = habitat.bounds;
    return { x: clamp(x, b.minX, b.maxX), y: clamp(y, b.minY, b.maxY) };
  }

  function loadPositions() {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;
      const positions = JSON.parse(saved);
      for (const id of Object.keys(habitat.objects)) {
        const position = positions?.[id];
        if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) {
          throw new Error("Invalid saved object positions");
        }
      }
      for (const id of Object.keys(habitat.objects)) {
        Object.assign(habitat.objects[id], boundedPosition(positions[id].x, positions[id].y));
      }
    } catch (error) {
      console.warn("Could not load habitat positions:", error);
      saveStatus.textContent = "Saved object positions could not be loaded. The default layout is shown.";
    }
  }

  function savePositions() {
    try {
      const positions = Object.fromEntries(Object.entries(habitat.objects).map(([id, object]) => [id, { x: object.x, y: object.y }]));
      localStorage.setItem(storageKey, JSON.stringify(positions));
      saveStatus.textContent = "";
    } catch (error) {
      console.warn("Could not save habitat positions:", error);
      saveStatus.textContent = "This browser could not save the layout; changes will last for this visit only.";
    }
  }

  function renderObjects() {
    for (const [id, object] of Object.entries(habitat.objects)) {
      objectElements[id].setAttribute("transform", `translate(${object.x} ${object.y})`);
      objectElements[id].classList.toggle("selected", id === selected);
      objectElements[id].setAttribute("aria-label", `${object.name}, ${id === selected ? "selected. " : ""}Use arrow keys to move.`);
    }
    select.value = selected;
  }

  function selectObject(id) {
    if (!Object.hasOwn(habitat.objects, id)) return;
    selected = id;
    renderObjects();
  }

  function updateObject(id, x, y) {
    Object.assign(habitat.objects[id], boundedPosition(x, y));
    renderObjects();
  }

  function setAction(kind, target, title, description, duration) {
    creature.action = { kind, target, title, description, duration, remaining: duration, arrived: false };
    enrichmentArt.setAttribute("visibility", kind === "enrichment" ? "visible" : "hidden");
    activity.textContent = title;
    detail.textContent = description;
  }

  function investigate(id) {
    const object = habitat.objects[id];
    setAction("investigate", boundedPosition(object.x - 55, object.y + 12), `Curious about the ${object.name}`,
      "The dragon is going over to investigate the change.", 4);
  }

  function nextRoutine() {
    creature.routineIndex = (creature.routineIndex + 1) % creature.routine.length;
    const kind = creature.routine[creature.routineIndex];
    if (kind === "drink") {
      setAction(kind, habitat.water, "Time for a drink", "The dragon visits the stream for fresh water.", 6);
    } else if (kind === "rest") {
      setAction(kind, { x: 300, y: 460 }, "Taking a rest", "A peaceful pause among the moss.", 7);
    } else if (kind === "shelter") {
      const shelter = habitat.objects.shelter;
      setAction(kind, { x: shelter.x, y: shelter.y }, "Seeking shelter", "The dragon settles into its stone shelter.", 7);
    } else {
      const destinations = [{ x: 240, y: 410 }, { x: 650, y: 430 }, { x: 400, y: 470 }, { x: 820, y: 470 }];
      const target = destinations[Math.floor(Math.random() * destinations.length)];
      setAction(kind, target, "Exploring the grotto", "A little wander to see what the day holds.", 3);
    }
  }

  function updateMeters() {
    for (const [id, value] of Object.entries(creature.wellbeing)) {
      const rounded = Math.round(value);
      meters[id].value = rounded;
      meterLabels[id].textContent = `${rounded}%`;
    }
  }

  function advance(seconds) {
    if (!creature.action) nextRoutine();
    const action = creature.action;
    // A moved shelter remains the live destination even while the dragon travels.
    if (action.kind === "shelter") action.target = { x: habitat.objects.shelter.x, y: habitat.objects.shelter.y };
    const dx = action.target.x - creature.position.x;
    const dy = action.target.y - creature.position.y;
    const distance = Math.hypot(dx, dy);
    const step = 65 * seconds;
    if (distance > step && distance > 0.5) {
      creature.position.x += dx / distance * step;
      creature.position.y += dy / distance * step;
      action.arrived = false;
    } else {
      creature.position.x = action.target.x;
      creature.position.y = action.target.y;
      action.arrived = true;
      action.remaining -= seconds;
      if (action.kind === "drink") creature.wellbeing.hydration += seconds * 2;
      if (action.kind === "rest" || action.kind === "shelter") creature.wellbeing.energy += seconds * 1.5;
      if (action.remaining <= 0) nextRoutine();
    }
    creature.wellbeing.energy = clamp(creature.wellbeing.energy - seconds * 0.035, 65, 100);
    creature.wellbeing.hydration = clamp(creature.wellbeing.hydration - seconds * 0.035, 65, 100);
    // Enrichment gently returns to a comfortable baseline, never a penalty.
    creature.wellbeing.enrichment = clamp(creature.wellbeing.enrichment - seconds * 0.025, 75, 100);
    dragon.setAttribute("transform", `translate(${creature.position.x.toFixed(1)} ${creature.position.y.toFixed(1)})`);
  }

  const gnomeThoughts = [
    "Hmm... four letters: a cozy place to rest. Could it be a nest?",
    "Nest! Yes, that fits rather nicely. Now, where was my pencil?",
    "A little creak in the porch, but it does its job. Just like me.",
    "Three letters: a creature's comfy home. Den, perhaps? Hmm...",
    "Den! I do believe I answered that one myself.",
    "The Chief knows where to find me if a helping hand is needed.",
    "A few fallen branches made a fine rocking chair, even if it wobbles."
  ];

  function nextGnomeThought() {
    gnomeIndex = (gnomeIndex + 1) % gnomeThoughts.length;
    document.querySelector("#gnome-message").textContent = gnomeThoughts[gnomeIndex];
    gnomeElapsed = 0;
  }

  function frame(time) {
    if (previousTime !== null && !document.hidden) {
      const seconds = Math.min((time - previousTime) / 1000, 0.1);
      elapsed += seconds;
      gnomeElapsed += seconds;
      advance(seconds);
      // This tiny placeholder shift suggests a shuffle, not a walking animation.
      const shift = Math.sin(elapsed / 6) * 3;
      gnome.setAttribute("transform", `translate(${(866 + shift).toFixed(1)} 302)`);
      if (gnomeElapsed >= 65) nextGnomeThought();
      updateMeters();
    }
    previousTime = time;
    requestAnimationFrame(frame);
  }

  function scenePoint(event) {
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(matrix.inverse());
  }

  svg.addEventListener("pointerdown", event => {
    const element = event.target.closest("[data-object]");
    if (!element || event.button !== 0) return;
    const point = scenePoint(event);
    if (!point) return;
    const id = element.dataset.object;
    selectObject(id);
    drag = { id, pointerId: event.pointerId, offsetX: point.x - habitat.objects[id].x, offsetY: point.y - habitat.objects[id].y, moved: false };
    element.setPointerCapture(event.pointerId);
    element.classList.add("dragging");
    event.preventDefault();
  });
  svg.addEventListener("pointermove", event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const point = scenePoint(event);
    if (!point) return;
    const old = habitat.objects[drag.id];
    const position = boundedPosition(point.x - drag.offsetX, point.y - drag.offsetY);
    if (Math.hypot(position.x - old.x, position.y - old.y) > 0.1) drag.moved = true;
    updateObject(drag.id, position.x, position.y);
  });
  function finishDrag(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const completed = drag;
    drag = null;
    objectElements[completed.id].classList.remove("dragging");
    if (completed.moved) {
      savePositions();
      investigate(completed.id);
    }
  }
  svg.addEventListener("pointerup", finishDrag);
  svg.addEventListener("pointercancel", finishDrag);
  svg.addEventListener("lostpointercapture", finishDrag);

  function moveSelected(dx, dy) {
    const object = habitat.objects[selected];
    const oldX = object.x;
    const oldY = object.y;
    updateObject(selected, oldX + dx, oldY + dy);
    if (object.x !== oldX || object.y !== oldY) {
      savePositions();
      investigate(selected);
    }
  }
  const directions = { left: [-20, 0], right: [20, 0], up: [0, -20], down: [0, 20] };
  document.querySelectorAll("[data-move]").forEach(button => {
    button.addEventListener("click", () => moveSelected(...directions[button.dataset.move]));
  });
  svg.addEventListener("keydown", event => {
    const element = event.target.closest("[data-object]");
    if (!element) return;
    const direction = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" }[event.key];
    if (direction) {
      event.preventDefault();
      selectObject(element.dataset.object);
      moveSelected(...directions[direction]);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectObject(element.dataset.object);
    }
  });
  select.addEventListener("change", () => selectObject(select.value));
  document.querySelector("#reset-objects").addEventListener("click", () => {
    for (const [id, position] of Object.entries(defaults)) Object.assign(habitat.objects[id], position);
    renderObjects();
    savePositions();
    investigate(selected);
  });
  function offerEnrichment(fromGnome = false) {
    creature.wellbeing.enrichment = clamp(creature.wellbeing.enrichment + 12, 75, 100);
    updateMeters();
    setAction("enrichment", { x: 420, y: 430 }, "Enjoying a little enrichment",
      `The dragon investigates a playful surprise from ${fromGnome ? "the gnome" : "the Chief"}.`, 6);
  }
  document.querySelector("#enrich").addEventListener("click", () => offerEnrichment());
  document.querySelector("#gnome-visit").addEventListener("click", nextGnomeThought);
  document.querySelector("#gnome-help").addEventListener("click", () => {
    document.querySelector("#gnome-message").textContent = "Of course, Chief. I'll bring the little dragon something to explore.";
    gnomeElapsed = 0;
    offerEnrichment(true);
  });
  document.addEventListener("visibilitychange", () => { previousTime = null; });

  loadPositions();
  renderObjects();
  updateMeters();
  nextRoutine();
  requestAnimationFrame(frame);
})();
