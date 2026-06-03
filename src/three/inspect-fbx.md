# Mazda_HiPoly.fbx — inspection notes

The FBX in `public/models/` is a 2019-era HiPoly Mazda asset (~6 MB). On first
run, paste this snippet into `CarViewer.tsx` (inside `<CarModel>`) to log mesh
and material names, then refine the substring map in `useCarModel.ts`:

```ts
useEffect(() => {
  model.traverse(o => {
    if ((o as Mesh).isMesh) {
      const m = o as Mesh;
      console.log('[fbx]', m.name, '/', (m.material as { name?: string } | undefined)?.name);
    }
  });
}, [model]);
```

## Current mapping (substring → material treatment)

| Substring (case-insensitive) | Treatment |
|---|---|
| `tire`, `tyre`, `wheel`, `rubber` | tire.png base + tire_N.png normal, near-black |
| `light`, `lamp`, `head`, `tail`, `brake` | lights.png base + emissive |
| `glass`, `window`, `windshield` | dark blue, transparent 55% |
| everything else | navy paint (#0E68C9), metallic 0.6 |

## Fallback if mesh names are obscure

If meshes are named `polySurface23` etc., switch to a bounding-box heuristic:
the 4 lowest-Y nearly-cylindrical meshes are wheels; the rest of the lowest-Y
hemisphere is the body.
