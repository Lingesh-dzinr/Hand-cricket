// Localized contour fix for pose 5 (paste-evaluated in the page). A stretch of a silhouette boundary, x(y) for rows y0..y1, is
// replaced by a least-squares polynomial of degree DEG fitted over that stretch, blended back to the original at both ends.
// Every skin vertex near that boundary (any bone: thumb, palm or wrist) is shifted sideways by the difference, fading over
// BAND px into the hand. side: 'left' = the hand's left outline; 'gap' = the index side of the thumb-index gap.
// Returns rows "vertex,dx,dy,dz" (0.1 µm, bind space) and the before/after profile.
async ({ side, y0, y1, deg, band, target, bones, minW }) => {
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
        const bx = y => { if (side === 'left') { for (let x = 0; x < W; x++) if (on(x, y)) return x; return null; }
          let x = 0; while (x < 330 && !on(x, y)) x++; if (x > 160) return null; while (x < 330 && on(x, y)) x++; while (x < 330 && !on(x, y)) x++; return x < 330 ? x : null; };
        const ys = [], xs = []; for (let y = y0; y <= y1; y++) { const x = bx(y); if (x != null) { ys.push(y); xs.push(x); } }
        // least-squares polynomial in t = (y - mid) / half
        const mid = (y0 + y1) / 2, half = (y1 - y0) / 2, n = deg + 1, A = Array.from({ length: n }, () => new Array(n + 1).fill(0));
        ys.forEach((y, i) => { const t = (y - mid) / half, p = []; for (let j = 0; j < n; j++) p.push(t ** j); for (let r = 0; r < n; r++) { for (let q = 0; q < n; q++) A[r][q] += p[r] * p[q]; A[r][n] += p[r] * xs[i]; } });
        for (let i = 0; i < n; i++) { let piv = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[piv][i])) piv = r; [A[i], A[piv]] = [A[piv], A[i]]; for (let r = 0; r < n; r++) if (r !== i) { const f = A[r][i] / A[i][i]; for (let q = i; q <= n; q++) A[r][q] -= f * A[i][q]; } }
        const coef = A.map((r, i) => r[n] / r[i]), fit = y => { const t = (y - mid) / half; return coef.reduce((s, cc, j) => s + cc * t ** j, 0); };
        const cur = {}; ys.forEach((y, i) => cur[y] = xs[i]);
        const tgt = target ? (y => target[y] ?? cur[y]) : fit;   // explicit per-row target overrides the polynomial
        const ramp = y => { const e = Math.min(y - y0, y1 - y) / (0.25 * (y1 - y0)), t = Math.min(1, Math.max(0, e)); return t * t * (3 - 2 * t); };   // blend back at the ends
        const delta = y => { const y_ = Math.round(y); return cur[y_] == null ? 0 : (tgt(y_) - cur[y_]) * (target ? 1 : ramp(y_)); };
        const geo = mesh.geometry, P = geo.attributes.position, SI = geo.attributes.skinIndex, SW = geo.attributes.skinWeight, MP = geo.morphAttributes.position[0], k5 = mesh.morphTargetInfluences[0];
        const bm = mesh.skeleton.boneMatrices, M = new THREE.Matrix4(), T = new THREE.Matrix4(), L = new THREE.Matrix3(), v = new THREE.Vector3(), rows = [];
        for (let i = 0; i < P.count; i++) {
          v.set(P.getX(i) * (1 - k5) + MP.getX(i) * k5, P.getY(i) * (1 - k5) + MP.getY(i) * k5, P.getZ(i) * (1 - k5) + MP.getZ(i) * k5);
          M.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
          for (let j = 0; j < 4; j++) { const w = SW.getComponent(i, j); if (!w) continue; T.fromArray(bm, SI.getComponent(i, j) * 16); for (let e = 0; e < 16; e++) M.elements[e] += T.elements[e] * w; }
          M.premultiply(mesh.bindMatrixInverse).multiply(mesh.bindMatrix).premultiply(mesh.matrixWorld);
          v.applyMatrix4(M); const p = v.clone().project(camera), px = (p.x + 1) / 2 * W, py = (1 - p.y) / 2 * H;
          if (py < y0 || py > y1) continue;
          if (bones) { const names = mesh.skeleton.bones; let wsum = 0; for (let j = 0; j < 4; j++) if (bones.includes(names[SI.getComponent(i, j)].name)) wsum += SW.getComponent(i, j); if (wsum < (minW || 0.5)) continue; } const yb = Math.round(py); if (cur[yb] == null) continue;
          const inside = px - cur[yb]; if (inside < -2 || inside > band) continue;   // skin lies to the right of both boundaries
          const dx = delta(py) * (1 - Math.max(0, inside) / band); if (Math.abs(dx) < 0.05) continue;
          const depth = -v.clone().applyMatrix4(camera.matrixWorldInverse).z, pxW = 2 * depth * Math.tan(THREE.MathUtils.degToRad(11)) / H;
          const dw = right.clone().multiplyScalar(dx * pxW).applyMatrix3(L.setFromMatrix4(M).invert());
          rows.push([i, Math.round(dw.x * 1e7), Math.round(dw.y * 1e7), Math.round(dw.z * 1e7)]);
        }
        const prof = []; for (let y = y0; y <= y1; y += 5) if (cur[y] != null) prof.push(y + ':' + cur[y] + '>' + (cur[y] + delta(y)).toFixed(1));
        res({ rows, prof: prof.join(' ') });
      } catch (e) { rej(String(e)); } });
    const to = setTimeout(() => { done = true; if (window.requestAnimationFrame === hook) window.requestAnimationFrame = raf; rej('no frame'); }, 8000); window.requestAnimationFrame = hook; });
}
