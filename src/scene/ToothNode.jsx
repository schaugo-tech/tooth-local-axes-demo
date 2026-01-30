import { useEffect, useMemo, useRef, useState } from 'react'
import { useGLTF, PivotControls } from '@react-three/drei'
import * as THREE from 'three'
import { computeMovableLocalFromWorld, decomposeMatrix } from '../utils/localFrame.js'

export default function ToothNode({
  toothId,
  glbUrl,
  axisDef,
  selected,
  onSelect,
  onGizmoDragStart,
  onGizmoDragEnd
}) {
  const { scene } = useGLTF(glbUrl)

  const axisGroup = useRef()
  const movable = useRef()
  const inited = useRef(false)
  const [ready, setReady] = useState(false)

  const ghostScene = useMemo(() => scene.clone(true), [scene])
  const dynScene = useMemo(() => scene.clone(true), [scene])

  const makeGlossyToothMat = (opacity = 1.0, transparent = false) =>
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#ffffff'),
      roughness: transparent ? 0.5 : 0.12,
      metalness: 0.03,
      clearcoat: transparent ? 0.2 : 1.0,
      clearcoatRoughness: transparent ? 0.3 : 0.08,
      sheen: 0.0,
      transmission: 0.0,
      transparent,
      opacity,
      depthWrite: !transparent,
      vertexColors: false
    })

  useEffect(() => {
    ghostScene.traverse((o) => {
      if (!o.isMesh) return
      o.raycast = () => null
      const g = o.geometry
      if (g && !g.attributes?.normal) g.computeVertexNormals()
      o.material = makeGlossyToothMat(0.18, true)
      o.material.side = THREE.DoubleSide
    })
  }, [ghostScene])

  useEffect(() => {
    dynScene.traverse((o) => {
      if (!o.isMesh) return
      const g = o.geometry
      if (g && !g.attributes?.normal) g.computeVertexNormals()
      o.material = makeGlossyToothMat(1.0, false)
      o.material.side = THREE.DoubleSide
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

    const toothWorld = new THREE.Matrix4().identity()
    const axisWorld = axisGroup.current.matrixWorld.clone()

    const local = computeMovableLocalFromWorld(toothWorld, axisWorld)
    const { pos, quat, scl } = decomposeMatrix(local)

    movable.current.position.copy(pos)
    movable.current.quaternion.copy(quat)
    movable.current.scale.copy(scl)
    movable.current.updateMatrixWorld(true)

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

  const axes = selected ? <axesHelper args={[12]} /> : null

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
              fixed={true}
              scale={55}
              lineWidth={3}
              activeAxes={[true, true, true]}
              disableSliders={false}
              disableRotations={false}
              disableAxes={false}
              onDragStart={() => onGizmoDragStart?.()}
              onDragEnd={() => onGizmoDragEnd?.()}
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
