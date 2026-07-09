// Procedural low-poly rally cars matching the picture (yellow / green / purple).
import * as THREE from 'three';

export const CAR_COLORS = {
  yellow: { body: 0xf2c024, accent: 0x2a2520, stripe: 0x2a2520 },
  green:  { body: 0x7ec947, accent: 0xe8e4d8, stripe: 0xe8e4d8 },
  purple: { body: 0xb06ae0, accent: 0xe8e4d8, stripe: 0xe8e4d8 },
};

export const CAR_LEN = 4.4, CAR_WID = 2.3;

export function buildCar(colorName) {
  const C = CAR_COLORS[colorName] || CAR_COLORS.yellow;
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: C.body, roughness: 0.5, metalness: 0.15 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x15130f, roughness: 0.6 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x1a1d20, roughness: 0.25, metalness: 0.4 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: C.stripe, roughness: 0.55 });
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0x887744, roughness: 0.4 });

  // main body
  const body = new THREE.Mesh(roundedBox(CAR_LEN, 0.72, CAR_WID, 0.18), bodyMat);
  body.position.y = 0.64;
  body.castShadow = true;
  g.add(body);
  // hood slope (front) + rear
  const nose = new THREE.Mesh(roundedBox(1.0, 0.55, CAR_WID * 0.94, 0.12), bodyMat);
  nose.position.set(0, 0.56, CAR_LEN / 2 - 0.45);
  nose.castShadow = true;
  g.add(nose);
  // cabin
  const cabin = new THREE.Mesh(roundedBox(2.1, 0.6, CAR_WID * 0.82, 0.16), bodyMat);
  cabin.position.set(0, 1.2, -0.15);
  cabin.castShadow = true;
  g.add(cabin);
  // glass band (windshield + sides)
  const glass = new THREE.Mesh(roundedBox(2.0, 0.4, CAR_WID * 0.84, 0.1), glassMat);
  glass.position.set(0, 1.24, -0.15);
  glass.scale.set(0.96, 1, 1.01);
  g.add(glass);
  // roof stripe
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.06, 0.9), stripeMat);
  roof.position.set(0, 1.53, -0.15);
  g.add(roof);
  // hood stripe
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 0.9), stripeMat);
  hood.position.set(0, 1.03, 1.35);
  g.add(hood);
  // spoiler
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.09, 2.0), bodyMat);
  spoiler.position.set(0, 1.2, -2.05);
  spoiler.castShadow = true;
  g.add(spoiler);
  const spost = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.12), darkMat);
  spost.position.set(0, 1.05, -2.0);
  g.add(spost);
  // bumpers
  const bf = new THREE.Mesh(new THREE.BoxGeometry(CAR_WID * 0.96, 0.34, 0.3), darkMat);
  bf.position.set(0, 0.42, CAR_LEN / 2 - 0.05);
  g.add(bf);
  const bb = new THREE.Mesh(new THREE.BoxGeometry(CAR_WID * 0.96, 0.34, 0.3), darkMat);
  bb.position.set(0, 0.42, -CAR_LEN / 2 + 0.05);
  g.add(bb);
  // headlights
  for (const sx of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.1), lightMat);
    hl.position.set(sx * 0.72, 0.78, CAR_LEN / 2 + 0.02);
    g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.18, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xa53020, emissive: 0x551008, roughness: 0.5 }));
    tl.position.set(sx * 0.72, 0.82, -CAR_LEN / 2 - 0.02);
    g.add(tl);
  }
  // wheels
  const wheelGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.42, 12);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x181614, roughness: 0.9 });
  const hubMat = new THREE.MeshStandardMaterial({ color: 0x8f8a80, roughness: 0.4, metalness: 0.5 });
  g.userData.wheels = [];
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const w = new THREE.Group();
    const tire = new THREE.Mesh(wheelGeo, wheelMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    w.add(tire);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.44, 8), hubMat);
    hub.rotation.z = Math.PI / 2;
    w.add(hub);
    w.position.set(sx * (CAR_WID / 2 - 0.12), 0.46, sz * 1.42);
    g.add(w);
    g.userData.wheels.push({ node: w, front: sz > 0 });
  }
  g.userData.color = colorName;
  return g;
}

function roundedBox(w, h, d, r) {
  // cheap "rounded" box: box with beveled look via extra scaling — keep it simple & low poly
  const geo = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
  return geo;
}
