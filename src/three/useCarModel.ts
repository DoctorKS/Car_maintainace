import { useLoader } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import {
  Box3,
  Mesh,
  MeshStandardMaterial,
  TextureLoader,
  type Material,
  type Object3D,
  Group,
  Vector3,
  type Texture,
} from 'three';
// FBXLoader is shipped under three/examples/jsm
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

const MODEL_URL = '/models/Mazda_HiPoly.fbx';
const TIRE_URL = '/textures/tire.png';
const TIRE_NRM_URL = '/textures/tire_N.png';
const LIGHTS_URL = '/textures/lights.png';

/**
 * Load the Mazda CX-5 HiPoly FBX and apply textures by mesh-name substring.
 *
 * Material rules (substring match, case-insensitive against
 *   `mesh.name + " " + material.name`):
 *   - tire | tyre | wheel | rubber → tire map + normal, near-black
 *   - light | lamp | head | tail | brake → lights map + emissive
 *   - glass | window | windshield → very dark, translucent
 *   - everything else → glossy black paint (#000) with metallic flake
 *
 * Handles meshes whose `material` is an array (multi-material) — every slot
 * is cloned and reassigned.
 */
export function useCarModel(): Group {
  const fbx = useLoader(FBXLoader, MODEL_URL) as Group;
  const tireMap = useLoader(TextureLoader, TIRE_URL);
  const tireNrm = useLoader(TextureLoader, TIRE_NRM_URL);
  const lightsMap = useLoader(TextureLoader, LIGHTS_URL);

  const model = useMemo<Group>(() => {
    const cloned = fbx.clone(true);
    centerAndScale(cloned);
    return cloned;
  }, [fbx]);

  useEffect(() => {
    applyTextures(model, { tireMap, tireNrm, lightsMap });
  }, [model, tireMap, tireNrm, lightsMap]);

  return model;
}

interface Maps {
  tireMap: Texture;
  tireNrm: Texture;
  lightsMap: Texture;
}

type Slot = 'tire' | 'light' | 'glass' | 'body';

function classify(name: string): Slot {
  if (/tire|tyre|wheel|rubber/.test(name)) return 'tire';
  if (/light|lamp|head|tail|brake/.test(name)) return 'light';
  if (/glass|window|windshield/.test(name)) return 'glass';
  return 'body';
}

function paint(mat: MeshStandardMaterial, slot: Slot, maps: Maps): void {
  switch (slot) {
    case 'tire':
      mat.map = maps.tireMap;
      mat.normalMap = maps.tireNrm;
      mat.color.set('#0c0c0c');
      mat.metalness = 0.1;
      mat.roughness = 0.85;
      break;
    case 'light':
      mat.map = maps.lightsMap;
      mat.emissiveMap = maps.lightsMap;
      mat.emissive.set('#1a1a1a');
      mat.metalness = 0.55;
      mat.roughness = 0.28;
      break;
    case 'glass':
      mat.color.set('#0a0a0a');
      mat.metalness = 0.95;
      mat.roughness = 0.05;
      mat.transparent = true;
      mat.opacity = 0.55;
      break;
    case 'body':
      // Glossy black car paint — high metalness, low roughness for sharp
      // highlights against the soft gradient backdrop.
      mat.color.set('#000000');
      mat.metalness = 0.78;
      mat.roughness = 0.22;
      break;
  }
  mat.needsUpdate = true;
}

function toStandard(existing: Material | undefined, fallback: string): MeshStandardMaterial {
  if (existing instanceof MeshStandardMaterial) {
    return existing.clone();
  }
  return new MeshStandardMaterial({ color: fallback, metalness: 0.6, roughness: 0.4 });
}

function applyTextures(root: Object3D, maps: Maps): void {
  root.traverse((obj) => {
    if (!(obj as Mesh).isMesh) return;
    const mesh = obj as Mesh;

    const meshName = (mesh.name ?? '').toLowerCase();
    const meshMatName = Array.isArray(mesh.material)
      ? mesh.material.map((m) => (m as { name?: string }).name ?? '').join(' ')
      : ((mesh.material as { name?: string } | undefined)?.name ?? '');
    const composite = `${meshName} ${meshMatName}`.toLowerCase();
    const slot = classify(composite);

    // Multi-material meshes need every slot cloned + re-painted.
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((m) => {
        const std = toStandard(m as Material, '#000000');
        paint(std, slot, maps);
        return std;
      });
    } else {
      const std = toStandard(mesh.material as Material | undefined, '#000000');
      paint(std, slot, maps);
      mesh.material = std;
    }

    mesh.castShadow = true;
    mesh.receiveShadow = false;
  });
}

/** Normalize the model so it fits a unit-ish box centered at the origin. */
function centerAndScale(root: Object3D): void {
  const box = new Box3().setFromObject(root);
  const size = new Vector3();
  box.getSize(size);
  const max = Math.max(size.x, size.y, size.z) || 1;
  const targetSize = 4.5;
  const scale = targetSize / max;
  root.scale.setScalar(scale);

  const box2 = new Box3().setFromObject(root);
  const center = new Vector3();
  box2.getCenter(center);
  root.position.x -= center.x;
  root.position.y -= box2.min.y;
  root.position.z -= center.z;
}
