import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm"
import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"

const canvasContainer = document.getElementById("canvasContainer")
const canvas = document.getElementById("mindmapCanvas")
const ctx = canvas.getContext("2d")
const loading = document.getElementById("loading")

// Toolbar buttons
const newNodeBtn = document.getElementById("newNodeBtn")
const connectModeBtn = document.getElementById("connectModeBtn")
const organizeBtn = document.getElementById("organizeBtn")
const organizeForceBtn = document.getElementById("organizeForceBtn")
const testBtn = document.getElementById("testBtn")
const saveBtn = document.getElementById("saveBtn")
const newPageBtn = document.getElementById("newPageBtn")
const changeViewBtn = document.getElementById("changeViewBtn")
const themeToggle = document.getElementById("themeToggle")

// Mobile toolbar buttons
const newNodeBtnMobile = document.getElementById("newNodeBtn-mobile")
const connectModeBtnMobile = document.getElementById("connectModeBtn-mobile")
const organizeBtnMobile = document.getElementById("organizeBtn-mobile")
const organizeForceBtnMobile = document.getElementById("organizeForceBtn-mobile")
const testBtnMobile = document.getElementById("testBtn-mobile")
const saveBtnMobile = document.getElementById("saveBtn-mobile")
const changeViewBtnMobile = document.getElementById("changeViewBtn-mobile")

// Sidebar toggle
const sidebarOpen = document.getElementById("sidebarOpen")
const sidebarClose = document.getElementById("sidebarClose")
const sidebar = document.querySelector(".sidebar")

// Toolbar dropdown
const toolbarDropdownBtn = document.getElementById("toolbarDropdownBtn")
const toolbarDropdownContent = document.getElementById("toolbarDropdownContent")

let logged_in = false
let isDarkMode = false

let nodes = []
let connections = []
const graph = {}
let parentNodes = []
let parentIndex = 0
let nextNodeId = 0 // 새 노드 추가

let isConnectMode = false
let isSelectingParent = false
let selectedNode = null
let selectedConnection = null
let isDragging = false
let isView3D = false

let startDragX = 0
let startDragY = 0
let scale = 1
let offsetX = 0
let offsetY = 0
const scaleFactor = 1.1

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

