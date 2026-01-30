# apply_patch.ps1
# One-shot writer for the "Tooth Local Axes Demo" repo.
# Usage (from repo root):
#   powershell -ExecutionPolicy Bypass -File .\apply_patch.ps1
# Then:
#   npm install
#   npm run dev
#
# Notes:
# - Expects public/CoordStep0.txt to exist (you already have it).
# - Expects GLBs in public/models/tooth_11.glb ... etc.
# - This script will CREATE/OVERWRITE files listed below.

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$p) {
  if (!(Test-Path $p)) { New-Item -ItemType Directory -Force -Path $p | Out-Null }
}

function Write-FileUtf8NoBom([string]$path, [string]$content) {
  $dir = Split-Path -Parent $path
  Ensure-Dir $dir
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
  Write-Host "Wrote $path"
}

function Patch-PackageJson {
  $pkgPath = Join-Path (Get-Location) "package.json"
  if (!(Test-Path $pkgPath)) { throw "package.json not found in repo root." }
  $pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json

  if (-not $pkg.scripts) { $pkg | Add-Member -NotePropertyName scripts -NotePropertyValue (@{}) }
  $pkg.scripts.dev = "vite"
  $pkg.scripts.build = "vite build"
  $pkg.scripts.preview = "vite preview"

  if (-not $pkg.dependencies) { $pkg | Add-Member -NotePropertyName dependencies -NotePropertyValue (@{}) }
  if (-not $pkg.devDependencies) { $pkg | Add-Member -NotePropertyName devDependencies -NotePropertyValue (@{}) }

  # Minimal stable deps for R3F + drei + Vite + React plugin
  $pkg.dependencies.react = "^18.2.0"
  $pkg.dependencies."react-dom" = "^18.2.0"
  $pkg.dependencies.three = "^0.160.0"
  $pkg.dependencies."@react-three/fiber" = "^8.15.16"
  $pkg.dependencies."@react-three/drei" = "^9.88.7"

  $pkg.devDependencies.vite = "^5.0.8"
  $pkg.devDependencies."@vitejs/plugin-react" = "^4.2.1"

  # Pretty print json
  $json = $pkg | ConvertTo-Json -Depth 20
  Write-FileUtf8NoBom $pkgPath ($json + "`n")
}

# 0) Sanity checks
$root = Get-Location
if (!(Test-Path (Join-Path $root "index.html"))) { throw "index.html not found. Run from repo root." }
if (!(Test-Path (Join-Path $root "src"))) { throw "src/ not found. Run from repo root." }

# 1) Ensure vite.config.js exists and uses plugin-react
Write-FileUtf8NoBom (Join-Path $root "vite.config.js") @"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true
  }
})
"@

# 2) Patch package.json to include needed deps
Patch-PackageJson

# 3) Write remaining source files

Write-FileUtf8NoBom (Join-Path $root "src\App.jsx") @"
import { Canvas } from '@react-three/fiber'
import { ArcballControls } from '@react-three/drei'
import ToothScene from './scene/ToothScene.jsx'
import Background from './scene/Background.jsx'

export default function App() {
  return (
    <Canvas
      camera={{ position: [0, 0, 200], fov: 45 }}
      gl={{ antialias: true }}
    >
      <Background />
      <ambientLight intensity={0.6} />
      <directionalLight position={[50, 80, 120]} intensity={0.8} />
      <ArcballControls makeDefault />
      <ToothScene />
    </Canvas>
  )
}
"@

Write-FileUtf8NoBom (Join-Path $root "src\scene\Background.jsx") @'
import { useMemo } from 'react'
import * as THREE from 'three'

export default function Background() {
  // Elegant light gradient using a large inverted sphere with a tiny shader.
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color('#f7f9ff') },
        bottomColor: { value: new THREE.Color('#eef2fb') }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y * 0.5 + 0.5;
          vec3 col = mix(bottomColor, topColor, h);
          gl_FragColor = vec4(col, 1.0);
        }
      `
    })
  }, [])

  return (
    <mesh scale={2000}>
      <sphereGeometry args={[1, 32, 32]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}
'@

Write-FileUtf8NoBom (Join-Path $root "src\utils\parseCoordStep.js") @'
// parseCoordStep.js
// Parses public/CoordStep0.txt
// Expected format per line (space or tab separated):
//   toothId  px py pz  qx qy qz qw
// Lines starting with # or empty are ignored.
export async function loadCoordStep0(url = '/CoordStep0.txt') {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  const txt = await res.text()
  const lines = txt.split(/\r?\n/)

  /** @type {Map<string, {pos:[number,number,number], quat:[number,number,number,number]}>} */
  const map = new Map()

  for (const line of lines) {
    const s = line.trim()
    if (!s) continue
    if (s.startsWith('#')) continue
    const parts = s.split(/\s+/)
    if (parts.length < 8) continue
    const toothId = String(parts[0])
    const px = Number(parts[1]); const py = Number(parts[2]); const pz = Number(parts[3])
    const qx = Number(parts[4]); const qy = Number(parts[5]); const qz = Number(parts[6]); const qw = Number(parts[7])
    if (![px,py,pz,qx,qy,qz,qw].every(Number.isFinite)) continue

    map.set(toothId, {
      pos: [px, py, pz],
      quat: [qx, qy, qz, qw]
    })
  }

  return map
}
'@

Write-FileUtf8NoBom (Join-Path $root "src\utils\localFrame.js") @'
// localFrame.js
// Core math: compute movable_local so that
//   tooth_world = axis_world * movable_local
// with tooth GLB already placed correctly in world space.
// IMPORTANT: Do this ONCE at initialization to avoid "click jump".
import * as THREE from 'three'

export function buildAxisObject(posArr, quatArr) {
  const obj = new THREE.Object3D()
  obj.position.set(posArr[0], posArr[1], posArr[2])
  obj.quaternion.set(quatArr[0], quatArr[1], quatArr[2], quatArr[3]).normalize()
  obj.updateMatrixWorld(true)
  return obj
}

export function computeMovableLocalFromWorld(toothWorldMatrix, axisWorldMatrix) {
  // local = inverse(axis) * toothWorld
  const axisInv = new THREE.Matrix4().copy(axisWorldMatrix).invert()
  const local = new THREE.Matrix4().multiplyMatrices(axisInv, toothWorldMatrix)
  return local
}

export function decomposeMatrix(m) {
  const pos = new THREE.Vector3()
  const quat = new THREE.Quaternion()
  const scl = new THREE.Vector3()
  m.decompose(pos, quat, scl)
  return { pos, quat, scl }
}
'@

Write-FileUtf8NoBom (Join-Path $root "src\scene\ToothNode.jsx") @'
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
'@

Write-FileUtf8NoBom (Join-Path $root "src\scene\ToothScene.jsx") @'
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
'@

Write-Host ""
Write-Host "Done. Next steps:"
Write-Host "  1) npm install"
Write-Host "  2) npm run dev"
Write-Host ""
Write-Host "Make sure your GLBs are in: public/models/tooth_11.glb ... etc."
Write-Host "Make sure CoordStep0.txt is in: public/CoordStep0.txt"
