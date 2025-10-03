import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { initAuth } from './auth.js';
import * as auth from './auth.js';
import * as ui from './ui.js';
import { setupButtonListeners, setupCanvasListeners, setupKeyboardListeners } from './event.js';
import * as api from './api.js';

class MindLinkApp {
    constructor() {
        this.nodes = [];
        this.connections = [];
        this.graph = {};
        this.parentNodes = [];
        this.parentIndex = 0;
        this.nextNodeId = 0;

        this.isConnectMode = false;
        this.selectedNode = null;
        this.selectedConnection = null;

        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;

        this.logged_in = false;

        this.ui = ui;
        this.api = api;
    }

    init() {
        this.logged_in = initAuth();
        
        if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
            this.ui.isDarkMode = true;
            document.body.classList.add("dark");
            this.ui.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }

        this.resizeCanvas();
        window.addEventListener("resize", () => this.resizeCanvas());
        
        this.initializePages();
        setupButtonListeners(this);
        setupCanvasListeners(this);
        setupKeyboardListeners(this);

        this.ui.showToast("마인드맵이 준비되었습니다", "info");
    }

    drawMindmap() {
        this.ui.drawMindmap(this.nodes, this.connections, this.selectedNode, this.selectedConnection, this.offsetX, this.offsetY, this.scale);
    }

    resizeCanvas() {
        this.ui.resizeCanvas(this.nodes, this.connections, this.selectedNode, this.selectedConnection, this.offsetX, this.offsetY, this.scale);
    }

    getRealCoordinates(mouseX, mouseY) {
        const realX = (mouseX - this.offsetX) / this.scale;
        const realY = (mouseY - this.offsetY) / this.scale;
        return { x: realX, y: realY };
    }

    isClickOnConnection(x, y, conn) {
        const startX = conn.start.x + (conn.end.x > conn.start.x ? conn.start.width / 2 : -conn.start.width / 2);
        const startY = conn.start.y;
        const endX = conn.end.x + (conn.end.x > conn.start.x ? -conn.end.width / 2 : conn.end.width / 2);
        const endY = conn.end.y;

        const controlPointX = (startX + endX) / 2;
        const controlPointY = (startY + endY) / 2 - 30;

        const samples = 10;
        let minDistance = Number.POSITIVE_INFINITY;

        for (let i = 0; i <= samples; i++) {
            const t = i / samples;
            const pointX = Math.pow(1 - t, 2) * startX + 2 * (1 - t) * t * controlPointX + Math.pow(t, 2) * endX;
            const pointY = Math.pow(1 - t, 2) * startY + 2 * (1 - t) * t * controlPointY + Math.pow(t, 2) * endY;

            const dx = x - pointX;
            const dy = y - pointY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < minDistance) {
                minDistance = distance;
            }
        }

        return minDistance < 10;
    }

    createNode(x, y) {
        const text = prompt("노드 텍스트를 입력하세요:", "새 노드");
        if (text === null) return;
        else if (text === "") {
            this.ui.showToast("노드 텍스트를 입력해주세요.", "warning");
            return;
        }

        if (x == null) {
            x = Math.random() * (this.ui.canvas.width - 40) + 20;
        }
        if (y == null) {
            y = Math.random() * (this.ui.canvas.height - 40) + 20;
        }

        const node = {
            id: this.nextNodeId++,
            x,
            y,
            text,
        };

        this.calculateNodeSize(node);
        this.nodes.push(node);
        this.generateGraphStructure();
        return node;
    }

    deleteNode(node) {
        this.connections = this.connections.filter((conn) => conn.start !== node && conn.end !== node);
        this.nodes = this.nodes.filter((n) => n !== node);
        this.selectedNode = null;
        this.drawMindmap();
        this.ui.showToast("노드가 삭제되었습니다");
    }

    createConnection(start, end) {
        const description = prompt("연결선의 설명을 입력하세요:", "연결선");
        if (description === null) return;
        else if (description === "") {
            this.ui.showToast("연결선 설명을 입력해주세요.", "warning");
            return;
        }

        this.connections.push({
            start: start,
            end: end,
            description: description,
        });
        this.generateGraphStructure();
        this.ui.showToast("연결선이 생성되었습니다");
    }

    deleteConnection(connection) {
        this.connections = this.connections.filter((conn) => conn !== connection);
        this.selectedConnection = null;
        this.drawMindmap();
        this.ui.showToast("연결선이 삭제되었습니다");
    }

    calculateNodeSize(node) {
        const padding = 10;
        const lineHeight = 20;
        const maxWidth = 200;

        this.ui.ctx.font = "14px Inter, sans-serif";
        const words = node.text.split(" ");
        const lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = this.ui.ctx.measureText(currentLine + " " + word).width;
            if (width < maxWidth) {
                currentLine += " " + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);

        const textWidth = Math.min(maxWidth, Math.max(...lines.map((line) => this.ui.ctx.measureText(line).width)));
        node.width = textWidth + padding * 2;
        node.height = lines.length * lineHeight + padding * 2;
    }

    generateGraphStructure() {
        this.graph = {};
        this.nodes.forEach((node) => {
            this.graph[node.id] = { node: node, children: [], parents: [] };
        });
        this.connections.forEach((conn) => {
            this.graph[conn.start.id].children.push(conn.end.id);
            this.graph[conn.end.id].parents.push(conn.start.id);
        });
    }

    organizeNodes() {
        if (this.nodes.length === 0) return;

        this.ui.showLoading(true);

        setTimeout(() => {
            this.generateGraphStructure();

            const rootNodes = this.nodes.filter((node) => this.graph[node.id].parents.length === 0);
            if (rootNodes.length === 0) {
                for (const node of this.nodes) {
                    if (this.graph[node.id].children.length != 0) {
                        rootNodes.push(node);
                        break;
                    }
                }
            }

            const queue = rootNodes.map((node) => ({ id: node.id, level: 0 }));
            const visited = new Set();

            while (queue.length > 0) {
                const { id, level } = queue.shift();
                if (visited.has(id)) continue;

                visited.add(id);
                const node = this.graph[id].node;
                node.level = level;

                this.graph[id].children.forEach((childId) => {
                    if (!visited.has(childId)) {
                        queue.push({ id: childId, level: level + 1 });
                    }
                });
            }

            this.nodes.forEach((node) => {
                if (!visited.has(node.id)) {
                    node.level = 0;
                }
            });

            const levelGroups = [];
            this.nodes.forEach((node) => {
                if (!levelGroups[node.level]) levelGroups[node.level] = [];
                levelGroups[node.level].push(node);
            });

            const levelWidth = Math.min(250, this.ui.canvas.width / levelGroups.length);
            Object.entries(levelGroups).forEach(([level, nodesInLevel]) => {
                const centerY = this.ui.canvas.height / 2;
                const levelX = Number(level) * levelWidth + levelWidth / 2;

                nodesInLevel.forEach((node, index) => {
                    const nodeSpacing = this.ui.canvas.height / (nodesInLevel.length + 1);
                    node.x = levelX;
                    node.y = (index + 1) * nodeSpacing;
                });
            });

            this.ui.showLoading(false);
            this.drawMindmap();
        }, 100);
    }

    organizeNodes_force() {
        this.ui.showLoading(true);

        setTimeout(() => {
            const convertedConnections = this.connections.map((c) => ({
                source: c.start,
                target: c.end,
                description: c.description,
            }));

            const simulation = d3
                .forceSimulation(this.nodes)
                .force(
                    "link",
                    d3
                        .forceLink(convertedConnections)
                        .id((d) => d.id)
                        .distance(150),
                )
                .force("charge", d3.forceManyBody().strength(-300))
                .force("center", d3.forceCenter(this.ui.canvas.width / 2, this.ui.canvas.height / 2))
                .force("collide", d3.forceCollide().radius(50));

            simulation.on("tick", () => {
                this.drawMindmap();
            });

            simulation.on("end", () => {
                this.ui.showLoading(false);
                this.drawMindmap();
            });

            this.drawMindmap();
        }, 100);
    }

    generateTestGraph() {
        this.ui.showLoading(true);

        setTimeout(() => {
            this.nodes = [];
            this.connections = [];
            this.nextNodeId = 0;

            const nodeCount = 20;
            const maxConnections = 5;

            for (let i = 0; i < nodeCount; i++) {
                const x = Math.random() * (this.ui.canvas.width - 100) + 50;
                const y = Math.random() * (this.ui.canvas.height - 100) + 50;
                const node = {
                    id: this.nextNodeId++,
                    x: x,
                    y: y,
                    text: `노드 ${i + 1}`,
                };
                this.calculateNodeSize(node);
                this.nodes.push(node);
            }

            this.nodes.forEach((node) => {
                const connectionCount = Math.floor(Math.random() * (maxConnections + 1));
                for (let i = 0; i < connectionCount; i++) {
                    const targetNode = this.nodes[Math.floor(Math.random() * this.nodes.length)];
                    if (
                        targetNode !== node &&
                        !this.connections.some(
                            (conn) =>
                                (conn.start === node && conn.end === targetNode) || (conn.start === targetNode && conn.end === node),
                        )
                    ) {
                        this.connections.push({
                            start: node,
                            end: targetNode,
                            description: `연결 ${this.connections.length + 1}`,
                        });
                    }
                }
            });

            this.ui.showLoading(false);
            this.drawMindmap();
        }, 100);
    }

    async saveGraph() {
        const activePage = document.querySelector("#pageList .page-item.active");

        if (!activePage) {
            this.ui.showToast("선택된 페이지가 없습니다.");
            return;
        }

        this.ui.showLoading(true);
        const pageId = activePage.dataset.pageId;
        await this.api.saveData(this.nodes, this.connections, pageId);
    }

    async initializePages() {
        this.ui.showLoading(true);
        try {
            let pages = await this.api.getData(this.logged_in, null, { suppressErrors: true });
            const pageList = document.getElementById("pageList");
            pageList.innerHTML = "";

            if (pages && pages.length > 0) {
                pages.forEach((page) => {
                    const li = document.createElement("li");
                    li.className = "page-item fade-in";
                    li.dataset.pageId = page.id;
                    li.innerHTML = `
                        <span class="page-icon"><i class="fas fa-file-alt"></i></span>
                        <span class="page-name">${page.name}</span>
                    `;
                    li.addEventListener("click", () => this.loadSelectedPage(page.id));
                    pageList.appendChild(li);
                });
                this.loadSelectedPage(pages[0].id);
            } else {
                await this.createNewPage();
            }
        } catch (error) {
            console.error("페이지 초기화 중 오류 발생:", error);
            this.ui.showToast("페이지 초기화 중 오류가 발생했습니다", "error");
        }
        this.ui.showLoading(false);
    }

    async loadSelectedPage(pageId) {
        this.ui.showLoading(true);
        this.ui.cleanupThree();

        this.nodes = [];
        this.connections = [];

        let data = await this.api.getData(this.logged_in, pageId);

        const pageItems = document.querySelectorAll("#pageList .page-item");
        pageItems.forEach((item) => {
            if (item.dataset.pageId === pageId) {
                item.classList.add("active");
                if (!item.querySelector(".trash-icon")) {
                    const trashIcon = document.createElement("span");
                    trashIcon.className = "trash-icon";
                    trashIcon.innerHTML = '<i class="fas fa-trash"></i>';
                    trashIcon.style.cursor = "pointer";
                    trashIcon.addEventListener("click", (e) => {
                        e.stopPropagation();
                        this.deletePage(pageId);
                    });
                    item.appendChild(trashIcon);
                }
            } else {
                item.classList.remove("active");
                if (item.querySelector(".trash-icon")) {
                    item.querySelector(".trash-icon").remove();
                }
            }
        });

        if (data.nodes) {
            this.nodes = data.nodes;
        }
        if (data.connections) {
            this.connections = data.connections.map((conn) => ({
                start: this.nodes.find((node) => node.id === conn.start),
                end: this.nodes.find((node) => node.id === conn.end),
                description: conn.description,
            }));
        }

        if (data.nodes && data.connections) {
            this.generateGraphStructure();
            this.nextNodeId = Math.max(...this.nodes.map((node) => node.id)) + 1;
        }

        this.offsetX = 0;
        this.offsetY = 0;
        this.scale = 1;

        if (this.ui.isView3D) {
            this.ui.initializeThree(this.nodes, this.connections);
        } else {
            this.drawMindmap();
        }

        this.ui.showLoading(false);

        if (window.innerWidth <= 768) {
            this.ui.sidebar.classList.remove("open");
        }
    }

    async createNewPage() {
        const newPage = await this.api.createPage(this.logged_in);
        if (newPage) {
            const pageList = document.getElementById("pageList");
            const li = document.createElement("li");
            li.className = "page-item fade-in";
            li.dataset.pageId = newPage.id;
            li.innerHTML = `
                <span class="page-icon"><i class="fas fa-file-alt"></i></span>
                <span class="page-name">${newPage.name}</span>
            `;
            li.addEventListener("click", () => this.loadSelectedPage(newPage.id));
            pageList.appendChild(li);
            this.loadSelectedPage(newPage.id);
            this.ui.showToast("새 페이지가 생성되었습니다");
        }
    }

    async deletePage(pageId) {
        await this.api.deleteData(pageId);
        const pageItems = document.querySelectorAll("#pageList .page-item");
        pageItems.forEach((item) => {
            if (item.dataset.pageId === pageId) {
                item.remove();
            }
        });
        if (document.querySelector("#pageList .page-item")) {
            this.loadSelectedPage(document.querySelector("#pageList .page-item").dataset.pageId);
        }
    }

    toggleTheme() {
        this.ui.toggleTheme(() => this.drawMindmap());
    }

    toggleConnectMode() {
        this.isConnectMode = !this.isConnectMode;
        this.ui.toggleConnectMode(this.isConnectMode);
    }

    toggleViewMode() {
        this.ui.toggleViewMode(() => this.drawMindmap());
    }
    
    selectParentNode() {
        const parentIds = this.graph[this.selectedNode.id].parents;
        if (parentIds.length > 0) {
            this.parentIndex = (this.parentIndex + 1) % parentIds.length;
            this.selectedNode = this.nodes.find(node => node.id === parentIds[this.parentIndex]);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new MindLinkApp();
    app.init();

    document.getElementById('google-login-btn').addEventListener('click', auth.login);
    document.getElementById('logout-btn').addEventListener('click', auth.logout);
});
