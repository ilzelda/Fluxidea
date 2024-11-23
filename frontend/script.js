const canvasContainer = document.getElementById('canvasContainer');
const canvas = document.getElementById('mindmapCanvas');
// const ctx = canvas.getContext('2d');

const newNodeBtn = document.getElementById('newNodeBtn');
const connectModeBtn = document.getElementById('connectModeBtn');
const organizeBtn = document.getElementById('organizeBtn');
const testBtn = document.getElementById('testBtn');
const saveBtn = document.getElementById('saveBtn');
const newPageBtn = document.getElementById('newPageBtn');

let nodes = [];
let connections = [];
let isConnectMode = false;
let selectedNode = null;
let isDragging = false;
let nextNodeId = 0; // 새 노드 추가

const levelColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F06292', '#AED581', '#FFD54F', '#4DB6AC', '#7986CB'
];

base_url = 'http://localhost:8080';
// base_url = 'https://0590a1e7-61ab-402e-9e7d-60cfee9e3001.mock.pstmn.io';

// 전역 변수 추가
let selectedConnection = null;

// 캔버스 크기 설정
function resizeCanvas() {
    const containerRect = canvasContainer.getBoundingClientRect();
    canvas.width = containerRect.width;
    canvas.height = containerRect.height;
    drawMindmap();
}

// 노드 그리기
function drawNode(node) {
    const maxWidth = 150; // 최대 너비를 줄임
    const padding = 5; // 패딩을 줄임
    const lineHeight = 16; // 줄 높이를 줄임

    ctx.font = '12px Arial'; // 폰트 크기를 줄임

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
    if (node.level !== undefined) {
        ctx.fillStyle = levelColors[node.level % levelColors.length];
    } else {
        ctx.fillStyle = 'white';
    }
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

    // 선택된 노드에 대해 휴지통 아이콘 그리기
    if (selectedNode === node) {
        const iconSize = 20;
        const iconX = node.x + node.width / 2 + 5;
        const iconY = node.y - node.height / 2;
        
        // 휴지통 아이콘 위치 저장 (클릭 감지용)
        node.deleteIcon = {
            x: iconX,
            y: iconY,
            width: iconSize,
            height: iconSize
        };

        // 휴지통 아이콘 그리기
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(iconX + iconSize/2, iconY + iconSize/2, iconSize/2, 0, Math.PI * 2);
        ctx.fill();
        
        // X 표시 그리기
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(iconX + 6, iconY + 6);
        ctx.lineTo(iconX + iconSize - 6, iconY + iconSize - 6);
        ctx.moveTo(iconX + iconSize - 6, iconY + 6);
        ctx.lineTo(iconX + 6, iconY + iconSize - 6);
        ctx.stroke();
        ctx.lineWidth = 1;
    }
}

