// src/utils/parseCoordStep.js
import * as THREE from 'three'

// CoordStep0.txt format per EX_Tools:
// toothId  px py pz  qw qx qy qz   (wxyz)
export async function loadCoordStep0(url = '/CoordStep0.txt') {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  const txt = await res.text()
  const lines = txt.split(/\r?\n/)

  /** @type {Map<string, {pos:[number,number,number], quat:[number,number,number,number], frameWxyz:[number,number,number,number]}>} */
  const map = new Map()

  for (const line of lines) {
    const s = line.trim()
    if (!s) continue
    if (s.startsWith('#')) continue

    const parts = s.split(/\s+/)
    if (parts.length < 8) continue

    const toothId = String(parts[0])
    const px = Number(parts[1])
    const py = Number(parts[2])
    const pz = Number(parts[3])

    const qw = Number(parts[4])
    const qx = Number(parts[5])
    const qy = Number(parts[6])
    const qz = Number(parts[7])

    if (![px, py, pz, qw, qx, qy, qz].every(Number.isFinite)) continue

    // EX_Tools: q is wxyz, and represents "frame orientation in world"
    const qFrame = new THREE.Quaternion(qx, qy, qz, qw).normalize()

    map.set(toothId, {
      pos: [px, py, pz],
      // three.js expects xyzw
      quat: [qFrame.x, qFrame.y, qFrame.z, qFrame.w],
      frameWxyz: [qw, qx, qy, qz]
    })
  }

  return map
}
