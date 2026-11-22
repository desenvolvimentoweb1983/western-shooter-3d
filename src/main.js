import './style.css'
import * as THREE from 'three'

// ======================================================
// WESTERN SHOOTER 3D - VERSÃO COMPLETA
// Controles: WASD, mouse, clique, R e ESC
// ======================================================

const root = document.querySelector('#game-root')
const hud = document.querySelector('#hud')
const menuScreen = document.querySelector('#menu-screen')
const pauseScreen = document.querySelector('#pause-screen')
const endScreen = document.querySelector('#end-screen')
const crosshair = document.querySelector('#crosshair')
const startButton = document.querySelector('#start-button')
const resumeButton = document.querySelector('#resume-button')
const restartButton = document.querySelector('#restart-button')
const playAgainButton = document.querySelector('#play-again-button')
const healthFill = document.querySelector('#health-fill')
const healthValue = document.querySelector('#health-value')
const ammoValue = document.querySelector('#ammo-value')
const reloadLabel = document.querySelector('#reload-label')
const scoreValue = document.querySelector('#score-value')
const waveValue = document.querySelector('#wave-value')
const enemiesValue = document.querySelector('#enemies-value')
const statusMessage = document.querySelector('#status-message')
const toast = document.querySelector('#toast')
const finalScore = document.querySelector('#final-score')
const endTitle = document.querySelector('#end-title')
const endDescription = document.querySelector('#end-description')
const endKicker = document.querySelector('#end-kicker')

const scene = new THREE.Scene()
scene.background = new THREE.Color(0xe9a65f)
scene.fog = new THREE.Fog(0xe9a65f, 32, 105)

const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 180)
camera.position.set(0, 9, 27)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8))
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.15
root.prepend(renderer.domElement)

const clock = new THREE.Clock()
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2(0, 0)
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const aimPoint = new THREE.Vector3(0, 0, 0)

const state = {
  mode: 'menu',
  score: 0,
  health: 100,
  maxHealth: 100,
  ammo: 12,
  magazine: 12,
  wave: 1,
  enemiesToSpawn: 0,
  spawnTimer: 0,
  reloadTimer: 0,
  fireCooldown: 0,
  damageCooldown: 0,
  waveDelay: 0,
  bossWave: false,
  mouseDown: false,
  toastTimer: 0
}

const keys = {}
const obstacles = []
const enemies = []
const bullets = []
const enemyBullets = []
const effects = []
const pickups = []

const mat = {
  ground: new THREE.MeshStandardMaterial({ color: 0xb88a50, roughness: 1 }),
  road: new THREE.MeshStandardMaterial({ color: 0x80603d, roughness: 1 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x704326, roughness: 0.95 }),
  woodLight: new THREE.MeshStandardMaterial({ color: 0xa36a38, roughness: 0.9 }),
  roof: new THREE.MeshStandardMaterial({ color: 0x4a2920, roughness: 0.95 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x2b1b14, roughness: 0.95 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x263f46, roughness: 0.4, metalness: 0.2 }),
  cactus: new THREE.MeshStandardMaterial({ color: 0x376c3e, roughness: 1 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xd5a13d, metalness: 0.55, roughness: 0.35 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.8, roughness: 0.28 }),
  bullet: new THREE.MeshStandardMaterial({ color: 0xffd45b, emissive: 0xff8a18, emissiveIntensity: 1.8 }),
  enemyBullet: new THREE.MeshStandardMaterial({ color: 0xff6238, emissive: 0xff2500, emissiveIntensity: 1.5 })
}

const hemi = new THREE.HemisphereLight(0xffe4bd, 0x68452d, 2.0)
scene.add(hemi)

const sun = new THREE.DirectionalLight(0xffd19a, 3.0)
sun.position.set(-18, 28, 16)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.left = -42
sun.shadow.camera.right = 42
sun.shadow.camera.top = 42
sun.shadow.camera.bottom = -42
scene.add(sun)

// Helpers
function mesh(geometry, material, parent, x = 0, y = 0, z = 0) {
  const object = new THREE.Mesh(geometry, material)
  object.position.set(x, y, z)
  object.castShadow = true
  object.receiveShadow = true
  parent.add(object)
  return object
}

function addObstacle(object, sx, sy, sz) {
  const box = new THREE.Box3().setFromObject(object)
  obstacles.push({ box, center: object.position.clone(), size: new THREE.Vector3(sx, sy, sz) })
}

