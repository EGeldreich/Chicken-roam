/**
 * Service to handle common functions, mostly mathematical problems
 * Centralizes logic for working with polygons and enclosures
 */
export default class CommonFunctionsService {
  /**
   * Create a new CommonFunctionsService
   * @param {Number} epsilon - Small value for floating point comparisons
   * @param {Object} planEditor - PlanEditor.js class object
   * @param {Object} canvas - HTML element
   */
  constructor(canvas, planEditor, epsilon) {
    this.canvas = canvas
    this.planEditor = planEditor
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

  //_____________________________________________________________________________________________________________calculateEnclosedArea
  /**
   * Use service method to define fences order, and calculate enclosed area as a polygon
   * @returns {Number} area in square meters
   */
  calculateEnclosedArea() {
    // Get all fences
    const fenceElements = Array.from(this.canvas.querySelectorAll('.fence'))

    // Use the service to get ordered vertices
    const orderedVertices = this.getOrderedVertices(fenceElements)

    // Use the service to calculate area
    const areaInSquareMeters = this.calculateArea(orderedVertices)

    console.log(`Area in square meters: ${areaInSquareMeters}`)
    return areaInSquareMeters
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
   * @param {Map} vertexConnections  Map of vertex IDs to vertex data id => {x, y, connections}
   * @returns {Boolean} True if enclosure is complete
   */
  isEnclosureComplete(vertexConnections) {
    // With less than 3 connections, cannot be complete
    if (vertexConnections.size < 3) {
      return false
    }

    let hasOpenConnections = false

    // For each vertex
    vertexConnections.forEach((vertexData) => {
      // Check for exactly 2 connections
      if (vertexData.connections !== 2) {
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

  //_____________________________________________________________________________________________________________wouldOverlap
  /**
   * Method to avoid overlapping
   * Called in placeElement()
   * @param {Object} newElementPosition Object containing top-left corner coordinates {x, y}
   * @param {Number} width element width in pixel
   * @param {Number} height element height in pixel
   * @returns {Boolean} True if there is a collision, false if not
   */
  wouldOverlap(newElementPosition, width, height) {
    // Calculate the bounds of the new element
    const newElement = {
      left: newElementPosition.x,
      top: newElementPosition.y,
      right: newElementPosition.x + width,
      bottom: newElementPosition.y + height,
    }

    // Compare bounds to existing elements
    for (const element of this.planEditor.placedElements) {
      // Convert string coordinates to numbers if needed
      const left = parseFloat(element.x)
      const top = parseFloat(element.y)
      const width = parseFloat(element.width)
      const height = parseFloat(element.height)

      const existingElement = {
        left: left,
        top: top,
        right: left + width,
        bottom: top + height,
      }

      // Check for intersection using the AABB collision detection algorithm
      if (
        newElement.left < existingElement.right &&
        newElement.right > existingElement.left &&
        newElement.top < existingElement.bottom &&
        newElement.bottom > existingElement.top
      ) {
        return true // Collision detected
      }
    }

    return false // No collision
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
    const INTERSECTION_MARGIN = 0.001

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

      // Treat each side of the element rectangle as a line, and use commonFunctionsService method to check intersection
      // A newElement.side is called twice because lines are horizontal or vertical, so either x or y is the same for both points
      if (
        this.checkLineIntersection(
          newElement.left,
          newElement.top,
          newElement.right,
          newElement.top,
          endpoints.start.x,
          endpoints.start.y,
          endpoints.end.x,
          endpoints.end.y
        ) ||
        this.checkLineIntersection(
          newElement.right,
          newElement.top,
          newElement.right,
          newElement.bottom,
          endpoints.start.x,
          endpoints.start.y,
          endpoints.end.x,
          endpoints.end.y
        ) ||
        this.checkLineIntersection(
          newElement.right,
          newElement.bottom,
          newElement.left,
          newElement.bottom,
          endpoints.start.x,
          endpoints.start.y,
          endpoints.end.x,
          endpoints.end.y
        ) ||
        this.checkLineIntersection(
          newElement.left,
          newElement.bottom,
          newElement.left,
          newElement.top,
          endpoints.start.x,
          endpoints.start.y,
          endpoints.end.x,
          endpoints.end.y
        )
      ) {
        return true // Collision detected
      }
    }

    return false // No collision
  }

  //_____________________________________________________________________________________________________________checkElementPlacement
  /**
   * Check if an element placement pass tests and add classes accordingly
   * @param {Object} point Object containing top-left corner coordinates {x, y}
   * @param {Object} element HTML element
   * @param {Number} width width of the element in pixel
   * @param {Number} height height of the element in pixel
   * @returns {String} error message, or null of placement is correct
   */
  checkElementPlacement(point, element, width, height) {
    // Check if the placement point would be inside the enclosure
    const wouldBeInside =
      !this.planEditor.isEnclosureComplete ||
      this.planEditor.isPointInEnclosure({
        x: point.x,
        y: point.y,
      })

    let message = null
    // First, check enclosure restriction
    if (!wouldBeInside) {
      message = 'Elements must be placed inside the enclosure'
      element.classList.add('invalid-placement')
      element.classList.remove('valid-placement')
    }
    // Then check for collision with other elements
    else if (this.wouldOverlap(point, width, height)) {
      message = 'Elements cannot overlap'
      element.classList.add('invalid-placement')
      element.classList.remove('valid-placement')
    }
    // Finally check for collision with fences
    else if (this.wouldOverlapFence(point, width, height)) {
      message = 'Elements cannot overlap with fences'
      element.classList.add('invalid-placement')
      element.classList.remove('valid-placement')
    } else {
      element.classList.add('valid-placement')
      element.classList.remove('invalid-placement')
    }
    return message
  }

  //_____________________________________________________________________________________________________________showPlacementError
  /**
   * Display an error feedback as an error toast
   * @param {String} message Text content of the message
   * @param {Object} element HTML element being placed or moved
   */
  showPlacementError(message, element) {
    // Visual feedback
    element.classList.add('placement-error')
    setTimeout(() => {
      if (element) {
        element.classList.remove('placement-error')
      }
    }, 1000)

    // Create error message dinv and display it for 3 seconds
    const errorMessage = document.createElement('div')
    errorMessage.className = 'placement-error-toast'
    errorMessage.textContent = message
    document.body.appendChild(errorMessage)

    setTimeout(() => {
      errorMessage.remove()
    }, 3000)
  }
}
