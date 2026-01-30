import { useEffect, useMemo, useRef, useState } from 'react'
import { useGLTF, PivotControls } from '@react-three/drei'
import * as THREE from 'three'
import { computeMovableLocalFromWorld, decomposeMatrix } from '../utils/localFrame.js'

export default function ToothNode({ toothId, glbUrl, axisDef, selected, onSelect, setOrbitEnabled }) {
  const { scene } = useGLTF(glbUrl)

  const axisGroup = useRef()
  const movable = useRef()
  const inited = useRef(false)

  const [ready, setReady] = useState(false)

  const ghostScene = useMemo(() => scene.clone(true), [scene])
  const dynScene = useMemo(() => scene.clone(true), [scene])

  useEffect(() => {
    ghostScene.traverse((o) => {
      if (!o.isMesh) return
      o.raycast = () => null
      const m = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#ffffff'),
        roughness: 0.35,
        metalness: 0.0,
        transmission: 0.0,
        transparent: true,
        opacity: 0.18,
        depthWrite: false
      })
      o.material = m
    })
  }, [ghostScene])

  useEffect(() => {
    dynScene.traverse((o) => {
      if (!o.isMesh) return
      const m = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#ffffff'),
        roughness: 0.12,
        metalness: 0.03,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08
      })
      o.material = m
    })
  }, [dynScene])

  useEffect(() => {
    if (!axisGroup.current) return
    if (!axisDef) return

    const { pos, quat } = axisDef
    axisGroup.current.position.set(pos[0], pos[1], pos[2])
    axisGroup.current.quaternion.set(quat[0], quat[1], quat[2], quat[3]).normalize()
    axisGroup.current.updateMatrixWorld(true)
  }, [axisDef])

  useEffect(() => {
    if (inited.current) return
    if (!axisGroup.current || !movable.current) return
    if (!axisDef) return

    axisGroup.current.updateMatrixWorld(true)

    // 关键点：GLB 本身已经在“世界正确位置”（靠内部节点的世界散布实现）
    // 所以把 dynamic 放到 axisGroup 下面之后，为了初始不动，需要满足：
    // axis_world * movable_local = I
    // => movable_local = inverse(axis_world)
    const toothWorld = new THREE.Matrix4().identity()
    const axisWorld = axisGroup.current.matrixWorld.clone()

    const local = computeMovableLocalFromWorld(toothWorld, axisWorld)
    const { pos, quat, scl } = decomposeMatrix(local)

    movable.current.position.copy(pos)
    movable.current.quaternion.copy(quat)
    movable.current.scale.copy(scl)
    movable.current.updateMatrixWorld(true)

    // 确保 dynScene 自身不再携带任何额外 transform
    dynScene.position.set(0, 0, 0)
    dynScene.quaternion.set(0, 0, 0, 1)
    dynScene.scale.set(1, 1, 1)
    dynScene.updateMatrixWorld(true)

    inited.current = true
    setReady(true)
  }, [axisDef, dynScene])

  const handlePointerDown = (e) => {
    e.stopPropagation()
    onSelect?.()
  }

  const axes = selected ? <axesHelper args={[10]} /> : null

  return (
    <group>
      <primitive object={ghostScene} />

      <group ref={axisGroup}>
        {axes}

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