// 연결선 그리기
function drawConnection(conn) {
    const startX = conn.start.x + (conn.end.x > conn.start.x ? conn.start.width / 2 : -conn.start.width / 2);
    const startY = conn.start.y;
    const endX = conn.end.x + (conn.end.x > conn.start.x ? -conn.end.width / 2 : conn.end.width / 2);
    const endY = conn.end.y;

    // 연결선의 중간 지점 계산
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;

    // 연결선 그리기
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
    ctx.lineTo(-8, -4);
    ctx.lineTo(-8, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 설명 그리기
    if (conn.description) {
        ctx.font = '10px Arial';
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(conn.description, midX, midY - 8);
    }

    // 선택된 연결선에 대해 삭제 아이콘 그리기
    if (selectedConnection === conn) {
        const iconSize = 16;
        
        // 삭제 아이콘 위치 저장
        conn.deleteIcon = {
            x: midX - iconSize/2,
            y: midY - iconSize/2,
            width: iconSize,
            height: iconSize
        };

        // 삭제 아이콘 그리기
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(midX, midY, iconSize/2, 0, Math.PI * 2);
        ctx.fill();

        // X 표시 그리기
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(midX - 4, midY - 4);
        ctx.lineTo(midX + 4, midY + 4);
        ctx.moveTo(midX + 4, midY - 4);
        ctx.lineTo(midX - 4, midY + 4);
        ctx.stroke();
        ctx.lineWidth = 1;
    }
}

// 마인드맵 그리기
// function drawMindmap() {
//     ctx.clearRect(0, 0, canvas.width, canvas.height);
//     nodes.forEach(drawNode);
//     connections.forEach(drawConnection);
// }
function drawMindmap(){
    const gdata = {
        "nodes" : nodes.map(node => ({"id": node.id, "name" : node.text})),
        "links" : connections.map(conn => ({"source": conn.start.id, "target": conn.end.id}))
    }
    console.log('gdata:', gdata);

    const Graph = ForceGraph3D()
    (document.getElementById('3d-graph'))
        .linkOpacity(0.5)
        .graphData(gdata)
        .linkDirectionalArrowLength(3.5)
        .linkDirectionalArrowRelPos(1);
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

// onMouseDown 함수 수정
function onMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 선택된 노드의 휴지통 아이콘 클릭 확인
    if (selectedNode && selectedNode.deleteIcon) {
        const icon = selectedNode.deleteIcon;
        if (x >= icon.x && x <= icon.x + icon.width &&
            y >= icon.y && y <= icon.y + icon.height) {
            if (confirm('이 노드를 삭제하시겠습니까?')) {
                deleteNode(selectedNode);
            }
            return;
        }
    }

    // 선택된 연결선의 삭제 아이콘 클릭 확인
    if (selectedConnection && selectedConnection.deleteIcon) {
        const icon = selectedConnection.deleteIcon;
        if (x >= icon.x && x <= icon.x + icon.width &&
            y >= icon.y && y <= icon.y + icon.height) {
            if (confirm('이 연결선을 삭제하시겠습니까?')) {
                deleteConnection(selectedConnection);
            }
            return;
        }
    }

    // 노드 클릭 확인
    const clickedNode = nodes.find(node => 
        x >= node.x - node.width / 2 &&
        x <= node.x + node.width / 2 &&
        y >= node.y - node.height / 2 &&
        y <= node.y + node.height / 2
    );

    if (clickedNode) {
        if (isConnectMode) {
            selectedNode = clickedNode;
            isDragging = true;
            canvas.style.cursor = 'crosshair';
        } else {
            if (selectedNode === clickedNode) {
                selectedNode = null;
            } else {
                selectedNode = clickedNode;
                isDragging = true;
                canvas.style.cursor = 'grabbing';
            }
        }
        selectedConnection = null; // 노드 선택시 연결선 선택 해제
    } else {
        // 연결선 클릭 확인
        const clickedConnection = connections.find(conn => isClickOnConnection(x, y, conn));
        if (clickedConnection) {
            if (selectedConnection === clickedConnection) {
                selectedConnection = null;
            } else {
                selectedConnection = clickedConnection;
            }
            selectedNode = null; // 연결선 선택시 노드 선택 해제
        } else {
            // 빈 공간 클릭
            selectedNode = null;
            selectedConnection = null;
        }
    }
    
    drawMindmap();
}

function onMouseMove(e) {
    if (!isDragging || !selectedNode) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

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
    if (!isDragging || !selectedNode) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

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
        selectedNode = null; // 연결 모드에서는 선택 해제
    }

    isDragging = false;
    canvas.style.cursor = 'default';
    drawMindmap();
}

// 노드 정렬 함수
function organizeNodes() {
    if (nodes.length === 0) return;

    // 그래프 구조 생성
    const graph = {};
    nodes.forEach(node => {
        console.log('node:', node);
        graph[node.id] = { node: node, children: [], parents: [] };
    });
    connections.forEach(conn => {
        graph[conn.start.id].children.push(conn.end.id);
        graph[conn.end.id].parents.push(conn.start.id);
    });
    console.log('graph:', graph);

    // 루트 노드 찾기 (들어오는 간선이 없는 노드)
    const rootNodes = nodes.filter(node => graph[node.id].parents.length === 0);
    // 루트 노드가 없으면 자식이 있는 노드를 루트 노드로 설정
    if (rootNodes.length === 0) {
        for(const node of nodes) {
            if (graph[node.id].children.length != 0) {
                rootNodes.push(node);
                break;
            }
        };
    }
    console.log('rootNodes:', rootNodes);
    // BFS로 레벨 할당
    const queue = rootNodes.map(node => ({id: node.id, level: 0}));
    console.log('queue:', queue);

    const visited = new Set();

    while (queue.length > 0) {
        const {id, level} = queue.shift();
        if (visited.has(id)) continue;

        visited.add(id);
        const node = graph[id].node;
        node.level = level;

        graph[id].children.forEach(childId => {
            if (!visited.has(childId)) {
                queue.push({id: childId, level: level + 1});
            }
        });
    }

    // 방문되지 않은 노드 처리 (순환 구조나 고립된 노드)
    nodes.forEach(node => {
        if (!visited.has(node.id)) {
            node.level = 0;  // 또는 적절한 기본 레벨 설정
        }
    });

    // 레벨별 노드 그룹화
    const levelGroups = [];
    nodes.forEach(node => {
        if (!levelGroups[node.level]) levelGroups[node.level] = [];
        levelGroups[node.level].push(node);
    });

    // 노드 위치 설정
    console.log('levelGroups', levelGroups);

    const levelWidth = Math.min(250, canvas.width / levelGroups.length);
    Object.entries(levelGroups).forEach(([level, nodesInLevel]) => {
        const centerY = canvas.height / 2;
        const levelX = Number(level) * levelWidth + levelWidth / 2;

        nodesInLevel.forEach((node, index) => {
            const nodeSpacing = canvas.height / (nodesInLevel.length + 1);
            node.x = levelX;
            node.y = (index + 1) * nodeSpacing;
        });
    });

    console.log('Nodes after organizing:', nodes);  // 디버깅용
}

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

