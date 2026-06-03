import { Canvas } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';
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
 * 3D viewer for the CX-5 — black glossy paint on a soft blurred gradient
 * background (CSS) to mimic a product-shot look.
 *
 * The canvas itself is transparent so the gradient layer behind it shows
 * through; we add a strong directional rim light + warm hemisphere to give
 * the black paint glossy highlights.
 */
export default function CarViewer({ className, autoRotate = true }: CarViewerProps) {
  return (
    <div className={`relative ${className ?? ''}`}>
      {/* Soft gradient backdrop — mimics the user's mockup photo */}
      <div
        className="absolute inset-0 -z-0"
        style={{
          background:
            'radial-gradient(ellipse 75% 60% at 50% 35%, #f4f7fb 0%, #c6cfdb 55%, #94a0b1 100%)',
        }}
        aria-hidden
      />

      <Canvas
        shadows
        camera={{ position: [4.5, 1.5, 5.2], fov: 30 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false }}
        className="relative z-10"
      >
        {/* Warm-cool key/fill that flatters black paint */}
        <ambientLight intensity={0.55} />
        <hemisphereLight color="#ffffff" groundColor="#bcc6d3" intensity={0.7} />
        <directionalLight
          position={[6, 9, 5]}
          intensity={1.4}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        {/* Rim from behind to catch the silhouette */}
        <directionalLight position={[-4, 5, -6]} intensity={0.55} color="#cfd9e6" />
        {/* Fill from the front to soften shadows on the bumper */}
        <directionalLight position={[0, 2.5, 8]} intensity={0.35} color="#ffffff" />

        <Suspense fallback={null}>
          <CarModel />
        </Suspense>

        <ContactShadows
          position={[0, -0.01, 0]}
          opacity={0.5}
          blur={2.4}
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
