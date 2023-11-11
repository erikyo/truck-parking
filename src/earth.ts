import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import CannonUtils from './utils/cannonUtils'
import type Physics from './physics'
import Cosmos from './cosmos'
import type Car from './car'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

export default class Earth {
  private mesh = new THREE.Mesh()
  private readonly lightPivot: THREE.Object3D
  ambientLight: THREE.AmbientLight
  light: THREE.DirectionalLight

  constructor (scene: THREE.Scene, physics: Physics, car: Car) {
    const loader = new GLTFLoader()
    loader.load(
      './assets/models/big_track.glb',
      (gltf) => {
        const track = gltf.scene
        track.children.forEach((child) => {
          if ((child as THREE.Mesh).isMesh) { // Adjust the scale based on your requirements
            const m = child as THREE.Mesh
            m.receiveShadow = true
            m.castShadow = true
            this.mesh = m

            const shape = CannonUtils.CreateTrimesh(m.geometry)
            const earthBody = new CANNON.Body({
              mass: 0,
              material: physics.groundMaterial
            })
            earthBody.addShape(shape)
            earthBody.position.x = m.position.x
            earthBody.position.y = m.position.y
            earthBody.position.z = m.position.z
            earthBody.quaternion.x = m.quaternion.x
            earthBody.quaternion.y = m.quaternion.y
            earthBody.quaternion.z = m.quaternion.z
            earthBody.quaternion.w = m.quaternion.w

            physics.world.addBody(earthBody)

            const startPosition = this.getSpawnPosition()
            car.spawn(startPosition)
          }
          scene.add(child)
        })
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
      },
      (error) => {
        console.log(error)
      }
    )

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(this.ambientLight)

    this.light = new THREE.DirectionalLight(0xffffff, 2)
    this.light.position.set(0, 0, 500)
    this.light.castShadow = true
    this.light.shadow.bias = -0.002
    this.light.shadow.mapSize.width = 512
    this.light.shadow.mapSize.height = 512
    this.light.shadow.camera.left = -150
    this.light.shadow.camera.right = 150
    this.light.shadow.camera.top = -150
    this.light.shadow.camera.bottom = 150
    this.light.shadow.camera.near = 350
    this.light.shadow.camera.far = 750

    this.lightPivot = new THREE.Object3D()
    this.lightPivot.add(this.light)
    scene.add(this.lightPivot)

    new Cosmos(scene, this.light)
  }

  getSpawnPosition (p?: THREE.Vector3 | undefined) {
    const raycaster = new THREE.Raycaster()

    const outside = new THREE.Vector3()
    if (p) {
      outside.copy(p)
    } else {
      outside.set(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      )
    }
    outside.normalize()

    const inside = new THREE.Vector3()
      .subVectors(new THREE.Vector3(), outside)
      .normalize()
    outside.multiplyScalar(200)
    raycaster.set(outside, inside)

    const intersects = raycaster.intersectObject(this.mesh, false)
    let pos = new THREE.Vector3()
    if (intersects.length > 0) {
      pos = intersects[0].point.addScaledVector(outside.normalize(), 4)
    }
    return pos
  }

  update (delta: number): void {
    this.lightPivot.rotation.y += delta / 4
  }
}