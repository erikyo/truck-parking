import { Mesh, Vector3, Object3D, Color, AudioListener, PositionalAudio, AudioLoader, TextureLoader, PerspectiveCamera, Scene, Quaternion } from 'three'
import * as CANNON from 'cannon-es'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import type Physics from './physics'
import type Earth from './earth'
import {
  Lensflare,
  LensflareElement
} from 'three/examples/jsm/objects/Lensflare.js'

export default class Car {
  earth: null | Earth = null
  // private scene: THREE.Scene
  private readonly camera: PerspectiveCamera
  private readonly physics: Physics

  frameMesh = new Mesh()

  wheelLFMesh = new Mesh()
  wheelRFMesh = new Mesh()
  wheelLBMesh = new Mesh()
  wheelRBMesh = new Mesh()

  private readonly tmpVec = new Vector3()
  private readonly tmpQuat = new Quaternion()
  private readonly camPos = new Vector3()
  private readonly camQuat = new Quaternion()
  chaseCamPivot = new Object3D()
  chaseCam = new Object3D()

  frameBody: CANNON.Body

  wheelLFBody: CANNON.Body
  wheelRFBody: CANNON.Body
  wheelLBBody: CANNON.Body
  wheelRBBody: CANNON.Body
  private readonly constraintLF: CANNON.HingeConstraint
  private readonly constraintRF: CANNON.HingeConstraint
  private readonly constraintLB: CANNON.HingeConstraint
  private readonly constraintRB: CANNON.HingeConstraint

  thrusting = false
  steering = false
  forwardVelocity = 0
  rightVelocity = 0

  enabled = true

  private readonly score: number = 0

  private upsideDownCounter = -1

  private readonly listener: AudioListener
  carSound: PositionalAudio
  private rattleSound: PositionalAudio[] = []

  cameraTempPosition: Object3D

  private readonly lensflares = [new Lensflare(), new Lensflare(), new Lensflare()]
  debugMesh: Mesh

