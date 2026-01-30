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
      vertexShader:
        'varying vec3 vWorldPosition;\n' +
        'void main() {\n' +
        '  vec4 worldPosition = modelMatrix * vec4(position, 1.0);\n' +
        '  vWorldPosition = worldPosition.xyz;\n' +
        '  gl_Position = projectionMatrix * viewMatrix * worldPosition;\n' +
        '}\n',
      fragmentShader:
        'uniform vec3 topColor;\n' +
        'uniform vec3 bottomColor;\n' +
        'varying vec3 vWorldPosition;\n' +
        'void main() {\n' +
        '  float h = normalize(vWorldPosition).y * 0.5 + 0.5;\n' +
        '  vec3 col = mix(bottomColor, topColor, h);\n' +
        '  gl_FragColor = vec4(col, 1.0);\n' +
        '}\n'
    })
  }, [])

  return (
    <mesh scale={2000}>
      <sphereGeometry args={[1, 32, 32]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}
