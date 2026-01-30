import { useEffect, useMemo, useState } from 'react'
import { useThree } from '@react-three/fiber'
import ToothNode from './ToothNode.jsx'
import { loadCoordStep0 } from '../utils/parseCoordStep.js'

function buildToothIds() {
  const ids = []
  for (let t = 11; t <= 17; t++) ids.push(String(t))
  for (let t = 21; t <= 27; t++) ids.push(String(t))
  for (let t = 31; t <= 37; t++) ids.push(String(t))
  for (let t = 41; t <= 47; t++) ids.push(String(t))
  return ids
}

export default function ToothScene({ editMode, transformMode }) {
  const [coordMap, setCoordMap] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [isDraggingGizmo, setIsDraggingGizmo] = useState(false)
  const { controls } = useThree()

  useEffect(() => {
    if (!controls) return
    controls.enabled = !isDraggingGizmo
  }, [controls, isDraggingGizmo])

  useEffect(() => {
    loadCoordStep0('/CoordStep0.txt').then(setCoordMap).catch((e) => {
      console.error(e)
      setCoordMap(new Map())
    })
  }, [])

  const toothIds = useMemo(() => buildToothIds(), [])

  const axisDefFor = (toothId) => {
    if (!coordMap) return null
    return coordMap.get(toothId) ?? null
  }

  const handlePointerMissed = (e) => {
    if (editMode || isDraggingGizmo) return
    if (e?.button !== 0) return
    setSelectedId(null)
  }

  return (
    <group onPointerMissed={handlePointerMissed}>
      {toothIds.map((id) => (
        <ToothNode
          key={id}
          toothId={id}
          glbUrl={`/models/tooth_${id}.glb`}
          axisDef={axisDefFor(id)}
          selected={selectedId === id}
          onSelect={() => setSelectedId(id)}
          editMode={editMode}
          transformMode={transformMode}
          onEditDragStart={() => setIsDraggingGizmo(true)}
          onEditDragEnd={() => setIsDraggingGizmo(false)}
        />
      ))}
    </group>
  )
}
