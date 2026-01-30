import { Canvas } from '@react-three/fiber'
import { ArcballControls } from '@react-three/drei'
import ToothScene from './scene/ToothScene.jsx'
import Background from './scene/Background.jsx'

export default function App() {
  return (
    <Canvas
      camera={{ position: [0, 0, 200], fov: 45 }}
      gl={{ antialias: true }}
    >
      <Background />
      <ambientLight intensity={0.6} />
      <directionalLight position={[50, 80, 120]} intensity={0.8} />
      <ArcballControls makeDefault />
      <ToothScene />
    </Canvas>
  )
}