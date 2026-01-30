import { useEffect, useMemo, useRef, useState } from 'react'
import { useGLTF, TransformControls } from '@react-three/drei'
import * as THREE from 'three'
import { computeMovableLocalFromWorld, decomposeMatrix } from '../utils/localFrame.js'
import AxisLines from './AxisLines.jsx'

export default function ToothNode({
  toothId,
  glbUrl,
  axisDef,
  selected,
  onSelect,
  editMode,
  transformMode,
  onEditDragStart,
  onEditDragEnd
}) {
  const { scene } = useGLTF(glbUrl)

  const axisGroup = useRef()
  const movable = useRef()
  const inited = useRef(false)

  const [ready, setReady] = useState(false)

  const ghostScene = useMemo(() => scene.clone(true), [scene])
  const dynScene = useMemo(() => scene.clone(true), [scene])

  const makeToothMat = (opacity = 1.0, transparent = false) =>
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#ffffff'),
      roughness: transparent ? 0.55 : 0.12,
      metalness: 0.03,
      clearcoat: transparent ? 0.2 : 1.0,
      clearcoatRoughness: transparent ? 0.35 : 0.08,
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
      o.material = makeToothMat(0.18, true)
      o.material.side = THREE.DoubleSide
    })
  }, [ghostScene])

  useEffect(() => {
    dynScene.traverse((o) => {
      if (!o.isMesh) return
      const g = o.geometry
      if (g && !g.attributes?.normal) g.computeVertexNormals()
      o.material = makeToothMat(1.0, false)
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

    // 让 axisGroup “只定义局部坐标系，不改变牙齿初始外观”
    // tooth_world 视作单位（因为 glb 已在 world 正确位置，且我们不把 glb 的 world transform 复制过来）
    // 于是 movable_local = inv(axis_world) * I
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
  const canEdit = editMode && selected && ready

  return (
    <group>
      <primitive object={ghostScene} />

      <group ref={axisGroup}>
        {axes}
		{toothId === '11' ? <AxisLines length={60} /> : null}

        {canEdit ? (
          <TransformControls
            mode={transformMode}
            space="local"
            onMouseDown={onEditDragStart}
            onMouseUp={onEditDragEnd}
          >
            <group ref={movable}>
              <group onPointerDown={handlePointerDown}>{ready ? <primitive object={dynScene} /> : null}</group>
            </group>
          </TransformControls>
        ) : (
          <group ref={movable}>
            <group onPointerDown={handlePointerDown}>{ready ? <primitive object={dynScene} /> : null}</group>
          </group>
        )}
      </group>
    </group>
  )
}

useGLTF.preload('/models/tooth_11.glb')
