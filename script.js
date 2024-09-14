const canvasContainer = document.getElementById('canvasContainer');
const canvas = document.getElementById('mindmapCanvas');
const ctx = canvas.getContext('2d');
const newNodeBtn = document.getElementById('newNodeBtn');
const connectModeBtn = document.getElementById('connectModeBtn');
const organizeBtn = document.getElementById('organizeBtn');
const testBtn = document.getElementById('testBtn');

let nodes = [];
let connections = [];
let isConnectMode = false;
let selectedNode = null;
let isDragging = false;

// 캔버스 크기 설정
function resizeCanvas() {
    const containerRect = canvasContainer.getBoundingClientRect();
    canvas.width = Math.max(containerRect.width, 1000); // 최소 너비 설정
    canvas.height = Math.max(containerRect.height, 1000); // 최소 높이 설정
    drawMindmap();
}

// 노드 그리기
function drawNode(node) {
    const padding = 10;
    const lineHeight = 20;
    const maxWidth = 200; // 최대 너비 설정

    ctx.font = '14px Arial'; // 폰트 설정

    // 텍스트 줄 바꿈
    const words = node.text.split(' ');
    let lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);

    // 노드 크기 계산
    const textWidth = Math.min(maxWidth, Math.max(...lines.map(line => ctx.measureText(line).width)));
    const nodeWidth = textWidth + padding * 2;
    const nodeHeight = lines.length * lineHeight + padding * 2;

    // 배경 그리기
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.beginPath();
    ctx.roundRect(node.x - nodeWidth / 2, node.y - nodeHeight / 2, nodeWidth, nodeHeight, 5);
    ctx.fill();
    ctx.stroke();

    // 텍스트 그리기
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach((line, index) => {
        const y = node.y - (lines.length - 1) * lineHeight / 2 + index * lineHeight;
        ctx.fillText(line, node.x, y);
    });

    // 노드 크기 저장 (연결선 그리기에 사용)
    node.width = nodeWidth;
    node.height = nodeHeight;
}

// 연결선 그리기
function drawConnection(conn) {
    const startX = conn.start.x + (conn.end.x > conn.start.x ? conn.start.width / 2 : -conn.start.width / 2);
    const startY = conn.start.y;
    const endX = conn.end.x + (conn.end.x > conn.start.x ? -conn.end.width / 2 : conn.end.width / 2);
    const endY = conn.end.y;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // 화살표 그리기
    const angle = Math.atan2(endY - startY, endX - startX);
    ctx.save();
    ctx.translate(endX, endY);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-10, -5);
    ctx.lineTo(-10, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 설명 그리기
    if (conn.description) {
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(conn.description, midX, midY - 10);
    }
}

// 마인드맵 그리기
function drawMindmap() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    connections.forEach(drawConnection);
    nodes.forEach(drawNode);
}

// 노드 크기 계산 함수
function calculateNodeSize(node) {
    const padding = 10;
    const lineHeight = 20;
    const maxWidth = 200;

    ctx.font = '14px Arial';
    const words = node.text.split(' ');
    let lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);

    const textWidth = Math.min(maxWidth, Math.max(...lines.map(line => ctx.measureText(line).width)));
    node.width = textWidth + padding * 2;
    node.height = lines.length * lineHeight + padding * 2;
}

// 새 노드 추가
let nextNodeId = 0;
newNodeBtn.addEventListener('click', () => {
    const text = prompt('노드 텍스트를 입력하세요:');
    if (text) {
        const x = Math.random() * (canvas.width - 40) + 20;
        const y = Math.random() * (canvas.height - 40) + 20;
        const node = { 
            id: nextNodeId++,
            x, 
            y, 
            text
        };
        calculateNodeSize(node);
        nodes.push(node);
        console.log('New node:', x, y); // 디버깅용
        drawMindmap();
    }
});

// 연결 모드 전환
connectModeBtn.addEventListener('click', () => {
    isConnectMode = !isConnectMode;
    connectModeBtn.textContent = isConnectMode ? '일반 모드' : '연결 모드';
});

// 캔버스 마우스 이벤트
canvas.addEventListener('mousedown', onMouseDown);
canvas.addEventListener('mousemove', onMouseMove);
canvas.addEventListener('mouseup', onMouseUp);

function onMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const scrollLeft = canvasContainer.scrollLeft;
    const scrollTop = canvasContainer.scrollTop;
    const x = e.clientX - rect.left + scrollLeft;
    const y = e.clientY - rect.top + scrollTop;

    selectedNode = nodes.find(node => 
        x >= node.x - node.width / 2 &&
        x <= node.x + node.width / 2 &&
        y >= node.y - node.height / 2 &&
        y <= node.y + node.height / 2
    );

    if (selectedNode) {
        isDragging = true;
        if (isConnectMode) {
            canvas.style.cursor = 'crosshair';
        } else {
            canvas.style.cursor = 'grabbing';
        }
    }
}

function onMouseMove(e) {
    if (!isDragging) return;

    const rect = canvas.getBoundingClientRect();
    const scrollLeft = canvasContainer.scrollLeft;
    const scrollTop = canvasContainer.scrollTop;
    const x = e.clientX - rect.left + scrollLeft;
    const y = e.clientY - rect.top + scrollTop;

    if (isConnectMode) {
        drawMindmap();
        ctx.beginPath();
        ctx.moveTo(selectedNode.x, selectedNode.y);
        ctx.lineTo(x, y);
        ctx.stroke();
    } else {
        selectedNode.x = x;
        selectedNode.y = y;
        drawMindmap();
    }
}

