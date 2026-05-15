
import { drawMindmap } from './ui.js';
import { getConnectionMidpoint, getCurveControlPoint, getNodeBoundaryPoint } from './connectionGeometry.js';

let isDragging = false;
let startDragX = 0;
let startDragY = 0;
let activeInlineEditor = null;
let connectTargetHintShown = false;
let isHandleConnectionDrag = false;

export function setupButtonListeners(app) {
    // Main toolbar buttons
    app.ui.organizeBtn.addEventListener("click", () => app.organizeNodes());
    app.ui.organizeForceBtn.addEventListener("click", () => app.organizeNodes_force());
    app.ui.newPageBtn.addEventListener("click", () => app.createNewPage());
    app.ui.testBtn.addEventListener("click", () => app.generateTestGraph());
    app.ui.saveBtn.addEventListener("click", () => app.saveGraph());
    app.ui.newNodeBtn.addEventListener("click", () => {
        const newNode = app.createNode();
        if (newNode) {
            app.selectedNode = newNode;
            app.selectedConnection = null;
            beginInlineEdit(app, "node", newNode);
        }
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
        const newNode = app.createNode();
        if (newNode) {
            app.selectedNode = newNode;
            app.selectedConnection = null;
            beginInlineEdit(app, "node", newNode);
        }
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
    app.ui.canvas.addEventListener("dblclick", (e) => onCanvasDoubleClick(e, app));
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

function findNodeAt(app, x, y) {
    return app.nodes.find(
        (node) =>
            x >= node.x - node.width / 2 &&
            x <= node.x + node.width / 2 &&
            y >= node.y - node.height / 2 &&
            y <= node.y + node.height / 2,
    );
}

function findConnectionAt(app, x, y) {
    return app.connections.find((conn) => app.isClickOnConnection(x, y, conn));
}

function findConnectTargetAt(app, x, y, sourceNode) {
    const targetNode = findNodeAt(app, x, y);
    return targetNode && targetNode !== sourceNode ? targetNode : null;
}

function isPointInBox(x, y, box) {
    return box && x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
}

function isConnectingDrag(app) {
    return app.selectedNode && (app.isConnectMode || isHandleConnectionDrag);
}

function isEditingElement(element) {
    return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element?.isContentEditable;
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function getScreenPosition(app, x, y) {
    return {
        x: x * app.scale + app.offsetX,
        y: y * app.scale + app.offsetY,
    };
}

function getConnectionLabelPosition(conn) {
    const midpoint = getConnectionMidpoint(conn);

    return { x: midpoint.x, y: midpoint.y - 8 };
}

function finishInlineEdit(commit = true) {
    if (!activeInlineEditor) return;

    const { app, input, target, type, previousValue } = activeInlineEditor;
    const nextValue = input.value;
    activeInlineEditor = null;
    input.remove();

    if (!commit) {
        if (type === "node") {
            target.text = previousValue;
            app.calculateNodeSize(target);
        } else {
            target.description = previousValue;
        }
        app.drawMindmap();
        return;
    }

    if (type === "node" && !app.updateNodeText(target, nextValue)) {
        target.text = previousValue;
        app.calculateNodeSize(target);
        app.drawMindmap();
        return;
    }

    if (type === "connection") {
        app.updateConnectionDescription(target, nextValue);
    }
}

function beginInlineEdit(app, type, target) {
    finishInlineEdit(true);

    const input = document.createElement("input");
    input.type = "text";
    input.className = `inline-editor inline-editor-${type}`;
    input.value = type === "node" ? target.text : target.description || "";
    input.placeholder = type === "node" ? "노드 텍스트" : "연결 설명";

    const containerWidth = app.ui.canvasContainer.clientWidth;
    const containerHeight = app.ui.canvasContainer.clientHeight;
    let screenPosition;
    let width;
    let height;

    if (type === "node") {
        screenPosition = getScreenPosition(app, target.x, target.y);
        width = clamp((target.width || 120) * app.scale + 24, 120, 360);
        height = clamp((target.height || 40) * app.scale + 10, 36, 96);
    } else {
        const labelPosition = getConnectionLabelPosition(target);
        screenPosition = getScreenPosition(app, labelPosition.x, labelPosition.y);
        width = clamp((input.value.length || input.placeholder.length) * 9 + 36, 120, 280);
        height = 34;
    }

    input.style.width = `${width}px`;
    input.style.height = `${height}px`;
    input.style.left = `${clamp(screenPosition.x - width / 2, 8, Math.max(8, containerWidth - width - 8))}px`;
    input.style.top = `${clamp(screenPosition.y - height / 2, 8, Math.max(8, containerHeight - height - 8))}px`;

    activeInlineEditor = {
        app,
        input,
        target,
        type,
        previousValue: input.value,
    };

    input.addEventListener("blur", () => finishInlineEdit(true));
    input.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
            e.preventDefault();
            finishInlineEdit(true);
        } else if (e.key === "Escape") {
            e.preventDefault();
            finishInlineEdit(false);
        }
    });

    app.ui.canvasContainer.appendChild(input);
    requestAnimationFrame(() => {
        input.focus();
        input.select();
    });
}

export function setupKeyboardListeners(app) {
    window.addEventListener("keydown", (e) => {
        if (isEditingElement(e.target)) return;

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
                    const sourceNode = app.selectedNode;
                    const newNode = app.createNode(sourceNode.x + app.ui.canvas.width * 0.1, sourceNode.y);
                    if (newNode) {
                        app.createConnection(sourceNode, newNode);
                        app.selectedNode = newNode;
                        app.selectedConnection = null;
                        app.drawMindmap();
                        beginInlineEdit(app, "node", newNode);
                    }
                    return;
                }
            }

            if (e.key === "ArrowUp") {
                // Handle arrow navigation if needed
            } else if (e.key === "ArrowDown") {
                // Handle arrow navigation if needed
            } else if (e.key === "Enter") {
                e.preventDefault();
                beginInlineEdit(app, "node", app.selectedNode);
                return;
            }
        }

        if (app.selectedConnection && e.key === "Enter") {
            e.preventDefault();
            beginInlineEdit(app, "connection", app.selectedConnection);
            return;
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
    finishInlineEdit(true);

    const rect = app.ui.canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    const { x, y } = app.getRealCoordinates(canvasX, canvasY);

    if (app.selectedNode && isPointInBox(x, y, app.selectedNode.connectHandle)) {
        app.highlightedConnectTarget = null;
        app.selectedConnection = null;
        connectTargetHintShown = false;
        isHandleConnectionDrag = true;
        isDragging = true;
        app.ui.canvas.style.cursor = "crosshair";
        app.drawMindmap();
        return;
    }

    if (app.selectedNode && app.selectedNode.deleteIcon) {
        const icon = app.selectedNode.deleteIcon;
        if (isPointInBox(x, y, icon)) {
            if (confirm("이 노드를 삭제하시겠습니까?")) {
                app.deleteNode(app.selectedNode);
            }
            return;
        }
    }

    if (app.selectedConnection && app.selectedConnection.deleteIcon) {
        const icon = app.selectedConnection.deleteIcon;
        if (isPointInBox(x, y, icon)) {
            if (confirm("이 연결선을 삭제하시겠습니까?")) {
                app.deleteConnection(app.selectedConnection);
            }
            return;
        }
    }

    const clickedNode = findNodeAt(app, x, y);

    if (clickedNode) {
        if (app.isConnectMode) {
            app.selectedNode = clickedNode;
            app.highlightedConnectTarget = null;
            connectTargetHintShown = false;
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
        const clickedConnection = findConnectionAt(app, x, y);
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

function onCanvasDoubleClick(e, app) {
    if (app.isConnectMode || app.ui.isView3D) return;

    const rect = app.ui.canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const { x, y } = app.getRealCoordinates(canvasX, canvasY);

    const clickedNode = findNodeAt(app, x, y);
    if (clickedNode) {
        app.selectedNode = clickedNode;
        app.selectedConnection = null;
        app.drawMindmap();
        beginInlineEdit(app, "node", clickedNode);
        return;
    }

    const clickedConnection = findConnectionAt(app, x, y);
    if (clickedConnection) {
        app.selectedNode = null;
        app.selectedConnection = clickedConnection;
        app.drawMindmap();
        beginInlineEdit(app, "connection", clickedConnection);
        return;
    }

    const newNode = app.createNode(x, y);
    if (!newNode) return;

    app.selectedNode = newNode;
    app.selectedConnection = null;
    app.drawMindmap();
    beginInlineEdit(app, "node", newNode);
}

function onMouseMove(e, app) {
    const rect = app.ui.canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const { x, y } = app.getRealCoordinates(canvasX, canvasY);

    if (!isDragging) {
        if (app.selectedNode && isPointInBox(x, y, app.selectedNode.connectHandle)) {
            app.ui.canvas.style.cursor = "crosshair";
        } else {
            app.ui.canvas.style.cursor = "default";
        }
        return;
    }

    if (isConnectingDrag(app)) {
        const targetNode = findConnectTargetAt(app, x, y, app.selectedNode);
        app.highlightedConnectTarget = targetNode;
        app.ui.canvas.style.cursor = targetNode ? "copy" : "crosshair";

        if (targetNode && !connectTargetHintShown) {
            app.ui.showToast("놓으면 연결됩니다.", "info");
            connectTargetHintShown = true;
        }

        app.drawMindmap();

        const start = getNodeBoundaryPoint(app.selectedNode, x, y);
        const end = { x, y };
        const controlPoint = getCurveControlPoint(start, end);

        app.ui.ctx.save();
        app.ui.ctx.translate(app.offsetX, app.offsetY);
        app.ui.ctx.scale(app.scale, app.scale);

        app.ui.ctx.strokeStyle = app.ui.isDarkMode ? "rgba(148, 163, 184, 0.6)" : "rgba(100, 116, 139, 0.6)";
        app.ui.ctx.lineWidth = 1.5;
        app.ui.ctx.setLineDash([5, 5]);

        app.ui.ctx.beginPath();
        app.ui.ctx.moveTo(start.x, start.y);
        app.ui.ctx.quadraticCurveTo(controlPoint.x, controlPoint.y, end.x, end.y);
        app.ui.ctx.stroke();

        app.ui.ctx.setLineDash([]);
        app.ui.ctx.restore();
    } else if (app.selectedNode) {
        app.selectedNode.x = x;
        app.selectedNode.y = y;
        app.drawMindmap();
    } else {
        app.offsetX = e.offsetX - startDragX;
        app.offsetY = e.offsetY - startDragY;
        app.drawMindmap();
    }
}

function onMouseUp(e, app) {
    if (!isDragging) return;
    let connectionToEdit = null;
    const sourceNode = app.selectedNode;
    const startedFromHandle = isHandleConnectionDrag;

    const rect = app.ui.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isConnectingDrag(app)) {
        const { x: realX, y: realY } = app.getRealCoordinates(x, y);
        const targetNode = findConnectTargetAt(app, realX, realY, app.selectedNode);

        if (targetNode) {
            connectionToEdit = app.createConnection(app.selectedNode, targetNode);
            app.selectedConnection = connectionToEdit;
        }
        app.selectedNode = connectionToEdit || !startedFromHandle ? null : sourceNode;
        app.highlightedConnectTarget = null;
        connectTargetHintShown = false;
    }

    isDragging = false;
    isHandleConnectionDrag = false;
    app.ui.canvas.style.cursor = "default";
    app.drawMindmap();

    if (connectionToEdit) {
        beginInlineEdit(app, "connection", connectionToEdit);
    }
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
