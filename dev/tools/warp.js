// Local screen-space warp for pose 5 (paste-evaluated). `move(px, py, ctx)` returns [dx, dy] in canvas px for a vertex at (px, py)
// (or null to leave it); offsets are converted back through each vertex's pose-5 skinning to bind space.
// ctx = { tip: [x, y] of the thumb's leftmost pixel }. Returns rows "vertex,dx,dy,dz" (0.1 µm).
async (move) => {
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
        const W = c.width, H = c.height, g = new OffscreenCanvas(W, H).getContext('2d'); g.drawImage(c, 0, 0); const a = g.getImageData(0, 0, W, H).data;
        let tip = null; for (let x = 0; x < W && !tip; x++) for (let y = 250; y < 470; y++) if (a[(y * W + x) * 4 + 3] > 128) { tip = [x, y]; break; }
        const geo = mesh.geometry, P = geo.attributes.position, SI = geo.attributes.skinIndex, SW = geo.attributes.skinWeight, MP = geo.morphAttributes.position[0], k5 = mesh.morphTargetInfluences[0];
        const bm = mesh.skeleton.boneMatrices, M = new THREE.Matrix4(), T = new THREE.Matrix4(), L = new THREE.Matrix3(), v = new THREE.Vector3(), rows = [];
        for (let i = 0; i < P.count; i++) {
          v.set(P.getX(i) * (1 - k5) + MP.getX(i) * k5, P.getY(i) * (1 - k5) + MP.getY(i) * k5, P.getZ(i) * (1 - k5) + MP.getZ(i) * k5);
          M.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
          for (let j = 0; j < 4; j++) { const w = SW.getComponent(i, j); if (!w) continue; T.fromArray(bm, SI.getComponent(i, j) * 16); for (let e = 0; e < 16; e++) M.elements[e] += T.elements[e] * w; }
          M.premultiply(mesh.bindMatrixInverse).multiply(mesh.bindMatrix).premultiply(mesh.matrixWorld);
          v.applyMatrix4(M); const p = v.clone().project(camera), px = (p.x + 1) / 2 * W, py = (1 - p.y) / 2 * H;
          const d = move(px, py, { tip }); if (!d || Math.hypot(d[0], d[1]) < 0.05) continue;
          const depth = -v.clone().applyMatrix4(camera.matrixWorldInverse).z, pxW = 2 * depth * Math.tan(THREE.MathUtils.degToRad(11)) / H;
          const dw = right.clone().multiplyScalar(d[0] * pxW).addScaledVector(up, -d[1] * pxW).applyMatrix3(L.setFromMatrix4(M).invert());
          rows.push([i, Math.round(dw.x * 1e7), Math.round(dw.y * 1e7), Math.round(dw.z * 1e7)]);
        }
        res({ tip, rows });
      } catch (e) { rej(String(e)); } });
    const to = setTimeout(() => { done = true; if (window.requestAnimationFrame === hook) window.requestAnimationFrame = raf; rej('no frame'); }, 8000); window.requestAnimationFrame = hook; });
}
