import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"

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
export const themeToggle = document.getElementById("themeToggle")

// Mobile toolbar buttons
export const newNodeBtnMobile = document.getElementById("newNodeBtn-mobile")
export const connectModeBtnMobile = document.getElementById("connectModeBtn-mobile")
export const organizeBtnMobile = document.getElementById("organizeBtn-mobile")
export const organizeForceBtnMobile = document.getElementById("organizeForceBtn-mobile")
export const testBtnMobile = document.getElementById("testBtn-mobile")
export const saveBtnMobile = document.getElementById("saveBtn-mobile")
export const changeViewBtnMobile = document.getElementById("changeViewBtn-mobile")

// Sidebar toggle
export const sidebarOpen = document.getElementById("sidebarOpen")
export const sidebarClose = document.getElementById("sidebarClose")
export const sidebar = document.querySelector(".sidebar")

// Toolbar dropdown
export const toolbarDropdownBtn = document.getElementById("toolbarDropdownBtn")
export const toolbarDropdownContent = document.getElementById("toolbarDropdownContent")

export let isDarkMode = false
let isView3D = false

let renderer, scene, camera, controls
let animationFrameId
let nodes3D = []
let connections3D = []

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
export function drawNode(node, selectedNode) {
  const maxWidth = 150
  const padding = 10
  const lineHeight = 18
  const borderRadius = 8

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
  if (node === selectedNode) {
    ctx.strokeStyle = "#4f46e5"
    ctx.lineWidth = 2
  } else {
    ctx.strokeStyle = isDarkMode ? "#475569" : "#e2e8f0"
    ctx.lineWidth = 1
  }

  // 그림자 효과
  ctx.shadowColor = "rgba(0, 0, 0, 0.1)"
  ctx.shadowBlur = 5
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
    const iconY = node.y - iconSize / 2

    // 휴지통 아이콘 위치 저장 (클릭 감지용)
    node.deleteIcon = {
      x: iconX,
      y: iconY,
      width: iconSize,
      height: iconSize,
    }

    // 휴지통 아이콘 배경
    ctx.fillStyle = isDarkMode ? "#334155" : "#f1f5f9"
    ctx.beginPath()
    ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2 + 4, 0, Math.PI * 2)
    ctx.fill()

    // 휴지통 아이콘 그리기
    ctx.font = `${iconSize}px "Font Awesome 6 Free"`
    ctx.fillStyle = isDarkMode ? "#f8fafc" : "#64748b"
    ctx.fillText("🗑️", iconX + iconSize / 2, iconY + iconSize / 2 + 2)
  }
}

// 연결선 그리기
export function drawConnection(conn, selectedConnection) {
  const startX = conn.start.x + (conn.end.x > conn.start.x ? conn.start.width / 2 : -conn.start.width / 2)
  const startY = conn.start.y
  const endX = conn.end.x + (conn.end.x > conn.start.x ? -conn.end.width / 2 : conn.end.width / 2)
  const endY = conn.end.y

  // 연결선의 중간 지점 계산
  const midX = (startX + endX) / 2
  const midY = (startY + endY) / 2

  // 연결선 그리기
  if (conn === selectedConnection) {
    ctx.strokeStyle = "#4f46e5"
    ctx.lineWidth = 2
  } else {
    ctx.strokeStyle = isDarkMode ? "#94a3b8" : "#64748b"
    ctx.lineWidth = 1.5
  }

  // 곡선 연결선 그리기
  const controlPointX = (startX + endX) / 2
  const controlPointY = (startY + endY) / 2 - 30

  ctx.beginPath()
  ctx.moveTo(startX, startY)
  ctx.quadraticCurveTo(controlPointX, controlPointY, endX, endY)
  ctx.stroke()

  // 화살표 그리기
  const arrowSize = 8
  const angle = Math.atan2(endY - controlPointY, endX - controlPointX)

  ctx.save()
  ctx.translate(endX, endY)
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
export function drawMindmap(nodes, connections, selectedNode, selectedConnection, offsetX, offsetY, scale) {
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
  nodes.forEach(node => drawNode(node, selectedNode))

  ctx.restore()
}

export function resizeCanvas(nodes, connections, selectedNode, selectedConnection, offsetX, offsetY, scale) {
  const containerRect = canvasContainer.getBoundingClientRect()
  canvas.width = containerRect.width
  canvas.height = containerRect.height
  drawMindmap(nodes, connections, selectedNode, selectedConnection, offsetX, offsetY, scale)
}

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}