// async function loadGraph() {
//     const userId = 'current_user_id'; // 실제 사용자 ID로 대체해야 합니다

//     try {
//         const response = await fetch(`${base_url}/api/data/${userId}`);

//         if (!response.ok) {
//             throw new Error('네트워크 응답이 올바르지 않습니다');
//         }

//         const data = await response.json();

//         if (data.nodes && data.connections) {
//             nodes = data.nodes;
//             connections = data.connections.map(conn => ({
//                 start: nodes.find(node => node.id === conn.start),
//                 end: nodes.find(node => node.id === conn.end),
//                 description: conn.description
//             }));

//             console.log('connections(loadGraph):', connections);
//             drawMindmap();
//             console.log('그래프가 성공적으로 로드되었습니다');
//         } else {
//             console.log('그래프 로드에 실패했습니다');
//         }
//     } catch (error) {
//         console.error('그래프 로드 중 오류 발생:', error);
//     }
// }

async function saveGraph() {
    const user_id = 'current_user_id'; // 실제 사용자 ID로 대체해야 합니다
    const activePage = document.querySelector('#pageList .page-item.active');
    
    if (!activePage) {
        console.log('선택된 페이지가 없습니다.');
        return;
    }

    const pageId = activePage.dataset.pageId;
    
    const data = {
        nodes: nodes.map(node => ({
            id: node.id,
            x: node.x,
            y: node.y,
            text: node.text
        })),
        connections: connections.map(conn => ({
            start: conn.start.id,
            end: conn.end.id,
            description: conn.description
        }))
    };

    try {
        const response = await fetch(`${base_url}/api/users/${user_id}/pages/${pageId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('네트워크 응답이 올바르지 않습니다');
        }

        const result = await response.json();
        
        if (result.success_ok) {
            console.log('그래프가 성공적으로 저장되었습니다');
        } else {
            console.log('그래프 저장에 실패했습니다');
        }
    } catch (error) {
        console.error('그래프 저장 중 오류 발생:', error);
    }
}

// 페이지 정보를 가져오고 목록을 생성하는 함수
async function initializePages() {
    const user_id = 'current_user_id'; // 실제 사용자 ID로 대체해야 합니다

    try {
        const response = await fetch(`${base_url}/api/users/${user_id}/pages`);
        if (!response.ok) {
            throw new Error('페이지 정보를 가져오는데 실패했습니다.');
        }
        
        const pageList = document.getElementById('pageList');
        
        switch(response.status){
            case 200:
                const pages = await response.json();

                pages.forEach(page => {
                    const li = document.createElement('li');
                    li.className = 'page-item';
                    li.dataset.pageId = page.id;
                    li.innerHTML = `
                        <span class="page-icon">📄</span>
                        <span class="page-name">${page.name}</span>
                    `;
                    li.addEventListener('click', () => loadSelectedPage(page.id));
                    pageList.appendChild(li);
                });
                break;
            case 204:
                await createNewPage();
                break;
            default:
                throw new Error('페이지 데이터를 가져오는데 실패했습니다.');
        }

    } catch (error) {
        console.error('페이지 초기화 중 오류 발생:', error);
    }
}

// 선택된 페이지 로드 함수
async function loadSelectedPage(pageId) {
    nodes = [];
    connections = [];

    const user_id = 'current_user_id'; // 실제 사용자 ID로 대체해야 합니다

    try {
        const response = await fetch(`${base_url}/api/users/${user_id}/pages/${pageId}`);
        if (!response.ok) {
            throw new Error('페이지 데이터를 가져오는데 실패했습니다.');
        }
        
        const pageItems = document.querySelectorAll('#pageList .page-item');
        pageItems.forEach(item => {
            if (item.dataset.pageId === pageId) {
                item.classList.add('active');
                console.log('active 클래스 추가 :', pageId);
            } else {
                item.classList.remove('active');
            }
        });

        // 페이지 데이터로 노드와 연결 업데이트
        const data = await response.json();

        if (data.nodes) {
            nodes = data.nodes;
        }
        if(data.connections) {
            connections = data.connections.map(conn => ({
                start: nodes.find(node => node.id === conn.start),
                end: nodes.find(node => node.id === conn.end),
                description: conn.description
            }));
        }
        if(!(data.nodes && data.connections)) {
            console.log('[loadSelectedPage] 서버로부터 받은 nodes와 connections가 비어있습니다.');
            console.log('\tnode:', data.nodes);
            console.log('\tconnections:', data.connections);
        }
        drawMindmap();

        
    } catch (error) {
        console.error('페이지 로드 중 오류 발생:', error);
    }
}

// 새 페이지 생성 함수
async function createNewPage(pageName='새 페이지') {
    const user_id = 'current_user_id'; // 실제 사용자 ID로 대체해야 합니다

    try {
        const response = await fetch(`${base_url}/api/users/${user_id}/pages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: pageName })
        });

        if (!response.ok) {
            throw new Error('새 페이지 생성에 실패했습니다.');
        }

        const newPage = await response.json(); // {id: <string>, name: <string>}
        console.log('새 페이지 생성:', newPage);

        // 페이지 목록에 새 페이지 추가
        const pageList = document.getElementById('pageList');
        const li = document.createElement('li');
        li.className = 'page-item';
        li.dataset.pageId = newPage.id;
        li.innerHTML = `
            <span class="page-icon">📄</span>
            <span class="page-name">${pageName}</span>
        `;
        li.addEventListener('click', () => loadSelectedPage(newPage.id));
        pageList.appendChild(li);

        // 새로 생성된 페이지 로드
        loadSelectedPage(newPage.id);

    } catch (error) {
        console.error('새 페이지 생성 중 오류 발생:', error);
        alert('새 페이지 생성에 실패했습니다. 다시 시도해주세요.');
    }
    
}

