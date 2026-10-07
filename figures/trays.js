/**
 * Trays: a wide tray holding two smaller trays, each holding a few beads.
 * The pointer picks a bead; it lifts, and every bead in the same small tray
 * lifts part of the way with it, staggered outwards, because they draw from
 * one tray. The other tray does not move. The tray's rim and the chosen bead
 * take the bright edge. At rest one bead sits a little proud and is bright.
 * The slider is the lift, in world units.
 *
 * The pattern: discrete items (Riffle). Tweens with a stagger by distance, a
 * hit test on the beads' resting centres, and a rest that is already composed.
 */
const {
  Cam, circ, facing, fit, hull, open, poly, prism, proj, ringAt, rrect, run, unproj,
  tdone, tset, tval, tween, disposer, mk, pointer, put, reflect, register, solid,
} = HL;

const STEP = 45, SIB = 0.55, WT = 2.4;
const OUTER = { x0: -10, y0: -10, x1: 142, y1: 66, h: 11, r: 8 };
// beads: [x, y, radius, thickness]; the tallest is bright at rest
const TRAYS = [
  { x0: 0, y0: 0, x1: 76, y1: 56, h: 8, r: 6, beads: [[18, 16, 6, 5], [54, 13, 7, 7], [36, 40, 8, 9]] },
  { x0: 86, y0: 0, x1: 132, y1: 56, h: 8, r: 6, beads: [[109, 15, 7, 6], [109, 41, 6, 4.5]] },
];

const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());

/** A tray that never moves: `far` is painted before what it holds, `near` after. */
function tray(P, front, t) {
  const outer = rrect(t.x0, t.y0, t.x1, t.y1, t.r, 6);
  const inner = rrect(t.x0 + WT, t.y0 + WT, t.x1 - WT, t.y1 - WT, t.r - WT, 6);
  const far = [
    [poly(hull(ringAt(P, outer, 0).concat(ringAt(P, outer, t.h)))), "sil"],
    [poly(ringAt(P, inner, t.h)), "nf"],
    [open(ringAt(P, run(inner, (q) => !front(q)), 1.6)), "nf lo"],
  ];
  const iF = LR(ringAt(P, run(inner, front), t.h));
  const oT = LR(ringAt(P, run(outer, front), t.h));
  const oB = LR(ringAt(P, run(outer, front), 0));
  const near = [
    [poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]), "fo"],
    [open(oT), "nf lo"],
    [open(iF), "nf"],
    [open([oT[0], ...oB, oT[oT.length - 1]]), "nf sil"],
  ];
  return { outer, far, near };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let lift = value;

  const C = Cam(45, 0.5, 1.85);
  fit(C, [
    [OUTER.x0, OUTER.y0, 0], [OUTER.x1, OUTER.y1, -10], [OUTER.x1, OUTER.y0, 0], [OUTER.x0, OUTER.y1, 0],
    [36, 40, 28 + 9], [109, 15, 28 + 6],
  ], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const acct = tray(P, front, OUTER);
  reflect(svg, g, P, front, acct.outer, 0, 14);
  const acctEls = acct.far.map(([d, cls]) => mk("path", { d, class: cls }, g));

  const beads = [], rims = [];
  TRAYS.forEach((t, ti) => {
    const tr = tray(P, front, t);
    const farEls = tr.far.map(([d, cls]) => mk("path", { d, class: cls }, g));
    t.beads.forEach(([x, y, R, H], bi) => {
      const el = solid(g);
      beads.push({
        ti, bi, x, y, R, H, ring: circ(R, 16), inner: circ(R - 1.2, 16), hole: circ(R * 0.3, 10),
        z: tween(0), el, holeEl: mk("path", { class: "nf lo" }, el.g), drawn: NaN,
      });
    });
    const nearEls = tr.near.map(([d, cls]) => mk("path", { d, class: cls }, g));
    rims.push({ hull: farEls[0], edge: nearEls[3] });
  });
  acct.near.forEach(([d, cls]) => mk("path", { d, class: cls }, g));

  function draw(b, z) {
    if (z === b.drawn) return;
    b.drawn = z;
    const shift = (q) => ({ u: q.u + b.x, v: q.v + b.y, nu: q.nu, nv: q.nv });
    put(b.el, prism(P, front, b.ring.map(shift), b.inner.map(shift), z, z + b.H));
    // the hole through the bead, seen on its top
    b.holeEl.setAttribute("d", poly(ringAt(P, b.hole.map(shift), z + b.H)));
  }

  const B = register(stage, (_dt, now) => {
    let moving = false;
    for (const b of beads) { draw(b, tval(b.z, now)); if (!tdone(b.z, now)) moving = true; }
    return moving;
  });
  bag.add(B.unregister);

  /** The bead whose resting footprint holds the point, or -1. */
  function hit([sx, sy]) {
    const [wx, wy] = unproj(C, sx, sy, 3);
    let best = -1, d0 = Infinity;
    beads.forEach((b, k) => {
      const d = Math.hypot(wx - b.x, wy - b.y) - b.R;
      if (d < 4 && d < d0) { d0 = d; best = k; }
    });
    return best;
  }

  let act = -1;
  const restMark = beads.reduce((a, b, k) => (b.H > beads[a].H ? k : a), 0);
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? beads[a] : beads[act];
    act = a;
    beads.forEach((b, k) => {
      const same = a >= 0 && b.ti === from.ti;
      const delay = b.ti === from.ti ? Math.abs(b.bi - from.bi) * STEP : 0;
      const target = !same ? 0 : k === a ? lift : lift * SIB;
      tset(b.z, target, now, delay);
      b.el.sil.classList.toggle("hi", a < 0 ? k === restMark : k === a);
    });
    rims.forEach((r, ti) => {
      const on = a >= 0 && from.ti === ti;
      r.hull.classList.toggle("hi", on);
      r.edge.classList.toggle("hi", on);
    });
    read.textContent = a < 0 ? "rest" : `domain ${from.ti + 1} · inbox ${from.bi + 1}`;
    B.wake();
  }
  setActive(-1);
  beads[restMark].el.sil.classList.add("hi");

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { lift = v; if (act >= 0) { const a = act; act = -2; setActive(a); } },
    destroy: bag.dispose,
  };
}

hairline({
  name: "trays",
  means: "Beads in two trays inside one: lift a bead and the rest of its tray comes part of the way, since they share it.",
  rules: [1, 2, 4, 5],
  range: [12, 20, 30],
  mount,
});
