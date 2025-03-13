export default class PointAdder {
  constructor(canvas, planId, planEditor) {
    this.canvas = canvas // Get canvas element (from planEditor)
    this.planId = planId // Get planId (from planEditor)
    this.planEditor = planEditor // Reference to planEditor

    // Default states
    this.isUsing = false
    this.temporaryPoint = null
    this.nearestFenceInfo = null
    this.SNAP_DISTANCE = 50 / this.planEditor.zoom
    this.EPSILON = 1
  }

  /**
   * ACtivate tool
   */
  startUsing() {
    this.isUsing = true
  }

  /**
   * Deactivate tool
   */
  stopUsing() {
    if (this.temporaryPoint) {
      this.temporaryPoint.remove()
      this.temporaryPoint = null
    }
    this.isUsing = false
    this.nearestFenceInfo = null
  }

  /**
   * Used to get mouse coordinates, and if necessary display temporary point
   * @param {Object} point {x, y} Mouse coords
   */
  handleMouseMove(point) {
    if (!this.isUsing) return

    // Delete eventual pre-existing temporary point
    if (this.temporaryPoint) {
      this.temporaryPoint.remove()
      this.temporaryPoint = null
    }

    // Find nearest fence and get relevant info
    const nearestFenceInfo = this.findNearestPointOnFence(point)
    this.nearestFenceInfo = nearestFenceInfo

    // If close enough to a fence, add a temporary point
    if (nearestFenceInfo && nearestFenceInfo.distance <= this.SNAP_DISTANCE) {
      this.createTemporaryPoint(nearestFenceInfo.closestPoint)
    }
  }

  /**
   * Handle clic (check and call split method)
   * @param {Object} point - {x, y} mouse coords
   */
  async handleMouseDown(point) {
    if (
      !this.isUsing ||
      !this.nearestFenceInfo ||
      this.nearestFenceInfo.distance > this.SNAP_DISTANCE
    )
      return

    try {
      // Call method to split fence
      await this.splitFence(this.nearestFenceInfo)

      // Reset to default states
      if (this.temporaryPoint) {
        this.temporaryPoint.remove()
        this.temporaryPoint = null
      }
    } catch (error) {
      console.error('Error while splitting the fence:', error)
    }
  }

  /**
   * Create temporary point for visual aid
   * @param {Object} position - {x, y} point coordinates
   */
  createTemporaryPoint(position) {
    this.temporaryPoint = document.createElement('div')
    this.temporaryPoint.className = 'point temporary-point temporary'
    this.temporaryPoint.style.left = `${position.x}px`
    this.temporaryPoint.style.top = `${position.y}px`
    this.canvas.appendChild(this.temporaryPoint)
  }

  /**
   * Find fence's nearest point
   * @param {Object} point - {x, y} Mouse coords
   * @returns {Object|null} - Nearest fence informations, or null
   */
  findNearestPointOnFence(point) {
    // Get all fences
    const fenceElements = Array.from(this.canvas.querySelectorAll('.fence'))
    if (fenceElements.length === 0) return null

    // Initialize variables
    let nearestFence = null
    let closestPoint = null
    let minDistance = Infinity

    // For each fence
    for (const fence of fenceElements) {
      // Get endpoints
      const endpoints = this.planEditor.commonFunctionsService.getFenceEndpoints(fence)

      // Find closes point on fence segment
      const closestPointOnFence = this.closestPointOnSegment(
        endpoints.start.x,
        endpoints.start.y,
        endpoints.end.x,
        endpoints.end.y,
        point.x,
        point.y
      )

      // Calculate distance between mouse and closest point on fence
      const distance = Math.sqrt(
        Math.pow(closestPointOnFence.x - point.x, 2) + Math.pow(closestPointOnFence.y - point.y, 2)
      )

      // If it's the smallest distance yet, keep it
      if (distance < minDistance) {
        minDistance = distance
        closestPoint = closestPointOnFence
        nearestFence = {
          element: fence,
          id: fence.dataset.fenceId,
          vertexStartId: fence.dataset.vertexStartId,
          vertexEndId: fence.dataset.vertexEndId,
          startPoint: endpoints.start,
          endPoint: endpoints.end,
        }
      }
    }

    // Return relevant informations, or null
    return nearestFence
      ? {
          fence: nearestFence,
          closestPoint: closestPoint,
          distance: minDistance,
        }
      : null
  }

  /**
   * Calculate closest point on a given segment
   * @param {number} x1 - X coordinate of the start of the segment
   * @param {number} y1 - Y coordinate of the start of the segment
   * @param {number} x2 - X coordinate of the end of the segment
   * @param {number} y2 - Y coordinate of the end of the segment
   * @param {number} px - X coordinate of the point
   * @param {number} py - Y coordinate of the point
   * @returns {Object} - {x, y} closest point's coordinates
   */
  closestPointOnSegment(x1, y1, x2, y2, px, py) {
    const dx = x2 - x1
    const dy = y2 - y1
    const lengthSquared = dx * dx + dy * dy

    // if lengthSquared < this.EPSILON, segment is a point, return point coordinates
    if (lengthSquared < this.EPSILON) return { x: x1, y: y1 }

    // Calculate point's projection on the segment
    const t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared

    // Limit to [o, 1] to stay on segment
    const clampedT = Math.max(0, Math.min(1, t))

    // Return calculated nearest point coordinates
    return {
      x: x1 + clampedT * dx,
      y: y1 + clampedT * dy,
    }
  }

  /**
   * Calculate distance between 2 points
   * @param {Object} point1 {x, y} First point
   * @param {Object} point2 {x, y} second point
   * @returns {number} Distance between 2 points
   */
  distanceBetweenPoints(point1, point2) {
    return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2))
  }

  /**
   * Divide a fence into 2 at the specified point
   * 1 Create new vertex
   * 2 Update existing fence
   * 3 Create new fence
   * @param {Object} nearestFenceInfo - Fence-to-split relevant informations
   */
  async splitFence(nearestFenceInfo) {
    const { fence, closestPoint } = nearestFenceInfo

    try {
      // First - Create a new vertex
      const createVertexResponse = await fetch('/api/vertices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
        },
        body: JSON.stringify({
          planId: this.planId,
          positionX: closestPoint.x,
          positionY: closestPoint.y,
        }),
      })

      if (!createVertexResponse.ok) throw new Error('Error while creating a new vertex')

      const newVertex = await createVertexResponse.json()

      // Second - Update existing fence
      // Find endpoint closest to new point
      const isStartCloser =
        this.distanceBetweenPoints(fence.startPoint, closestPoint) <
        this.distanceBetweenPoints(fence.endPoint, closestPoint)

      // Define vertex to keep as the closest one to the new point
      const keepVertexId = isStartCloser ? fence.vertexStartId : fence.vertexEndId

      // Update in back
      const updateFenceResponse = await fetch(`/api/fences/${fence.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
        },
        body: JSON.stringify({
          vertexStartId: isStartCloser ? keepVertexId : newVertex.id,
          vertexEndId: isStartCloser ? newVertex.id : keepVertexId,
        }),
      })

      if (!updateFenceResponse.ok) throw new Error('Error while updating fence')

      // Third - Create new fence with new vertex
      const otherVertexId = isStartCloser ? fence.vertexEndId : fence.vertexStartId

      const createFenceResponse = await fetch('/api/fences/create-from-vertices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
        },
        body: JSON.stringify({
          planId: this.planId,
          vertexStartId: newVertex.id,
          vertexEndId: otherVertexId,
          type: 'standard',
        }),
      })

      if (!createFenceResponse.ok) throw new Error('Error while creating new fence')

      // Update interface
      await this.planEditor.fenceDrawer.loadExistingFences()
    } catch (error) {
      console.error('Error while splitting the fence:', error)
      throw error
    }
  }
}
