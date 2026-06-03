import { Canvas } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';
import { useCarModel } from './useCarModel';

function CarModel() {
  const model = useCarModel();
  // primitive lets us drop the loaded scene graph straight into the scene.
  return <primitive object={model} />;
}

interface CarViewerProps {
  className?: string;
  /** Auto-rotate the model slowly (for the dashboard idle state). */
  autoRotate?: boolean;
}

/**
 * Transparent-background 3D viewer: car body + soft contact shadow.
 * No ground plane, no environment — page navy shows through the canvas.
 */
export default function CarViewer({ className, autoRotate = true }: CarViewerProps) {
  return (
    <div className={className}>
      <Canvas
        shadows
        camera={{ position: [4.2, 1.6, 5.0], fov: 32 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false }}
      >
        <ambientLight intensity={0.55} />
        <directionalLight
          position={[5, 8, 4]}
          intensity={1.15}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <hemisphereLight color="#a0c4ff" groundColor="#062F66" intensity={0.35} />

        <Suspense fallback={null}>
          <CarModel />
        </Suspense>

        <ContactShadows
          position={[0, -0.01, 0]}
          opacity={0.55}
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
