import { useEffect, useMemo, useRef, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { computeMovableLocalFromWorld, decomposeMatrix } from '../utils/localFrame.js'

export default function ToothNode({
  toothId,
  glbUrl,
  axisDef,
  selected,
  onSelect,
  editMode,
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

    // IMPORTANT: quat is already "frame in world" (xyzw), do NOT invert
    axisGroup.current.quaternion.set(quat[0], quat[1], quat[2], quat[3]).normalize()
    axisGroup.current.updateMatrixWorld(true)
  }, [axisDef])

  useEffect(() => {
    if (inited.current) return
    if (!axisGroup.current || !movable.current) return
    if (!axisDef) return

    axisGroup.current.updateMatrixWorld(true)

    // Make axisGroup "define local axes but not change initial appearance":
    // axis_world * movable_local = I  => movable_local = inv(axis_world)
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

  const drag = useRef({
    active: false,
    pointerId: null,
    startNdc: new THREE.Vector2(),
    startPos: new THREE.Vector3(),
    startQuat: new THREE.Quaternion()
  })

  const onDown = (e) => {
    e.stopPropagation()
    onSelect?.()

    if (!editMode) return
    if (!movable.current) return

    e.target.setPointerCapture(e.pointerId)

    drag.current.active = true
    drag.current.pointerId = e.pointerId
    drag.current.startNdc.set(e.pointer.x, e.pointer.y)
    drag.current.startPos.copy(movable.current.position)
    drag.current.startQuat.copy(movable.current.quaternion)

    onEditDragStart?.()
  }

  const onMove = (e) => {
    if (!editMode) return
    if (!drag.current.active) return
    if (drag.current.pointerId !== e.pointerId) return
    if (!movable.current) return

    const dx = e.pointer.x - drag.current.startNdc.x
    const dy = e.pointer.y - drag.current.startNdc.y

    // Hand-feel coefficient for orthographic + NDC
    const scale = 25.0

    if (e.altKey) {
      // Alt + drag: rotate around local Z
      const angle = dx * 2.2
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle)
      movable.current.quaternion.copy(drag.current.startQuat).multiply(q)
      return
    }

    // Drag: translate in local X/Y
    const localDelta = new THREE.Vector3(dx * scale, -dy * scale, 0)
    movable.current.position.copy(drag.current.startPos).add(localDelta)
  }

  const onUp = (e) => {
    if (!editMode) return
    if (drag.current.pointerId !== e.pointerId) return
    drag.current.active = false
    drag.current.pointerId = null
    onEditDragEnd?.()
  }

  const axes = selected ? <axesHelper args={[12]} /> : null

  return (
    <group>
      <primitive object={ghostScene} />

      <group ref={axisGroup}>
        {axes}
        <group ref={movable}>
          <group onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
            {ready ? <primitive object={dynScene} /> : null}
          </group>
        </group>
      </group>
    </group>
  )
}

useGLTF.preload('/models/tooth_11.glb')
