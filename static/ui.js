import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { VRButton } from "three/addons/webxr/VRButton.js"
import { getConnectionEndpoints, getCurveControlPoint } from "./connectionGeometry.js"

// UI Elements
export const canvasContainer = document.getElementById("canvasContainer")
export const canvas = document.getElementById("mindmapCanvas")
export const ctx = canvas.getContext("2d")
export const loading = document.getElementById("loading")

// Toolbar buttons
export const newNodeBtn = document.getElementById("newNodeBtn")
export const connectModeBtn = document.getElementById("connectModeBtn")
export const organizeBtn = document.getElementById("organizeBtn")
export const organizeForceBtn = document.getElementById("organizeForceBtn")
export const testBtn = document.getElementById("testBtn")
export const saveBtn = document.getElementById("saveBtn")
export const newPageBtn = document.getElementById("newPageBtn")
export const changeViewBtn = document.getElementById("changeViewBtn")
export const vrViewBtn = document.getElementById("vrViewBtn")
export const themeToggle = document.getElementById("themeToggle")

// Mobile toolbar buttons
export const newNodeBtnMobile = document.getElementById("newNodeBtn-mobile")
export const connectModeBtnMobile = document.getElementById("connectModeBtn-mobile")
export const organizeBtnMobile = document.getElementById("organizeBtn-mobile")
export const organizeForceBtnMobile = document.getElementById("organizeForceBtn-mobile")
export const testBtnMobile = document.getElementById("testBtn-mobile")
export const saveBtnMobile = document.getElementById("saveBtn-mobile")
export const changeViewBtnMobile = document.getElementById("changeViewBtn-mobile")
export const vrViewBtnMobile = document.getElementById("vrViewBtn-mobile")

// Sidebar toggle
export const sidebarOpen = document.getElementById("sidebarOpen")
export const sidebarClose = document.getElementById("sidebarClose")
export const sidebar = document.querySelector(".sidebar")

// Toolbar dropdown
export const toolbarDropdownBtn = document.getElementById("toolbarDropdownBtn")
export const toolbarDropdownContent = document.getElementById("toolbarDropdownContent")

export let isDarkMode = false
export let isView3D = false

let renderer, scene, camera, controls
let graphGroup = null
let latestViewState = null
let xrNativeButton = null
let nodes3D = []
let connections3D = []
let nodeDepths = new Map()
let activeApp = null
let activeDragNode = null
let activeConnectNode = null
let dragPlane = null
let dragOffset = null
let previewLine = null
let wasDragging3D = false
let connectTargetHintShown3D = false

const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()

const levelColors = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#FFA07A",
  "#98D8C8",
  "#F06292",
  "#AED581",
  "#FFD54F",
  "#4DB6AC",
  "#7986CB",
]

export function setDarkMode(value) {
  isDarkMode = value
}