function addBuilding(x, z, width, depth, height, label) {
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  scene.add(group)

  mesh(new THREE.BoxGeometry(width, height, depth), mat.wood, group, 0, height / 2, 0)
  mesh(new THREE.BoxGeometry(width + 0.45, 0.35, depth + 0.45), mat.roof, group, 0, height + 0.18, 0)
  mesh(new THREE.BoxGeometry(width + 0.18, 0.12, 0.25), mat.dark, group, 0, height * 0.55, depth / 2 + 0.14)

  // Porta e janelas voltadas para a rua
  mesh(new THREE.BoxGeometry(0.9, 1.7, 0.08), mat.dark, group, 0, 0.85, depth / 2 + 0.05)
  for (const side of [-1, 1]) {
    mesh(new THREE.BoxGeometry(0.65, 0.75, 0.08), mat.glass, group, side * width * 0.32, height * 0.62, depth / 2 + 0.06)
    mesh(new THREE.BoxGeometry(0.78, 0.09, 0.14), mat.woodLight, group, side * width * 0.32, height * 0.62, depth / 2 + 0.1)
  }

  // Placa simples
  const sign = mesh(new THREE.BoxGeometry(Math.min(width * 0.65, 3.8), 0.55, 0.12), mat.woodLight, group, 0, height + 0.65, depth / 2 + 0.25)
  sign.userData.label = label

  addObstacle(group, width, height + 1, depth)
  return group
}

function createCactus(x, z, scale = 1) {
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  group.scale.setScalar(scale)
  scene.add(group)
  mesh(new THREE.CylinderGeometry(0.22, 0.28, 2.1, 8), mat.cactus, group, 0, 1.05, 0)
  mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.9, 8), mat.cactus, group, -0.35, 1.0, 0)
  mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.75, 8), mat.cactus, group, 0.35, 1.35, 0)
  mesh(new THREE.SphereGeometry(0.23, 8, 8), mat.cactus, group, 0, 2.05, 0)
  addObstacle(group, 0.9 * scale, 2.2 * scale, 0.65 * scale)
  return group
}

function createCrate(x, z, size = 1) {
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  scene.add(group)
  mesh(new THREE.BoxGeometry(size, size, size), mat.woodLight, group, 0, size / 2, 0)
  for (let i = -1; i <= 1; i++) {
    mesh(new THREE.BoxGeometry(0.08, size * 0.95, size * 1.02), mat.wood, group, i * size * 0.32, size / 2, 0)
  }
  addObstacle(group, size, size, size)
}

function createBarrel(x, z) {
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  scene.add(group)
  mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.95, 12), mat.woodLight, group, 0, 0.48, 0)
  for (const y of [0.18, 0.76]) {
    mesh(new THREE.TorusGeometry(0.44, 0.045, 6, 16), mat.metal, group, 0, y, 0).rotation.x = Math.PI / 2
  }
  addObstacle(group, 0.9, 1, 0.9)
}

function buildWorld() {
  const ground = mesh(new THREE.PlaneGeometry(180, 180), mat.ground, scene, 0, -0.06, 0)
  ground.rotation.x = -Math.PI / 2

  const road = mesh(new THREE.PlaneGeometry(12, 100), mat.road, scene, 0, -0.025, -12)
  road.rotation.x = -Math.PI / 2

  // Laterais da cidade
  addBuilding(-11, -7, 7, 6, 4.6, 'SALoon')
  addBuilding(11, -9, 7, 6, 4.4, 'HOTEL')
  addBuilding(-12, -25, 7, 7, 4.2, 'LOJA')
  addBuilding(12, -27, 7, 7, 4.5, 'DELEGACIA')
  addBuilding(-10, -45, 8, 7, 4.3, 'ESTÁBULO')
  addBuilding(10, -47, 8, 7, 4.3, 'BANCO')

  createBarrel(-5.8, 2)
  createBarrel(5.8, -3)
  createBarrel(-6.2, -17)
  createBarrel(6.1, -22)
  createCrate(-5.5, -10, 1.2)
  createCrate(5.4, -14, 1.1)
  createCrate(-6, -34, 1.3)
  createCrate(6, -39, 1.2)

  for (const [x, z, s] of [
    [-18, 2, 1.2], [18, 1, 1.1], [-19, -18, 1.4], [19, -21, 1.3],
    [-18, -40, 1.2], [18, -44, 1.4], [-7, -53, 1], [7, -55, 1.1]
  ]) createCactus(x, z, s)

  // Montanhas distantes
  const mountainMat = new THREE.MeshStandardMaterial({ color: 0x9a6040, roughness: 1 })
  for (let i = 0; i < 13; i++) {
    const h = 9 + Math.random() * 12
    const m = mesh(new THREE.ConeGeometry(7 + Math.random() * 5, h, 5), mountainMat, scene,
      -55 + i * 9, h / 2 - 1, -65 - Math.random() * 15)
    m.rotation.y = Math.random() * Math.PI
  }
}
buildWorld()

// Player
const player = new THREE.Group()
scene.add(player)
player.position.set(0, 0, 16)

const playerM = {
  skin: new THREE.MeshStandardMaterial({ color: 0xd69a6b }),
  shirt: new THREE.MeshStandardMaterial({ color: 0xe5d2a9 }),
  vest: new THREE.MeshStandardMaterial({ color: 0x754321 }),
  leather: new THREE.MeshStandardMaterial({ color: 0x38251b }),
  hat: new THREE.MeshStandardMaterial({ color: 0x302018 }),
  hatBand: new THREE.MeshStandardMaterial({ color: 0xc18b45 }),
  scarf: new THREE.MeshStandardMaterial({ color: 0xa9231e }),
  jeans: new THREE.MeshStandardMaterial({ color: 0x294e85 }),
  boots: new THREE.MeshStandardMaterial({ color: 0x24160f }),
  gold: mat.gold,
  metal: mat.metal,
  white: new THREE.MeshStandardMaterial({ color: 0xf5e9d5 }),
  black: new THREE.MeshStandardMaterial({ color: 0x17120f })
}

