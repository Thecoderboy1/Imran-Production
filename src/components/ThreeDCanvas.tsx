import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { 
  Float, 
  PerspectiveCamera, 
  Text, 
  ContactShadows, 
  Environment,
  MeshDistortMaterial
} from '@react-three/drei';
import * as THREE from 'three';

function Coin() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.015;
      meshRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 0.8) * 0.15;
    }
  });

  return (
    <group>
      <mesh ref={meshRef} castShadow receiveShadow>
        <cylinderGeometry args={[2, 2, 0.4, 64]} />
        <meshPhysicalMaterial 
          color="#00C853" 
          metalness={1} 
          roughness={0.15} 
          clearcoat={1}
          clearcoatRoughness={0.1}
          emissive="#00C853"
          emissiveIntensity={0.1}
        />
        
        {/* Dollar sign on the face */}
        <Text
          position={[0, 0, 0.21]}
          fontSize={1.6}
          color="#0D1117"
          font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGkyMZhrib2Bg-4.ttf"
          anchorX="center"
          anchorY="middle"
          fontWeight="black"
        >
          $
        </Text>
        <Text
          position={[0, 0, -0.21]}
          rotation={[0, Math.PI, 0]}
          fontSize={1.6}
          color="#0D1117"
          font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGkyMZhrib2Bg-4.ttf"
          anchorX="center"
          anchorY="middle"
          fontWeight="black"
        >
          $
        </Text>
      </mesh>
      
      {/* Outer Glow Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.3, 0.03, 16, 120]} />
        <meshBasicMaterial color="#00C853" opacity={0.3} transparent />
      </mesh>
    </group>
  );
}

export default function ThreeDCanvas() {
  return (
    <div className="w-full h-full">
      <Canvas shadows gl={{ antialias: true, alpha: true }}>
        <PerspectiveCamera makeDefault position={[0, 0, 7]} fov={40} />
        
        {/* Cinematic Lighting Setup */}
        <ambientLight intensity={0.2} />
        <spotLight position={[10, 10, 10]} angle={0.2} penumbra={1} intensity={3} castShadow color="#ffffff" />
        <spotLight position={[-10, 5, 5]} angle={0.3} penumbra={1} intensity={2} color="#00C853" />
        <pointLight position={[0, -5, 5]} intensity={1.5} color="#00ff88" />
        <pointLight position={[5, 5, -5]} intensity={1} color="#ffffff" />
        
        <Float speed={1.5} rotationIntensity={0.8} floatIntensity={1}>
          <Coin />
        </Float>

        <ContactShadows 
          position={[0, -2.5, 0]} 
          opacity={0.6} 
          scale={12} 
          blur={2.8} 
          far={5} 
          color="#00C853"
        />
        
        <Environment preset="studio" />
      </Canvas>
    </div>
  );
}