// 노드 삭제 함수 추가
function deleteNode(node) {
    // 연결된 모든 connection 삭제
    connections = connections.filter(conn => 
        conn.start !== node && conn.end !== node
    );
    
    // 노드 삭제
    nodes = nodes.filter(n => n !== node);
    
    selectedNode = null;
    drawMindmap();
}

// 연결선 삭제 함수
function deleteConnection(connection) {
    connections = connections.filter(conn => conn !== connection);
    selectedConnection = null;
    drawMindmap();
}

// 연결선 클릭 감지 함수
function isClickOnConnection(x, y, conn) {
    const startX = conn.start.x + (conn.end.x > conn.start.x ? conn.start.width / 2 : -conn.start.width / 2);
    const startY = conn.start.y;
    const endX = conn.end.x + (conn.end.x > conn.start.x ? -conn.end.width / 2 : conn.end.width / 2);
    const endY = conn.end.y;

    // 선과 점 사이의 거리 계산
    const A = x - startX;
    const B = y - startY;
    const C = endX - startX;
    const D = endY - startY;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    const param = dot / len_sq;

    let xx, yy;

    if (param < 0) {
        xx = startX;
        yy = startY;
    } else if (param > 1) {
        xx = endX;
        yy = endY;
    } else {
        xx = startX + param * C;
        yy = startY + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < 5; // 5픽셀 이내 클릭을 허용
}

function setupButtonListeners() {
    organizeBtn.addEventListener('click', () => {
        organizeNodes();
        drawMindmap();
    });

    newPageBtn.addEventListener('click', () => {
        const pageName = prompt('새 페이지의 이름을 입력하세요:', '새 페이지');
        if (pageName !== null) {  // 사용자가 취소를 누르지 않았다면
            createNewPage(pageName);
        }
    });
    testBtn.addEventListener('click', generateTestGraph);
    saveBtn.addEventListener('click', saveGraph);

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

    connectModeBtn.addEventListener('click', () => {
        isConnectMode = !isConnectMode;
        connectModeBtn.textContent = isConnectMode ? '일반 모드' : '연결 모드';
    });
}

function setupCanvasListeners() {
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
}

function initializeApp() {
    // resizeCanvas();
    // window.addEventListener('resize', resizeCanvas);
    initializePages();
    setupButtonListeners();
    // setupCanvasListeners();
}

window.addEventListener('load', initializeApp);