// 노드 그리기
function drawNode(node) {
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
function drawConnection(conn) {
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
function drawMindmap() {
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
  connections.forEach(drawConnection)

  // 그 다음 노드 그리기
  nodes.forEach(drawNode)

  ctx.restore()
}

// 노드 크기 계산 함수
function calculateNodeSize(node) {
  const padding = 10
  const lineHeight = 20
  const maxWidth = 200

  ctx.font = "14px Inter, sans-serif"
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

  const textWidth = Math.min(maxWidth, Math.max(...lines.map((line) => ctx.measureText(line).width)))
  node.width = textWidth + padding * 2
  node.height = lines.length * lineHeight + padding * 2
}

function generateGraphStructure() {
  nodes.forEach((node) => {
    graph[node.id] = { node: node, children: [], parents: [] }
  })
  connections.forEach((conn) => {
    graph[conn.start.id].children.push(conn.end.id)
    graph[conn.end.id].parents.push(conn.start.id)
  })
  return graph
}

// 노드 정렬 함수
function organizeNodes() {
  if (nodes.length === 0) return

  showLoading(true)

  setTimeout(() => {
    // 그래프 구조 생성
    generateGraphStructure()
    console.log("graph:", graph)

    // 루트 노드 찾기 (들어오는 간선이 없는 노드)
    const rootNodes = nodes.filter((node) => graph[node.id].parents.length === 0)
    // 루트 노드가 없으면 자식이 있는 노드를 루트 노드로 설정
    if (rootNodes.length === 0) {
      for (const node of nodes) {
        if (graph[node.id].children.length != 0) {
          rootNodes.push(node)
          break
        }
      }
    }
    console.log("rootNodes:", rootNodes)
    // BFS로 레벨 할당
    const queue = rootNodes.map((node) => ({ id: node.id, level: 0 }))
    console.log("queue:", queue)

    const visited = new Set()

    while (queue.length > 0) {
      const { id, level } = queue.shift()
      if (visited.has(id)) continue

      visited.add(id)
      const node = graph[id].node
      node.level = level

      graph[id].children.forEach((childId) => {
        if (!visited.has(childId)) {
          queue.push({ id: childId, level: level + 1 })
        }
      })
    }

    // 방문되지 않은 노드 처리 (순환 구조나 고립된 노드)
    nodes.forEach((node) => {
      if (!visited.has(node.id)) {
        node.level = 0 // 또는 적절한 기본 레벨 설정
      }
    })

    // 레벨별 노드 그룹화
    const levelGroups = []
    nodes.forEach((node) => {
      if (!levelGroups[node.level]) levelGroups[node.level] = []
      levelGroups[node.level].push(node)
    })

    // 노드 위치 설정
    console.log("levelGroups", levelGroups)

    const levelWidth = Math.min(250, canvas.width / levelGroups.length)
    Object.entries(levelGroups).forEach(([level, nodesInLevel]) => {
      const centerY = canvas.height / 2
      const levelX = Number(level) * levelWidth + levelWidth / 2

      nodesInLevel.forEach((node, index) => {
        const nodeSpacing = canvas.height / (nodesInLevel.length + 1)
        node.x = levelX
        node.y = (index + 1) * nodeSpacing
      })
    })

    console.log("Nodes after organizing:", nodes) // 디버깅용

    showLoading(false)
    drawMindmap()
  }, 100)
}

function organizeNodes_force() {
  showLoading(true)

  setTimeout(() => {
    const convertedConnections = connections.map((c) => ({
      source: c.start,
      target: c.end,
      description: c.description,
    }))

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(convertedConnections)
          .id((d) => d.id)
          .distance(150),
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(canvas.width / 2, canvas.height / 2))
      .force("collide", d3.forceCollide().radius(50))

    simulation.on("tick", () => {
      drawMindmap()
    })

    simulation.on("end", () => {
      showLoading(false)
      drawMindmap()
    })

    drawMindmap()
  }, 100)
}

// 임의의 그래프 생성 함수
function generateTestGraph() {
  showLoading(true)

  setTimeout(() => {
    // 기존 노드와 연결 초기화
    nodes = []
    connections = []
    nextNodeId = 0

    const nodeCount = 20 // 생성할 노드 수 (모바일에서는 적게)
    const maxConnections = 5 // 각 노드당 최대 연결 수

    // 노드 생성
    for (let i = 0; i < nodeCount; i++) {
      const x = Math.random() * (canvas.width - 100) + 50
      const y = Math.random() * (canvas.height - 100) + 50
      const node = {
        id: nextNodeId++,
        x: x,
        y: y,
        text: `노드 ${i + 1}`,
      }
      calculateNodeSize(node) // 노드 크기 계산
      nodes.push(node)
    }

    // 연결 생성
    nodes.forEach((node) => {
      const connectionCount = Math.floor(Math.random() * (maxConnections + 1))
      for (let i = 0; i < connectionCount; i++) {
        const targetNode = nodes[Math.floor(Math.random() * nodes.length)]
        if (
          targetNode !== node &&
          !connections.some(
            (conn) =>
              (conn.start === node && conn.end === targetNode) || (conn.start === targetNode && conn.end === node),
          )
        ) {
          connections.push({
            start: node,
            end: targetNode,
            description: `연결 ${connections.length + 1}`,
          })
        }
      }
    })

    showLoading(false)
    drawMindmap()
  }, 100)
}

async function saveGraph() {
  const activePage = document.querySelector("#pageList .page-item.active")

  if (!activePage) {
    showToast("선택된 페이지가 없습니다.")
    return
  }

  showLoading(true)

  const data = {
    nodes: nodes.map((node) => ({
      id: node.id,
      x: node.x,
      y: node.y,
      text: node.text,
    })),
    connections: connections.map((conn) => ({
      start: conn.start.id,
      end: conn.end.id,
      description: conn.description,
    })),
  }

  const pageId = activePage.dataset.pageId

  if (pageId === "temp") {
    const tempPage = localStorage.getItem("mindlink_temp_page")
    const tempData = JSON.parse(tempPage)
    tempData[0].data = data
    localStorage.setItem("mindlink_temp_page", JSON.stringify(tempData))
    showLoading(false)
    showToast("그래프가 로컬에 저장되었습니다")
  } else {
    try {
      const response = await fetch(`/api/pages/${pageId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("네트워크 응답이 올바르지 않습니다")
      }

      const result = await response.json()

      showLoading(false)
      if (result.success_ok) {
        showToast("그래프가 성공적으로 저장되었습니다")
      } else {
        showToast("그래프 저장에 실패했습니다", "error")
      }
    } catch (error) {
      showLoading(false)
      console.error("그래프 저장 중 오류 발생:", error)
      showToast("그래프 저장 중 오류가 발생했습니다", "error")
    }
  }
}

// 페이지 정보를 가져오고 목록을 생성하는 함수
async function initializePages() {
  showLoading(true)

  try {
    let response

    if (logged_in) {
      response = await fetch(`/api/pages`)
      if (!response.ok) {
        throw new Error(`페이지 초기화 실패`)
      }
    } else {
      let data = localStorage.getItem("mindlink_temp_page")
      if (data === null) {
        response = { status: 204 }
      } else {
        data = JSON.parse(data)
        console.log(typeof data)
        console.log(data)

        response = { status: 200, json: () => Promise.resolve(data) }
      }
    }

    const pageList = document.getElementById("pageList")
    pageList.innerHTML = "" // 기존 목록 초기화

    switch (response.status) {
      case 200:
        const pages = await response.json()

        pages.forEach((page) => {
          const li = document.createElement("li")
          li.className = "page-item fade-in"
          li.dataset.pageId = page.id
          li.innerHTML = `
                        <span class="page-icon"><i class="fas fa-file-alt"></i></span>
                        <span class="page-name">${page.name}</span>
                    `
          li.addEventListener("click", () => loadSelectedPage(page.id))
          pageList.appendChild(li)
        })

        loadSelectedPage(pages[0].id)

        break
      case 204:
        await createNewPage()
        break
      default:
        throw new Error("페이지 데이터를 가져오는데 실패했습니다.")
    }
  } catch (error) {
    console.error("페이지 초기화 중 오류 발생:", error)
    showToast("페이지 초기화 중 오류가 발생했습니다", "error")
  }

  showLoading(false)
}

async function loadSelectedPage(pageId) {
  showLoading(true)

  cleanupThree()

  nodes = []
  connections = []

  let response
  let data

  if (!logged_in) {
    const tempPage = localStorage.getItem("mindlink_temp_page")
    data = JSON.parse(tempPage)[0].data
  } else {
    try {
      response = await fetch(`/api/pages/${pageId}`)
      if (!response.ok) {
        throw new Error("페이지 데이터를 가져오는데 실패했습니다.")
      }
      data = await response.json()
    } catch (error) {
      console.error("페이지 로드 중 오류 발생:", error)
      showToast("페이지 로드 중 오류가 발생했습니다", "error")
    }
  }

  const pageItems = document.querySelectorAll("#pageList .page-item")
  pageItems.forEach((item) => {
    if (item.dataset.pageId === pageId) {
      item.classList.add("active")
      console.log("active 클래스 추가 :", pageId)

      if (!item.querySelector(".trash-icon")) {
        // 휴지통 아이콘 요소 생성
        const trashIcon = document.createElement("span")
        trashIcon.className = "trash-icon"
        trashIcon.innerHTML = '<i class="fas fa-trash"></i>'
        trashIcon.style.cursor = "pointer"

        // 휴지통 아이콘 클릭 시 삭제 로직 구현
        trashIcon.addEventListener("click", (e) => {
          e.stopPropagation() // 부모 요소 클릭 이벤트 방지
          deletePage(pageId)
        })
        // active 상태인 요소에 휴지통 아이콘 추가
        item.appendChild(trashIcon)
      }
    } else {
      item.classList.remove("active")
      if (item.querySelector(".trash-icon")) {
        item.querySelector(".trash-icon").remove()
      }
    }
  })

  // 페이지 데이터로 노드와 연결 업데이트
  if (data.nodes) {
    nodes = data.nodes
  }
  if (data.connections) {
    connections = data.connections.map((conn) => ({
      start: nodes.find((node) => node.id === conn.start),
      end: nodes.find((node) => node.id === conn.end),
      description: conn.description,
    }))
  }

  if (!(data.nodes && data.connections)) {
    console.log("[loadSelectedPage] nodes와 connections가 비어있습니다.")
  } else {
    generateGraphStructure()
  }

  offsetX = 0
  offsetY = 0
  scale = 1

  if (isView3D) {
    initializeThree()
  } else {
    drawMindmap()
  }

  showLoading(false)

  // 모바일에서 페이지 선택 후 사이드바 닫기
  if (window.innerWidth <= 768) {
    sidebar.classList.remove("open")
  }
}

async function createNewPage() {
  if (!logged_in) {
    const tempPage = localStorage.getItem("mindlink_temp_page")
    if (tempPage !== null) {
      showToast("로그인이 필요합니다.", "warning")
      return
    }
  }

  const pageName = prompt("새 페이지의 이름을 입력하세요:", "새 페이지")
  if (pageName === null) return
  else if (pageName === "") {
    showToast("페이지 이름을 입력해주세요.", "warning")
    return
  }

  showLoading(true)

  let newPage

  if (logged_in) {
    try {
      const response = await fetch(`/api/pages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: pageName }),
      })

      if (!response.ok) {
        throw new Error("새 페이지 생성에 실패했습니다.")
      }

      newPage = await response.json() // {id: <string>, name: <string>}
      console.log("새 페이지 생성:", newPage)
    } catch (error) {
      console.error("새 페이지 생성 중 오류 발생:", error)
      showToast("새 페이지 생성에 실패했습니다. 다시 시도해주세요.", "error")
    }
  } else {
    newPage = [{ id: "temp", name: pageName, data: { nodes: [], connections: [] } }]
    localStorage.setItem("mindlink_temp_page", JSON.stringify(newPage))
  }

  // 페이지 목록에 새 페이지 추가
  const pageList = document.getElementById("pageList")
  const li = document.createElement("li")
  li.className = "page-item fade-in"
  li.dataset.pageId = newPage.id
  li.innerHTML = `
        <span class="page-icon"><i class="fas fa-file-alt"></i></span>
        <span class="page-name">${pageName}</span>
    `
  li.addEventListener("click", () => loadSelectedPage(newPage.id))
  pageList.appendChild(li)

  // 새로 생성된 페이지 로드
  loadSelectedPage(newPage.id)

  showLoading(false)
  showToast("새 페이지가 생성되었습니다")
}

