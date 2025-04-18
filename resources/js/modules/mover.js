export default class MoveDrawer {
  constructor(canvas, planId, planEditor) {
    this.canvas = canvas
    this.planId = planId
    this.planEditor = planEditor

    // Default states
    this.isUsing = false
    this.isMoving = false
    this.lastMovePoint = { x: 0, y: 0 }
  }

  /**
   * Change isUsing state and cursor
   */
  startUsing() {
    this.isUsing = true
    this.canvas.style.cursor = 'grab'
  }

  /**
   * Reset states and cursor
   */
  stopUsing() {
    this.isUsing = false
    this.isMoving = false
    this.canvas.style.cursor = 'default'
  }

  /**
   * Start panning on mouse down
   * @param {Object} point {x, y} coordinates of mouseEvent in canvas space
   */
  handleMouseDown(point) {
    // Security
    if (!this.isUsing) return

    // Change states and cursor style
    this.isMoving = true
    this.lastMovePoint = point
    this.canvas.style.cursor = 'grabbing'
  }

  /**
   * Handle mouse movement - update pan values when moving
   * @param {Object} point {x, y} coordinates of mouseEvent in canvas space
   */
  handleMouseMove(point) {
    // Security
    if (!this.isUsing || !this.isMoving) return

    // Calculate the displacement (in world coordinates)
    const dx = point.x - this.lastMovePoint.x
    const dy = point.y - this.lastMovePoint.y

    // Update pan values, taking zoom into account
    this.planEditor.panX += dx * this.planEditor.zoom
    this.planEditor.panY += dy * this.planEditor.zoom

    // Update last position
    this.lastMovePoint = { x: point.x, y: point.y }

    // Apply transform with new values
    this.planEditor.applyTransform()
  }

  /**
   * Stop panning on mouse up
   */
  handleMouseUp() {
    // Security
    if (!this.isUsing) return

    // Reset states and cursor style
    this.isMoving = false
    this.canvas.style.cursor = 'grab'
  }
}
