import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const canvasContainer = document.getElementById('canvasContainer');
const canvas = document.getElementById('mindmapCanvas');
const ctx = canvas.getContext('2d');

const newNodeBtn = document.getElementById('newNodeBtn');
const connectModeBtn = document.getElementById('connectModeBtn');
const organizeBtn = document.getElementById('organizeBtn');
const organizeForceBtn = document.getElementById('organizeForceBtn');
const testBtn = document.getElementById('testBtn');
const saveBtn = document.getElementById('saveBtn');
const newPageBtn = document.getElementById('newPageBtn');

let nodes = [];
let connections = [];
let graph = {};
let parentNodes = [];
let isConnectMode = false;
let isSelectingParent = false;
let parentIndex = 0;
let selectedNode = null;
let selectedConnection = null;
let isDragging = false;
let nextNodeId = 0; // 새 노드 추가
let logged_in = false;
let scale = 1;
let offsetX = 0;
let offsetY = 0;
const scaleFactor = 1.1;

const levelColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F06292', '#AED581', '#FFD54F', '#4DB6AC', '#7986CB'
];

// base_url = 'http://localhost:8080';
// base_url = 'https://0590a1e7-61ab-402e-9e7d-60cfee9e3001.mock.pstmn.io';

// 노드 그리기
function drawNode(node) {
    const maxWidth = 150; 
    const padding = 5; 
    const lineHeight = 16; 

    ctx.font = '12px Arial'; 

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
    // 노드 크기 저장 (연결선 그리기에 사용)
    node.width = nodeWidth;
    node.height = nodeHeight;

    // 배경 그리기
    if (node.level !== undefined) { 
        ctx.fillStyle = levelColors[node.level % levelColors.length];
    } else {
        ctx.fillStyle = 'white';
    }

    // 선택된 노드 강조
    if(node === selectedNode) {
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
    }
    else {
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
    }

    // 사각형 그리기
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

    // 선택된 노드에 대해 휴지통 아이콘 그리기
    if (selectedNode === node) {
        const iconSize = 20;
        const iconX = node.x + node.width + 5;
        const iconY = node.y;
        
        // 휴지통 아이콘 위치 저장 (클릭 감지용)
        node.deleteIcon = {
            x: iconX,
            y: iconY,
            width: iconSize,
            height: iconSize
        };

        // 휴지통 아이콘 그리기
        ctx.font = `${iconSize}px Arial`;
        ctx.fillText('🗑️', iconX, iconY);
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
    if (conn === selectedConnection) {
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
    }
    else {
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
    }
    
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
            x: midX - iconSize / 2,
            y: midY - iconSize / 2,
            width: iconSize,
            height: iconSize
        };

        // 삭제 아이콘 그리기
        ctx.font = `${iconSize}px Arial`;
        ctx.fillText('🗑️', midX - iconSize / 2, midY + iconSize / 2);
    }
}

// 마인드맵 그리기
function drawMindmap() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    
    nodes.forEach(drawNode);
    connections.forEach(drawConnection);
    
    ctx.restore();
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

function generateGraphStructure() {
    nodes.forEach(node => {
        graph[node.id] = { node: node, children: [], parents: [] };
    });
    connections.forEach(conn => {
        graph[conn.start.id].children.push(conn.end.id);
        graph[conn.end.id].parents.push(conn.start.id);
    });
    return graph;
}

// 노드 정렬 함수
function organizeNodes() {
    if (nodes.length === 0) return;

    // 그래프 구조 생성
    generateGraphStructure();
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

function organizeNodes_force(){
    const convertedConnections = connections.map(c => ({
        source: c.start,
        target: c.end,
        description: c.description
      }));

    const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(convertedConnections).id(d => d.id).distance(150))
    .force("charge", d3.forceManyBody().strength(-300))
    .force("center", d3.forceCenter(canvas.width / 2, canvas.height / 2))
    .force("collide", d3.forceCollide().radius(30)); 
    
    simulation.on("tick", () => {
        drawMindmap();
      });
    
    drawMindmap();
}