async function deletePage(pageId) {
  if (confirm("정말로 이 페이지를 삭제하시겠습니까?")) {
    showLoading(true)

    const response = await fetch(`/api/pages/${pageId}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      console.log("페이지 삭제에 실패했습니다.", response.status)
      showToast("페이지 삭제에 실패했습니다.", "error")
    } else {
      console.log("페이지 삭제 성공")
      const pageItems = document.querySelectorAll("#pageList .page-item")
      await pageItems.forEach((item) => {
        if (item.dataset.pageId === pageId) {
          item.remove()
        }
      })
      if (document.querySelector("#pageList .page-item")) {
        loadSelectedPage(document.querySelector("#pageList .page-item").dataset.pageId)
      }
      showToast("페이지가 삭제되었습니다")
    }

    showLoading(false)
  }
}

function createNode(x, y) {
  const text = prompt("노드 텍스트를 입력하세요:", "새 노드")
  if (text === null) return
  else if (text === "") {
    showToast("노드 텍스트를 입력해주세요.", "warning")
    return
  }

  if (x == null) {
    x = Math.random() * (canvas.width - 40) + 20
  }
  if (y == null) {
    y = Math.random() * (canvas.height - 40) + 20
  }

  const node = {
    id: nextNodeId++,
    x,
    y,
    text,
  }

  calculateNodeSize(node)
  nodes.push(node)
  generateGraphStructure()
  console.log("New node:", x, y, text) // 디버깅용
  return node
}

function deleteNode(node) {
  // 연결된 모든 connection 삭제
  connections = connections.filter((conn) => conn.start !== node && conn.end !== node)

  // 노드 삭제
  nodes = nodes.filter((n) => n !== node)

  selectedNode = null
  drawMindmap()
  showToast("노드가 삭제되었습니다")
}

function createConnection(start, end) {
  const description = prompt("연결선의 설명을 입력하세요:", "연결선")
  if (description === null) return
  else if (description === "") {
    showToast("연결선 설명을 입력해주세요.", "warning")
    return
  }

  connections.push({
    start: start,
    end: end,
    description: description,
  })
  generateGraphStructure()
  showToast("연결선이 생성되었습니다")
}

function deleteConnection(connection) {
  connections = connections.filter((conn) => conn !== connection)
  selectedConnection = null
  drawMindmap()
  showToast("연결선이 삭제되었습니다")
}

function getRealCoordinates(mouseX, mouseY) {
  const realX = (mouseX - offsetX) / scale
  const realY = (mouseY - offsetY) / scale
  return { x: realX, y: realY }
}

/**
 * 연결선 클릭 감지 함수
 *
 * 선과 점 사이의 거리 공식이용
 */
function isClickOnConnection(x, y, conn) {
  const startX = conn.start.x + (conn.end.x > conn.start.x ? conn.start.width / 2 : -conn.start.width / 2)
  const startY = conn.start.y
  const endX = conn.end.x + (conn.end.x > conn.start.x ? -conn.end.width / 2 : conn.end.width / 2)
  const endY = conn.end.y

  // 곡선 연결선의 경우 제어점 고려
  const controlPointX = (startX + endX) / 2
  const controlPointY = (startY + endY) / 2 - 30

  // 곡선 위의 점들을 샘플링하여 거리 계산
  const samples = 10
  let minDistance = Number.POSITIVE_INFINITY

  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    const pointX = Math.pow(1 - t, 2) * startX + 2 * (1 - t) * t * controlPointX + Math.pow(t, 2) * endX
    const pointY = Math.pow(1 - t, 2) * startY + 2 * (1 - t) * t * controlPointY + Math.pow(t, 2) * endY

    const dx = x - pointX
    const dy = y - pointY
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < minDistance) {
      minDistance = distance
    }
  }

  return minDistance < 10 // 10픽셀 이내 클릭을 허용
}

function onMouseDown(e) {
  const rect = canvas.getBoundingClientRect()
  const canvasX = e.clientX - rect.left
  const canvasY = e.clientY - rect.top

  const { x, y } = getRealCoordinates(canvasX, canvasY)

  // 선택된 노드의 휴지통 아이콘 클릭 확인
  if (selectedNode && selectedNode.deleteIcon) {
    const icon = selectedNode.deleteIcon
    if (x >= icon.x && x <= icon.x + icon.width && y >= icon.y && y <= icon.y + icon.height) {
      if (confirm("이 노드를 삭제하시겠습니까?")) {
        deleteNode(selectedNode)
      }
      return
    }
  }

  // 선택된 연결선의 삭제 아이콘 클릭 확인
  if (selectedConnection && selectedConnection.deleteIcon) {
    const icon = selectedConnection.deleteIcon
    if (x >= icon.x && x <= icon.x + icon.width && y >= icon.y && y <= icon.y + icon.height) {
      if (confirm("이 연결선을 삭제하시겠습니까?")) {
        deleteConnection(selectedConnection)
      }
      return
    }
  }

  // 노드 클릭 확인
  const clickedNode = nodes.find(
    (node) =>
      x >= node.x - node.width / 2 &&
      x <= node.x + node.width / 2 &&
      y >= node.y - node.height / 2 &&
      y <= node.y + node.height / 2,
  )

  if (clickedNode) {
    // 노드 클릭
    if (isConnectMode) {
      // 연결모드 일때
      selectedNode = clickedNode
      isDragging = true
      canvas.style.cursor = "crosshair"
    } else {
      // 일반모드 일때
      if (selectedNode === clickedNode) {
        selectedNode = null
      } else {
        selectedNode = clickedNode
        isDragging = true
        canvas.style.cursor = "grabbing"
      }
    }
    selectedConnection = null // 노드 선택시 연결선 선택 해제
  } else {
    // 연결선 클릭
    const clickedConnection = connections.find((conn) => isClickOnConnection(x, y, conn))
    if (clickedConnection) {
      if (selectedConnection === clickedConnection) {
        selectedConnection = null
      } else {
        selectedConnection = clickedConnection
      }
      selectedNode = null // 연결선 선택시 노드 선택 해제
    } else {
      // 빈 공간 클릭
      selectedNode = null
      selectedConnection = null
      parentIndex = 0

      isDragging = true
      // 드래그 시작 시 마우스 좌표와 현재 offset의 차이를 저장
      startDragX = e.offsetX - offsetX
      startDragY = e.offsetY - offsetY
    }
  }

  drawMindmap()
}

function onMouseMove(e) {
  if (!isDragging) return

  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  if (isConnectMode) {
    drawMindmap()

    // 곡선 연결선 미리보기
    const startX = selectedNode.x + (x > selectedNode.x ? selectedNode.width / 2 : -selectedNode.width / 2)
    const startY = selectedNode.y
    const controlPointX = (startX + x) / 2
    const controlPointY = (startY + y) / 2 - 30

    ctx.save()
    ctx.translate(offsetX, offsetY)
    ctx.scale(scale, scale)

    ctx.strokeStyle = isDarkMode ? "rgba(148, 163, 184, 0.6)" : "rgba(100, 116, 139, 0.6)"
    ctx.lineWidth = 1.5
    ctx.setLineDash([5, 5])

    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.quadraticCurveTo(controlPointX, controlPointY, x, y)
    ctx.stroke()

    ctx.setLineDash([])
    ctx.restore()
  } else if (selectedNode) {
    selectedNode.x = (x - offsetX) / scale
    selectedNode.y = (y - offsetY) / scale
    drawMindmap()
  } else {
    offsetX = e.offsetX - startDragX
    offsetY = e.offsetY - startDragY

    drawMindmap()
  }
}

function onMouseUp(e) {
  if (!isDragging) return

  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  if (isConnectMode) {
    const { x: realX, y: realY } = getRealCoordinates(x, y)
    const targetNode = nodes.find(
      (node) =>
        node !== selectedNode &&
        realX >= node.x - node.width / 2 &&
        realX <= node.x + node.width / 2 &&
        realY >= node.y - node.height / 2 &&
        realY <= node.y + node.height / 2,
    )

    if (targetNode) {
      createConnection(selectedNode, targetNode)
    }
    selectedNode = null // 연결 모드에서는 선택 해제
  }

  isDragging = false
  canvas.style.cursor = "default"
  drawMindmap()
}

function onMouseWheel(e) {
  e.preventDefault()

  // 마우스 위치 (canvas 내 좌표)
  const { offsetX: mouseX, offsetY: mouseY } = e
  // 휠 방향에 따라 확대 또는 축소 결정
  const delta = e.deltaY < 0 ? 1 : -1
  const zoom = Math.pow(scaleFactor, delta)

  // 마우스 위치를 기준으로 오프셋 업데이트
  offsetX = mouseX - zoom * (mouseX - offsetX)
  offsetY = mouseY - zoom * (mouseY - offsetY)

  // 스케일 업데이트
  scale *= zoom

  drawMindmap()
}

function resizeCanvas() {
  const containerRect = canvasContainer.getBoundingClientRect()
  canvas.width = containerRect.width
  canvas.height = containerRect.height
  drawMindmap()
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

function initializeThree() {
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

function cleanupThree() {
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

function toggleTheme() {
  isDarkMode = !isDarkMode
  document.body.classList.toggle("dark", isDarkMode)

  themeToggle.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>'

  if (isView3D && renderer) {
    renderer.setClearColor(isDarkMode ? 0x0f172a : 0xffffff, 1)
  }

  drawMindmap()
}

function toggleConnectMode() {
  isConnectMode = !isConnectMode
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

function toggleViewMode() {
  if (!isView3D) {
    canvas.style.display = "none"
    initializeThree()
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
}

function showToast(message, type = "success") {
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

function showLoading(show) {
  loading.style.display = show ? "flex" : "none"
}

function setupButtonListeners() {
  // 메인 툴바 버튼
  organizeBtn.addEventListener("click", organizeNodes)
  organizeForceBtn.addEventListener("click", organizeNodes_force)
  newPageBtn.addEventListener("click", createNewPage)
  testBtn.addEventListener("click", generateTestGraph)
  saveBtn.addEventListener("click", saveGraph)
  newNodeBtn.addEventListener("click", () => {
    createNode()
    drawMindmap()
  })
  connectModeBtn.addEventListener("click", toggleConnectMode)
  changeViewBtn.addEventListener("click", toggleViewMode)
  themeToggle.addEventListener("click", toggleTheme)

  // 모바일 툴바 버튼
  organizeBtnMobile.addEventListener("click", organizeNodes)
  organizeForceBtnMobile.addEventListener("click", organizeNodes_force)
  testBtnMobile.addEventListener("click", generateTestGraph)
  saveBtnMobile.addEventListener("click", saveGraph)
  newNodeBtnMobile.addEventListener("click", () => {
    createNode()
    drawMindmap()
  })
  connectModeBtnMobile.addEventListener("click", toggleConnectMode)
  changeViewBtnMobile.addEventListener("click", toggleViewMode)

  // 사이드바 토글
  sidebarOpen.addEventListener("click", () => {
    sidebar.classList.add("open")
  })

  sidebarClose.addEventListener("click", () => {
    sidebar.classList.remove("open")
  })

  // 툴바 드롭다운
  toolbarDropdownBtn.addEventListener("click", () => {
    toolbarDropdownContent.classList.toggle("show")
  })

  // 드롭다운 외부 클릭 시 닫기
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".toolbar-dropdown") && toolbarDropdownContent.classList.contains("show")) {
      toolbarDropdownContent.classList.remove("show")
    }
  })
}

function setupCanvasListeners() {
  canvas.addEventListener("mousedown", onMouseDown)
  canvas.addEventListener("mousemove", onMouseMove)
  canvas.addEventListener("mouseup", onMouseUp)
  canvas.addEventListener("wheel", onMouseWheel)

  // 터치 이벤트 지원
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault()
    const touch = e.touches[0]
    const mouseEvent = new MouseEvent("mousedown", {
      clientX: touch.clientX,
      clientY: touch.clientY,
    })
    canvas.dispatchEvent(mouseEvent)
  })

  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault()
    const touch = e.touches[0]
    const mouseEvent = new MouseEvent("mousemove", {
      clientX: touch.clientX,
      clientY: touch.clientY,
    })
    canvas.dispatchEvent(mouseEvent)
  })

  canvas.addEventListener("touchend", (e) => {
    e.preventDefault()
    const mouseEvent = new MouseEvent("mouseup", {})
    canvas.dispatchEvent(mouseEvent)
  })
}

function setupKeyboardListeners() {
  window.addEventListener("keydown", (e) => {
    if (selectedNode) {
      if (e.key === "Tab") {
        // shift + tab : 부모 선택
        if (e.shiftKey) {
          e.preventDefault()
          parentNodes = graph[selectedNode.id].parents
          parentNodes.forEach((id) => {
            console.log(graph[id])
          })

          if (parentIndex < parentNodes.length && parentIndex > 0) {
            parentIndex = (parentIndex + 1) % parentNodes.length
          }

          selectedNode = nodes.find((node) => node.id === parentNodes[parentIndex])
        } else {
          // tab : 자식 생성
          e.preventDefault()
          const newnode = createNode(selectedNode.x + canvas.width * 0.1, selectedNode.y)
          if (newnode !== undefined) {
            createConnection(selectedNode, newnode)
            selectedNode = newnode
          }
        }
      }

      if (e.key === "ArrowUp") {
        const currentIndex = parentNodes.indexOf(selectedNode)
        const nextIndex = (currentIndex - 1 + parentNodes.length) % parentNodes.length
        selectedNode = parentNodes[nextIndex]
      } else if (e.key === "ArrowDown") {
        const currentIndex = parentNodes.indexOf(selectedNode)
        const nextIndex = (currentIndex + 1) % parentNodes.length
        selectedNode = parentNodes[nextIndex]
      } else if (e.key === "Enter") {
        isSelectingParent = false
      }
    }

    drawMindmap()
  })
}

function getCookie() {
  const cookies = document.cookie.split("; ") // 쿠키 문자열을 `; ` 기준으로 분할
  for (const cookie of cookies) {
    const [key, value] = cookie.split("=") // `=` 기준으로 키와 값 분리
    if (key === "access-token") return decodeURIComponent(value) // 원하는 쿠키 찾으면 반환
  }
  return null // 없으면 null 반환
}

function deleteCookie() {
  document.cookie = "access-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
  window.location.reload()
}

function checkLoggedIn() {
  if (getCookie() === null) {
    showToast("로그인이 필요합니다.", "info")
  } else {
    logged_in = true
    document.getElementById("login-text").innerText = "로그아웃"
    document.getElementById("google-login-btn").addEventListener("click", deleteCookie)
  }
}

function initializeApp() {
  // 시스템 다크모드 감지
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    isDarkMode = true
    document.body.classList.add("dark")
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>'
  }

  checkLoggedIn()
  resizeCanvas()
  window.addEventListener("resize", resizeCanvas)
  initializePages()
  setupButtonListeners()
  setupCanvasListeners()
  setupKeyboardListeners()

  // 초기 로딩 메시지
  showToast("마인드맵이 준비되었습니다", "info")
}

window.addEventListener("load", initializeApp)