// 노드 그리기
export function drawNode(node, selectedNode, highlightedConnectTarget = null) {
  const maxWidth = 150
  const padding = 10
  const lineHeight = 18
  const borderRadius = 8
  const isConnectTarget = node === highlightedConnectTarget

  ctx.font = "14px Inter, sans-serif"

  // 텍스트 줄 바꿈
  const words = node.text.split(" ")
  const lines = []
  let currentLine = words[0]

  for (let i = 1; i < words.length; i++) {
    const word = words[i]
    const width = ctx.measureText(currentLine + " " + word).width
    if (width < maxWidth) {
      currentLine += " " + word
    } else {
      lines.push(currentLine)
      currentLine = word
    }
  }
  lines.push(currentLine)

  // 노드 크기 계산
  const textWidth = Math.min(maxWidth, Math.max(...lines.map((line) => ctx.measureText(line).width)))
  const nodeWidth = textWidth + padding * 2
  const nodeHeight = lines.length * lineHeight + padding * 2
  // 노드 크기 저장 (연결선 그리기에 사용)
  node.width = nodeWidth
  node.height = nodeHeight

  // 배경 그리기
  if (node.level !== undefined) {
    ctx.fillStyle = levelColors[node.level % levelColors.length]
  } else {
    ctx.fillStyle = isDarkMode ? "#1e293b" : "#ffffff"
  }

  // 선택된 노드 강조
  if (isConnectTarget) {
    ctx.strokeStyle = "#10b981"
    ctx.lineWidth = 3
  } else if (node === selectedNode) {
    ctx.strokeStyle = "#4f46e5"
    ctx.lineWidth = 2
  } else {
    ctx.strokeStyle = isDarkMode ? "#475569" : "#e2e8f0"
    ctx.lineWidth = 1
  }

  // 그림자 효과
  ctx.shadowColor = isConnectTarget ? "rgba(16, 185, 129, 0.35)" : "rgba(0, 0, 0, 0.1)"
  ctx.shadowBlur = isConnectTarget ? 12 : 5
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 2

  // 사각형 그리기
  ctx.beginPath()
  ctx.roundRect(node.x - nodeWidth / 2, node.y - nodeHeight / 2, nodeWidth, nodeHeight, borderRadius)
  ctx.fill()
  ctx.shadowColor = "transparent"
  ctx.stroke()

  // 텍스트 그리기
  ctx.fillStyle = isDarkMode ? "#f8fafc" : "#0f172a"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  lines.forEach((line, index) => {
    const y = node.y - ((lines.length - 1) * lineHeight) / 2 + index * lineHeight
    ctx.fillText(line, node.x, y)
  })

  // 선택된 노드에 대해 휴지통 아이콘 그리기
  if (selectedNode === node) {
    const iconSize = 24
    const iconX = node.x + node.width / 2 + 15
    const connectIconY = node.y - iconSize - 4
    const deleteIconY = node.y + 4

    node.connectHandle = {
      x: iconX,
      y: connectIconY,
      width: iconSize,
      height: iconSize,
    }

    ctx.fillStyle = "#4f46e5"
    ctx.beginPath()
    ctx.arc(iconX + iconSize / 2, connectIconY + iconSize / 2, iconSize / 2 + 4, 0, Math.PI * 2)
    ctx.fill()

    ctx.font = `600 ${iconSize}px Inter, sans-serif`
    ctx.fillStyle = "#ffffff"
    ctx.fillText("+", iconX + iconSize / 2, connectIconY + iconSize / 2 - 1)

    // 휴지통 아이콘 위치 저장 (클릭 감지용)
    node.deleteIcon = {
      x: iconX,
      y: deleteIconY,
      width: iconSize,
      height: iconSize,
    }

    // 휴지통 아이콘 배경
    ctx.fillStyle = isDarkMode ? "#334155" : "#f1f5f9"
    ctx.beginPath()
    ctx.arc(iconX + iconSize / 2, deleteIconY + iconSize / 2, iconSize / 2 + 4, 0, Math.PI * 2)
    ctx.fill()

    // 휴지통 아이콘 그리기
    ctx.font = `${iconSize}px "Font Awesome 6 Free"`
    ctx.fillStyle = isDarkMode ? "#f8fafc" : "#64748b"
    ctx.fillText("🗑️", iconX + iconSize / 2, deleteIconY + iconSize / 2 + 2)
  }
}

// 연결선 그리기
export function drawConnection(conn, selectedConnection) {
  const { start, end } = getConnectionEndpoints(conn)
  const controlPoint = getCurveControlPoint(start, end)

  // 연결선의 중간 지점 계산
  const midX = (start.x + end.x) / 2
  const midY = (start.y + end.y) / 2

  // 연결선 그리기
  if (conn === selectedConnection) {
    ctx.strokeStyle = "#4f46e5"
    ctx.lineWidth = 2
  } else {
    ctx.strokeStyle = isDarkMode ? "#94a3b8" : "#64748b"
    ctx.lineWidth = 1.5
  }

  // 곡선 연결선 그리기
  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.quadraticCurveTo(controlPoint.x, controlPoint.y, end.x, end.y)
  ctx.stroke()

  // 화살표 그리기
  const arrowSize = 8
  const angle = Math.atan2(end.y - controlPoint.y, end.x - controlPoint.x)

  ctx.save()
  ctx.translate(end.x, end.y)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(-arrowSize, -arrowSize / 2)
  ctx.lineTo(-arrowSize, arrowSize / 2)
  ctx.closePath()
  ctx.fillStyle = isDarkMode ? "#94a3b8" : "#64748b"
  if (conn === selectedConnection) {
    ctx.fillStyle = "#4f46e5"
  }
  ctx.fill()
  ctx.restore()

  // 설명 그리기
  if (conn.description) {
    // 설명 배경
    const padding = 6
    ctx.font = "12px Inter, sans-serif"
    const textWidth = ctx.measureText(conn.description).width
    const textHeight = 16

    ctx.fillStyle = isDarkMode ? "rgba(30, 41, 59, 0.8)" : "rgba(255, 255, 255, 0.8)"
    ctx.beginPath()
    ctx.roundRect(
      midX - textWidth / 2 - padding,
      midY - textHeight / 2 - padding - 8,
      textWidth + padding * 2,
      textHeight + padding * 2,
      4,
    )
    ctx.fill()

    // 설명 텍스트
    ctx.font = "12px Inter, sans-serif"
    ctx.fillStyle = isDarkMode ? "#f8fafc" : "#0f172a"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(conn.description, midX, midY - 8)
  }

  // 선택된 연결선에 대해 삭제 아이콘 그리기
  if (selectedConnection === conn) {
    const iconSize = 20

    // 삭제 아이콘 배경
    ctx.fillStyle = isDarkMode ? "#334155" : "#f1f5f9"
    ctx.beginPath()
    ctx.arc(midX, midY + 15, iconSize / 2 + 4, 0, Math.PI * 2)
    ctx.fill()

    // 삭제 아이콘 위치 저장
    conn.deleteIcon = {
      x: midX - iconSize / 2,
      y: midY + 15 - iconSize / 2,
      width: iconSize,
      height: iconSize,
    }

    // 삭제 아이콘 그리기
    ctx.font = `${iconSize}px "Font Awesome 6 Free"`
    ctx.fillStyle = isDarkMode ? "#f8fafc" : "#64748b"
    ctx.fillText("🗑️", midX, midY + 15 + 2)
  }
}

