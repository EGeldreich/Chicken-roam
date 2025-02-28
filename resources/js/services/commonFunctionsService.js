/**
 * Service to handle common functions, mostly mathematical problems
 * Centralizes logic for working with polygons and enclosures
 */
export default class CommonFunctionsService {
  /**
   * Create a new CommonFunctionsService
   * @param {number} epsilon - Small value for floating point comparisons
   * @param {Object} canvas - HTML element
   */
  constructor(canvas, epsilon) {
    this.canvas = canvas
    this.EPSILON = epsilon
  }

  /**
   * Get ordered vertices of an enclosure from fence elements
   * @param {Array} fenceElements - Array of fence DOM elements
   * @returns {Array} Array of [x, y] coordinates in order
   */
  getOrderedVertices(fenceElements) {
    // Initialize empty array for ordered vertices
    let orderedVertices = []
    // Initialize current vertex
    let currentVertex = null
    // Track used fences
    let usedFences = new Set()

    // Start with the first fence, push endpoints into orderedVertices
    if (fenceElements.length > 0) {
      const firstFence = fenceElements[0]
      const endpoints = this.getFenceEndpoints(firstFence)

      orderedVertices.push([endpoints.start.x, endpoints.start.y])
      currentVertex = [endpoints.start.x, endpoints.start.y]
      usedFences.add(firstFence)
    } else {
      return [] // No fences, return empty array
    }

    // Traverse the fence network
    let iteration = 0
    const MAX_ITERATIONS = fenceElements.length * 2 // Safety limit

    while (usedFences.size < fenceElements.length && iteration < MAX_ITERATIONS) {
      iteration++

      // Find next fence that connects to current vertex
      const nextFence = fenceElements.find((fence) => {
        if (usedFences.has(fence)) return false

        const endpoints = this.getFenceEndpoints(fence)

        const isConnected =
          (Math.abs(endpoints.start.x - currentVertex[0]) < this.EPSILON &&
            Math.abs(endpoints.start.y - currentVertex[1]) < this.EPSILON) ||
          (Math.abs(endpoints.end.x - currentVertex[0]) < this.EPSILON &&
            Math.abs(endpoints.end.y - currentVertex[1]) < this.EPSILON)

        return isConnected
      })

      if (!nextFence) {
        break // No next fence found
      }

      usedFences.add(nextFence)

      // Get endpoints of next fence
      const endpoints = this.getFenceEndpoints(nextFence)

      // Determine which point is the next vertex
      let nextVertex
      if (
        Math.abs(endpoints.start.x - currentVertex[0]) < this.EPSILON &&
        Math.abs(endpoints.start.y - currentVertex[1]) < this.EPSILON
      ) {
        nextVertex = [endpoints.end.x, endpoints.end.y]
      } else {
        nextVertex = [endpoints.start.x, endpoints.start.y]
      }
      currentVertex = nextVertex
      orderedVertices.push(currentVertex)
    }

    // Safety check for infinite loop
    if (iteration >= MAX_ITERATIONS) {
      console.warn('Maximum iterations reached, polygon may be incomplete')
    }

    return orderedVertices
  }

  //_____________________________________________________________________________________________________________getFenceEndpoints
  /**
   * Get endpoints of a fence element
   * @param {Element} fence DOM element representing a fence
   * @returns {Object} Object with start and end points {start: {x, y}, end: {x, y}}
   */
  getFenceEndpoints(fence) {
    const startX = Math.round(parseFloat(fence.style.left))
    const startY = Math.round(parseFloat(fence.style.top))
    const angle = parseFloat(fence.style.transform.replace('rotate(', '').replace('deg)', ''))
    const width = Math.round(parseFloat(fence.style.width))

    // Calculate end point
    const endX = Math.round(startX + width * Math.cos((angle * Math.PI) / 180))
    const endY = Math.round(startY + width * Math.sin((angle * Math.PI) / 180))

    return {
      start: { x: startX, y: startY },
      end: { x: endX, y: endY },
    }
  }

  //_____________________________________________________________________________________________________________calculateArea
  /**
   * Calculate area of a polygon using Shoelace formula
   * @param {Array} vertices Array of [x, y] coordinates
   * @param {number} pixelsPerMeter Scale to convert pixels to meters
   * @returns {number} Area in square meters
   */
  calculateArea(vertices, pixelsPerMeter = 100) {
    if (vertices.length < 3) return 0 // Need at least a triangle

    // Apply Shoelace formula
    let area = 0
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length
      area += vertices[i][0] * vertices[j][1]
      area -= vertices[j][0] * vertices[i][1]
    }