const playerShadow = mesh(new THREE.CircleGeometry(0.65, 20),
  new THREE.MeshBasicMaterial({ color: 0x302016, transparent: true, opacity: 0.24 }), player, 0, 0.025, 0)
playerShadow.rotation.x = -Math.PI / 2

const leftLeg = new THREE.Group()
leftLeg.position.set(-0.2, 0.85, 0)
player.add(leftLeg)
mesh(new THREE.BoxGeometry(0.31, 0.8, 0.36), playerM.jeans, leftLeg, 0, -0.4, 0)
mesh(new THREE.BoxGeometry(0.36, 0.22, 0.5), playerM.boots, leftLeg, 0, -0.79, 0.08)

const rightLeg = new THREE.Group()
rightLeg.position.set(0.2, 0.85, 0)
player.add(rightLeg)
mesh(new THREE.BoxGeometry(0.31, 0.8, 0.36), playerM.jeans, rightLeg, 0, -0.4, 0)
mesh(new THREE.BoxGeometry(0.36, 0.22, 0.5), playerM.boots, rightLeg, 0, -0.79, 0.08)

mesh(new THREE.BoxGeometry(0.82, 0.9, 0.48), playerM.shirt, player, 0, 1.3, 0)
mesh(new THREE.BoxGeometry(0.85, 0.73, 0.5), playerM.vest, player, 0, 1.32, 0.015)
mesh(new THREE.BoxGeometry(0.85, 0.14, 0.5), playerM.leather, player, 0, 0.85, 0)
mesh(new THREE.BoxGeometry(0.19, 0.19, 0.06), playerM.gold, player, 0, 0.85, 0.29)

// Botões do colete
for (const side of [-1, 1]) {
  for (const y of [1.15, 1.35, 1.55]) mesh(new THREE.SphereGeometry(0.035, 8, 8), playerM.gold, player, side * 0.17, y, 0.29)
}

const leftArm = new THREE.Group()
leftArm.position.set(-0.49, 1.65, 0)
player.add(leftArm)
mesh(new THREE.BoxGeometry(0.25, 0.62, 0.28), playerM.shirt, leftArm, 0, -0.3, 0)
mesh(new THREE.BoxGeometry(0.21, 0.17, 0.22), playerM.skin, leftArm, 0, -0.68, 0.02)

const rightArm = new THREE.Group()
rightArm.position.set(0.49, 1.65, 0)
player.add(rightArm)
mesh(new THREE.BoxGeometry(0.25, 0.62, 0.28), playerM.shirt, rightArm, 0, -0.3, 0)
mesh(new THREE.BoxGeometry(0.21, 0.17, 0.22), playerM.skin, rightArm, 0, -0.68, 0.08)

const revolver = new THREE.Group()
mesh(new THREE.BoxGeometry(0.14, 0.15, 0.5), playerM.metal, revolver, 0, 0, 0.24)
mesh(new THREE.BoxGeometry(0.15, 0.25, 0.15), playerM.leather, revolver, 0, -0.16, 0.06)
mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.13, 12), playerM.gold, revolver, 0, 0.01, 0.08)
revolver.position.set(0, -0.68, 0.16)
rightArm.add(revolver)

mesh(new THREE.BoxGeometry(0.5, 0.18, 0.48), playerM.scarf, player, 0, 1.78, 0)
const scarfTail = mesh(new THREE.BoxGeometry(0.16, 0.32, 0.08), playerM.scarf, player, 0.2, 1.59, 0.25)
scarfTail.rotation.z = -0.25

mesh(new THREE.SphereGeometry(0.3, 20, 16), playerM.skin, player, 0, 2.08, 0)
for (const side of [-1, 1]) {
  mesh(new THREE.SphereGeometry(0.09, 10, 10), playerM.skin, player, side * 0.29, 2.08, 0)
  mesh(new THREE.SphereGeometry(0.05, 10, 10), playerM.white, player, side * 0.11, 2.13, 0.26)
  mesh(new THREE.SphereGeometry(0.027, 8, 8), playerM.black, player, side * 0.11, 2.13, 0.3)
  const brow = mesh(new THREE.BoxGeometry(0.14, 0.035, 0.04), playerM.leather, player, side * 0.11, 2.21, 0.27)
  brow.rotation.z = side * -0.1
}
mesh(new THREE.SphereGeometry(0.065, 10, 10), playerM.skin, player, 0, 2.03, 0.31)
const beard = mesh(new THREE.SphereGeometry(0.23, 16, 12), playerM.leather, player, 0, 1.91, 0.08)
beard.scale.set(1, 0.48, 0.85)
for (const side of [-1, 1]) {
  const moustache = mesh(new THREE.SphereGeometry(0.1, 10, 8), playerM.leather, player, side * 0.08, 1.98, 0.3)
  moustache.scale.set(1, 0.45, 0.65)
}
mesh(new THREE.CylinderGeometry(0.58, 0.53, 0.08, 24), playerM.hat, player, 0, 2.36, 0)
mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.38, 18), playerM.hat, player, 0, 2.57, 0)
mesh(new THREE.CylinderGeometry(0.355, 0.355, 0.07, 18), playerM.hatBand, player, 0, 2.48, 0)
mesh(new THREE.BoxGeometry(0.1, 0.07, 0.025), playerM.gold, player, 0, 2.48, 0.36)

