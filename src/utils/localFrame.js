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