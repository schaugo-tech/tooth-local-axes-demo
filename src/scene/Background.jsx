import { useMemo } from 'react'
import * as THREE from 'three'

export default function Background() {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color('#fbfcff') },
        bottomColor: { value: new THREE.Color('#eef2fb') }
      },
      vertexShader:
        'varying vec3 vPos;\n' +
        'void main(){\n' +
        '  vec4 wp = modelMatrix * vec4(position, 1.0);\n' +
        '  vPos = wp.xyz;\n' +
        '  gl_Position = projectionMatrix * viewMatrix * wp;\n' +
        '}\n',
      fragmentShader:
        'uniform vec3 topColor;\n' +
        'uniform vec3 bottomColor;\n' +
        'varying vec3 vPos;\n' +
        'void main(){\n' +
        '  vec3 n = normalize(vPos);\n' +
        '  float h = clamp(n.y * 0.5 + 0.5, 0.0, 1.0);\n' +
        '  vec3 col = mix(bottomColor, topColor, smoothstep(0.0, 1.0, h));\n' +
        '  float v = 1.0 - smoothstep(0.2, 1.1, length(n.xy));\n' +
        '  col *= (0.92 + 0.08 * v);\n' +
        '  gl_FragColor = vec4(col, 1.0);\n' +
        '}\n'
    })
  }, [])

  return (
    <mesh scale={2000}>
      <sphereGeometry args={[1, 48, 48]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}