// 마인드맵 그리기
export function drawMindmap(
  nodes,
  connections,
  selectedNode,
  selectedConnection,
  highlightedConnectTarget,
  offsetX,
  offsetY,
  scale,
) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  ctx.translate(offsetX, offsetY)
  ctx.scale(scale, scale)

  // 그리드 그리기 (옵션)
  if (scale > 0.5) {
    const gridSize = 50
    const gridColor = isDarkMode ? "rgba(51, 65, 85, 0.2)" : "rgba(226, 232, 240, 0.5)"

    ctx.strokeStyle = gridColor
    ctx.lineWidth = 1

    const startX = Math.floor(-offsetX / scale / gridSize) * gridSize
    const startY = Math.floor(-offsetY / scale / gridSize) * gridSize
    const endX = startX + canvas.width / scale + gridSize
    const endY = startY + canvas.height / scale + gridSize

    for (let x = startX; x < endX; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, startY)
      ctx.lineTo(x, endY)
      ctx.stroke()
    }

    for (let y = startY; y < endY; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(startX, y)
      ctx.lineTo(endX, y)
      ctx.stroke()
    }
  }

  // 연결선 먼저 그리기
  connections.forEach(conn => drawConnection(conn, selectedConnection))

  // 그 다음 노드 그리기
  nodes.forEach(node => drawNode(node, selectedNode, highlightedConnectTarget))

  ctx.restore()
}

export function resizeCanvas(
  nodes,
  connections,
  selectedNode,
  selectedConnection,
  highlightedConnectTarget,
  offsetX,
  offsetY,
  scale,
) {
  const containerRect = canvasContainer.getBoundingClientRect()
  canvas.width = containerRect.width
  canvas.height = containerRect.height
  drawMindmap(nodes, connections, selectedNode, selectedConnection, highlightedConnectTarget, offsetX, offsetY, scale)
}

function getSceneRoot() {
  return graphGroup ?? scene
}

function renderThree() {
  if (!renderer || !scene || !camera || !controls) return

  if (!renderer.xr.isPresenting) {
    controls.update()
  }
  renderer.render(scene, camera)
}

function startThreeRenderLoop() {
  if (!renderer) return

  renderer.setAnimationLoop(renderThree)
}