// Holster
const holster = mesh(new THREE.BoxGeometry(0.23, 0.42, 0.28), playerM.leather, player, 0.48, 0.65, 0.02)
holster.rotation.z = -0.18

// Enemy construction
const enemyMaterials = [
  { shirt: 0x7c3327, vest: 0x3b241c, pants: 0x4b3d30, scarf: 0xd3a04e, hat: 0x291b16 },
  { shirt: 0x526b58, vest: 0x343c2e, pants: 0x343f5a, scarf: 0x9e2c23, hat: 0x24201b },
  { shirt: 0x9b784b, vest: 0x52331f, pants: 0x534b3f, scarf: 0x6c2520, hat: 0x3a281b }
]

function createEnemyPart(parent, geometry, material, x, y, z) {
  return mesh(geometry, material, parent, x, y, z)
}

function createEnemy(x, z, boss = false) {
  const enemy = new THREE.Group()
  enemy.position.set(x, 0, z)
  scene.add(enemy)

  const variant = enemyMaterials[Math.floor(Math.random() * enemyMaterials.length)]
  const em = {
    skin: new THREE.MeshStandardMaterial({ color: 0xc98d62 }),
    shirt: new THREE.MeshStandardMaterial({ color: variant.shirt }),
    vest: new THREE.MeshStandardMaterial({ color: variant.vest }),
    pants: new THREE.MeshStandardMaterial({ color: variant.pants }),
    scarf: new THREE.MeshStandardMaterial({ color: variant.scarf }),
    hat: new THREE.MeshStandardMaterial({ color: variant.hat }),
    leather: new THREE.MeshStandardMaterial({ color: 0x281a13 }),
    gold: mat.gold,
    metal: mat.metal,
    white: playerM.white,
    black: playerM.black
  }
  const s = boss ? 1.35 : 1
  enemy.scale.setScalar(s)

  const lLeg = new THREE.Group()
  lLeg.position.set(-0.19, 0.83, 0)
  enemy.add(lLeg)
  createEnemyPart(lLeg, new THREE.BoxGeometry(0.3, 0.76, 0.34), em.pants, 0, -0.38, 0)
  createEnemyPart(lLeg, new THREE.BoxGeometry(0.35, 0.2, 0.48), em.leather, 0, -0.75, 0.07)

  const rLeg = new THREE.Group()
  rLeg.position.set(0.19, 0.83, 0)
  enemy.add(rLeg)
  createEnemyPart(rLeg, new THREE.BoxGeometry(0.3, 0.76, 0.34), em.pants, 0, -0.38, 0)
  createEnemyPart(rLeg, new THREE.BoxGeometry(0.35, 0.2, 0.48), em.leather, 0, -0.75, 0.07)

  createEnemyPart(enemy, new THREE.BoxGeometry(0.78, 0.82, 0.43), em.shirt, 0, 1.25, 0)
  createEnemyPart(enemy, new THREE.BoxGeometry(0.8, 0.65, 0.45), em.vest, 0, 1.29, 0.02)
  createEnemyPart(enemy, new THREE.BoxGeometry(0.82, 0.12, 0.47), em.leather, 0, 0.84, 0)
  createEnemyPart(enemy, new THREE.BoxGeometry(0.16, 0.16, 0.05), em.gold, 0, 0.84, 0.25)
  createEnemyPart(enemy, new THREE.BoxGeometry(0.42, 0.15, 0.44), em.scarf, 0, 1.73, 0)

  const lArm = new THREE.Group()
  lArm.position.set(-0.47, 1.6, 0)
  enemy.add(lArm)
  createEnemyPart(lArm, new THREE.BoxGeometry(0.23, 0.58, 0.25), em.shirt, 0, -0.29, 0)
  createEnemyPart(lArm, new THREE.BoxGeometry(0.19, 0.16, 0.2), em.skin, 0, -0.65, 0.02)

  const rArm = new THREE.Group()
  rArm.position.set(0.47, 1.6, 0)
  enemy.add(rArm)
  createEnemyPart(rArm, new THREE.BoxGeometry(0.23, 0.58, 0.25), em.shirt, 0, -0.29, 0)
  createEnemyPart(rArm, new THREE.BoxGeometry(0.19, 0.16, 0.2), em.skin, 0, -0.65, 0.08)

  const enemyGun = new THREE.Group()
  createEnemyPart(enemyGun, new THREE.BoxGeometry(0.12, 0.13, 0.42), em.metal, 0, 0, 0.2)
  createEnemyPart(enemyGun, new THREE.BoxGeometry(0.13, 0.22, 0.13), em.leather, 0, -0.15, 0.05)
  enemyGun.position.set(0, -0.65, 0.12)
  rArm.add(enemyGun)

  createEnemyPart(enemy, new THREE.SphereGeometry(0.28, 16, 14), em.skin, 0, 2.02, 0)
  for (const side of [-1, 1]) {
    createEnemyPart(enemy, new THREE.SphereGeometry(0.045, 8, 8), em.white, side * 0.1, 2.08, 0.24)
    createEnemyPart(enemy, new THREE.SphereGeometry(0.025, 8, 8), em.black, side * 0.1, 2.08, 0.28)
  }
  createEnemyPart(enemy, new THREE.SphereGeometry(0.15, 12, 10), em.leather, 0, 1.88, 0.08)
  createEnemyPart(enemy, new THREE.CylinderGeometry(0.53, 0.5, 0.07, 20), em.hat, 0, 2.29, 0)
  createEnemyPart(enemy, new THREE.CylinderGeometry(0.29, 0.33, 0.32, 16), em.hat, 0, 2.47, 0)
  createEnemyPart(enemy, new THREE.CylinderGeometry(0.335, 0.335, 0.06, 16), em.gold, 0, 2.4, 0)

  enemy.userData = {
    health: boss ? 12 + state.wave * 2 : 2 + Math.floor(state.wave / 3),
    maxHealth: boss ? 12 + state.wave * 2 : 2 + Math.floor(state.wave / 3),
    speed: boss ? 1.45 : 1.9 + Math.min(state.wave * 0.08, 1.2),
    shootTimer: 1.4 + Math.random() * 1.5,
    phase: Math.random() * 10,
    leftLeg: lLeg,
    rightLeg: rLeg,
    leftArm: lArm,
    rightArm: rArm,
    boss
  }
  enemies.push(enemy)
  return enemy
}

