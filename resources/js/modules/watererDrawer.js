import ElementDrawer from './elementDrawer.js'

export default class WatererDrawer extends ElementDrawer {
  constructor(canvas, planId, planEditor) {
    super(canvas, planId, planEditor)
    this.elementType = 'waterer'
    this.elementSize = { width: 60, height: 60 }
    this.objectiveValue = 1
  }
  // Override original method to create element-specific temporary appearance
  createTemporaryElement() {
    super.createTemporaryElement()
    // Add element-specific styling
    this.temporaryElement.classList.add('temporary', this.elementType)
  }
}