function stopThreeRenderLoop() {
  if (!renderer) return

  renderer.setAnimationLoop(null)
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function getGraphViewState(nodes) {
  if (nodes.length === 0) {
    return {
      center: new THREE.Vector3(0, 0, 0),
      width: 0,
      height: 0,
      depthRange: 80,
    }
  }

  const bounds = nodes.reduce(
    (acc, node) => ({
      minX: Math.min(acc.minX, node.x),
      maxX: Math.max(acc.maxX, node.x),
      minY: Math.min(acc.minY, node.y),
      maxY: Math.max(acc.maxY, node.y),
    }),
    {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
    },
  )

  const width = bounds.maxX - bounds.minX
  const height = bounds.maxY - bounds.minY
  const maxSpan = Math.max(width, height)

  return {
    center: new THREE.Vector3((bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2, 0),
    width,
    height,
    depthRange: clamp(maxSpan * 0.35, 40, 240),
  }
}

function setRandomNodeDepths(nodes, depthRange) {
  nodes.forEach((node) => {
    if (!nodeDepths.has(node.id)) {
      nodeDepths.set(node.id, (Math.random() - 0.5) * depthRange)
    }
  })
}

function updateVRButtons(isPresenting = false) {
  const icon = '<i class="fas fa-vr-cardboard"></i>'
  const label = isPresenting ? "VR 종료" : "VR 보기"

  ;[vrViewBtn, vrViewBtnMobile].forEach((button) => {
    if (!button) return

    button.innerHTML = `${icon}<span>${label}</span>`
    button.classList.toggle("vr-active", isPresenting)
  })
}

function ensureNativeVRButton() {
  if (!renderer || xrNativeButton) return

  xrNativeButton = VRButton.createButton(renderer)
  xrNativeButton.classList.add("xr-native-button")
  xrNativeButton.setAttribute("aria-hidden", "true")
  xrNativeButton.tabIndex = -1
  canvasContainer.appendChild(xrNativeButton)
}

function getVRUnavailableMessage(error = null) {
  if (!window.isSecureContext) {
    return "VR 보기는 HTTPS 또는 localhost에서만 작동합니다."
  }

  if (!("xr" in navigator)) {
    return "이 브라우저는 WebXR VR을 지원하지 않습니다."
  }

  if (error?.name === "NotSupportedError") {
    return "연결된 VR 기기 또는 브라우저에서 몰입형 VR을 지원하지 않습니다."
  }

  if (error?.name === "SecurityError") {
    return "보안 연결에서만 VR을 시작할 수 있습니다. HTTPS 주소로 접속해 주세요."
  }

  if (error?.name === "NotAllowedError") {
    return "VR 시작 권한이 취소되었습니다."
  }

  return "VR 보기를 시작하지 못했습니다."
}

function applyVRViewingTransform() {
  if (!graphGroup || !latestViewState) return

  const span = Math.max(latestViewState.width, latestViewState.height, latestViewState.depthRange, 120)
  const scale = clamp(2.6 / span, 0.004, 0.025)

  graphGroup.scale.setScalar(scale)
  graphGroup.position.set(
    -latestViewState.center.x * scale,
    -latestViewState.center.y * scale,
    -2.4 - latestViewState.center.z * scale,
  )
}

function restoreDesktopGraphTransform() {
  if (!graphGroup) return

  graphGroup.position.set(0, 0, 0)
  graphGroup.rotation.set(0, 0, 0)
  graphGroup.scale.setScalar(1)
}

function handleXRSessionStart() {
  if (controls) controls.enabled = false

  applyVRViewingTransform()
  updateVRButtons(true)
  showToast("VR에서는 그래프를 둘러보기만 지원합니다.", "info")
}

function handleXRSessionEnd() {
  restoreDesktopGraphTransform()

  if (controls) controls.enabled = true
  updateVRButtons(false)
}

function getNodeColor(node, isSelected = false) {
  if (activeApp?.highlightedConnectTarget === node) return new THREE.Color(0x10b981)
  if (isSelected) return new THREE.Color(0x4f46e5)
  return node.level !== undefined
    ? new THREE.Color(levelColors[node.level % levelColors.length])
    : new THREE.Color(isDarkMode ? 0x1e293b : 0xffffff)
}

function generateNodes3D(node) {
  const geometry = new THREE.SphereGeometry(5, 32, 32)
  const material = new THREE.MeshBasicMaterial({
    color: getNodeColor(node, activeApp?.selectedNode === node),
  })
  const sphere = new THREE.Mesh(geometry, material)
  const z = nodeDepths.get(node.id) ?? 0
  sphere.position.set(node.x, node.y, z)
  sphere.userData = { id: node.id, text: node.text, node }

  // 노드 텍스트 추가
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")
  canvas.width = 256
  canvas.height = 128

  context.fillStyle = isDarkMode ? "#f8fafc" : "#0f172a"
  context.font = "24px Inter, sans-serif"
  context.textAlign = "center"
  context.fillText(node.text, 128, 64)

  const texture = new THREE.CanvasTexture(canvas)
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture })
  const sprite = new THREE.Sprite(spriteMaterial)
  sprite.position.set(0, -10, 0)
  sprite.scale.set(30, 15, 1)

  sphere.add(sprite)
  nodes3D.push(sphere)
}

function generateConnections3D(conn) {
  const startX = conn.start.x
  const startY = conn.start.y
  const startZ = nodeDepths.get(conn.start.id) ?? 0
  const endX = conn.end.x
  const endY = conn.end.y
  const endZ = nodeDepths.get(conn.end.id) ?? 0

  // 곡선 연결선 생성
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(startX, startY, startZ),
    new THREE.Vector3((startX + endX) / 2, (startY + endY) / 2 - 30, (startZ + endZ) / 2 + 20),
    new THREE.Vector3(endX, endY, endZ),
  )

  const points = curve.getPoints(50)
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({
    color: activeApp?.selectedConnection === conn ? 0x4f46e5 : isDarkMode ? 0x94a3b8 : 0x64748b,
    linewidth: 2,
  })
  const line = new THREE.Line(geometry, material)
  line.userData = { connection: conn }

  connections3D.push(line)
}

function setPointerFromEvent(event) {
  const rect = renderer.domElement.getBoundingClientRect()
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(pointer, camera)
}

function findNodeFromEvent(event) {
  if (!renderer || !camera) return null

  setPointerFromEvent(event)
  const intersects = raycaster.intersectObjects(nodes3D, false)
  return intersects.length > 0 ? intersects[0].object.userData.node : null
}

