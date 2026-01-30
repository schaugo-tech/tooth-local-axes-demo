import { Canvas } from '@react-three/fiber'
import { ArcballControls } from '@react-three/drei'

export default function App() {
  return (
    <Canvas
      camera={{ position: [0, 0, 200], fov: 45 }}
      gl={{ antialias: true }}
    >
      {/* 浅色背景（临时，后面会换成渐变组件） */}
      <color attach="background" args={['#f5f7fb']} />

      <ambientLight intensity={0.6} />
      <directionalLight position={[50, 80, 120]} intensity={0.8} />

      {/* 相机控制 */}
      <ArcballControls makeDefault />

      {/* 临时坐标轴，确认 three 场景正常 */}
      <axesHelper args={[50]} />
    </Canvas>
  )
}
