import ElementDrawer from './elementDrawer.js'

export default class ShrubDrawer extends ElementDrawer {
  constructor(canvas, planId) {
    super(canvas, planId)
    this.elementType = 'shrub'
    this.elementSize = { width: 100, height: 100 }
  }
  // Override original method to create element-specific temporary appearance
  createTemporaryElement() {
    super.createTemporaryElement()
    // Add element-specific styling
    this.temporaryElement.className =
      'absolute border-2 border-dashed border-yellow-600 bg-yellow-200 bg-opacity-70 transition-transform duration-100 ease-out'
    // Create new div, used to put an icon
    const icon = document.createElement('div')
    // Add classes
    icon.className = 'absolute inset-0 flex items-center justify-center text-yellow-800'
    // Set icon as innerHTML
    icon.innerHTML = '🌾' // Or use an SVG/icon
    // Append new div to element div
    this.temporaryElement.appendChild(icon)
  }

  // Override original method to create element-specific final appearance
  renderPlacedElement(elementData) {
    super.renderPlacedElement(elementData)
    // Get the element we just created
    const element = this.canvas.querySelector(`[data-element-id="${elementData.id}"]`)
    if (element) {
      // Add styling
      element.className = 'absolute border-2 border-yellow-600 bg-yellow-100'
      // Add icon
      const icon = document.createElement('div')
      icon.className = 'absolute inset-0 flex items-center justify-center text-yellow-800'
      icon.innerHTML = '🌾'
      element.appendChild(icon)
    }
  }
}
