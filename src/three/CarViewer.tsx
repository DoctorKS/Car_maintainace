import { Canvas } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';
import * as THREE from 'three';
import { useCarModel } from './useCarModel';

function CarModel() {
  const model = useCarModel();
  return <primitive object={model} />;
}

interface CarViewerProps {
  className?: string;
  /** Auto-rotate the model slowly (default true). */
  autoRotate?: boolean;
}

/**
 * White-background 3D viewer for the CX-5: black car body + soft contact shadow.
 * The scene is rendered onto an opaque white background so the card looks like
 * a flat product shot.
 */
export default function CarViewer({ className, autoRotate = true }: CarViewerProps) {
  return (
    <div className={className}>
      <Canvas
        shadows
        camera={{ position: [4.2, 1.6, 5.0], fov: 32 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: false }}
        onCreated={({ scene, gl }) => {
          scene.background = new THREE.Color('#ffffff');
          gl.setClearColor('#ffffff', 1);
        }}
      >
        <ambientLight intensity={0.85} />
        <directionalLight
          position={[5, 8, 4]}
          intensity={1.25}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <hemisphereLight color="#ffffff" groundColor="#dde6f3" intensity={0.6} />

        <Suspense fallback={null}>
          <CarModel />
        </Suspense>

        <ContactShadows
          position={[0, -0.01, 0]}
          opacity={0.45}
          blur={2.6}
          far={3.5}
          resolution={512}
          color="#000000"
        />

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate={autoRotate}
          autoRotateSpeed={0.7}
          minPolarAngle={Math.PI / 2.6}
          maxPolarAngle={Math.PI / 2.05}
          target={[0, 0.7, 0]}
        />
      </Canvas>
    </div>
  );
}
