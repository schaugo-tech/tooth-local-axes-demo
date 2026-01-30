import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { ArcballControls, Environment } from '@react-three/drei'
import ToothScene from './scene/ToothScene.jsx'

export default function App() {
  const [editMode, setEditMode] = useState(false)
  const [transformMode, setTransformMode] = useState('translate')

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10 }}>
        <button
          onClick={() => setEditMode(v => !v)}
          style={{
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.08)',
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(8px)',
            cursor: 'pointer'
          }}
        >
          {editMode ? '退出目标位调整' : '调整牙齿目标位'}
        </button>
        {editMode ? (
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <button
              onClick={() => setTransformMode('translate')}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid rgba(0,0,0,0.08)',
                background:
                  transformMode === 'translate' ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.85)',
                color: transformMode === 'translate' ? '#ffffff' : '#222222',
                cursor: 'pointer'
              }}
            >
              平移
            </button>
            <button
              onClick={() => setTransformMode('rotate')}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid rgba(0,0,0,0.08)',
                background:
                  transformMode === 'rotate' ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.85)',
                color: transformMode === 'rotate' ? '#ffffff' : '#222222',
                cursor: 'pointer'
              }}
            >
              旋转
            </button>
          </div>
        ) : null}
      </div>

      <Canvas
        orthographic
        camera={{ position: [0, 0, 200], zoom: 2.2, near: 0.1, far: 5000 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[50, 80, 120]} intensity={0.9} />
        <directionalLight position={[-80, -30, 60]} intensity={0.25} />
        <Environment preset="studio" />

        {!editMode ? <ArcballControls makeDefault /> : null}

        <ToothScene editMode={editMode} transformMode={transformMode} />
      </Canvas>
    </div>
  )
}