  constructor (
    scene: Scene,
    camera: PerspectiveCamera,
    physics: Physics,
    listener: AudioListener
  ) {
    this.camera = camera
    this.physics = physics
    this.listener = listener

    this.cameraTempPosition = new Object3D()
    scene.add(this.cameraTempPosition)

    const audioLoader = new AudioLoader()
    const carSound = new PositionalAudio(this.listener)
    audioLoader.load('./assets/sounds/engine.wav', (buffer) => {
      carSound.setBuffer(buffer)
      carSound.setVolume(0.5)
    })
    this.carSound = carSound

    this.rattleSound.push(new PositionalAudio(listener as AudioListener))
    audioLoader?.load('./assets/sounds/crash.wav', (buffer) => {
      this.rattleSound[0].setBuffer(buffer)
      this.rattleSound[0].setLoop(false)
    })
    this.frameMesh.add(this.rattleSound[0] as PositionalAudio)

    this.rattleSound.push(new PositionalAudio(listener as AudioListener))
    audioLoader?.load('./assets/sounds/crash2.wav', (buffer) => {
      this.rattleSound[1].setBuffer(buffer)
      this.rattleSound[1].setLoop(false)
    })

    const flareTexture = new TextureLoader().load('./assets/img/lensflare0.png')
    this.lensflares.forEach((l) => {
      l.addElement(
        new LensflareElement(
          flareTexture,
          200,
          0,
          new Color(0x00ff00)
        )
      )
    })

    const loader = new GLTFLoader()
    loader.load(
      './assets/models/truck_optim.glb',
      (gltf) => {
        console.log(gltf.scene)

        this.enabled = true
        this.frameMesh = gltf.scene.children[0].children[0] as Mesh
        console.log('truck body', this.frameMesh)
        this.frameMesh.castShadow = true
        scene.add(this.frameMesh)

        this.carSound.loop = true
        this.frameMesh.add(this.carSound)

        this.chaseCam.position.set(0, 2, 250)
        this.chaseCamPivot.add(this.chaseCam)
        this.frameMesh.add(this.chaseCamPivot)

        this.wheelLFMesh = gltf.scene.children[0].children[7] as Mesh
        console.log('wheel LR', this.wheelLFMesh)
        // this.wheelLFMesh.children[0].castShadow = true
        this.wheelRFMesh = gltf.scene.children[0].children[6] as Mesh
        this.wheelLBMesh = gltf.scene.children[0].children[4] as Mesh
        this.wheelRBMesh = gltf.scene.children[0].children[5] as Mesh
        scene.add(this.wheelLFMesh)
        scene.add(this.wheelRFMesh)
        scene.add(this.wheelLBMesh)
        scene.add(this.wheelRBMesh)
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
      },
      (error) => {
        console.log(error)
      }
    )
    this.frameBody = new CANNON.Body({ mass: 0.1 })
    this.frameBody.addShape(
      new CANNON.Sphere(0.1),
      new CANNON.Vec3(-1.5, 1, -5.5)
    )
    this.frameBody.addShape(
      new CANNON.Sphere(0.1),
      new CANNON.Vec3(1.5, 1, -5.5)
    )
    this.frameBody.addShape(
      new CANNON.Sphere(0.1),
      new CANNON.Vec3(-1.5, 1, 7.5)
    )
    this.frameBody.addShape(new CANNON.Sphere(0.1), new CANNON.Vec3(1, -0.1, 0))
    this.frameBody.addShape(
      new CANNON.Sphere(0.1),
      new CANNON.Vec3(1.5, 1, 7.5)
    )
    this.frameBody.position.set(0, 3.5, 0)

    this.frameBody.addEventListener('collide', (e: any) => {
      const r = Math.round(Math.random()) // 1 or 0
      if (this.rattleSound[r] !== undefined) {
        this.rattleSound[r].setVolume(Math.abs(e.contact.getImpactVelocityAlongNormal()) / 25)
        if (this.rattleSound[r].isPlaying) this.rattleSound[r].stop()
        this.rattleSound[r].play()
      }
    })

    const wheelLFShape = new CANNON.Sphere(0.35)
    this.wheelLFBody = new CANNON.Body({
      mass: 1,
      material: this.physics.wheelMaterial
    })
    this.wheelLFBody.addShape(wheelLFShape)
    this.wheelLFBody.position.set(-1, 0, -1)

    const wheelRFShape = new CANNON.Sphere(0.35)
    this.wheelRFBody = new CANNON.Body({
      mass: 1,
      material: this.physics.wheelMaterial
    })
    this.wheelRFBody.addShape(wheelRFShape)
    this.wheelRFBody.position.set(1, 0, -1)

    const wheelLBShape = new CANNON.Sphere(0.4)
    this.wheelLBBody = new CANNON.Body({
      mass: 1,
      material: this.physics.wheelMaterial
    })
    this.wheelLBBody.addShape(wheelLBShape)
    this.wheelLBBody.position.set(-1, 0, 1)

    const wheelRBShape = new CANNON.Sphere(0.4)
    this.wheelRBBody = new CANNON.Body({
      mass: 1,
      material: this.physics.wheelMaterial
    })
    this.wheelRBBody.addShape(wheelRBShape)
    this.wheelRBBody.position.set(1, 0, 1)

    const leftFrontAxis = new CANNON.Vec3(1, 0, 0)
    const rightFrontAxis = new CANNON.Vec3(1, 0, 0)
    const leftBackAxis = new CANNON.Vec3(1, 0, 0)
    const rightBackAxis = new CANNON.Vec3(1, 0, 0)

    this.constraintLF = new CANNON.HingeConstraint(
      this.frameBody,
      this.wheelLFBody,
      {
        pivotA: new CANNON.Vec3(-1, 0, -1),
        axisA: leftFrontAxis,
        maxForce: 0.66
      }
    )
    this.physics.world.addConstraint(this.constraintLF)
    this.constraintRF = new CANNON.HingeConstraint(
      this.frameBody,
      this.wheelRFBody,
      {
        pivotA: new CANNON.Vec3(1, 0, -1),
        axisA: rightFrontAxis,
        maxForce: 0.66
      }
    )
    this.physics.world.addConstraint(this.constraintRF)
    this.constraintLB = new CANNON.HingeConstraint(
      this.frameBody,
      this.wheelLBBody,
      {
        pivotA: new CANNON.Vec3(-1, 0, 1),
        axisA: leftBackAxis,
        maxForce: 0.66
      }
    )
    this.physics.world.addConstraint(this.constraintLB)
    this.constraintRB = new CANNON.HingeConstraint(
      this.frameBody,
      this.wheelRBBody,
      {
        pivotA: new CANNON.Vec3(1, 0, 1),
        axisA: rightBackAxis,
        maxForce: 0.66
      }
    )
    this.physics.world.addConstraint(this.constraintRB)

    this.physics.world.addBody(this.frameBody)
    this.physics.world.addBody(this.wheelLFBody)
    this.physics.world.addBody(this.wheelRFBody)
    this.physics.world.addBody(this.wheelLBBody)
    this.physics.world.addBody(this.wheelRBBody)

    // rear wheel drive
    this.constraintLB.enableMotor()
    this.constraintRB.enableMotor()

    setInterval(() => {
      if (this.enabled) {
        if (this.isUpsideDown()) {
          this.upsideDownCounter += 1
          const liftedPos = (this.earth)?.getSpawnPosition(
            this.frameMesh.position
          )
          if (liftedPos != null && this.upsideDownCounter > 3) {
            this.spawn(liftedPos)
            console.log('flipped car')
          }
          console.log('car is upside down')
        } else {
          this.upsideDownCounter = 0
        }
      }
    }, 1000)
  }

