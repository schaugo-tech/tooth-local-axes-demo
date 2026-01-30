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
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      ,
      fragmentShader: 
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y * 0.5 + 0.5;
          vec3 col = mix(bottomColor, topColor, h);
          gl_FragColor = vec4(col, 1.0);
        }
      
    })
  }, [])

  return (
    <mesh scale={2000}>
      <sphereGeometry args={[1, 32, 32]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}