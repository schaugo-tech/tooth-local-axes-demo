import { Canvas } from '@react-three/fiber'
import { ArcballControls, Environment } from '@react-three/drei'
import ToothScene from './scene/ToothScene.jsx'
import Background from './scene/Background.jsx'

export default function App() {
  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 200], zoom: 2.2, near: 0.1, far: 5000 }}
      gl={{ antialias: true }}
      dpr={[1, 2]}
    >
      <Background />
      <ambientLight intensity={0.6} />
      <directionalLight position={[50, 80, 120]} intensity={0.9} />
      <directionalLight position={[-80, -30, 60]} intensity={0.25} />
      <Environment preset="studio" />
      <ArcballControls makeDefault />
      <ToothScene />
    </Canvas>
  )
}
