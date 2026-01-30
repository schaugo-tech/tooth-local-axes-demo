// src/scene/AxisLines.jsx
import { useMemo } from 'react'
import * as THREE from 'three'

export default function AxisLines({ length = 40 }) {
  const geoX = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(length, 0, 0)
    ])
    return g
  }, [length])

  const geoY = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, length, 0)
    ])
    return g
  }, [length])

  const geoZ = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, length)
    ])
    return g
  }, [length])

  return (
    <group>
      <line geometry={geoX}>
        <lineBasicMaterial attach="material" color="red" />
      </line>
      <line geometry={geoY}>
        <lineBasicMaterial attach="material" color="green" />
      </line>
      <line geometry={geoZ}>
        <lineBasicMaterial attach="material" color="blue" />
      </line>
    </group>
  )
}