// Particle and effects
function burst(position, color = 0xffc45b, amount = 8, size = 0.09) {
  for (let i = 0; i < amount; i++) {
    const particle = mesh(new THREE.SphereGeometry(size, 6, 6),
      new THREE.MeshBasicMaterial({ color, transparent: true }), scene,
      position.x, position.y, position.z)
    particle.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 4,
      Math.random() * 3,
      (Math.random() - 0.5) * 4
    )
    particle.userData.life = 0.45 + Math.random() * 0.35
    effects.push(particle)
  }
}

function showToast(message, duration = 1.6) {
  toast.textContent = message
  toast.classList.add('show')
  state.toastTimer = duration
}

function updateHud() {
  healthFill.style.width = `${Math.max(0, state.health / state.maxHealth * 100)}%`
  healthValue.textContent = Math.ceil(state.health)
  ammoValue.textContent = `${state.ammo} / ${state.magazine}`
  reloadLabel.textContent = state.reloadTimer > 0 ? 'RECARREGANDO...' : ''
  scoreValue.textContent = state.score.toLocaleString('pt-BR')
  waveValue.textContent = state.wave
  enemiesValue.textContent = `INIMIGOS: ${enemies.length + state.enemiesToSpawn}`
}

function startGame() {
  resetGame()
  state.mode = 'playing'
  menuScreen.classList.add('hidden')
  pauseScreen.classList.add('hidden')
  endScreen.classList.add('hidden')
  hud.classList.remove('hidden')
  crosshair.classList.remove('hidden')
  showToast('BOA SORTE, XERIFE!')
  renderer.domElement.requestPointerLock?.()
}

function resetGame() {
  for (const list of [enemies, bullets, enemyBullets, effects, pickups]) {
    for (const object of [...list]) {
      scene.remove(object)
      disposeObject(object)
    }
    list.length = 0
  }
  state.score = 0
  state.health = state.maxHealth
  state.ammo = state.magazine
  state.wave = 1
  state.enemiesToSpawn = 0
  state.spawnTimer = 0
  state.reloadTimer = 0
  state.fireCooldown = 0
  state.damageCooldown = 0
  state.waveDelay = 0
  state.bossWave = false
  state.mouseDown = false
  player.position.set(0, 0, 16)
  player.rotation.y = 0
  beginWave()
  updateHud()
}

function disposeObject(object) {
  object.traverse?.(child => {
    if (child.geometry) child.geometry.dispose()
    if (child.material && !Array.isArray(child.material)) {
      // Materiais compartilhados não são descartados aqui.
    }
  })
}

function beginWave() {
  state.bossWave = state.wave % 4 === 0
  state.enemiesToSpawn = state.bossWave ? 1 : 4 + state.wave * 2
  state.spawnTimer = 0.7
  state.waveDelay = 0
  showToast(state.bossWave ? `CHEFE DA FASE ${state.wave}` : `FASE ${state.wave}`)
  statusMessage.textContent = state.bossWave ? 'DERROTE O CHEFE!' : 'ELIMINE TODOS OS INIMIGOS'
}