  shoot () {
    if (this.enabled) {
      console.log('PEW PEW PEW')
    }
  }

  isUpsideDown () {
    const bodyUp = new Vector3()
    bodyUp.copy(this.frameMesh.up).applyQuaternion(this.frameMesh.quaternion)
    const down = this.frameMesh.position.clone().negate().normalize()
    // console.log(down.dot(bodyUp))
    if (down.dot(bodyUp) > 0) {
      return true
    } else {
      return false
    }
  }

  spawn (startPosition: Vector3) {
    console.log('respawning')
    // console.log(startPosition)

    // this.debugMesh.position.copy(startPosition)
    this.frameMesh.add(this.chaseCamPivot)

    this.enabled = false

    this.physics.world.removeBody(this.frameBody)
    this.physics.world.removeBody(this.wheelLFBody)
    this.physics.world.removeBody(this.wheelRFBody)
    this.physics.world.removeBody(this.wheelLBBody)
    this.physics.world.removeBody(this.wheelRBBody)

    const o = new Object3D()
    o.position.copy(startPosition)
    o.lookAt(new Vector3())
    o.rotateX(-Math.PI / 2)

    const q = new CANNON.Quaternion().set(
      o.quaternion.x,
      o.quaternion.y,
      o.quaternion.z,
      o.quaternion.w
    )

    this.forwardVelocity = 0
    this.rightVelocity = 0

    this.frameBody.velocity.set(0, 0, 0)
    this.frameBody.angularVelocity.set(0, 0, 0)
    this.frameBody.position.set(
      startPosition.x,
      startPosition.y,
      startPosition.z
    )
    this.frameBody.quaternion.copy(q)

    this.wheelLFBody.velocity.set(0, 0, 0)
    this.wheelLFBody.angularVelocity.set(0, 0, 0)
    this.wheelLFBody.position.set(
      startPosition.x - 1,
      startPosition.y,
      startPosition.z - 1
    )
    this.wheelLFBody.quaternion.copy(q)

    this.wheelRFBody.velocity.set(0, 0, 0)
    this.wheelRFBody.angularVelocity.set(0, 0, 0)
    this.wheelRFBody.position.set(
      startPosition.x + 1,
      startPosition.y,
      startPosition.z - 1
    )
    this.wheelRFBody.quaternion.copy(q)

    this.wheelLBBody.velocity.set(0, 0, 0)
    this.wheelLBBody.angularVelocity.set(0, 0, 0)
    this.wheelLBBody.position.set(
      startPosition.x - 1,
      startPosition.y,
      startPosition.z + 1
    )
    this.wheelLBBody.quaternion.copy(q)

    this.wheelRBBody.velocity.set(0, 0, 0)
    this.wheelRBBody.angularVelocity.set(0, 0, 0)
    this.wheelRBBody.position.set(
      startPosition.x + 1,
      startPosition.y,
      startPosition.z + 1
    )
    this.wheelRBBody.quaternion.copy(q)

    this.physics.world.addBody(this.frameBody)
    this.physics.world.addBody(this.wheelLFBody)
    this.physics.world.addBody(this.wheelRFBody)
    this.physics.world.addBody(this.wheelLBBody)
    this.physics.world.addBody(this.wheelRBBody)
  }

