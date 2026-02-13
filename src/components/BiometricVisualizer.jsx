import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useMemo, useState, useEffect } from 'react';
import { Float, ContactShadows, OrbitControls, Sphere, Capsule } from '@react-three/drei';
import * as THREE from 'three';

function BaymaxModel({ petData, isMini }) {
  const groupRef = useRef();
  const headRef = useRef();

  // 1. Lógica de Color (Basada en Salud/Hambre de tu propuesta Tamagotchi)
  const color = useMemo(() => {
    const health = petData?.health ?? 100;
    const hunger = petData?.hunger ?? 0;
    if (health < 30) return "#ff9999"; // Rojo si está mal
    if (hunger > 70) return "#ffcc88"; // Naranja si tiene hambre
    return "#ffffff"; // Blanco Baymax
  }, [petData]);

  // 2. Animación de "Vida"
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    const energy = petData?.energy ?? 100;
    const speed = Math.max(0.4, energy / 100);

    // Flotación y respiración
    groupRef.current.position.y = Math.sin(t * speed) * 0.1;
    headRef.current.rotation.x = Math.sin(t * speed * 1.5) * 0.05;
  });

  const stageScale = 0.8 + ((petData?.stage || 1) * 0.2);

  return (
    <group ref={groupRef} scale={isMini ? 0.5 : stageScale} position={[0, -0.5, 0]}>
      {/* CUERPO - Más amigable que los cilindros anteriores */}
      <Capsule args={[0.6, 0.8, 4, 16]}>
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
      </Capsule>

      {/* CABEZA */}
      <group ref={headRef} position={[0, 0.7, 0]}>
        <Sphere args={[0.38, 32, 32]}>
          <meshStandardMaterial color={color} roughness={0.3} />
        </Sphere>
        
        {/* OJOS ICÓNICOS - Esto le da la personalidad */}
        <mesh position={[0.12, 0.05, 0.32]}>
          <sphereGeometry args={[0.03, 16, 16]} />
          <meshBasicMaterial color="black" />
        </mesh>
        <mesh position={[-0.12, 0.05, 0.32]}>
          <sphereGeometry args={[0.03, 16, 16]} />
          <meshBasicMaterial color="black" />
        </mesh>
        <mesh position={[0, 0.05, 0.31]}>
          <boxGeometry args={[0.2, 0.01, 0.01]} />
          <meshBasicMaterial color="black" />
        </mesh>
      </group>

      {/* BRAZOS GORDITOS */}
      <Sphere args={[0.2, 16, 16]} position={[0.7, 0.1, 0]} scale={[1, 2, 1]}>
        <meshStandardMaterial color={color} />
      </Sphere>
      <Sphere args={[0.2, 16, 16]} position={[-0.7, 0.1, 0]} scale={[1, 2, 1]}>
        <meshStandardMaterial color={color} />
      </Sphere>
    </group>
  );
}

export default function BiometricVisualizer({ patientData, petData, isMini = false }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <div style={{ height: isMini ? '150px' : '350px', background: '#020617' }} />;

  return (
    <div style={{ 
      width: '100%', 
      height: isMini ? '150px' : '350px', 
      background: 'radial-gradient(circle, #1e293b 0%, #020617 100%)', 
      borderRadius: isMini ? '12px' : '24px', 
      overflow: 'hidden', 
      position: 'relative' 
    }}>
      {/* TEXTO DE ESTADO GAMER */}
      {!isMini && (
        <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10 }}>
          <div style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', letterSpacing: '2px' }}>STATUS COMPAÑERO</div>
          <div style={{ fontSize: '16px', fontWeight: '900', color: 'white' }}>
            NIVEL {petData?.stage || 1} • {petData?.name || 'BAYMAX'}
          </div>
        </div>
      )}
      
      <Canvas shadows camera={{ position: [0, 1, 5], fov: 35 }}>
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
        
        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
          <BaymaxModel petData={petData} isMini={isMini} />
        </Float>

        {/* SOMBRA EN EL SUELO - Le da mucha calidad visual */}
        <ContactShadows position={[0, -1.2, 0]} opacity={0.5} scale={6} blur={2.5} far={2} />
        
        {!isMini && <OrbitControls enableZoom={false} minPolarAngle={Math.PI/3} maxPolarAngle={Math.PI/1.5} />}
      </Canvas>
    </div>
  );
}