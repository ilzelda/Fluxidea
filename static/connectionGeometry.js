export function getNodeBoundaryPoint(node, targetX, targetY) {
  const halfWidth = (node.width || 0) / 2
  const halfHeight = (node.height || 0) / 2
  const dx = targetX - node.x
  const dy = targetY - node.y

  if ((!dx && !dy) || !halfWidth || !halfHeight) {
    return { x: node.x, y: node.y }
  }

  const scaleX = dx ? halfWidth / Math.abs(dx) : Number.POSITIVE_INFINITY
  const scaleY = dy ? halfHeight / Math.abs(dy) : Number.POSITIVE_INFINITY
  const scale = Math.min(scaleX, scaleY)

  return {
    x: node.x + dx * scale,
    y: node.y + dy * scale,
  }
}

export function getConnectionEndpoints(conn) {
  return {
    start: getNodeBoundaryPoint(conn.start, conn.end.x, conn.end.y),
    end: getNodeBoundaryPoint(conn.end, conn.start.x, conn.start.y),
  }
}

export function getCurveControlPoint(start, end) {
  return {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2 - 30,
  }
}

export function getConnectionMidpoint(conn) {
  const { start, end } = getConnectionEndpoints(conn)
  return {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  }
}

export function getQuadraticPoint(start, control, end, t) {
  const inverseT = 1 - t

  return {
    x: inverseT ** 2 * start.x + 2 * inverseT * t * control.x + t ** 2 * end.x,
    y: inverseT ** 2 * start.y + 2 * inverseT * t * control.y + t ** 2 * end.y,
  }
}
