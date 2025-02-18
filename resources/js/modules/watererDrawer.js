import ElementDrawer from './elementDrawer.js'

export default class WatererDrawer extends ElementDrawer {
  constructor(canvas, planId) {
    super(canvas, planId)
    this.elementType = 'waterer'
    this.elementSize = { width: 100, height: 100 }
    this.objectiveValue = 1
  }
  // Override original method to create element-specific temporary appearance
  createTemporaryElement() {
    super.createTemporaryElement()
    // Add element-specific styling
    this.temporaryElement.className = `temporary ${this.elementType}`
  }
}