  update () {
    this.chaseCam.getWorldPosition(this.camPos)
    this.camera.position.lerpVectors(this.camera.position, this.camPos, 0.1)

    this.chaseCam.getWorldQuaternion(this.camQuat)
    this.camera.quaternion.slerp(this.camQuat, 0.1)

    this.frameMesh.position.x = this.frameBody.position.x
    this.frameMesh.position.y = this.frameBody.position.y
    this.frameMesh.position.z = this.frameBody.position.z
    this.frameMesh.quaternion.x = this.frameBody.quaternion.x
    this.frameMesh.quaternion.y = this.frameBody.quaternion.y
    this.frameMesh.quaternion.z = this.frameBody.quaternion.z
    this.frameMesh.quaternion.w = this.frameBody.quaternion.w

    this.wheelLFMesh.position.x = this.wheelLFBody.position.x
    this.wheelLFMesh.position.y = this.wheelLFBody.position.y
    this.wheelLFMesh.position.z = this.wheelLFBody.position.z
    this.wheelLFMesh.quaternion.x = this.wheelLFBody.quaternion.x
    this.wheelLFMesh.quaternion.y = this.wheelLFBody.quaternion.y
    this.wheelLFMesh.quaternion.z = this.wheelLFBody.quaternion.z
    this.wheelLFMesh.quaternion.w = this.wheelLFBody.quaternion.w

    this.wheelRFMesh.position.x = this.wheelRFBody.position.x
    this.wheelRFMesh.position.y = this.wheelRFBody.position.y
    this.wheelRFMesh.position.z = this.wheelRFBody.position.z
    this.wheelRFMesh.quaternion.x = this.wheelRFBody.quaternion.x
    this.wheelRFMesh.quaternion.y = this.wheelRFBody.quaternion.y
    this.wheelRFMesh.quaternion.z = this.wheelRFBody.quaternion.z
    this.wheelRFMesh.quaternion.w = this.wheelRFBody.quaternion.w

    this.wheelLBMesh.position.x = this.wheelLBBody.position.x
    this.wheelLBMesh.position.y = this.wheelLBBody.position.y
    this.wheelLBMesh.position.z = this.wheelLBBody.position.z
    this.wheelLBMesh.quaternion.x = this.wheelLBBody.quaternion.x
    this.wheelLBMesh.quaternion.y = this.wheelLBBody.quaternion.y
    this.wheelLBMesh.quaternion.z = this.wheelLBBody.quaternion.z
    this.wheelLBMesh.quaternion.w = this.wheelLBBody.quaternion.w

    this.wheelRBMesh.position.x = this.wheelRBBody.position.x
    this.wheelRBMesh.position.y = this.wheelRBBody.position.y
    this.wheelRBMesh.position.z = this.wheelRBBody.position.z
    this.wheelRBMesh.quaternion.x = this.wheelRBBody.quaternion.x
    this.wheelRBMesh.quaternion.y = this.wheelRBBody.quaternion.y
    this.wheelRBMesh.quaternion.z = this.wheelRBBody.quaternion.z
    this.wheelRBMesh.quaternion.w = this.wheelRBBody.quaternion.w

    this.constraintLB.setMotorSpeed(this.forwardVelocity)
    this.constraintRB.setMotorSpeed(this.forwardVelocity)
    this.constraintLF.axisA.z = this.rightVelocity
    this.constraintRF.axisA.z = this.rightVelocity

    this.carSound.setPlaybackRate(
      Math.abs(this.forwardVelocity / 50) + Math.random() / 9
    )
  }

  fix () {
    if (this.physics.world.constraints.length === 0) {
      console.log('fixing')
      this.physics.world.addConstraint(this.constraintLF)
      this.physics.world.addConstraint(this.constraintRF)
      this.physics.world.addConstraint(this.constraintLB)
      this.physics.world.addConstraint(this.constraintRB)
    }
  }
}
