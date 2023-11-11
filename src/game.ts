import type * as THREE from 'three'
import UI from './ui'
import Earth from './earth'
import Physics from './physics'
import CannonDebugRenderer from './utils/cannonDebugRenderer'
import Car from './car'
import type Player from './player'
import { TWEEN } from 'three/examples/jsm/libs/tween.module.min'
import type { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer'

export default class Game {
  private readonly scene: THREE.Scene
  private readonly camera: THREE.PerspectiveCamera
  private readonly renderer: THREE.WebGLRenderer
  private readonly listener: THREE.AudioListener
  private readonly labelRenderer: CSS2DRenderer
  car: Car
  earth: Earth
  private readonly physics: Physics
  private readonly cannonDebugRenderer: CannonDebugRenderer
  private readonly ui: UI
  private readonly updateInterval: any // used to update server
  private myId = ''
  private gamePhase: number = 0
  private readonly timestamp = 0
  players: Record<string, Player> = {}
  // springs: { [id: string]: Spring } = {}
  private readonly explosionSound: THREE.PositionalAudio

  isMobile = false

  constructor (
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    listener: THREE.AudioListener,
    labelRenderer: CSS2DRenderer
  ) {
    if (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )
    ) {
      this.isMobile = true
    }

    this.scene = scene
    this.camera = camera
    this.renderer = renderer
    this.listener = listener
    this.labelRenderer = labelRenderer
    this.ui = new UI(this, renderer)
    this.physics = new Physics()
    this.car = new Car(
      scene,
      camera,
      this.physics,
      this.players,
      this.listener
    )
    this.earth = new Earth(this.scene, this.physics, this.car)
    this.car.earth = this.earth

    this.cannonDebugRenderer = new CannonDebugRenderer(
      this.scene,
      this.physics.world
    )

    console.log('game on')
  }

  joined = (id: string, screenName: string, recentWinners: []): void => {
    this.myId = id;
    (
      document.getElementById('screenNameInput') as HTMLInputElement
    ).value = screenName

    this.ui.menuActive = true
    this.ui.menuPanel.style.display = 'block'

    this.ui.updateScoreBoard(recentWinners)
  }

  gameData = (gameData: any): void => {
    if (gameData.gameClock >= 0) {
      if (this.gamePhase !== 1) {
        console.log('new game')
        this.gamePhase = 1
        ;(
          document.getElementById('gameClock') as HTMLDivElement
        ).style.display = 'block'
        ;(
          document.getElementById('winnerLabel') as HTMLDivElement
        ).style.display = 'none'
        ;(
          document.getElementById(
            'winnerScreenName'
          ) as HTMLDivElement
        ).innerHTML = ''

        if (!this.car.enabled) {
          this.car.fix()
          const pos = this.earth.getSpawnPosition()
          this.car.spawn(pos)

          new TWEEN.Tween(this.car.chaseCam.position)
            .to({ z: 4 })
            .easing(TWEEN.Easing.Cubic.Out)
            .start()
        }
      }
      ;(
        document.getElementById('gameClock') as HTMLDivElement
      ).innerText = Math.floor(gameData.gameClock).toString()
    } else {
      ;(
        document.getElementById('gameClock') as HTMLDivElement
      ).style.display = 'none'
      if (
        !this.ui.menuActive &&
                gameData.gameClock >= -3 &&
                this.gamePhase === 1
      ) {
        console.log('game closed')
        this.ui.gameClosedAlert.style.display = 'block'
        setTimeout(() => {
          this.ui.gameClosedAlert.style.display = 'none'
        }, 5000)
      }
      this.gamePhase = 0
    }
  }

  update = (delta: number): void => {
    this.physics.world.step(delta)

    this.car.update()

    this.earth.update(delta)

    TWEEN.update()
  }

  // Add a function to reset the game state
  resetGame = (): void => {
    // Reset any game-specific state here
    this.gamePhase = 0
    // Reset player, moon, or any other game elements if needed
    // For example:
    this.car.update() // You can define a reset function in your Car class
    // Reset other game elements as needed
  }

  newGame = (): void => {
    // Update the game state for a new game in a single-player context
    this.ui.gameClosedAlert.style.display = 'none'

    if (!this.ui.menuActive) {
      this.ui.newGameAlert.style.display = 'block'
      setTimeout(() => {
        this.ui.newGameAlert.style.display = 'none'
        // Additional logic for a new game in single-player mode
        this.resetGame() // You can define a function to reset the game state
      }, 2000)
    }
  }
}
