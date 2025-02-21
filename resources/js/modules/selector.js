export default class Selector {
  constructor(canvas, planId, placedElementsRef) {
    this.canvas = canvas // Get canvas element (from planEditor)
    this.planId = planId // Get planId (from planEditor)
    this.placedElements = placedElementsRef // Get elements coordinates from planEditor

    // Default state
    this.isUsing = true
    this.selectedElement = null
  }
  //
  //
  // Start selection process
  startUsing() {
    console.log('start selecting')
    this.isUsing = true
  }
  //
  //
  // Stop selection process
  stopUsing() {
    this.isUsing = false
    this.selectedElement = null
    let selectedElement = document.querySelector('.selected')
    if (selectedElement) {
      selectedElement.classList.remove('selected')
    }
  }
  //
  //
  // Check if there is an element at those coordinates
  wouldSelect(targetPoint) {
    // For each placed element
    for (const element of this.placedElements) {
      // Transform top left point and size into coordinates
      const left = parseFloat(element.x)
      const top = parseFloat(element.y)
      const width = parseFloat(element.width)
      const height = parseFloat(element.height)

      // Create an object with those coordinates
      const existingElement = {
        id: element.id,
        left: left,
        top: top,
        right: left + width,
        bottom: top + height,
      }

      // Check for intersection using the AABB collision detection algorithm
      if (
        targetPoint.x < existingElement.right &&
        targetPoint.x > existingElement.left &&
        targetPoint.y < existingElement.bottom &&
        targetPoint.y > existingElement.top
      ) {
        return existingElement.id // Collision detected
      }
    }
    return false // No collision
  }
  //
  //
  // Select an element
  selectElement(point) {
    // Get out if not currently selecting
    console.log('selector method')
    if (!this.isUsing) {
      return
    }
    // Get coordinates from planEditor
    const selectionPoint = {
      x: point.x,
      y: point.y,
    }
    let oldSelectedElement = document.querySelector('.selected')
    if (oldSelectedElement) {
      oldSelectedElement.classList.remove('selected')
    }
    // If there is an element at target point
    if (this.wouldSelect(selectionPoint)) {
      let selectedElement = document.querySelector(
        `[data-element-id="${this.wouldSelect(selectionPoint)}"]`
      )
      selectedElement.classList.add('selected')
    }
  }
  //
  //
  //
}