// 임의의 그래프 생성 함수
function generateTestGraph() {
    // 기존 노드와 연결 초기화
    nodes = [];
    connections = [];
    nextNodeId = 0;

    const nodeCount = 100; // 생성할 노드 수
    const maxConnections = 10; // 각 노드당 최대 연결 수

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

async function saveGraph() {
    const activePage = document.querySelector('#pageList .page-item.active');

    if (!activePage) {
        console.log('선택된 페이지가 없습니다.');
        return;
    }
    
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

    const pageId = activePage.dataset.pageId;

    if (pageId === 'temp') {
        let tempPage = localStorage.getItem('mindlink_temp_page');
        let tempData = JSON.parse(tempPage);
        tempData[0].data = data;
        localStorage.setItem('mindlink_temp_page', JSON.stringify(tempData));
    }
    else{
        try {
            const response = await fetch(`/api/pages/${pageId}`, {
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
}

// 페이지 정보를 가져오고 목록을 생성하는 함수
async function initializePages() {
    try {
        let response;

        if(logged_in ){
            response = await fetch(`/api/pages`);
            if (!response.ok) {
                throw new Error(`페이지 초기화 실패`);
            }
        }
        else{
            let data = localStorage.getItem('mindlink_temp_page');
            if (data === null) {
                response = { status: 204 };
            }
            else{
                data = JSON.parse(data)
                console.log(typeof(data));
                console.log(data);

                response = { status: 200, json: () => Promise.resolve(data) };
            }
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
                
                loadSelectedPage(pages[0].id); 
                
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

async function loadSelectedPage(pageId) {
    nodes = [];
    connections = [];

    let response;
    let data;

    if(!logged_in){
        let tempPage = localStorage.getItem('mindlink_temp_page');
        data = JSON.parse(tempPage)[0].data;
    }
    else{
        try {
            response = await fetch(`/api/pages/${pageId}`);
            if (!response.ok) {
                throw new Error('페이지 데이터를 가져오는데 실패했습니다.');
            }
            data = await response.json();
    
        } catch (error) {
            console.error('페이지 로드 중 오류 발생:', error);
        }
    }

    const pageItems = document.querySelectorAll('#pageList .page-item');
    pageItems.forEach(item => {
        if (item.dataset.pageId === pageId) {
            item.classList.add('active');
            console.log('active 클래스 추가 :', pageId);

            if (!item.querySelector('.trash-icon')) {
                 // 휴지통 아이콘 요소 생성 (Font Awesome 아이콘 사용 예)
                const trashIcon = document.createElement('span');
                trashIcon.className = 'trash-icon';
                trashIcon.innerHTML = '<i class="fa fa-trash"></i>';
                trashIcon.style.cursor = 'pointer';

                // 휴지통 아이콘 클릭 시 삭제 로직 구현
                trashIcon.addEventListener('click', (e) => {
                    e.stopPropagation(); // 부모 요소 클릭 이벤트 방지
                    deletePage(pageId);
                });
                // active 상태인 요소에 휴지통 아이콘 추가
                item.appendChild(trashIcon);
            }
        } else {
            item.classList.remove('active');
            if (item.querySelector('.trash-icon')) {
                item.querySelector('.trash-icon').remove();
            }
        }
    });

    // 페이지 데이터로 노드와 연결 업데이트
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
        console.log('[loadSelectedPage] nodes와 connections가 비어있습니다.');
    }
    else{
        generateGraphStructure();
    }
    
    offsetX = 0;
    offsetY = 0;
    scale = 1;
    
    drawMindmap();
    
}

async function createNewPage() {
    if(!logged_in){
        let tempPage = localStorage.getItem('mindlink_temp_page');
        if (tempPage !== null) {
            alert('로그인이 필요합니다.');
            return;
        }
    }
    
    const pageName = prompt('새 페이지의 이름을 입력하세요:', '새 페이지');
    if (pageName === null) return;
    else if (pageName === '') {
        alert('페이지 이름을 입력해주세요.');
        return;
    }
    
    let newPage;

    if(logged_in){
        try {
            const response = await fetch(`/api/pages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: pageName })
            });
    
            if (!response.ok) {
                throw new Error('새 페이지 생성에 실패했습니다.');
            }
    
            newPage = await response.json(); // {id: <string>, name: <string>}
            console.log('새 페이지 생성:', newPage);
        } catch (error) {
            console.error('새 페이지 생성 중 오류 발생:', error);
            alert('새 페이지 생성에 실패했습니다. 다시 시도해주세요.');
        }
    }
    else{
        newPage = [{id:'temp', name : pageName, data: {nodes: [], connections: []}}];
        localStorage.setItem('mindlink_temp_page', JSON.stringify(newPage));
    }

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
}

async function deletePage(pageId) {
    if (confirm('정말로 이 페이지를 삭제하시겠습니까?')) {
        const response = await fetch(`/api/pages/${pageId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            console.log('페이지 삭제에 실패했습니다.', response.status);
        }
        else{
            console.log('페이지 삭제 성공');
            const pageItems = document.querySelectorAll('#pageList .page-item');
            await pageItems.forEach(item => {
                if (item.dataset.pageId === pageId) {
                    item.remove();
                }
            });
            if (document.querySelector('#pageList .page-item')) {
                loadSelectedPage(document.querySelector('#pageList .page-item').dataset.pageId);
            }
        }
    }
}

function createNode(x, y) {
    let text = prompt('노드 텍스트를 입력하세요:', '새 노드');
    if (text === null) return;
    else if(text === '') {
        alert('노드 텍스트를 입력해주세요.');
        return;
    }

    if (x == null ) { x = Math.random() * (canvas.width - 40) + 20;}
    if (y == null) { y = Math.random() * (canvas.height - 40) + 20;}
    
    const node = { 
        id: nextNodeId++,
        x, 
        y, 
        text
    };

    calculateNodeSize(node);
    nodes.push(node);
    generateGraphStructure();
    console.log('New node:', x, y, text); // 디버깅용
    return node;
}

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

function createConnection(start, end) {
    let description = prompt('연결선의 설명을 입력하세요:', '연결선');
    if (description === null) return;
    else if(description === '') {
        alert('연결선 설명을 입력해주세요.');
        return;
    }

    connections.push({
        start: start,
        end: end,
        description: description
    });
    generateGraphStructure();
}

function deleteConnection(connection) {
    connections = connections.filter(conn => conn !== connection);
    selectedConnection = null;
    drawMindmap();
}

/** 
 * 연결선 클릭 감지 함수
 * 
 * 선과 점 사이의 거리 공식이용
 */ 
function isClickOnConnection(x, y, conn) {
    const startX = conn.start.x + (conn.end.x > conn.start.x ? conn.start.width / 2 : -conn.start.width / 2);
    const startY = conn.start.y;
    const endX = conn.end.x + (conn.end.x > conn.start.x ? -conn.end.width / 2 : conn.end.width / 2);
    const endY = conn.end.y;

    
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
        // 노드 클릭 
        if (isConnectMode) { // 연결모드 일때
            selectedNode = clickedNode;
            isDragging = true;
            canvas.style.cursor = 'crosshair';
        } 
        else { // 일반모드 일때
            if (selectedNode === clickedNode) {
                selectedNode = null;
            } else {
                selectedNode = clickedNode;
                isDragging = true;
                canvas.style.cursor = 'grabbing';
            }
        }
        selectedConnection = null; // 노드 선택시 연결선 선택 해제
    } 
    else {
        // 연결선 클릭
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
            parentIndex = 0;
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
            createConnection(selectedNode, targetNode);
        }
        selectedNode = null; // 연결 모드에서는 선택 해제
    }

    isDragging = false;
    canvas.style.cursor = 'default';
    drawMindmap();
}

function onMouseWheel(e) {
    e.preventDefault();
    console.log('mouse wheel event:', e);

    // 마우스 위치 (canvas 내 좌표)
    const { offsetX: mouseX, offsetY: mouseY } = e;
    // 휠 방향에 따라 확대 또는 축소 결정
    const delta = e.deltaY < 0 ? 1 : -1;
    const zoom = Math.pow(scaleFactor, delta);
    
    // 마우스 위치를 기준으로 오프셋 업데이트
    offsetX = mouseX - zoom * (mouseX - offsetX);
    offsetY = mouseY - zoom * (mouseY - offsetY);
    
    // 스케일 업데이트
    scale *= zoom;
    
    drawMindmap();
}


function resizeCanvas() {
    const containerRect = canvasContainer.getBoundingClientRect();
    canvas.width = containerRect.width;
    canvas.height = containerRect.height;
    drawMindmap();
}

function setupButtonListeners() {
    organizeBtn.addEventListener('click', () => {
        organizeNodes();
        drawMindmap();
    });

    organizeForceBtn.addEventListener('click', () => {
        organizeNodes_force();
        drawMindmap();
    });

    newPageBtn.addEventListener('click', () => {
            createNewPage();
    });
    testBtn.addEventListener('click', generateTestGraph);
    saveBtn.addEventListener('click', saveGraph);

    newNodeBtn.addEventListener('click', () => {
        createNode()
        drawMindmap();
    });

    connectModeBtn.addEventListener('click', () => {
        isConnectMode = !isConnectMode;
        connectModeBtn.textContent = isConnectMode ? '일반 모드로 전환' : '연결 모드로 전환';
    });
}

function setupCanvasListeners() {
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onMouseWheel);
}

function setupKeyboardListeners() {
    window.addEventListener('keydown', e => {
        if (selectedNode) {
            if (e.key === 'Tab') {
                // shift + tab : 부모 선택
                if (e.shiftKey) {
                    e.preventDefault();
                    parentNodes = graph[selectedNode.id].parents;
                    parentNodes.forEach(id => {
                        console.log(graph[id]);
                    })
                    
                    if (parentIndex < parentNodes.length && parentIndex > 0) {
                        parentIndex = (parentIndex + 1) % parentNodes.length;
                    }

                    selectedNode = nodes.find(node => node.id === parentNodes[parentIndex]);
                } 
                else { 
                    // tab : 자식 생성
                    e.preventDefault();
                    const newnode = createNode(x = selectedNode.x + canvas.width*0.1, y=selectedNode.y);
                    if (newnode !== undefined) {
                        createConnection(selectedNode, newnode);
                        selectedNode = newnode;
                    }
                }
            }

            if (e.key === 'ArrowUp') {
                const currentIndex = parentNodes.indexOf(selectedNode);
                const nextIndex = (currentIndex - 1 + parentNodes.length) % parentNodes.length;
                selectedNode = parentNodes[nextIndex];
            } else if (e.key === 'ArrowDown') {
                const currentIndex = parentNodes.indexOf(selectedNode);
                const nextIndex = (currentIndex + 1) % parentNodes.length;
                selectedNode = parentNodes[nextIndex];
            } else if (e.key === 'Enter') {
                isSelectingParent = false;
            }
        }

        drawMindmap();
    });
}

function getCookie() {
    const cookies = document.cookie.split("; "); // 쿠키 문자열을 `; ` 기준으로 분할
    for (let cookie of cookies) {
        let [key, value] = cookie.split("="); // `=` 기준으로 키와 값 분리
        if (key === "access-token" ) return decodeURIComponent(value); // 원하는 쿠키 찾으면 반환
    }
    return null; // 없으면 null 반환
}

function deleteCookie(){
    document.cookie ="access-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.reload();
}

function checkLoggedIn(){
    if (getCookie() === null) {
        alert('로그인이 필요합니다.');
    }
    else{
        logged_in = true;
        document.getElementById("login-text").innerText = "Logout";
        document.getElementById("google-login-btn").addEventListener("click", deleteCookie);
    }
}

function initializeApp() {
    checkLoggedIn();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    initializePages();
    setupButtonListeners();
    setupCanvasListeners();
    setupKeyboardListeners(); 
}

window.addEventListener('load', initializeApp);