    area = Math.abs(area) / 2

    // Convert pixels to meters
    return area / (pixelsPerMeter * pixelsPerMeter)
  }

  //_____________________________________________________________________________________________________________isPointInPolygon
  /**
   * Check if a point is inside a polygon
   * @param {Object} point Point to check {x, y}
   * @param {Array} vertices Array of [x, y] coordinates defining the polygon
   * @returns {boolean} True if point is inside polygon
   */
  isPointInPolygon(point, vertices) {
    if (vertices.length < 3) return false

    let inside = false
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const xi = vertices[i][0],
        yi = vertices[i][1]
      const xj = vertices[j][0],
        yj = vertices[j][1]

      const intersect =
        yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi

      if (intersect) inside = !inside
    }

    return inside
  }

  //_____________________________________________________________________________________________________________isEnclosureComplete
  /**
   * Check if an enclosure is complete (all vertices have exactly 2 connections)
   * @param {Map} vertexConnections  Map of vertex positions to connection counts
   * @returns {Boolean} True if enclosure is complete
   */
  isEnclosureComplete(vertexConnections) {
    let hasOpenConnections = false

    vertexConnections.forEach((connections) => {
      if (connections !== 2) {
        hasOpenConnections = true
      }
    })

    return !hasOpenConnections && vertexConnections.size > 2
  }

  //_____________________________________________________________________________________________________________updateObjectivesDisplay
  /**
   * Update the textContent of the objectives
   * Called in placeElement()
   * @param {Object} objectives Object containing all relevant objective information {id, name, description, target_value, completion_percentage, unit}
   */
  updateObjectivesDisplay(objectives) {
    objectives.forEach((objective) => {
      // Finf the correct HTML element
      const objectiveEl = document.querySelector(`#${objective.name}`)
      if (objectiveEl) {
        objectiveEl.textContent = objective.completion_percentage
      }
    })
  }

  //_____________________________________________________________________________________________________________checkLineIntersection
  /**
   * Helper method to  check if two lines intersect
   * @param {number} x1 - First segment starting point X coordinate
   * @param {number} y1 - First segment starting point Y coordinate
   * @param {number} x2 - First segment ending point X coordinate
   * @param {number} y2 - First segment ending point Y coordinate
   * @param {number} x3 - Second segment starting point X coordinate
   * @param {number} y3 - Second segment starting point Y coordinate
   * @param {number} x4 - Second segment ending point X coordinate
   * @param {number} y4 - Second segment ending point Y coordinate
   * @returns {Boolean} True if segments would intersect, false if not
   */
  checkLineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
    const INTERSECTION_MARGIN = 0

    // Check for shared endpoints
    if (
      (Math.abs(x1 - x3) < this.EPSILON && Math.abs(y1 - y3) < this.EPSILON) ||
      (Math.abs(x1 - x4) < this.EPSILON && Math.abs(y1 - y4) < this.EPSILON) ||
      (Math.abs(x2 - x3) < this.EPSILON && Math.abs(y2 - y3) < this.EPSILON) ||
      (Math.abs(x2 - x4) < this.EPSILON && Math.abs(y2 - y4) < this.EPSILON)
    ) {
      // If segments share an endpoint, this is not considered as an intersection
      return false
    }

    // Calculate the denominators
    const denominator = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3)

    // If the denominator is close to zero, the lines are parallel or colinear
    if (Math.abs(denominator) < 0.001) return false

    // Calculate intersection point parameters
    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator

    return (
      ua > INTERSECTION_MARGIN &&
      ua < 1 - INTERSECTION_MARGIN &&
      ub > INTERSECTION_MARGIN &&
      ub < 1 - INTERSECTION_MARGIN
    )
  }

  //_____________________________________________________________________________________________________________wouldOverlapFence
  /**
   * Check if an element would overlap with fences
   * Called in placeElement()
   * @param {Object} newElementPosition Object containing top-left corner coordinates {x, y}
   * @param {Number} width element width in pixel
   * @param {Number} height element height in pixel
   * @returns {Boolean} True if would overlap, false if not
   */
  wouldOverlapFence(newElementPosition, width, height) {
    // Get all fences
    const fences = Array.from(this.canvas.querySelectorAll('.fence'))

    // Calculate extremities of the new element (create element-sized rectangle)
    const newElement = {
      left: newElementPosition.x,
      top: newElementPosition.y,
      right: newElementPosition.x + width,
      bottom: newElementPosition.y + height,
    }

    // For each fence ...
    for (const fence of fences) {
      // Get endpoints
      const endpoints = this.getFenceEndpoints(fence)

      // Create rectangle englobing the fence (for quick validation of obviously not overlaping elements)
      const fenceBounds = {
        left: Math.min(endpoints.start.x, endpoints.end.x),
        top: Math.min(endpoints.start.y, endpoints.end.y),
        right: Math.max(endpoints.start.x, endpoints.end.x),
        bottom: Math.max(endpoints.start.y, endpoints.end.y),
      }

      // If the element rectangle does not intersect with any fence-rectangles, obviously no overlap, skip more precise test
      if (
        newElement.right < fenceBounds.left ||
        newElement.left > fenceBounds.right ||
        newElement.bottom < fenceBounds.top ||
        newElement.top > fenceBounds.bottom
      ) {
        continue
      }

      // Check if a fence endpoint is inside the rectangle
      if (
        (endpoints.start.x >= newElement.left &&
          endpoints.start.x <= newElement.right &&
          endpoints.start.y >= newElement.top &&
          endpoints.start.y <= newElement.bottom) ||
        (endpoints.end.x >= newElement.left &&
          endpoints.end.x <= newElement.right &&
          endpoints.end.y >= newElement.top &&
          endpoints.end.y <= newElement.bottom)
      ) {
        return true // Collision detected
      }

      // Check if fence line intersects with rectangle using a more direct and robust method
      const fenceLineVector = {
        x: endpoints.end.x - endpoints.start.x,
        y: endpoints.end.y - endpoints.start.y,
      }

      // Points to check (all vertices of the rectangle)
      const rectPoints = [
        { x: newElement.left, y: newElement.top }, // Top-left
        { x: newElement.right, y: newElement.top }, // Top-right
        { x: newElement.right, y: newElement.bottom }, // Bottom-right
        { x: newElement.left, y: newElement.bottom }, // Bottom-left
      ]

      // Check all sides of the rectangle against the fence line
      for (let i = 0; i < rectPoints.length; i++) {
        const p1 = rectPoints[i]
        const p2 = rectPoints[(i + 1) % rectPoints.length]

        // Check intersection using vector cross product
        const s1_x = p2.x - p1.x
        const s1_y = p2.y - p1.y
        const s2_x = fenceLineVector.x
        const s2_y = fenceLineVector.y

        const s =
          (-s1_y * (p1.x - endpoints.start.x) + s1_x * (p1.y - endpoints.start.y)) /
          (-s2_x * s1_y + s1_x * s2_y)

        const t =
          (s2_x * (p1.y - endpoints.start.y) - s2_y * (p1.x - endpoints.start.x)) /
          (-s2_x * s1_y + s1_x * s2_y)

        if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
          return true // Intersection found
        }
      }

      // Special case: Horizontal or vertical fence that might be colinear with rectangle sides
      const isHorizontalFence = Math.abs(endpoints.start.y - endpoints.end.y) < this.EPSILON
      const isVerticalFence = Math.abs(endpoints.start.x - endpoints.end.x) < this.EPSILON

      if (isHorizontalFence) {
        const fenceY = endpoints.start.y
        // Check if fence Y is between rectangle's top and bottom AND
        // if the X ranges overlap
        if (
          fenceY >= newElement.top &&
          fenceY <= newElement.bottom &&
          Math.max(fenceBounds.left, newElement.left) <=
            Math.min(fenceBounds.right, newElement.right)
        ) {
          return true
        }
      }

      if (isVerticalFence) {
        const fenceX = endpoints.start.x
        // Check if fence X is between rectangle's left and right AND
        // if the Y ranges overlap
        if (
          fenceX >= newElement.left &&
          fenceX <= newElement.right &&
          Math.max(fenceBounds.top, newElement.top) <=
            Math.min(fenceBounds.bottom, newElement.bottom)
        ) {
          return true
        }
      }
    }

    return false // No collision
  }
}
