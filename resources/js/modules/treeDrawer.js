import ElementDrawer from './elementDrawer.js'

export default class TreeDrawer extends ElementDrawer {
  constructor(canvas, planId, planEditor) {
    super(canvas, planId, planEditor)
    this.elementType = 'tree'
    this.elementSize = { width: 200, height: 200 }
    this.objectiveValue = 0
  }
  // Override original method to create element-specific temporary appearance
  createTemporaryElement() {
    super.createTemporaryElement()
    // Add element-specific styling
    this.temporaryElement.classList.add('temporary', this.elementType)
  }
}
