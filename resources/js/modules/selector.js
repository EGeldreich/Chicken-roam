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
  // Select an element
  selectElement(event) {
    if (!this.isUsing) return

    // Remove previous selection
    const previousSelected = document.querySelector('.selected')
    if (previousSelected) {
      previousSelected.classList.remove('selected')
    }

    // Find the closest element with data-element-id
    const targetElement = event.target
    if (targetElement) {
      targetElement.classList.add('selected')
    }
  }
  //
  //
  //
}
