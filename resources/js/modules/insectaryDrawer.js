import ElementDrawer from './elementDrawer.js'

export default class InsectaryDrawer extends ElementDrawer {
  constructor(canvas, planId, planEditor) {
    super(canvas, planId, planEditor)
    this.elementType = 'insectary'
    this.elementSize = { width: 85, height: 85 }
    this.objectiveValue = 1
  }
  // Override original method to create element-specific temporary appearance
  createTemporaryElement() {
    super.createTemporaryElement()
    // Add element-specific styling
    this.temporaryElement.classList.add('temporary', this.elementType)
  }

  // Override original method to create element-specific final appearance
  // renderPlacedElement(elementData) {
  //   super.renderPlacedElement(elementData)
  //   // Get the element we just created
  //   const element = this.canvas.querySelector(`[data-element-id="${elementData.id}"]`)
  //   if (element) {
  //     // Add styling
  //     element.className = 'absolute border-2 border-yellow-600 bg-yellow-100'
  //     // Add icon
  //     const icon = document.createElement('div')
  //     icon.className = 'absolute inset-0 flex items-center justify-center text-yellow-800'
  //     icon.innerHTML = '🌾'
  //     element.appendChild(icon)
  //   }
  // }
}
