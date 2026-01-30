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