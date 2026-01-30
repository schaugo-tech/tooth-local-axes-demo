import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, PivotControls } from '@react-three/drei'
import * as THREE from 'three'
import { buildAxisObject, computeMovableLocalFromWorld, decomposeMatrix } from '../utils/localFrame.js'

/**
 * ToothNode
 * - Renders ghost (static, semi-transparent) + dynamic (movable in local axis frame)
 * - axisGroup defines the local coordinate system (pos/quaternion from CoordStep0)
 * - movable holds the actual DOF (translation+rotation in LOCAL space)
 *
 * Props:
 * - toothId: string like "11"
 * - glbUrl: "/models/tooth_11.glb"
 * - axisDef: {pos:[x,y,z], quat:[qx,qy,qz,qw]}
 * - selected: boolean
 * - onSelect: () => void
 * - setOrbitEnabled: (boolean)=>void  (to disable Arcball while dragging)
 */
export default function ToothNode({ toothId, glbUrl, axisDef, selected, onSelect, setOrbitEnabled }) {
  const { scene } = useGLTF(glbUrl)
  const axisGroup = useRef()
  const movable = useRef()
  const [ready, setReady] = useState(false)

  // Clone the loaded scene so ghost + dynamic don't share materials.
  const ghostScene = useMemo(() => scene.clone(true), [scene])
  const dynScene = useMemo(() => scene.clone(true), [scene])

  // Make ghost semi-transparent and unselectable by raycast (we set raycast to null)
  useEffect(() => {
    ghostScene.traverse((o) => {
      if (o.isMesh) {
        o.raycast = () => null
        o.material = o.material.clone()
        o.material.transparent = true
        o.material.opacity = 0.18
        o.material.depthWrite = false
      }
    })
  }, [ghostScene])

  // Make dynamic meshes selectable
  useEffect(() => {
    dynScene.traverse((o) => {
      if (o.isMesh) {
        o.material = o.material.clone()
      }
    })
  }, [dynScene])

  // Initialize axisGroup transform (local coordinate system definition)
  useEffect(() => {
    if (!axisGroup.current || !axisDef) return
    const { pos, quat } = axisDef
    axisGroup.current.position.set(pos[0], pos[1], pos[2])
    axisGroup.current.quaternion.set(quat[0], quat[1], quat[2], quat[3]).normalize()
    axisGroup.current.updateMatrixWorld(true)
  }, [axisDef])

  // Initialize movable local transform ONCE: movable_local = inv(axis_world) * tooth_world
  useEffect(() => {
    if (!axisGroup.current || !movable.current) return
    // tooth world matrix comes from the GLB scene as imported (already placed in world)
    // But since we're parenting dynScene under movable, we need to capture its original world matrix.
    // We'll treat dynScene as an Object3D with its current matrixWorld.
    dynScene.updateMatrixWorld(true)
    axisGroup.current.updateMatrixWorld(true)

    const toothWorld = dynScene.matrixWorld.clone()
    const axisWorld = axisGroup.current.matrixWorld.clone()

    const local = computeMovableLocalFromWorld(toothWorld, axisWorld)
    const { pos, quat, scl } = decomposeMatrix(local)

    movable.current.position.copy(pos)
    movable.current.quaternion.copy(quat)
    movable.current.scale.copy(scl)
    movable.current.updateMatrixWorld(true)

    // Now that movable holds the transform, reset dynScene local transform
    dynScene.position.set(0, 0, 0)
    dynScene.quaternion.set(0, 0, 0, 1)
    dynScene.scale.set(1, 1, 1)
    dynScene.updateMatrixWorld(true)

    setReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dynScene])

  const handlePointerDown = (e) => {
    e.stopPropagation()
    onSelect?.()
  }

  // Visual axes helper only when selected
  const axes = selected ? <axesHelper args={[10]} /> : null

  return (
    <group>
      {/* Ghost in original world placement */}
      <primitive object={ghostScene} />

      {/* Axis definition (fixed) */}
      <group ref={axisGroup}>
        {axes}

        {/* Movable DOF inside local frame */}
        <group ref={movable}>
          {selected ? (
            <PivotControls
              anchor={[0, 0, 0]}
              depthTest={false}
              lineWidth={2}
              scale={30}
              fixed={true}
              activeAxes={[true, true, true]}
              onDragStart={() => setOrbitEnabled?.(false)}
              onDragEnd={() => setOrbitEnabled?.(true)}
            >
              <group onPointerDown={handlePointerDown}>
                {ready ? <primitive object={dynScene} /> : null}
              </group>
            </PivotControls>
          ) : (
            <group onPointerDown={handlePointerDown}>
              {ready ? <primitive object={dynScene} /> : null}
            </group>
          )}
        </group>
      </group>
    </group>
  )
}

useGLTF.preload('/models/tooth_11.glb')