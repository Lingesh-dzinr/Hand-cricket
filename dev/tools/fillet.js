// Thumb-index web fillet for pose 5 (paste into the page). Finds the gap's closing row, fits both edges as lines, then moves
// each edge vertex within the tangent length onto its matching point of a circle tangent to both (apex -> arc bottom),
// easing out BAND px into the hand. Returns rows "vertex,dx,dy,dz" (0.1 µm, bind space) plus the measured geometry.
async (RHO, BAND) => {
  const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js');
  let root = __hand.J['index-finger-phalanx-proximal'].bone; while (root.parent) root = root.parent;
  let mesh; root.traverse(o => { if (o.isSkinnedMesh && o.material.side !== 1) mesh = o; });
  const c = document.getElementById('c'), camera = new THREE.PerspectiveCamera(22, c.clientWidth / c.clientHeight, 0.01, 10);
  camera.position.set(-0.02, 0.075, 0.8); camera.lookAt(-0.02, 0.075, 0); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  const right = new THREE.Vector3(), up = new THREE.Vector3(); camera.matrixWorld.extractBasis(right, up, new THREE.Vector3());
  const h = __hand; h.setPose(5); for (const s of h.springs.values()) { s.x = s.to; s.v = 0; s.delay = 0; }
  return await new Promise((res, rej) => { const raf = window.requestAnimationFrame; let k = 0, done = false;
    const hook = cb => raf(() => { cb(1000); if (done || ++k < 3) return; done = true; if (window.requestAnimationFrame === hook) window.requestAnimationFrame = raf; clearTimeout(to);
      try {
        const W = c.width, H = c.height, g = new OffscreenCanvas(W, H).getContext('2d'); g.drawImage(c, 0, 0); const a = g.getImageData(0, 0, W, H).data, on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && a[(y * W + x) * 4 + 3] > 128;
        const gapAt = y => { let x = 60; while (x < 330 && !on(x, y)) x++; while (x < 330 && on(x, y)) x++; const a0 = x - 1; while (x < 330 && !on(x, y)) x++; return x < 330 && x - a0 > 1 ? [a0, x] : null; };
        let fy = 300; while (fy < 470 && !gapAt(fy)) fy++; while (fy < 470 && gapAt(fy)) fy++;
        const pts = side => { const p = []; for (let dy = 6; dy <= 34; dy += 2) { const gp = gapAt(fy - dy); if (gp) p.push([gp[side] + (side ? -0.5 : 0.5), fy - dy]); } return p; };
        const line = p => { const n = p.length, my = p.reduce((s, q) => s + q[1], 0) / n, mx = p.reduce((s, q) => s + q[0], 0) / n; let sxy = 0, syy = 0; for (const q of p) { sxy += (q[0] - mx) * (q[1] - my); syy += (q[1] - my) ** 2; } return { mx, my, b: sxy / syy }; };
        const LT = line(pts(0)), LI = line(pts(1));
        const ay = (LI.mx - LT.mx + LT.b * LT.my - LI.b * LI.my) / (LT.b - LI.b), ax = LT.mx + LT.b * (ay - LT.my), A = [ax, ay];
        const dirUp = L => { const l = Math.hypot(L.b, 1); return [-L.b / l, -1 / l]; };
        const eT = dirUp(LT), eI = dirUp(LI), theta = Math.acos(eT[0] * eI[0] + eT[1] * eI[1]);
        const bis = [eT[0] + eI[0], eT[1] + eI[1]], bl = Math.hypot(...bis); bis[0] /= bl; bis[1] /= bl;
        const nOf = e => { let n = [-e[1], e[0]]; if (n[0] * bis[0] + n[1] * bis[1] < 0) n = [-n[0], -n[1]]; return n; };
        const dpr = W / c.clientWidth, rho = RHO * dpr / 1.36, t = rho / Math.tan(theta / 2), C = [A[0] + bis[0] * rho / Math.sin(theta / 2), A[1] + bis[1] * rho / Math.sin(theta / 2)];
        const angTo = p => Math.atan2(p[1] - C[1], p[0] - C[0]), angB = angTo([C[0] - bis[0] * rho, C[1] - bis[1] * rho]);
        const target = (e, s) => { const Tp = [A[0] + e[0] * t, A[1] + e[1] * t]; let a0 = angTo(Tp), d = angB - a0; d = Math.atan2(Math.sin(d), Math.cos(d)); const ang = a0 + d * (1 - s / t); return [C[0] + rho * Math.cos(ang), C[1] + rho * Math.sin(ang)]; };
        const geo = mesh.geometry, P = geo.attributes.position, SI = geo.attributes.skinIndex, SW = geo.attributes.skinWeight, MP = geo.morphAttributes.position[0], k5 = mesh.morphTargetInfluences[0];
        const bm = mesh.skeleton.boneMatrices, M = new THREE.Matrix4(), T = new THREE.Matrix4(), L = new THREE.Matrix3(), v = new THREE.Vector3(), rows = [];
        const band = BAND * dpr / 1.36;
        for (let i = 0; i < P.count; i++) {
          v.set(P.getX(i) * (1 - k5) + MP.getX(i) * k5, P.getY(i) * (1 - k5) + MP.getY(i) * k5, P.getZ(i) * (1 - k5) + MP.getZ(i) * k5);
          M.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
          for (let j = 0; j < 4; j++) { const w = SW.getComponent(i, j); if (!w) continue; T.fromArray(bm, SI.getComponent(i, j) * 16); for (let e = 0; e < 16; e++) M.elements[e] += T.elements[e] * w; }
          M.premultiply(mesh.bindMatrixInverse).multiply(mesh.bindMatrix).premultiply(mesh.matrixWorld);
          v.applyMatrix4(M); const p = v.clone().project(camera), px = (p.x + 1) / 2 * W, py = (1 - p.y) / 2 * H, sx = px - A[0], sy = py - A[1];
          if (Math.hypot(sx, sy) > t * 1.3 + band) continue;
          const onIndex = (sx * bis[1] - sy * bis[0]) * (eI[0] * bis[1] - eI[1] * bis[0]) > 0, e = onIndex ? eI : eT, n = nOf(e);
          const s = sx * e[0] + sy * e[1], inside = -(sx * n[0] + sy * n[1]);
          if (s > t || inside < -3 || inside > band) continue;
          const sc = Math.max(0, s), tg = target(e, sc), edgePt = [A[0] + e[0] * sc, A[1] + e[1] * sc];
          const q = 1 - Math.max(0, inside) / band, fade = q * q * (3 - 2 * q), dx = (tg[0] - edgePt[0]) * fade, dy = (tg[1] - edgePt[1]) * fade;
          if (Math.hypot(dx, dy) < 0.05) continue;
          const depth = -v.clone().applyMatrix4(camera.matrixWorldInverse).z, pxW = 2 * depth * Math.tan(THREE.MathUtils.degToRad(11)) / H;
          const dw = right.clone().multiplyScalar(dx * pxW).addScaledVector(up, -dy * pxW).applyMatrix3(L.setFromMatrix4(M).invert());
          rows.push([i, Math.round(dw.x * 1e7), Math.round(dw.y * 1e7), Math.round(dw.z * 1e7)]);
        }
        res({ A, eT, eI, thetaDeg: theta * 180 / Math.PI, rho, t, rows });
      } catch (e) { rej(String(e)); } });
    const to = setTimeout(() => { done = true; if (window.requestAnimationFrame === hook) window.requestAnimationFrame = raf; rej('no frame'); }, 8000); window.requestAnimationFrame = hook; });
}
