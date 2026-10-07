/**
 * Valve: a short pipe on two saddles, its mouth toward the viewer, with a
 * flap hinged at the top of the mouth and a bolt under it. The pointer's
 * height is the bounce rate: as it rises the flap swings shut by degrees,
 * open, ajar, nearly shut, and past the top band the bolt rises and holds it.
 * Leaving does not open a bolted flap; a click does, as a review would. The
 * flap's rim is bright until the bolt takes the bright. The slider is how far
 * the flap stands open at rest, in degrees.
 *
 * The pattern: a continuous input. A spring on the flap's angle, a tween on
 * the bolt, a hit test on the pipe's resting screen box, and a rest ajar.
 */
const {
  Cam, clamp, facing, fit, hull, lerp, open, poly, prism, proj, rad, rings,
  spring, stepS, tdone, tset, tval, tween, disposer, mk, pointer, put, reflect, register, solid,
} = HL;

const X0 = 0, X1 = 64, R = 20, FL = 5, FR = R + 3.5, CY = 0, CZ = R + 6;
const SAD = [[6, 20], [40, 54]];                 // saddles' x spans
const FLAP_R = R - 1.5, FLAP_T = 1.8, HINGE_R = 2.2;
const BOLT_W = 5, BOLT_H = 9, BOLT_X = X1 + FLAP_T + 2.5;
const BANDS = [0.3, 0.6, 0.9];                   // rate: good | watch | throttled | suspended
const NAMES = ["good", "watch", "throttled", "suspended"];

/** A ring of n points round the x axis at x, radius r: a pipe's section. */
const sect = (x, r, n = 40) => Array.from({ length: n }, (_, k) => {
  const a = (k / n) * Math.PI * 2;
  return [x, CY + r * Math.cos(a), CZ + r * Math.sin(a)];
});

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let openDeg = value;

  const C = Cam(45, 0.5, 2.7);
  fit(C, [[X0, -FR, 0], [X1 + R + 4, FR, 0], [X1 + R + 4, -FR, 0], [X0, FR, 0], [X0, 0, CZ + FR], [X1, 0, CZ + FR]], 200, 166);
  const P = proj(C), front = facing(C);
  const pp = (pt) => P(pt[0], pt[1], pt[2]);

  const g = mk("g", {}, svg);
  const [gr] = rings(X0, -FR, X1 + 2, FR, 4, 1);
  reflect(svg, g, P, front, gr, 0, 10);

  // saddles, far to near, then the pipe lying across them
  for (const [a, b] of SAD) {
    const [ring, inner] = rings(a, -R + 2, b, R - 2, 3, 1.2);
    put(solid(g), prism(P, front, ring, inner, 0, CZ - R + 3));
  }
  const body = solid(g);
  put(body, { sil: poly(hull(sect(X0, R).concat(sect(X1 - FL, R)).map(pp))), crease: open(sect(X0 + 1.5, R - 1.5).map(pp)) });
  const flange = solid(g);
  put(flange, { sil: poly(hull(sect(X1 - FL, FR).concat(sect(X1, FR)).map(pp))), crease: poly(sect(X1, R - 2).map(pp)) });
  // the hinge: a pin across the top of the mouth
  const hinge = [X1 + FLAP_T / 2, 0, CZ + R - HINGE_R];
  const pin = (y) => Array.from({ length: 12 }, (_, k) => {
    const a = (k / 12) * Math.PI * 2;
    return P(hinge[0] + HINGE_R * Math.cos(a), y, hinge[2] + HINGE_R * Math.sin(a));
  });
  mk("path", { d: poly(hull(pin(-R + 5).concat(pin(R - 5)))), class: "sil" }, g);

  const flap = solid(g);
  let drawnDeg = NaN;
  function drawFlap(deg) {
    if (deg === drawnDeg) return;
    drawnDeg = deg;
    const t = rad(deg), d = [Math.sin(t), 0, -Math.cos(t)], n = [Math.cos(t), 0, Math.sin(t)];
    const ring = (rr, off) => Array.from({ length: 40 }, (_, k) => {
      const a = (k / 40) * Math.PI * 2, u = rr * Math.cos(a), v = rr * Math.sin(a);
      return P(
        hinge[0] + (FLAP_R + v) * d[0] + off * n[0],
        hinge[1] + u,
        hinge[2] + (FLAP_R + v) * d[2] + off * n[2],
      );
    });
    put(flap, { sil: poly(hull(ring(FLAP_R, 0).concat(ring(FLAP_R, FLAP_T)))), crease: poly(ring(FLAP_R - 1.6, FLAP_T)) });
  }

  // the bolt: a pin that rises from the base to hold the flap's foot
  const [br, bi] = rings(BOLT_X - BOLT_W / 2, -BOLT_W / 2, BOLT_X + BOLT_W / 2, BOLT_W / 2, 2, 0.8);
  const bolt = solid(g);
  let drawnBolt = NaN;
  function drawBolt(h) {
    if (h === drawnBolt) return;
    drawnBolt = h;
    put(bolt, prism(P, front, br, bi, 0, Math.max(0.6, h)));
  }

  const ang = spring(openDeg), bz = tween(0);
  const L = register(stage, (dt, now) => {
    const m = stepS(ang, dt);
    drawFlap(ang.x);
    drawBolt(tval(bz, now));
    return m || !tdone(bz, now);
  });
  bag.add(L.unregister);

  // the pointer's height across the pipe's resting screen box is the rate
  const yTop = P(X1, 0, CZ + FR)[1], yBot = P(X1, 0, 0)[1];
  let latched = false, rate = -1;

  function apply() {
    const now = performance.now();
    const band = rate < 0 ? -1 : BANDS.findIndex((b) => rate < b) === -1 ? 3 : BANDS.findIndex((b) => rate < b);
    if (band === 3) latched = true;
    const shut = latched ? 0 : rate < 0 ? openDeg : lerp(openDeg, 4, rate / BANDS[2]);
    ang.t = clamp(shut, 0, openDeg);
    tset(bz, latched ? BOLT_H : 0, now, 0);
    flap.sil.classList.toggle("hi", !latched);
    bolt.sil.classList.toggle("hi", latched);
    read.textContent = latched ? NAMES[3] : band < 0 ? "rest" : NAMES[band];
    L.wake();
  }
  apply();

  bag.add(pointer(stage, {
    move: ([, y]) => { rate = clamp((yBot - y) / (yBot - yTop), 0, 1); apply(); },
    down: () => { latched = false; apply(); },
    leave: () => { rate = -1; apply(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { openDeg = v; apply(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "valve",
  means: "A flap on a pipe: raise the pointer and it swings shut by degrees; at the top a bolt holds it until a click lets go.",
  rules: [1, 4, 5, 8],
  range: [35, 55, 75],
  mount,
});
