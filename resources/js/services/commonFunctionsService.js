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
    return areaInSquareMeters
  }

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

      // Check for collision between new element and each fences
      this.checkElementFenceCollision(endpoints, newElement) // Return true if there is a collision
    }

    return false // No collision
  }

  /**
   * Check collision between an element and a fence
   * @param {Object} endpoints {start: {x, y}, end: {x, y}} coordinates of fence endpoints
   * @param {Object} element contain element sides element = {left: .., top: .., right: .., bottom: ..}
   */
  checkElementFenceCollision(endpoints, element) {
    // Create rectangle englobing the fence (for quick validation of obviously not overlaping elements)
    const fenceBounds = {
      left: Math.min(endpoints.start.x, endpoints.end.x),
      top: Math.min(endpoints.start.y, endpoints.end.y),
      right: Math.max(endpoints.start.x, endpoints.end.x),
      bottom: Math.max(endpoints.start.y, endpoints.end.y),
    }

    // If the element rectangle does not intersect with any fence-rectangles, obviously no overlap, skip more precise test
    if (
      element.right < fenceBounds.left ||
      element.left > fenceBounds.right ||
      element.bottom < fenceBounds.top ||
      element.top > fenceBounds.bottom
    ) {
      return false // No overlap
    }

    // Treat each side of the element rectangle as a line, and use commonFunctionsService method to check intersection
    // A element.side is called twice because lines are horizontal or vertical, so either x or y is the same for both points
    if (
      this.checkLineIntersection(
        element.left,
        element.top,
        element.right,
        element.top,
        endpoints.start.x,
        endpoints.start.y,
        endpoints.end.x,
        endpoints.end.y
      ) ||
      this.checkLineIntersection(
        element.right,
        element.top,
        element.right,
        element.bottom,
        endpoints.start.x,
        endpoints.start.y,
        endpoints.end.x,
        endpoints.end.y
      ) ||
      this.checkLineIntersection(
        element.right,
        element.bottom,
        element.left,
        element.bottom,
        endpoints.start.x,
        endpoints.start.y,
        endpoints.end.x,
        endpoints.end.y
      ) ||
      this.checkLineIntersection(
        element.left,
        element.bottom,
        element.left,
        element.top,
        endpoints.start.x,
        endpoints.start.y,
        endpoints.end.x,
        endpoints.end.y
      )
    ) {
      return true // Collision detected
    }
  }

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

    const result = { invalid: false, reason: null } // Default result

    // First, check enclosure restriction
    if (!wouldBeInside) {
      result.invalid = true
      result.reason = 'outside'
      this.invalidPlacement(element)
    }
    // Then check for collision with other elements
    else if (
      this.wouldOverlap(point, width, height) ||
      this.wouldOverlapFence(point, width, height)
    ) {
      result.invalid = true
      result.reason = 'overlap'
      this.invalidPlacement(element)
    } else {
      this.validPlacement(element)
    }
    return result
  }

  /**
   * Check placement validity when moving fences
   * @param {Array} connectedFences Contains both fences connected to the point being moved (HTML objects)
   * @param {Object} vertexPoint {x, y} coordinates of moved vector
   * @returns {Object } result { invalid: bool, reason: string }
   */
  checkVertexPlacement(connectedFences, vertexPoint) {
    const result = { invalid: false, reason: null } // Default result

    // 1. Check minimal length
    if (!this.validateLength(connectedFences)) {
      result.invalid = true
      result.reason = 'length'
      for (let fence of connectedFences) {
        this.invalidPlacement(fence)
      }
    }
    // 2. Check angles
    else if (!this.validateAngle(connectedFences, vertexPoint)) {
      result.invalid = true
      result.reason = 'angle'
      for (let fence of connectedFences) {
        this.invalidPlacement(fence)
      }
    }
    // 3. Check fences intersections
    else if (!this.validateIntersections(connectedFences)) {
      result.invalid = true
      result.reason = 'intersection'
      for (let fence of connectedFences) {
        this.invalidPlacement(fence)
      }
    }
    // 4. Check for element overlap
    else if (!this.validateOverlap(connectedFences)) {
      result.invalid = true
      result.reason = 'overlap'
      for (let fence of connectedFences) {
        this.invalidPlacement(fence)
      }
    } else {
      for (let fence of connectedFences) {
        this.validPlacement(fence)
      }
    }

    return result
  }

  /**
   * Validate length
   * @param {Array} connectedFences Contains both fences connected to the point being moved (HTML objects)
   * @returns {Boolean} True if all fences have valid length
   */
  validateLength(connectedFences) {
    for (const fence of connectedFences) {
      if (parseFloat(fence.style.width) < 10) {
        return false // Fence is too short
      }
    }
    return true // All fences have valid length
  }

  /**
   * Validate angle between connected fences and their connected neighbors
   * @param {Array} connectedFences Contains fences connected to the point being moved (HTML objects)
   * @param {Object} movedVertex Object containing the moved vertex coordinates
   * @returns {Boolean} True if all angles are valid
   */
  validateAngle(connectedFences, movedVertex) {
    const MIN_ANGLE_DEG = 15

    // 1. Check first angle, around moved vertex
    if (connectedFences.length >= 2) {
      // Vérifier l'angle entre les clôtures connectées au vertex déplacé
      if (!this.checkAngleBetweenVectors(connectedFences, movedVertex, MIN_ANGLE_DEG)) {
        return false
      }

      // 2. Check further angles (between each connected fence and their neighbor)
      // For each fence connected to moved vertex
      for (const fence of connectedFences) {
        const endpoints = this.getFenceEndpoints(fence)

        // Find the other end (the one not moving)
        let otherEndpoint
        if (this.arePointsClose(endpoints.start, movedVertex)) {
          otherEndpoint = endpoints.end
        } else {
          otherEndpoint = endpoints.start
        }

        // Find fence connected on the other end
        const connectedToEndpoint = this.findFencesConnectedToPoint(otherEndpoint)

        // If a fence is found
        if (connectedToEndpoint.length >= 2) {
          // Check angle
          if (!this.checkAngleBetweenVectors(connectedToEndpoint, otherEndpoint, MIN_ANGLE_DEG)) {
            return false
          }
        }
      }
    }

    return true // All angles are valid
  }

  /**
   * Check if two points are close enough to be considered equal
   * @param {Object} point1 first point {x, y}
   * @param {Object} point2 2nd point {x, y}
   * @returns {Boolean} True if points are close enough
   */
  arePointsClose(point1, point2) {
    return (
      Math.abs(point1.x - point2.x) < this.EPSILON && Math.abs(point1.y - point2.y) < this.EPSILON
    )
  }

  /**
   * Find all fences connected to a given point
   * @param {Object} point Point to check {x, y}
   * @returns {Array} Array of connected fences
   */
  findFencesConnectedToPoint(point) {
    // Get all fences
    const allFences = Array.from(this.canvas.querySelectorAll('.fence'))
    // Filter to keep only fences with an endpoint equal to given point
    return allFences.filter((fence) => {
      const endpoints = this.getFenceEndpoints(fence)
      return (
        this.arePointsClose(endpoints.start, point) || this.arePointsClose(endpoints.end, point)
      )
    })
  }

  /**
   * Check angle between two vectors (fences)
   * @param {Array} fences Array of fences to check
   * @param {Object} commonPoint Common endpoint {x,y}
   * @param {Number} minAngle Minimum angle (below that, angle is invalid)
   * @returns {Boolean} True if all angle are avlid
   */
  checkAngleBetweenVectors(fences, commonPoint, minAngle) {
    // Initialise vectors
    const vectors = []

    // For each fence
    for (const fence of fences) {
      // Get endpoints
      const endpoints = this.getFenceEndpoints(fence)

      if (this.arePointsClose(endpoints.start, commonPoint)) {
        // Common point is the START of this fence
        vectors.push({
          x: endpoints.end.x - commonPoint.x,
          y: endpoints.end.y - commonPoint.y,
          fence: fence,
        })
      } else if (this.arePointsClose(endpoints.end, commonPoint)) {
        // Common point is the END of this fence
        vectors.push({
          x: endpoints.start.x - commonPoint.x,
          y: endpoints.start.y - commonPoint.y,
          fence: fence,
        })
      }
    }

    // Check angle between each pair of vector
    // (currently overkill as there should be only 1 pair)
    for (let i = 0; i < vectors.length; i++) {
      for (let j = i + 1; j < vectors.length; j++) {
        const vector1 = vectors[i]
        const vector2 = vectors[j]

        // Scalare product
        const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y

        // Magnitudes
        const magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y)
        const magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y)

        // Avoid divinding by 0
        if (magnitude1 < this.EPSILON || magnitude2 < this.EPSILON) return false

        // Calculate angle
        const cosAngle = dotProduct / (magnitude1 * magnitude2)
        const angleRad = Math.acos(Math.max(-1, Math.min(1, cosAngle)))
        const angleDeg = (angleRad * 180) / Math.PI

        // Check angle validity
        if (angleDeg < minAngle) {
          return false // Angle too small
        }
      }
    }
    return true // All angles are valid
  }

  /**
   * Validate intersections
   * @param {Array} connectedFences Contains both fences connected to the point being moved (HTML objects)
   * @returns {Boolean} True if no intersections
   */
  validateIntersections(connectedFences) {
    // Get all fence
    const allFences = Array.from(this.canvas.querySelectorAll('.fence'))
    // Filter for only non connected fences
    const nonConnectedFences = allFences.filter((fence) => !connectedFences.includes(fence))

    // Get endpoints for each connected fence
    for (const connectedFence of connectedFences) {
      const endpoints1 = this.getFenceEndpoints(connectedFence)

      // Get endpoints of non connected fences
      for (const otherFence of nonConnectedFences) {
        const endpoints2 = this.getFenceEndpoints(otherFence)

        // Check intersection for each possibility
        if (
          this.checkLineIntersection(
            endpoints1.start.x,
            endpoints1.start.y,
            endpoints1.end.x,
            endpoints1.end.y,
            endpoints2.start.x,
            endpoints2.start.y,
            endpoints2.end.x,
            endpoints2.end.y
          )
        )
          return false // Intersection detected
      }
    }

    return true // No intersections
  }

  /**
   * Validate element overlap
   * @param {Array} connectedFences Contains both fences connected to the point being moved (HTML objects)
   * @returns {Boolean} True if no overlap
   */
  validateOverlap(connectedFences) {
    // For each element
    for (const element of this.planEditor.placedElements) {
      const elementSquare = {
        left: element.x,
        top: element.y,
        right: element.x + element.width,
        bottom: element.y + element.height,
      }
      // For both connected fences
      for (const fence of connectedFences) {
        // Get endpoints
        const endpoints = this.getFenceEndpoints(fence)

        const collision = this.checkElementFenceCollision(endpoints, elementSquare)

        if (collision) return false // Overlap detected
      }
    }

    return true // No overlap
  }

  /**
   * Add valid-placement and remove invalid-placement
   * @param {Object} element HTML element to which add or remove class
   */
  validPlacement(element) {
    element.classList.add('valid-placement')
    element.classList.remove('invalid-placement')
  }

  /**
   * Add invalid-placement and remove valid-placement
   * @param {Object} element HTML element to which add or remove class
   */
  invalidPlacement(element) {
    element.classList.add('invalid-placement')
    element.classList.remove('valid-placement')
  }

  /**
   * Display an error feedback as an error toast
   * @param {String} reason String containing reason
   * @param {Object} element HTML element being placed or moved
   */
  showPlacementError(reason, element) {
    // Visual feedback
    element.classList.add('placement-error')
    setTimeout(() => {
      if (element) {
        element.classList.remove('placement-error')
      }
    }, 1000)

    // Create correct error msg from reason
    let message
    if (reason === 'outside') {
      message = 'Elements cannot be outside of the enclosure'
    } else if (reason === 'overlap') {
      message = 'Elements cannot overlap'
    } else if (reason === 'length') {
      message = 'Fence is too short'
    } else if (reason === 'angle') {
      message = 'Angle between fences cannot be smaller than 15°'
    } else if (reason === 'intersection') {
      message = 'Fences cannot intersect each other'
    }

    // Create error message div and display it for 3 seconds
    const errorMessage = document.createElement('div')
    errorMessage.className = 'placement-error-toast'
    errorMessage.textContent = message
    document.body.appendChild(errorMessage)

    setTimeout(() => {
      errorMessage.remove()
    }, 3000)
  }
}
