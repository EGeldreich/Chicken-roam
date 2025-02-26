/**
 * Service to handle enclosure-related operations
 * Centralizes logic for working with polygons and enclosures
 */
export default class EnclosureService {
  /**
   * Create a new EnclosureService
   * @param {number} epsilon - Small value for floating point comparisons
   */
  constructor(epsilon = 0.001) {
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

    console.log(`Processing ${fenceElements.length} fence elements`)

    // Start with the first fence if available
    if (fenceElements.length > 0) {
      const firstFence = fenceElements[0]
      const endpoints = this.getFenceEndpoints(firstFence)

      console.log(
        'Starting with first fence endpoints:',
        `start:(${endpoints.start.x}, ${endpoints.start.y})`,
        `end:(${endpoints.end.x}, ${endpoints.end.y})`
      )

      orderedVertices.push([endpoints.start.x, endpoints.start.y])
      currentVertex = [endpoints.start.x, endpoints.start.y]
      usedFences.add(firstFence)
    } else {
      console.log('No fences to process')
      return [] // No fences, return empty array
    }

    // Traverse the fence network
    let iteration = 0
    const MAX_ITERATIONS = fenceElements.length * 2 // Safety limit

    while (usedFences.size < fenceElements.length && iteration < MAX_ITERATIONS) {
      iteration++
      console.log(`Iteration ${iteration}, used ${usedFences.size}/${fenceElements.length} fences`)

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
        console.log('No next fence found - breaking loop')
        break // No next fence found
      }

      usedFences.add(nextFence)

      // Get endpoints of next fence
      const endpoints = this.getFenceEndpoints(nextFence)
      console.log(
        'Next fence endpoints:',
        `start:(${endpoints.start.x}, ${endpoints.start.y})`,
        `end:(${endpoints.end.x}, ${endpoints.end.y})`
      )

      // Determine which point is the next vertex
      let nextVertex
      if (
        Math.abs(endpoints.start.x - currentVertex[0]) < this.EPSILON &&
        Math.abs(endpoints.start.y - currentVertex[1]) < this.EPSILON
      ) {
        console.log('Current matches start point, next vertex is end point')
        nextVertex = [endpoints.end.x, endpoints.end.y]
      } else {
        console.log('Current matches end point, next vertex is start point')
        nextVertex = [endpoints.start.x, endpoints.start.y]
      }

      console.log(`Adding vertex: [${nextVertex[0]}, ${nextVertex[1]}]`)
      currentVertex = nextVertex
      orderedVertices.push(currentVertex)
    }

    // Safety check for infinite loop
    if (iteration >= MAX_ITERATIONS) {
      console.warn('Maximum iterations reached, polygon may be incomplete')
    }

    console.log(`Found ${orderedVertices.length} vertices:`)
    // Properly log the vertices array
    orderedVertices.forEach((vertex, i) => {
      console.log(`  Vertex ${i}: (${vertex[0]}, ${vertex[1]})`)
    })

    return orderedVertices
  }

  /**
   * Get endpoints of a fence element
   * @param {Element} fence - DOM element representing a fence
   * @returns {Object} Object with start and end points {start: {x, y}, end: {x, y}}
   */
  getFenceEndpoints(fence) {
    const startX = parseFloat(fence.style.left)
    const startY = parseFloat(fence.style.top)
    const angle = parseFloat(fence.style.transform.replace('rotate(', '').replace('deg)', ''))
    const width = parseFloat(fence.style.width)

    // Calculate end point
    const endX = startX + width * Math.cos((angle * Math.PI) / 180)
    const endY = startY + width * Math.sin((angle * Math.PI) / 180)

    return {
      start: { x: startX, y: startY },
      end: { x: endX, y: endY },
    }
  }

  /**
   * Calculate area of a polygon using Shoelace formula
   * @param {Array} vertices - Array of [x, y] coordinates
   * @param {number} pixelsPerMeter - Scale to convert pixels to meters
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
   * @param {Object} point - Point to check {x, y}
   * @param {Array} vertices - Array of [x, y] coordinates defining the polygon
   * @returns {boolean} True if point is inside polygon
   */
  isPointInPolygon(point, vertices) {
    console.log('checking if inside')
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
   * @param {Map} vertexConnections - Map of vertex positions to connection counts
   * @returns {boolean} True if enclosure is complete
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
}
