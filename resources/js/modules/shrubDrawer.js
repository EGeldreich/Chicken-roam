import ElementDrawer from './elementDrawer.js'

export default class ShrubDrawer extends ElementDrawer {
  constructor(canvas, planId, planEditor) {
    super(canvas, planId, planEditor)
    this.elementType = 'shrub'
    this.elementSize = { width: 100, height: 100 }
    this.objectiveValue = 1
  }
  // Override original method to create element-specific temporary appearance
  createTemporaryElement() {
    super.createTemporaryElement()
    // Add element-specific styling
    this.temporaryElement.classList.add('temporary', this.elementType)
  }
}