function pauseGame() {
  if (state.mode !== 'playing') return
  state.mode = 'paused'
  state.mouseDown = false
  pauseScreen.classList.remove('hidden')
  document.exitPointerLock?.()
}

function resumeGame() {
  if (state.mode !== 'paused') return
  state.mode = 'playing'
  pauseScreen.classList.add('hidden')
  renderer.domElement.requestPointerLock?.()
}

function finishGame(victory) {
  state.mode = 'ended'
  state.mouseDown = false
  document.exitPointerLock?.()
  hud.classList.add('hidden')
  crosshair.classList.add('hidden')
  endScreen.classList.remove('hidden')
  endTitle.textContent = victory ? 'VITÓRIA!' : 'DERROTA'
  endTitle.style.color = victory ? '#f2c36e' : '#e17c59'
  endKicker.textContent = victory ? 'A CIDADE ESTÁ A SALVO' : 'O VELHO OESTE NÃO PERDOA'
  endDescription.textContent = victory
    ? 'Você derrotou o bando e se tornou uma lenda.'
    : 'Os bandidos dominaram a cidade. Tente novamente!'
  finalScore.textContent = state.score.toLocaleString('pt-BR')
}

function reload() {
  if (state.mode !== 'playing' || state.reloadTimer > 0 || state.ammo === state.magazine) return
  state.reloadTimer = 1.15
  showToast('RECARREGANDO...')
}

function finishReload() {
  state.ammo = state.magazine
  state.reloadTimer = 0
  updateHud()
}

function getAimPoint() {
  raycaster.setFromCamera(mouse, camera)
  const result = new THREE.Vector3()
  if (raycaster.ray.intersectPlane(groundPlane, result)) {
    aimPoint.copy(result)
    return result
  }
  return new THREE.Vector3(player.position.x, 0, player.position.z - 10)
}

function aimPlayer() {
  const target = getAimPoint()
  const dx = target.x - player.position.x
  const dz = target.z - player.position.z
  player.rotation.y = Math.atan2(dx, dz)
}

function shootPlayer() {
  if (state.mode !== 'playing' || state.reloadTimer > 0 || state.fireCooldown > 0) return
  if (state.ammo <= 0) {
    showToast('SEM MUNIÇÃO! PRESSIONE R')
    state.fireCooldown = 0.3
    return
  }

  state.ammo--
  state.fireCooldown = 0.22
  rightArm.rotation.x = -0.32
  const direction = new THREE.Vector3(Math.sin(player.rotation.y), 0, Math.cos(player.rotation.y)).normalize()
  const origin = player.position.clone().add(new THREE.Vector3(0, 1.35, 0)).add(direction.clone().multiplyScalar(0.85))
  const bullet = mesh(new THREE.SphereGeometry(0.105, 8, 8), mat.bullet, scene, origin.x, origin.y, origin.z)
  bullet.userData.velocity = direction.multiplyScalar(28)
  bullet.userData.life = 1.7
  bullets.push(bullet)
  burst(origin.clone().add(new THREE.Vector3(0, 0.05, 0)), 0xffd16a, 3, 0.055)
  updateHud()
}

function shootEnemy(enemy) {
  const origin = enemy.position.clone().add(new THREE.Vector3(0, 1.35, 0))
  const target = player.position.clone().add(new THREE.Vector3(0, 1.1, 0))
  const direction = target.sub(origin).normalize()
  const bullet = mesh(new THREE.SphereGeometry(0.11, 8, 8), mat.enemyBullet, scene, origin.x, origin.y, origin.z)
  bullet.userData.velocity = direction.multiplyScalar(13)
  bullet.userData.life = 3
  enemyBullets.push(bullet)
  enemy.userData.rightArm.rotation.x = -0.3
}

function damageEnemy(enemy, amount = 1) {
  if (!enemies.includes(enemy)) return
  enemy.userData.health -= amount
  burst(enemy.position.clone().add(new THREE.Vector3(0, 1.1, 0)), 0xffa15b, 5, 0.07)
  if (enemy.userData.health <= 0) {
    const boss = enemy.userData.boss
    state.score += boss ? 1500 : 100
    burst(enemy.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xffc16b, boss ? 24 : 12, 0.1)
    scene.remove(enemy)
    enemies.splice(enemies.indexOf(enemy), 1)
    disposeObject(enemy)
    if (boss) {
      showToast('CHEFE DERROTADO! +1500')
      state.health = Math.min(state.maxHealth, state.health + 20)
    }
    updateHud()
  }
}

function playerTakeDamage(amount) {
  if (state.damageCooldown > 0 || state.mode !== 'playing') return
  state.health = Math.max(0, state.health - amount)
  state.damageCooldown = 0.45
  burst(player.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xff5533, 5, 0.07)
  showToast(`VOCÊ FOI ATINGIDO! -${amount}`)
  updateHud()
  if (state.health <= 0) finishGame(false)
}

