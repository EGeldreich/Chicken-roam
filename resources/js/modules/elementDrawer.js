// Serve as base for all elements (except fence)
export default class ElementDrawer {
  constructor(canvas, planId) {
    this.canvas = canvas // Get canvas element (from planEditor)
    this.planId = planId // Get planId (from planEditor)

    // Default states
    this.isPlacing = false
    this.temporaryElement = null

    // To be overridden by subclasses
    this.objectiveValue = null
    this.elementType = 'generic'
    this.elementSize = { width: 60, height: 60 }

    // Get existing elements
    this.loadExistingElements()
  }
  //
  // COMMON METHODS
  //
  //
  // Get existing elements
  async loadExistingElements() {
    // GET elements from db
    const response = await fetch(`/api/elements/${this.planId}`)
    if (response.ok) {
      const elements = await response.json()
      // For each element
      elements.forEach((element) => {
        this.renderPlacedElement(element)
      })
    }
  }
  //
  //
  // Stop placing elements (when tool is deselected)
  stopPlacement() {
    this.isPlacing = false
    if (this.temporaryElement) {
      this.temporaryElement.remove()
      this.temporaryElement = null
    }
  }
  //
  //
  // Start the placement process - create temporary element that follows mouse
  startPlacement() {
    this.isPlacing = true
    this.createTemporaryElement()
  }
  //
  //
  // Create temporary visual element that follows mouse
  createTemporaryElement() {
    this.temporaryElement = document.createElement('div')

    // Set predefined size
    this.temporaryElement.style.width = `${this.elementSize.width}px`
    this.temporaryElement.style.height = `${this.elementSize.height}px`

    // Center the element on cursor
    this.temporaryElement.style.transform = 'translate(-50%, -50%)'

    this.canvas.appendChild(this.temporaryElement)
  }
  //
  //
  // Handle mouse movement to update the preview position
  handleMouseMove(point) {
    if (point.x > 0 && point.y > 0 && this.isPlacing && this.temporaryElement) {
      this.updateTemporaryElementPosition(point)
    }
  }
  //
  //
  // Update position to follow mouse cursor
  updateTemporaryElementPosition(point) {
    if (!this.temporaryElement) return

    this.temporaryElement.style.left = `${point.x}px`
    this.temporaryElement.style.top = `${point.y}px`
  }
  //
  //
  // Place the element at the specified position
  async placeElement(point) {
    try {
      // Calculate the position where the top-left corner should be
      // This accounts for the element being centered on the cursor
      const placementPoint = {
        x: point.x - this.elementSize.width / 2,
        y: point.y - this.elementSize.height / 2,
      }

      const response = await fetch(`/api/elements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
        },
        body: JSON.stringify({
          planId: this.planId,
          type: this.elementType,
          objectiveValue: this.objectiveValue,
          positionX: placementPoint.x,
          positionY: placementPoint.y,
          width: this.elementSize.width,
          height: this.elementSize.height,
          // Add any type-specific properties here
        }),
      })

      if (response.ok) {
        const data = await response.json()
        this.renderPlacedElement(data)
        console.log(data)
        // Continue placing elements until tool is deselected
      } else {
        console.error('Failed to save element:', await response.json())
      }
    } catch (error) {
      console.error('Error saving element:', error)
    }
  }
  //
  //
  // Render the final placed element
  renderPlacedElement(elementData) {
    console.log(elementData)
    const element = document.createElement('div')
    element.className = `absolute ${elementData.type}`
    element.dataset.elementId = elementData.id
    element.dataset.elementType = elementData.type

    // Position and size
    element.style.left = `${elementData.vertex.positionX}px`
    element.style.top = `${elementData.vertex.positionY}px`
    element.style.width = `${elementData.width}px`
    element.style.height = `${elementData.height}px`

    this.canvas.appendChild(element)
  }
}