function onMouseUp(e) {
    if (!isDragging) return;

    const rect = canvas.getBoundingClientRect();
    const scrollLeft = canvasContainer.scrollLeft;
    const scrollTop = canvasContainer.scrollTop;
    const x = e.clientX - rect.left + scrollLeft;
    const y = e.clientY - rect.top + scrollTop;

    if (isConnectMode) {
        const targetNode = nodes.find(node => 
            node !== selectedNode &&
            x >= node.x - node.width / 2 &&
            x <= node.x + node.width / 2 &&
            y >= node.y - node.height / 2 &&
            y <= node.y + node.height / 2
        );

        if (targetNode) {
            const description = prompt('연결선의 설명을 입력하세요:');
            connections.push({
                start: selectedNode,
                end: targetNode,
                description: description
            });
        }
    }

    isDragging = false;
    canvas.style.cursor = 'default';
    drawMindmap();
}

// 노드 정렬 함수
function organizeNodes() {
    if (nodes.length === 0) return;

    const levelWidth = Math.min(250, canvas.width / 5); // 레벨 간 간격, 캔버스 너비에 따라 조정
    const nodeVerticalSpacing = Math.min(100, canvas.height / 10); // 같은 레벨 내 노드 간 수직 간격, 캔버스 높이에 따라 조정
    
    // 그래프 구조 생성
    const graph = {};
    nodes.forEach(node => {
        graph[node.id] = { node: node, children: [] };
    });
    connections.forEach(conn => {
        graph[conn.start.id].children.push(conn.end.id);
    });

    // 루트 노드 찾기 (들어오는 간선이 없는 노드)
    const rootId = nodes.find(node => !connections.some(conn => conn.end.id === node.id))?.id || nodes[0].id;

    // BFS로 레벨 할당
    const queue = [{id: rootId, level: 0}];
    const visited = new Set();
    const nodeLevels = {};

    while (queue.length > 0) {
        const {id, level} = queue.shift();
        if (visited.has(id)) continue;

        visited.add(id);
        nodeLevels[id] = level;

        graph[id].children.forEach(childId => {
            queue.push({id: childId, level: level + 1});
        });
    }

    // 레벨별 노드 그룹화
    const levelGroups = {};
    Object.entries(nodeLevels).forEach(([id, level]) => {
        if (!levelGroups[level]) levelGroups[level] = [];
        levelGroups[level].push(graph[id].node);
    });

    // 노드 위치 설정
    let maxHeight = 0;
    let maxWidth = 0;
    Object.entries(levelGroups).forEach(([level, nodesInLevel]) => {
        const levelX = level * levelWidth;
        nodesInLevel.forEach((node, index) => {
            const centerY = (nodesInLevel.length - 1) * nodeVerticalSpacing / 2;
            node.x = levelX;
            node.y = index * nodeVerticalSpacing - centerY;
            maxHeight = Math.max(maxHeight, Math.abs(node.y));
            maxWidth = Math.max(maxWidth, node.x);
        });
    });

    // 전체 그래프를 캔버스 중앙으로 이동 및 크기 조정
    const scale = Math.min(
        (canvas.width - 100) / (maxWidth + levelWidth),
        (canvas.height - 100) / (maxHeight * 2 + nodeVerticalSpacing),
        1 // 최대 스케일을 1로 제한
    );
    const offsetX = (canvas.width - (maxWidth + levelWidth) * scale) / 2;
    const offsetY = canvas.height / 2;

    nodes.forEach(node => {
        node.x = node.x * scale + offsetX;
        node.y = node.y * scale + offsetY;
    });
    console.log('scale', scale);
    console.log("offsetX, offsetY", offsetX, offsetY);
    drawMindmap();
}

// 정리 버튼 이벤트 리스너
organizeBtn.addEventListener('click', organizeNodes);

// 임의의 그래프 생성 함수
function generateTestGraph() {
    // 기존 노드와 연결 초기화
    nodes = [];
    connections = [];
    nextNodeId = 0;

    const nodeCount = 10; // 생성할 노드 수
    const maxConnections = 3; // 각 노드당 최대 연결 수

    // 노드 생성
    for (let i = 0; i < nodeCount; i++) {
        const x = Math.random() * (canvas.width - 100) + 50;
        const y = Math.random() * (canvas.height - 100) + 50;
        const node = {
            id: nextNodeId++,
            x: x,
            y: y,
            text: `노드 ${i + 1}`
        };
        calculateNodeSize(node); // 노드 크기 계산
        nodes.push(node);
    }

    // 연결 생성
    nodes.forEach(node => {
        const connectionCount = Math.floor(Math.random() * (maxConnections + 1));
        for (let i = 0; i < connectionCount; i++) {
            const targetNode = nodes[Math.floor(Math.random() * nodes.length)];
            if (targetNode !== node && !connections.some(conn => 
                (conn.start === node && conn.end === targetNode) || 
                (conn.start === targetNode && conn.end === node)
            )) {
                connections.push({
                    start: node,
                    end: targetNode,
                    description: `연결 ${connections.length + 1}`
                });
            }
        }
    });

    drawMindmap();
}

// 테스트 버튼 이벤트 리스너
testBtn.addEventListener('click', generateTestGraph);

// 초기화 및 이벤트 리스너 설정
window.addEventListener('load', () => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
});