function spawnPickup(position) {
  if (Math.random() > 0.22) return
  const pickup = mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32),
    new THREE.MeshStandardMaterial({ color: 0x69b85d, emissive: 0x1c5514, emissiveIntensity: 0.4 }),
    scene, position.x, 0.45, position.z)
  pickup.userData.life = 12
  pickups.push(pickup)
}

function updatePlayer(dt) {
  const move = new THREE.Vector3(
    (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0),
    0,
    (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0)
  )
  const moving = move.lengthSq() > 0
  if (moving) {
    move.normalize()
    const speed = keys.ShiftLeft ? 8.5 : 6.2
    const next = player.position.clone().add(move.clone().multiplyScalar(speed * dt))
    next.x = THREE.MathUtils.clamp(next.x, -8.3, 8.3)
    next.z = THREE.MathUtils.clamp(next.z, -58, 22)

    const playerBox = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(next.x, 0.9, next.z), new THREE.Vector3(0.8, 1.8, 0.8)
    )
    let blocked = false
    for (const obstacle of obstacles) {
      const expanded = obstacle.box.clone().expandByScalar(0.45)
      if (playerBox.intersectsBox(expanded)) { blocked = true; break }
    }
    if (!blocked) player.position.copy(next)

    const walk = clock.elapsedTime * 11
    leftLeg.rotation.x = Math.sin(walk) * 0.55
    rightLeg.rotation.x = Math.sin(walk + Math.PI) * 0.55
    leftArm.rotation.x = Math.sin(walk + Math.PI) * 0.18
    rightArm.rotation.x = -0.12 + Math.sin(walk) * 0.06
    player.position.y = Math.abs(Math.sin(walk * 2)) * 0.025
  } else {
    leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, 0, 10, dt)
    rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, 0, 10, dt)
    leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, 0, 10, dt)
    rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, -0.12, 10, dt)
    player.position.y = 0
  }

  aimPlayer()
  if (state.mouseDown) shootPlayer()

  // câmera acompanha o jogador mantendo a cidade à frente
  const desiredCamera = new THREE.Vector3(
    player.position.x * 0.42,
    8.5,
    player.position.z + 11.5
  )
  camera.position.lerp(desiredCamera, 1 - Math.exp(-4 * dt))
  camera.lookAt(player.position.x, 1.1, player.position.z - 9)
}

function spawnEnemy() {
  const side = Math.random() < 0.5 ? -1 : 1
  const x = side * (4.5 + Math.random() * 3)
  const z = player.position.z - 19 - Math.random() * 17
  createEnemy(x, z, state.bossWave)
  state.enemiesToSpawn--
  updateHud()
}

function updateEnemies(dt) {
  for (const enemy of [...enemies]) {
    const data = enemy.userData
    const dx = player.position.x - enemy.position.x
    const dz = player.position.z - enemy.position.z
    const distance = Math.hypot(dx, dz)
    enemy.rotation.y = Math.atan2(dx, dz)

    if (distance > 4.8) {
      const dir = new THREE.Vector3(dx, 0, dz).normalize()
      const next = enemy.position.clone().add(dir.multiplyScalar(data.speed * dt))
      next.x = THREE.MathUtils.clamp(next.x, -8.2, 8.2)
      next.z = THREE.MathUtils.clamp(next.z, -60, 22)
      enemy.position.copy(next)
      const walk = clock.elapsedTime * 8 + data.phase
      data.leftLeg.rotation.x = Math.sin(walk) * 0.5
      data.rightLeg.rotation.x = Math.sin(walk + Math.PI) * 0.5
      data.leftArm.rotation.x = Math.sin(walk + Math.PI) * 0.15
      data.rightArm.rotation.x = -0.18 + Math.sin(walk) * 0.05
    } else {
      data.leftLeg.rotation.x = 0
      data.rightLeg.rotation.x = 0
      data.rightArm.rotation.x = -0.25
    }

    data.shootTimer -= dt
    if (distance < 18 && data.shootTimer <= 0) {
      shootEnemy(enemy)
      data.shootTimer = Math.max(0.8, 2.2 - state.wave * 0.05) + Math.random() * 0.8
    }

    if (distance < 1.05) playerTakeDamage(data.boss ? 18 : 10)
  }
}

