/**
 * Stairs: four stone steps climbing away from the viewer, the top one a
 * landing, with a rounded block resting on the second. Each step is a stretch
 * of the domain's age; the pointer over a step is that age, and the block
 * climbs to the highest step it has earned, since each step also asks for a
 * number of lifetime recipients. The step reached takes the bright edge. The
 * slider is the lifetime recipients, so at a low value the block stalls on a
 * step however far the pointer goes.
 *
 * The pattern: discrete items. One tween per axis for the block, a hit test
 * on each step's own resting top, and a rest with the block part way up.
 */
const {
  Cam, clamp, facing, fit, prism, proj, rings, unproj,
  tdone, tset, tval, tween, disposer, flatDot, mk, place, pointer, put, reflect, register, solid,
} = HL;

const N = 4, W = 30, D = 64, LAND = 20, R = 3.2, B = 1.3;
const H = [9, 18, 27, 36];           // step heights, rising away from the viewer
const AGE = [0, 7, 14, 28];          // days a step stands for
const VOL = [0, 50, 150, 400];       // lifetime recipients each step asks for
const BW = 17, BH = 12, BY = D * 0.58, REST = 1;

/** Step i's footprint: step 0 is nearest (largest x), step 3 is the landing. */
function foot(i) {
  const x1 = (N - i) * W, x0 = i === N - 1 ? x1 - W - LAND : x1 - W;
  return [x0, 0, x1, D];
}
const mid = (i) => { const f = foot(i); return (f[0] + f[2]) / 2; };

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let vol = value;

  const C = Cam(45, 0.5, 1.9);
  const f3 = foot(N - 1), f0 = foot(0);
  fit(C, [[f3[0], 0, 0], [f0[2], D, 0], [f0[2], 0, 0], [f3[0], D, 0], [f3[0], 0, H[3] + BH], [mid(0), BY, H[0] + BH]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [pr] = rings(f3[0], 0, f0[2], D, R, B);
  reflect(svg, g, P, front, pr, 0, 12);

  // steps, far to near: the landing first, since the near steps cover its foot
  const steps = [];
  for (let i = N - 1; i >= 0; i--) {
    const [x0, y0, x1, y1] = foot(i);
    const [ring, inner] = rings(x0, y0, x1, y1, R, B);
    const el = solid(g);
    put(el, prism(P, front, ring, inner, 0, H[i]));
    steps[i] = { el, ring, inner };
  }

  // the block, painted last: it always stands above the steps in front of it
  const [bring, binner] = rings(-BW / 2, -BW / 2, BW / 2, BW / 2, 4.5, 1.4);
  const block = { el: solid(g), x: tween(mid(REST)), z: tween(H[REST]), drawn: "" };
  // a 2 × 2 of dots stamped on its lid, the way a crate carries its code
  const stamp = [0, 1, 2, 3].map((k) => flatDot(block.el.g, C, 0.5, k === 0 ? "dot m" : "dot off"));
  function drawBlock(now) {
    const bx = tval(block.x, now), bz = tval(block.z, now), key = bx + "," + bz;
    if (key === block.drawn) return;
    block.drawn = key;
    const at = (q) => ({ u: q.u + bx, v: q.v + BY, nu: q.nu, nv: q.nv });
    put(block.el, prism(P, front, bring.map(at), binner.map(at), bz, bz + BH));
    stamp.forEach((el, k) => place(el, P(bx + ((k % 2) - 0.5) * 3.2, BY + (Math.floor(k / 2) - 0.5) * 3.2, bz + BH)));
  }

  const L = register(stage, (_dt, now) => {
    drawBlock(now);
    return !tdone(block.x, now) || !tdone(block.z, now);
  });
  bag.add(L.unregister);

  /** The step whose resting top holds the point, or -1: each step is tested on its own plane. */
  function hit([sx, sy]) {
    let best = -1, d0 = Infinity;
    for (let i = 0; i < N; i++) {
      const [x0, y0, x1, y1] = foot(i), [wx, wy] = unproj(C, sx, sy, H[i]);
      if (wx < x0 - 2 || wx > x1 + 2 || wy < y0 - 2 || wy > y1 + 2) continue;
      const d = Math.abs(wx - (x0 + x1) / 2) / (x1 - x0) + Math.abs(wy - D / 2) / D;
      if (d < d0) { d0 = d; best = i; }
    }
    return best;
  }

  /** The highest step at or below `picked` whose volume the domain has. */
  const earned = (picked) => { let t = 0; for (let i = 0; i <= picked; i++) if (vol >= VOL[i]) t = i; return t; };

  let act = -2;
  function setActive(a) {
    if (a === act) return;
    act = a;
    const now = performance.now(), to = a < 0 ? REST : earned(a);
    tset(block.x, mid(to), now, 0);
    tset(block.z, H[to], now, 0);
    steps.forEach((s, i) => s.el.sil.classList.toggle("hi", a >= 0 && i === to));
    block.el.sil.classList.toggle("hi", a < 0);
    read.textContent = a < 0 ? "rest" : `day ${AGE[a]} · tier ${to}`;
    L.wake();
  }
  setActive(-1);

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { vol = v; if (act >= 0) { const a = act; act = -2; setActive(a); } },
    destroy: bag.dispose,
  };
}

hairline({
  name: "stairs",
  means: "A block on a stair: the pointer is the domain's age, and the block climbs only as far as its volume lets it.",
  rules: [1, 4, 5, 9],
  range: [40, 160, 450],
  mount,
});
