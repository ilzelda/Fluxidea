
import { drawMindmap } from './ui.js';

let isDragging = false;
let startDragX = 0;
let startDragY = 0;

export function setupButtonListeners(app) {
    // Main toolbar buttons
    app.ui.organizeBtn.addEventListener("click", () => app.organizeNodes());
    app.ui.organizeForceBtn.addEventListener("click", () => app.organizeNodes_force());
    app.ui.newPageBtn.addEventListener("click", () => app.createNewPage());
    app.ui.testBtn.addEventListener("click", () => app.generateTestGraph());
    app.ui.saveBtn.addEventListener("click", () => app.saveGraph());
    app.ui.newNodeBtn.addEventListener("click", () => {
        app.createNode();
        app.drawMindmap();
    });
    app.ui.connectModeBtn.addEventListener("click", () => app.toggleConnectMode());
    app.ui.changeViewBtn.addEventListener("click", () => app.toggleViewMode());
    app.ui.themeToggle.addEventListener("click", () => app.toggleTheme());

    // Mobile toolbar buttons
    app.ui.organizeBtnMobile.addEventListener("click", () => app.organizeNodes());
    app.ui.organizeForceBtnMobile.addEventListener("click", () => app.organizeNodes_force());
    app.ui.testBtnMobile.addEventListener("click", () => app.generateTestGraph());
    app.ui.saveBtnMobile.addEventListener("click", () => app.saveGraph());
    app.ui.newNodeBtnMobile.addEventListener("click", () => {
        app.createNode();
        app.drawMindmap();
    });
    app.ui.connectModeBtnMobile.addEventListener("click", () => app.toggleConnectMode());
    app.ui.changeViewBtnMobile.addEventListener("click", () => app.toggleViewMode());

    // Sidebar toggle
    app.ui.sidebarOpen.addEventListener("click", () => {
        app.ui.sidebar.classList.add("open");
    });

    app.ui.sidebarClose.addEventListener("click", () => {
        app.ui.sidebar.classList.remove("open");
    });

    // Toolbar dropdown
    app.ui.toolbarDropdownBtn.addEventListener("click", () => {
        app.ui.toolbarDropdownContent.classList.toggle("show");
    });

    // 드롭다운 외부 클릭 시 닫기
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".toolbar-dropdown") && app.ui.toolbarDropdownContent.classList.contains("show")) {
            app.ui.toolbarDropdownContent.classList.remove("show");
        }
    });
}

export function setupCanvasListeners(app) {
    app.ui.canvas.addEventListener("mousedown", (e) => onMouseDown(e, app));
    app.ui.canvas.addEventListener("mousemove", (e) => onMouseMove(e, app));
    app.ui.canvas.addEventListener("mouseup", (e) => onMouseUp(e, app));
    app.ui.canvas.addEventListener("wheel", (e) => onMouseWheel(e, app));

    // Touch events
    app.ui.canvas.addEventListener("touchstart", (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent("mousedown", {
            clientX: touch.clientX,
            clientY: touch.clientY,
        });
        app.ui.canvas.dispatchEvent(mouseEvent);
    });

    app.ui.canvas.addEventListener("touchmove", (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent("mousemove", {
            clientX: touch.clientX,
            clientY: touch.clientY,
        });
        app.ui.canvas.dispatchEvent(mouseEvent);
    });

    app.ui.canvas.addEventListener("touchend", (e) => {
        e.preventDefault();
        const mouseEvent = new MouseEvent("mouseup", {});
        app.ui.canvas.dispatchEvent(mouseEvent);
    });
}

export function setupKeyboardListeners(app) {
    window.addEventListener("keydown", (e) => {
        if (app.selectedNode) {
            if (e.key === "Delete" || e.key === "Backspace") {
                e.preventDefault();
                if (confirm("이 노드를 삭제하시겠습니까?")) {
                    app.deleteNode(app.selectedNode);
                }
                return;
            }

            if (e.key === "Tab") {
                if (e.shiftKey) {
                    e.preventDefault();
                    app.selectParentNode();
                } else {
                    e.preventDefault();
                    const newNode = app.createNode(app.selectedNode.x + app.ui.canvas.width * 0.1, app.selectedNode.y);
                    if (newNode) {
                        app.createConnection(app.selectedNode, newNode);
                        app.selectedNode = newNode;
                    }
                }
            }

            if (e.key === "ArrowUp") {
                // Handle arrow navigation if needed
            } else if (e.key === "ArrowDown") {
                // Handle arrow navigation if needed
            } else if (e.key === "Enter") {
                // Handle enter key if needed
            }
        }

        if (app.selectedConnection && (e.key === "Delete" || e.key === "Backspace")) {
            e.preventDefault();
            if (confirm("이 연결선을 삭제하시겠습니까?")) {
                app.deleteConnection(app.selectedConnection);
            }
            return;
        }

        app.drawMindmap();
    });
}