function findConnectionFromEvent(event) {
  if (!renderer || !camera) return null

  setPointerFromEvent(event)
  raycaster.params.Line.threshold = 8
  const intersects = raycaster.intersectObjects(connections3D, false)
  return intersects.length > 0 ? intersects[0].object.userData.connection : null
}

function getNodeMesh(node) {
  return nodes3D.find((mesh) => mesh.userData.node === node)
}

function updateNode3DPosition(node) {
  const mesh = getNodeMesh(node)
  if (!mesh) return

  const z = nodeDepths.get(node.id) ?? 0
  mesh.position.set(node.x, node.y, z)
}

function updatePreviewLine(startNode, event) {
  if (!scene || !startNode) return

  setPointerFromEvent(event)
  const startZ = nodeDepths.get(startNode.id) ?? 0
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -startZ)
  const end = new THREE.Vector3()

  if (!raycaster.ray.intersectPlane(plane, end)) return

  const start = new THREE.Vector3(startNode.x, startNode.y, startZ)
  const control = new THREE.Vector3((start.x + end.x) / 2, (start.y + end.y) / 2 - 30, startZ + 20)
  const curve = new THREE.QuadraticBezierCurve3(start, control, end)
  const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(30))

  if (!previewLine) {
    previewLine = new THREE.Line(
      geometry,
      new THREE.LineDashedMaterial({
        color: isDarkMode ? 0x94a3b8 : 0x64748b,
        dashSize: 8,
        gapSize: 6,
        transparent: true,
        opacity: 0.65,
      }),
    )
    getSceneRoot().add(previewLine)
  } else {
    previewLine.geometry.dispose()
    previewLine.geometry = geometry
  }

  previewLine.computeLineDistances()
}

function clearPreviewLine() {
  if (!previewLine || !scene) return

  getSceneRoot().remove(previewLine)
  previewLine.geometry.dispose()
  previewLine.material.dispose()
  previewLine = null
}

function refreshConnectionGeometry() {
  connections3D.forEach((line) => {
    line.geometry.dispose()
    getSceneRoot().remove(line)
  })
  connections3D = []
  activeApp.connections.forEach(generateConnections3D)
  connections3D.forEach((conn) => getSceneRoot().add(conn))
}

function handleThreePointerDown(event) {
  if (renderer?.xr.isPresenting) return
  if (!activeApp) return

  const clickedNode = findNodeFromEvent(event)

  if (clickedNode) {
    event.preventDefault()
    event.stopImmediatePropagation()
    activeApp.selectedConnection = null
    activeApp.selectedNode = clickedNode

    if (activeApp.isConnectMode) {
      activeConnectNode = clickedNode
      activeApp.highlightedConnectTarget = null
      connectTargetHintShown3D = false
      updatePreviewLine(clickedNode, event)
    } else {
      activeDragNode = clickedNode
      wasDragging3D = false
      const mesh = getNodeMesh(clickedNode)
      const z = nodeDepths.get(clickedNode.id) ?? 0
      dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -z)
      const hit = new THREE.Vector3()
      if (raycaster.ray.intersectPlane(dragPlane, hit) && mesh) {
        dragOffset = hit.sub(mesh.position)
      } else {
        dragOffset = new THREE.Vector3()
      }
      controls.enabled = false
      renderer.domElement.style.cursor = "grabbing"
    }

    refreshThreeScene(activeApp.nodes, activeApp.connections, activeApp.selectedNode, activeApp.selectedConnection)
    return
  }

  const clickedConnection = findConnectionFromEvent(event)
  if (clickedConnection) {
    event.preventDefault()
    event.stopImmediatePropagation()
    activeApp.selectedConnection = activeApp.selectedConnection === clickedConnection ? null : clickedConnection
    activeApp.selectedNode = null
    refreshThreeScene(activeApp.nodes, activeApp.connections, activeApp.selectedNode, activeApp.selectedConnection)
    return
  }

  activeApp.selectedNode = null
  activeApp.selectedConnection = null
  activeApp.highlightedConnectTarget = null
  refreshThreeScene(activeApp.nodes, activeApp.connections, activeApp.selectedNode, activeApp.selectedConnection)
}

