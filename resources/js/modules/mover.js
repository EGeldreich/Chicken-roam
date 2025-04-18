export default class Mover {
  constructor(canvas, planId, planEditor) {
    this.canvas = canvas
    this.planId = planId
    this.planEditor = planEditor

    // Default states
    this.isUsing = false
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
    this.planEditor.isPanning = false
    this.canvas.style.cursor = 'default'
  }

  /**
   * Activate isPanning state and change cursor style
   */
  handleMouseDown() {
    if (!this.isUsing) return

    this.planEditor.isPanning = true
    this.canvas.style.cursor = 'grabbing'
  }

  /**
   * Stop panning on mouse up and change cursor style
   */
  handleMouseUp() {
    if (!this.isUsing) return

    this.planEditor.isPanning = false
    this.canvas.style.cursor = 'grab'
  }
}
