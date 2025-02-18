import ElementDrawer from './elementDrawer.js'

export default class ShrubDrawer extends ElementDrawer {
  constructor(canvas, planId) {
    super(canvas, planId)
    this.elementType = 'shrub'
    this.elementSize = { width: 100, height: 100 }
    this.objectiveValue = 1
  }
  // Override original method to create element-specific temporary appearance
  createTemporaryElement() {
    super.createTemporaryElement()
    // Add element-specific styling
    this.temporaryElement.className =
      'absolute border-2 border-dashed border-yellow-600 bg-yellow-200 bg-opacity-70 transition-transform duration-100 ease-out'
  }
}