function handleThreePointerMove(event) {
  if (renderer?.xr.isPresenting) return
  if (!activeApp) return

  if (activeConnectNode) {
    event.preventDefault()
    event.stopImmediatePropagation()
    const targetNode = findNodeFromEvent(event)
    const nextTargetNode = targetNode && targetNode !== activeConnectNode ? targetNode : null

    if (activeApp.highlightedConnectTarget !== nextTargetNode) {
      activeApp.highlightedConnectTarget = nextTargetNode
      refreshThreeScene(activeApp.nodes, activeApp.connections, activeApp.selectedNode, activeApp.selectedConnection)
    }

    if (nextTargetNode && !connectTargetHintShown3D) {
      activeApp.ui.showToast("놓으면 연결됩니다.", "info")
      connectTargetHintShown3D = true
    }

    updatePreviewLine(activeConnectNode, event)
    renderer.domElement.style.cursor = nextTargetNode ? "copy" : "crosshair"
    return
  }

  if (!activeDragNode || !dragPlane || !dragOffset) {
    renderer.domElement.style.cursor = findNodeFromEvent(event) ? "grab" : "default"
    return
  }

  event.preventDefault()
  event.stopImmediatePropagation()
  setPointerFromEvent(event)
  const hit = new THREE.Vector3()
  if (!raycaster.ray.intersectPlane(dragPlane, hit)) return

  hit.sub(dragOffset)
  activeDragNode.x = hit.x
  activeDragNode.y = hit.y
  updateNode3DPosition(activeDragNode)
  refreshConnectionGeometry()
  wasDragging3D = true
}

function handleThreePointerUp(event) {
  if (renderer?.xr.isPresenting) return
  if (!activeApp) return

  if (activeConnectNode) {
    event.preventDefault()
    event.stopImmediatePropagation()
    const targetNode = findNodeFromEvent(event)
    if (targetNode && targetNode !== activeConnectNode) {
      activeApp.createConnection(activeConnectNode, targetNode)
    }
    activeApp.selectedNode = null
    activeApp.highlightedConnectTarget = null
    activeConnectNode = null
    connectTargetHintShown3D = false
    clearPreviewLine()
    refreshThreeScene(activeApp.nodes, activeApp.connections, activeApp.selectedNode, activeApp.selectedConnection)
  }

  if (activeDragNode) {
    event.preventDefault()
    event.stopImmediatePropagation()
    activeDragNode = null
    dragPlane = null
    dragOffset = null
    controls.enabled = true
    renderer.domElement.style.cursor = "default"
    if (wasDragging3D) {
      refreshThreeScene(activeApp.nodes, activeApp.connections, activeApp.selectedNode, activeApp.selectedConnection)
    }
  }
}

function handleThreeContextMenu(event) {
  if (!canvasContainer.contains(event.target)) return

  event.preventDefault()
  event.stopImmediatePropagation()
}

function handleThreeSecondaryClick(event) {
  if (event.button !== 2 && event.buttons !== 2) return

  event.preventDefault()
}

function setupThreeInteractions(app) {
  activeApp = app
  window.addEventListener("contextmenu", handleThreeContextMenu, true)
  canvasContainer.addEventListener("contextmenu", handleThreeContextMenu, true)
  renderer.domElement.addEventListener("contextmenu", handleThreeContextMenu, true)
  renderer.domElement.oncontextmenu = handleThreeContextMenu
  renderer.domElement.addEventListener("pointerdown", handleThreeSecondaryClick, true)
  renderer.domElement.addEventListener("pointerup", handleThreeSecondaryClick, true)
  renderer.domElement.addEventListener("mousedown", handleThreeSecondaryClick, true)
  renderer.domElement.addEventListener("mouseup", handleThreeSecondaryClick, true)
  renderer.domElement.addEventListener("auxclick", handleThreeSecondaryClick, true)
  renderer.domElement.addEventListener("pointerdown", handleThreePointerDown, true)
  renderer.domElement.addEventListener("pointermove", handleThreePointerMove, true)
  renderer.domElement.addEventListener("pointerup", handleThreePointerUp, true)
  renderer.domElement.addEventListener("pointerleave", handleThreePointerUp, true)
}

function removeThreeInteractions() {
  if (!renderer) return

  window.removeEventListener("contextmenu", handleThreeContextMenu, true)
  canvasContainer.removeEventListener("contextmenu", handleThreeContextMenu, true)
  renderer.domElement.removeEventListener("contextmenu", handleThreeContextMenu, true)
  if (renderer.domElement.oncontextmenu === handleThreeContextMenu) {
    renderer.domElement.oncontextmenu = null
  }
  renderer.domElement.removeEventListener("pointerdown", handleThreeSecondaryClick, true)
  renderer.domElement.removeEventListener("pointerup", handleThreeSecondaryClick, true)
  renderer.domElement.removeEventListener("mousedown", handleThreeSecondaryClick, true)
  renderer.domElement.removeEventListener("mouseup", handleThreeSecondaryClick, true)
  renderer.domElement.removeEventListener("auxclick", handleThreeSecondaryClick, true)
  renderer.domElement.removeEventListener("pointerdown", handleThreePointerDown, true)
  renderer.domElement.removeEventListener("pointermove", handleThreePointerMove, true)
  renderer.domElement.removeEventListener("pointerup", handleThreePointerUp, true)
  renderer.domElement.removeEventListener("pointerleave", handleThreePointerUp, true)
}