function onMouseDown(e, app) {
    const rect = app.ui.canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    const { x, y } = app.getRealCoordinates(canvasX, canvasY);

    if (app.selectedNode && app.selectedNode.deleteIcon) {
        const icon = app.selectedNode.deleteIcon;
        if (x >= icon.x && x <= icon.x + icon.width && y >= icon.y && y <= icon.y + icon.height) {
            if (confirm("이 노드를 삭제하시겠습니까?")) {
                app.deleteNode(app.selectedNode);
            }
            return;
        }
    }

    if (app.selectedConnection && app.selectedConnection.deleteIcon) {
        const icon = app.selectedConnection.deleteIcon;
        if (x >= icon.x && x <= icon.x + icon.width && y >= icon.y && y <= icon.y + icon.height) {
            if (confirm("이 연결선을 삭제하시겠습니까?")) {
                app.deleteConnection(app.selectedConnection);
            }
            return;
        }
    }

    const clickedNode = app.nodes.find(
        (node) =>
            x >= node.x - node.width / 2 &&
            x <= node.x + node.width / 2 &&
            y >= node.y - node.height / 2 &&
            y <= node.y + node.height / 2,
    );

    if (clickedNode) {
        if (app.isConnectMode) {
            app.selectedNode = clickedNode;
            isDragging = true;
            app.ui.canvas.style.cursor = "crosshair";
        } else {
            if (app.selectedNode === clickedNode) {
                app.selectedNode = null;
            } else {
                app.selectedNode = clickedNode;
                isDragging = true;
                app.ui.canvas.style.cursor = "grabbing";
            }
        }
        app.selectedConnection = null;
    } else {
        const clickedConnection = app.connections.find((conn) => app.isClickOnConnection(x, y, conn));
        if (clickedConnection) {
            if (app.selectedConnection === clickedConnection) {
                app.selectedConnection = null;
            } else {
                app.selectedConnection = clickedConnection;
            }
            app.selectedNode = null;
        } else {
            app.selectedNode = null;
            app.selectedConnection = null;
            isDragging = true;
            startDragX = e.offsetX - app.offsetX;
            startDragY = e.offsetY - app.offsetY;
        }
    }

    app.drawMindmap();
}

function onMouseMove(e, app) {
    if (!isDragging) return;

    const rect = app.ui.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (app.isConnectMode && app.selectedNode) {
        app.drawMindmap();

        const startX = app.selectedNode.x + (x > app.selectedNode.x ? app.selectedNode.width / 2 : -app.selectedNode.width / 2);
        const startY = app.selectedNode.y;
        const controlPointX = (startX + x) / 2;
        const controlPointY = (startY + y) / 2 - 30;

        app.ui.ctx.save();
        app.ui.ctx.translate(app.offsetX, app.offsetY);
        app.ui.ctx.scale(app.scale, app.scale);

        app.ui.ctx.strokeStyle = app.ui.isDarkMode ? "rgba(148, 163, 184, 0.6)" : "rgba(100, 116, 139, 0.6)";
        app.ui.ctx.lineWidth = 1.5;
        app.ui.ctx.setLineDash([5, 5]);

        app.ui.ctx.beginPath();
        app.ui.ctx.moveTo(startX, startY);
        app.ui.ctx.quadraticCurveTo(controlPointX, controlPointY, x, y);
        app.ui.ctx.stroke();

        app.ui.ctx.setLineDash([]);
        app.ui.ctx.restore();
    } else if (app.selectedNode) {
        app.selectedNode.x = (x - app.offsetX) / app.scale;
        app.selectedNode.y = (y - app.offsetY) / app.scale;
        app.drawMindmap();
    } else {
        app.offsetX = e.offsetX - startDragX;
        app.offsetY = e.offsetY - startDragY;
        app.drawMindmap();
    }
}

function onMouseUp(e, app) {
    if (!isDragging) return;

    const rect = app.ui.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (app.isConnectMode && app.selectedNode) {
        const { x: realX, y: realY } = app.getRealCoordinates(x, y);
        const targetNode = app.nodes.find(
            (node) =>
                node !== app.selectedNode &&
                realX >= node.x - node.width / 2 &&
                realX <= node.x + node.width / 2 &&
                realY >= node.y - node.height / 2 &&
                realY <= node.y + node.height / 2,
        );

        if (targetNode) {
            app.createConnection(app.selectedNode, targetNode);
        }
        app.selectedNode = null;
    }

    isDragging = false;
    app.ui.canvas.style.cursor = "default";
    app.drawMindmap();
}

function onMouseWheel(e, app) {
    e.preventDefault();

    const { offsetX: mouseX, offsetY: mouseY } = e;
    const delta = e.deltaY < 0 ? 1 : -1;
    const zoom = Math.pow(1.1, delta);

    app.offsetX = mouseX - zoom * (mouseX - app.offsetX);
    app.offsetY = mouseY - zoom * (mouseY - app.offsetY);
    app.scale *= zoom;

    app.drawMindmap();
}
