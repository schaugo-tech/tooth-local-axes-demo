import { useEffect, useMemo, useState } from 'react'
import { useThree } from '@react-three/fiber'
import ToothNode from './ToothNode.jsx'
import { loadCoordStep0 } from '../utils/parseCoordStep.js'

function buildToothIds() {
  // Default: 28 teeth 11-17,21-27,31-37,41-47
  const ids = []
  for (let t = 11; t <= 17; t++) ids.push(String(t))
  for (let t = 21; t <= 27; t++) ids.push(String(t))
  for (let t = 31; t <= 37; t++) ids.push(String(t))
  for (let t = 41; t <= 47; t++) ids.push(String(t))
  return ids
}

export default function ToothScene() {
  const [coordMap, setCoordMap] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const { controls } = useThree()

  // Allow disabling Arcball while dragging gizmo
  const setOrbitEnabled = (enabled) => {
    if (!controls) return
    controls.enabled = !!enabled
  }

  useEffect(() => {
    loadCoordStep0('/CoordStep0.txt').then(setCoordMap).catch((e) => {
      console.error(e)
      setCoordMap(new Map())
    })
  }, [])

  const toothIds = useMemo(() => buildToothIds(), [])

  const axisDefFor = (toothId) => {
    if (!coordMap) return null
    const v = coordMap.get(toothId)
    if (!v) return null
    return v
  }

  // Click empty space to clear selection
  const handlePointerMissed = () => setSelectedId(null)

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
          setOrbitEnabled={setOrbitEnabled}
        />
      ))}
    </group>
  )
}