export function refreshThreeScene(nodes, connections, selectedNode = null, selectedConnection = null) {
  if (!scene || !renderer) return

  const root = getSceneRoot()
  latestViewState = getGraphViewState(nodes)
  nodes3D.forEach((node) => {
    root.remove(node)
    node.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) obj.material.dispose()
    })
  })
  connections3D.forEach((conn) => {
    root.remove(conn)
    conn.geometry.dispose()
    conn.material.dispose()
  })

  nodes3D = []
  connections3D = []

  nodes.forEach((node) => {
    if (!nodeDepths.has(node.id)) nodeDepths.set(node.id, 0)
  })
  nodeDepths.forEach((_, nodeId) => {
    if (!nodes.some((node) => node.id === nodeId)) {
      nodeDepths.delete(nodeId)
    }
  })

  if (activeApp) {
    activeApp.selectedNode = selectedNode
    activeApp.selectedConnection = selectedConnection
  }

  nodes.forEach(generateNodes3D)
  connections.forEach(generateConnections3D)
  nodes3D.forEach((node) => root.add(node))
  connections3D.forEach((conn) => root.add(conn))
}

export function initializeThree(nodes, connections, app = null) {
  if (renderer?.xr.isPresenting) {
    activeApp = app
    renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight)
    refreshThreeScene(nodes, connections, app?.selectedNode ?? null, app?.selectedConnection ?? null)
    applyVRViewingTransform()
    return
  }

  if (renderer) {
    cleanupThree()
  }

  activeApp = app

  console.log("initializing three.js")
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight)
  renderer.setClearColor(isDarkMode ? 0x0f172a : 0xffffff, 1)
  renderer.domElement.style.touchAction = "none"
  renderer.xr.enabled = true
  renderer.xr.setReferenceSpaceType("local")
  renderer.xr.addEventListener("sessionstart", handleXRSessionStart)
  renderer.xr.addEventListener("sessionend", handleXRSessionEnd)

  canvasContainer.appendChild(renderer.domElement)

  scene = new THREE.Scene()
  graphGroup = new THREE.Group()
  scene.add(graphGroup)
  camera = new THREE.PerspectiveCamera(75, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.1, 1000)
  controls = new OrbitControls(camera, renderer.domElement)
  const viewState = getGraphViewState(nodes)
  latestViewState = viewState
  setRandomNodeDepths(nodes, viewState.depthRange)
  if (app) setupThreeInteractions(app)
  ensureNativeVRButton()

  // 그리드 헬퍼 추가
  const gridHelper = new THREE.GridHelper(500, 50, isDarkMode ? 0x334155 : 0xe2e8f0, isDarkMode ? 0x1e293b : 0xf1f5f9)
  gridHelper.position.y = -50
  gridHelper.position.x = viewState.center.x
  gridHelper.position.z = viewState.center.z
  graphGroup.add(gridHelper)

  nodes.forEach(generateNodes3D)
  connections.forEach(generateConnections3D)

  nodes3D.forEach((node) => graphGroup.add(node))
  connections3D.forEach((conn) => graphGroup.add(conn))

  const fovRadians = THREE.MathUtils.degToRad(camera.fov)
  const fitHeightDistance = viewState.height / 2 / Math.tan(fovRadians / 2)
  const fitWidthDistance = viewState.width / 2 / (Math.tan(fovRadians / 2) * camera.aspect)
  const cameraDistance = Math.max(fitHeightDistance, fitWidthDistance, 120) + viewState.depthRange + 80

  camera.position.set(viewState.center.x, viewState.center.y, viewState.center.z + cameraDistance)
  camera.lookAt(viewState.center)
  camera.far = Math.max(1000, cameraDistance + viewState.depthRange + 100)
  camera.updateProjectionMatrix()
  controls.target.copy(viewState.center)

  controls.update()

  startThreeRenderLoop()
}

export function cleanupThree() {
  if (renderer) {
    removeThreeInteractions()
    const xrSession = renderer.xr.getSession()
    if (xrSession) {
      xrSession.end().catch(() => {})
    }
    renderer.xr.removeEventListener("sessionstart", handleXRSessionStart)
    renderer.xr.removeEventListener("sessionend", handleXRSessionEnd)
    stopThreeRenderLoop()
    scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry.dispose()
        obj.material.dispose()
      }
      if (obj.isLine) {
        obj.geometry.dispose()
        obj.material.dispose()
      }
    })

    if (xrNativeButton) {
      xrNativeButton.remove()
      xrNativeButton = null
    }

    renderer.domElement.remove()
    controls.dispose()

    renderer = scene = camera = controls = null
    graphGroup = null
    latestViewState = null
    nodes3D = []
    connections3D = []
    nodeDepths = new Map()
    activeApp = null
    activeDragNode = null
    activeConnectNode = null
    dragPlane = null
    dragOffset = null
    previewLine = null
    connectTargetHintShown3D = false
    updateVRButtons(false)
  }
}

