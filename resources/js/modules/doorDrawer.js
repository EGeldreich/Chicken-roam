import ElementDrawer from './elementDrawer.js'

export default class DoorDrawer extends ElementDrawer {
  constructor(canvas, planId, planEditor) {
    super(canvas, planId, planEditor)
    this.elementType = 'door'
    this.elementSize = { width: 100, height: 100 }
    this.objectiveValue = null
  }
  // Override original method to create element-specific temporary appearance
  // createTemporaryElement() {
  //   super.createTemporaryElement()
  //   // Add element-specific styling
  //   this.temporaryElement.classList.add('temporary', this.elementType)
  // }
}
