// src/utils/parseCoordStep.js
import * as THREE from 'three'

// CoordStep0.txt expected columns per line (space/tab separated):
// toothId  px py pz  qw qx qy qz
// - This is the "frame in world" quaternion in WXYZ order, per your EX_Tools.
// - In three.js, Object3D.quaternion represents object orientation in world.
//   To represent a "local frame", we must use the INVERSE of the frame quaternion.

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

    // q_frame is given as WXYZ (Open3D / your EX_Tools)
    const qFrame = new THREE.Quaternion(qx, qy, qz, qw).normalize()

    // Convert frame quaternion to three.js object quaternion: inverse(frame)
    const qObj = qFrame.clone().invert()

    map.set(toothId, {
      pos: [px, py, pz],
      // three.js order: [x,y,z,w], already inverted and ready to apply to Object3D.quaternion
      quat: [qObj.x, qObj.y, qObj.z, qObj.w],
      // keep original for debugging/verification
      frameWxyz: [qw, qx, qy, qz]
    })
  }

  return map
}