function updateBullets(dt) {
  for (const bullet of [...bullets]) {
    bullet.position.addScaledVector(bullet.userData.velocity, dt)
    bullet.userData.life -= dt
    let removed = false

    // A bala desaparece ao tocar em inimigos, prédios, barris, caixas ou cactos.
    for (const enemy of [...enemies]) {
      const target = enemy.position.clone().add(new THREE.Vector3(0, 1.05, 0))
      if (bullet.position.distanceTo(target) < (enemy.userData.boss ? 1.25 : 0.78)) {
        damageEnemy(enemy, 1)
        removed = true
        break
      }
    }

    if (!removed) {
      for (const obstacle of obstacles) {
        const box = obstacle.box.clone().expandByScalar(0.12)
        if (box.containsPoint(bullet.position)) {
          burst(bullet.position, 0xd5a15b, 4, 0.05)
          removed = true
          break
        }
      }
    }

    if (removed || bullet.userData.life <= 0 || bullet.position.y < 0 || bullet.position.z < -75) {
      scene.remove(bullet)
      bullets.splice(bullets.indexOf(bullet), 1)
    }
  }

  for (const bullet of [...enemyBullets]) {
    bullet.position.addScaledVector(bullet.userData.velocity, dt)
    bullet.userData.life -= dt
    const playerTarget = player.position.clone().add(new THREE.Vector3(0, 1, 0))
    if (bullet.position.distanceTo(playerTarget) < 0.75) {
      playerTakeDamage(8)
      scene.remove(bullet)
      enemyBullets.splice(enemyBullets.indexOf(bullet), 1)
      continue
    }
    if (bullet.userData.life <= 0 || bullet.position.z > 30 || bullet.position.z < -80) {
      scene.remove(bullet)
      enemyBullets.splice(enemyBullets.indexOf(bullet), 1)
    }
  }
}

function updatePickups(dt) {
  for (const pickup of [...pickups]) {
    pickup.rotation.y += dt * 2
    pickup.position.y = 0.45 + Math.sin(clock.elapsedTime * 4) * 0.08
    pickup.userData.life -= dt
    if (pickup.position.distanceTo(player.position) < 1.25) {
      state.health = Math.min(state.maxHealth, state.health + 20)
      state.ammo = state.magazine
      showToast('SUPRIMENTO: +20 VIDA E MUNIÇÃO')
      updateHud()
      scene.remove(pickup)
      pickups.splice(pickups.indexOf(pickup), 1)
    } else if (pickup.userData.life <= 0) {
      scene.remove(pickup)
      pickups.splice(pickups.indexOf(pickup), 1)
    }
  }
}

function updateEffects(dt) {
  for (const effect of [...effects]) {
    effect.userData.life -= dt
    effect.position.addScaledVector(effect.userData.velocity, dt)
    effect.userData.velocity.y -= 5 * dt
    effect.material.opacity = Math.max(0, effect.userData.life * 1.5)
    if (effect.userData.life <= 0) {
      scene.remove(effect)
      effects.splice(effects.indexOf(effect), 1)
    }
  }
}

function updateGame(dt) {
  state.fireCooldown = Math.max(0, state.fireCooldown - dt)
  state.damageCooldown = Math.max(0, state.damageCooldown - dt)

  if (state.reloadTimer > 0) {
    state.reloadTimer -= dt
    if (state.reloadTimer <= 0) finishReload()
  }

  if (state.toastTimer > 0) {
    state.toastTimer -= dt
    if (state.toastTimer <= 0) toast.classList.remove('show')
  }

  updatePlayer(dt)
  updateEnemies(dt)
  updateBullets(dt)
  updatePickups(dt)
  updateEffects(dt)

  if (state.enemiesToSpawn > 0) {
    state.spawnTimer -= dt
    if (state.spawnTimer <= 0) {
      spawnEnemy()
      state.spawnTimer = state.bossWave ? 0.1 : Math.max(0.45, 1.15 - state.wave * 0.035)
    }
  } else if (enemies.length === 0) {
    state.waveDelay += dt
    statusMessage.textContent = 'ÁREA LIMPA!'
    if (state.waveDelay > 2.4) {
      state.wave++
      state.health = Math.min(state.maxHealth, state.health + 12)
      state.ammo = state.magazine
      beginWave()
      updateHud()
    }
  }

  updateHud()
}

function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.04)
  if (state.mode === 'playing') updateGame(dt)
  else {
    updateEffects(dt)
    // câmera e luzes continuam estáveis no menu/pausa
  }
  renderer.render(scene, camera)
}
animate()

// Input
addEventListener('keydown', event => {
  keys[event.code] = true
  if (event.code === 'Escape') {
    if (state.mode === 'playing') pauseGame()
    else if (state.mode === 'paused') resumeGame()
  }
  if (event.code === 'KeyR') reload()
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault()
})

addEventListener('keyup', event => { keys[event.code] = false })

renderer.domElement.addEventListener('pointermove', event => {
  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  crosshair.style.left = `${event.clientX}px`
  crosshair.style.top = `${event.clientY}px`
})

renderer.domElement.addEventListener('pointerdown', event => {
  if (event.button !== 0) return
  if (state.mode === 'playing') {
    state.mouseDown = true
    if (document.pointerLockElement !== renderer.domElement) {
      // A mira também funciona sem pointer lock; o cursor continua visível.
    }
  }
})

addEventListener('pointerup', () => { state.mouseDown = false })
addEventListener('blur', () => { state.mouseDown = false; for (const key in keys) keys[key] = false })

startButton.addEventListener('click', startGame)
resumeButton.addEventListener('click', resumeGame)
restartButton.addEventListener('click', startGame)
playAgainButton.addEventListener('click', startGame)

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8))
})

// Estado inicial
updateHud()