function generateNodes3D(node) {
  const geometry = new THREE.SphereGeometry(5, 32, 32)
  const material = new THREE.MeshBasicMaterial({
    color:
      node.level !== undefined
        ? new THREE.Color(levelColors[node.level % levelColors.length])
        : new THREE.Color(isDarkMode ? 0x1e293b : 0xffffff),
  })
  const sphere = new THREE.Mesh(geometry, material)
  sphere.position.set(node.x, node.y, 0)
  sphere.userData = { id: node.id, text: node.text }

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
  const endX = conn.end.x
  const endY = conn.end.y

  // 곡선 연결선 생성
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(startX, startY, 0),
    new THREE.Vector3((startX + endX) / 2, (startY + endY) / 2 - 30, 20),
    new THREE.Vector3(endX, endY, 0),
  )

  const points = curve.getPoints(50)
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({
    color: isDarkMode ? 0x94a3b8 : 0x64748b,
    linewidth: 2,
  })
  const line = new THREE.Line(geometry, material)

  connections3D.push(line)
}

export function initializeThree(nodes, connections) {
  if (!renderer) {
    console.log("initializing three.js")
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight)
    renderer.setClearColor(isDarkMode ? 0x0f172a : 0xffffff, 1)
    renderer.setAnimationLoop(animate)

    canvasContainer.appendChild(renderer.domElement)

    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(75, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.1, 1000)
    controls = new OrbitControls(camera, renderer.domElement)

    // 그리드 헬퍼 추가
    const gridHelper = new THREE.GridHelper(500, 50, isDarkMode ? 0x334155 : 0xe2e8f0, isDarkMode ? 0x1e293b : 0xf1f5f9)
    gridHelper.position.y = -50
    scene.add(gridHelper)

    nodes.forEach(generateNodes3D)
    connections.forEach(generateConnections3D)

    nodes3D.forEach((node) => scene.add(node))
    connections3D.forEach((conn) => scene.add(conn))

    if (nodes.length > 0) {
      camera.position.set(nodes[0].x, nodes[0].y, 100)
      camera.lookAt(nodes[0].x, nodes[0].y, 0)
    } else {
      camera.position.set(0, 0, 100)
      camera.lookAt(0, 0, 0)
    }

    controls.update()

    animate()
  } else {
    renderer.domElement.style.display = "block"
    renderer.setClearColor(isDarkMode ? 0x0f172a : 0xffffff, 1)
  }
}

export function cleanupThree() {
  if (renderer) {
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

    renderer.domElement.remove()
    controls.dispose()

    renderer = scene = camera = controls = null
    nodes3D = []
    connections3D = []
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

export function toggleViewMode(drawMindmapCallback, nodes, connections) {
    if (!isView3D) {
        canvas.style.display = "none"
        initializeThree(nodes, connections)
        changeViewBtn.innerHTML = '<i class="fas fa-map"></i><span>2D 모드</span>'
        changeViewBtnMobile.innerHTML = '<i class="fas fa-map"></i><span>2D 모드</span>'
        showToast("3D 모드로 전환되었습니다.")
    } else {
        canvas.style.display = "block"
        if (renderer) {
            renderer.domElement.style.display = "none"
            cancelAnimationFrame(animationFrameId)
        }
        changeViewBtn.innerHTML = '<i class="fas fa-cube"></i><span>3D 모드</span>'
        changeViewBtnMobile.innerHTML = '<i class="fas fa-cube"></i><span>3D 모드</span>'
        showToast("2D 모드로 전환되었습니다.")
    }

    isView3D = !isView3D
    drawMindmapCallback()
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
