import * as THREE from 'three'
import {
  Lensflare,
  LensflareElement
} from 'three/examples/jsm/objects/Lensflare.js'

export default class Cosmos {
  constructor (scene: THREE.Scene, light: THREE.Light) {
    const flareTexture = new THREE.TextureLoader().load('./assets/img/lensflare0.png')
    const lensflare = new Lensflare()
    lensflare.addElement(
      new LensflareElement(flareTexture, 100, 0, light.color)
    )
    light.add(lensflare)

    const texture = new THREE.CubeTextureLoader().load([
      './assets/img/px_eso0932a.jpg',
      './assets/img/nx_eso0932a.jpg',
      './assets/img/py_eso0932a.jpg',
      './assets/img/ny_eso0932a.jpg',
      './assets/img/pz_eso0932a.jpg',
      './assets/img/nz_eso0932a.jpg'
    ])
    scene.background = texture
  }
}
