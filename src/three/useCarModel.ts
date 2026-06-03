import { useLoader } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import {
  Box3,
  Mesh,
  MeshStandardMaterial,
  TextureLoader,
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
 * The FBX ships from a 2019-era pack and uses internal names like "Tire", "Headlight"
 * — we match heuristically. If the original FBX is later replaced and names change,
 * adjust the substrings (or fall back to bounding-box heuristics).
 */
export function useCarModel(): Group {
  const fbx = useLoader(FBXLoader, MODEL_URL) as Group;
  const tireMap = useLoader(TextureLoader, TIRE_URL);
  const tireNrm = useLoader(TextureLoader, TIRE_NRM_URL);
  const lightsMap = useLoader(TextureLoader, LIGHTS_URL);

  // Clone so multiple <CarModel /> mounts don't share material refs.
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

function applyTextures(root: Object3D, maps: Maps): void {
  root.traverse((obj) => {
    if (!(obj as Mesh).isMesh) return;
    const mesh = obj as Mesh;
    const name = (mesh.name + ' ' + (mesh.material as { name?: string } | undefined)?.name).toLowerCase();

    // Ensure we own the material so edits don't leak across clones.
    let mat = mesh.material as MeshStandardMaterial;
    if (!(mat instanceof MeshStandardMaterial)) {
      mat = new MeshStandardMaterial({ color: '#cfd6e0', metalness: 0.4, roughness: 0.5 });
      mesh.material = mat;
    } else {
      mat = mat.clone();
      mesh.material = mat;
    }

    if (/tire|tyre|wheel|rubber/.test(name)) {
      mat.map = maps.tireMap;
      mat.normalMap = maps.tireNrm;
      mat.color.set('#0c0c0c');
      mat.metalness = 0.1;
      mat.roughness = 0.85;
    } else if (/light|lamp|head|tail|brake/.test(name)) {
      mat.map = maps.lightsMap;
      mat.emissiveMap = maps.lightsMap;
      mat.emissive.set('#1a1a1a');
      mat.metalness = 0.6;
      mat.roughness = 0.25;
    } else if (/glass|window|windshield/.test(name)) {
      mat.color.set('#1a1a1a');
      mat.metalness = 0.9;
      mat.roughness = 0.05;
      mat.transparent = true;
      mat.opacity = 0.55;
    } else {
      // Default body paint: solid black with subtle metallic flake.
      mat.color.set('#0a0a0a');
      mat.metalness = 0.55;
      mat.roughness = 0.45;
    }
    mat.needsUpdate = true;
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
  const targetSize = 4.5; // tuned for the CarViewer's camera framing
  const scale = targetSize / max;
  root.scale.setScalar(scale);

  // Recompute box after scaling and recenter so the model sits on y=0.
  const box2 = new Box3().setFromObject(root);
  const center = new Vector3();
  box2.getCenter(center);
  root.position.x -= center.x;
  root.position.y -= box2.min.y; // floor touches y=0
  root.position.z -= center.z;
}