export function toggleTheme(drawMindmapCallback) {
  isDarkMode = !isDarkMode
  document.body.classList.toggle("dark", isDarkMode)

  themeToggle.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>'

  if (isView3D && renderer) {
    renderer.setClearColor(isDarkMode ? 0x0f172a : 0xffffff, 1)
  }

  drawMindmapCallback()
}

export function toggleConnectMode(isConnectMode) {
  connectModeBtn.innerHTML = isConnectMode
    ? '<i class="fas fa-mouse-pointer"></i><span>일반 모드</span>'
    : '<i class="fas fa-link"></i><span>연결 모드</span>'
  connectModeBtnMobile.innerHTML = isConnectMode
    ? '<i class="fas fa-mouse-pointer"></i><span>일반 모드</span>'
    : '<i class="fas fa-link"></i><span>연결 모드</span>'

  if (isConnectMode) {
    showToast("연결 모드가 활성화되었습니다. 노드를 선택하여 연결하세요.")
  } else {
    showToast("일반 모드로 전환되었습니다.")
  }
}

export function toggleViewMode(drawMindmapCallback, nodes, connections, app = null) {
    if (!isView3D) {
        isView3D = true
        canvas.style.display = "none"
        initializeThree(nodes, connections, app)
        changeViewBtn.innerHTML = '<i class="fas fa-map"></i><span>2D 모드</span>'
        changeViewBtnMobile.innerHTML = '<i class="fas fa-map"></i><span>2D 모드</span>'
        showToast("3D 모드로 전환되었습니다.")
    } else {
        isView3D = false
        canvas.style.display = "block"
        if (renderer) {
            cleanupThree()
        }
        changeViewBtn.innerHTML = '<i class="fas fa-cube"></i><span>3D 모드</span>'
        changeViewBtnMobile.innerHTML = '<i class="fas fa-cube"></i><span>3D 모드</span>'
        showToast("2D 모드로 전환되었습니다.")
    }

    drawMindmapCallback()
}

export async function enterVRView(drawMindmapCallback, nodes, connections, app = null) {
  if (!window.isSecureContext || !("xr" in navigator)) {
    showToast(getVRUnavailableMessage(), "warning")
    return
  }

  if (!isView3D) {
    isView3D = true
    canvas.style.display = "none"
    initializeThree(nodes, connections, app)
    changeViewBtn.innerHTML = '<i class="fas fa-map"></i><span>2D 모드</span>'
    changeViewBtnMobile.innerHTML = '<i class="fas fa-map"></i><span>2D 모드</span>'
    drawMindmapCallback()
  } else if (!renderer) {
    initializeThree(nodes, connections, app)
  }

  ensureNativeVRButton()

  try {
    const activeSession = renderer.xr.getSession()
    if (activeSession) {
      await activeSession.end()
      return
    }

    const session = await navigator.xr.requestSession("immersive-vr", {
      optionalFeatures: ["local-floor", "bounded-floor"],
    })
    await renderer.xr.setSession(session)
  } catch (error) {
    console.error("Failed to start VR session", error)
    showToast(getVRUnavailableMessage(error), "error")
  }
}

export function showToast(message, type = "success") {
  // 기존 토스트 제거
  const existingToast = document.querySelector(".toast")
  if (existingToast) {
    existingToast.remove()
  }

  // 새 토스트 생성
  const toast = document.createElement("div")
  toast.className = `toast toast-${type} fade-in`
  toast.style.position = "fixed"
  toast.style.bottom = "20px"
  toast.style.right = "20px"
  toast.style.padding = "10px 20px"
  toast.style.borderRadius = "4px"
  toast.style.backgroundColor =
    type === "success" ? "#10b981" : type === "error" ? "#ef4444" : type === "warning" ? "#f59e0b" : "#3b82f6"
  toast.style.color = "white"
  toast.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.1)"
  toast.style.zIndex = "9999"
  toast.style.transition = "all 0.3s ease"

  toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas ${
              type === "success"
                ? "fa-check-circle"
                : type === "error"
                  ? "fa-exclamation-circle"
                  : type === "warning"
                    ? "fa-exclamation-triangle"
                    : "fa-info-circle"
            }"></i>
            <span>${message}</span>
        </div>
    `

  document.body.appendChild(toast)

  // 3초 후 토스트 제거
  setTimeout(() => {
    toast.style.opacity = "0"
    setTimeout(() => {
      toast.remove()
    }, 300)
  }, 3000)
}

export function showLoading(show) {
  loading.style.display = show ? "flex" : "none"
}
