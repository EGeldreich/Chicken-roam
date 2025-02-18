// Serve as base for all elements (except fence)
export default class ElementDrawer {
  constructor(canvas, planId, placedElementsRef) {
    this.canvas = canvas // Get canvas element (from planEditor)
    this.planId = planId // Get planId (from planEditor)

    // To be overridden by subclasses
    this.objectiveValue = null
    this.elementType = 'generic'
    this.elementSize = { width: 60, height: 60 }

    this.placedElements = placedElementsRef

    // Default states
    this.isPlacing = false
    this.temporaryElement = null
  }
  //
  // COMMON METHODS
  //
  // Function called in PlanEditor to load each type of element
  async loadElements() {
    try {
      const response = await fetch(`/api/elements/${this.planId}`)
      if (response.ok) {
        const elements = await response.json()
        elements.forEach((element) => {
          // Only render elements that match this drawer's type
          if (element.type === this.elementType) {
            this.renderPlacedElement(element)
          }
        })
      }
    } catch (error) {
      console.error(`Failed to load ${this.elementType} elements:`, error)
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
    this.temporaryElement.className = 'temporary-element valid-placement'

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

      // Calculate placement position
      const placementPoint = {
        x: point.x - this.elementSize.width / 2,
        y: point.y - this.elementSize.height / 2,
      }

      // Check for collision and update visual feedback
      if (this.wouldOverlap(placementPoint)) {
        this.temporaryElement.classList.add('invalid-placement')
        this.temporaryElement.classList.remove('valid-placement')
      } else {
        this.temporaryElement.classList.add('valid-placement')
        this.temporaryElement.classList.remove('invalid-placement')
      }
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
    // Calculate the position where the top-left corner should be
    // This accounts for the element being centered on the cursor
    const placementPoint = {
      x: point.x - this.elementSize.width / 2,
      y: point.y - this.elementSize.height / 2,
    }

    // Do not place the element if it would overlap
    if (this.wouldOverlap(placementPoint)) {
      // Optionally, provide feedback to the user
      this.showPlacementError()
      return
    }

    try {
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
        const element = await response.json()
        this.renderPlacedElement(element)

        this.placedElements.push({
          id: element.id,
          type: element.type,
          x: parseFloat(element.vertex.positionX),
          y: parseFloat(element.vertex.positionY),
          width: parseFloat(element.width),
          height: parseFloat(element.height),
        })

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
  //
  //
  // Method to avoid overlapping
  wouldOverlap(newElementPosition) {
    // Calculate the bounds of the new element
    const newElement = {
      left: newElementPosition.x,
      top: newElementPosition.y,
      right: newElementPosition.x + this.elementSize.width,
      bottom: newElementPosition.y + this.elementSize.height,
    }

    // Compare bounds to existing elements
    for (const element of this.placedElements) {
      // Convert string coordinates to numbers if needed
      const left = parseFloat(element.x)
      const top = parseFloat(element.y)
      const width = parseFloat(element.width)
      const height = parseFloat(element.height)

      const existingElement = {
        left: left,
        top: top,
        right: left + width,
        bottom: top + height,
      }

      // Check for intersection using the AABB collision detection algorithm
      if (
        newElement.left < existingElement.right &&
        newElement.right > existingElement.left &&
        newElement.top < existingElement.bottom &&
        newElement.bottom > existingElement.top
      ) {
        return true // Collision detected
      }
    }

    return false // No collision
  }
  //
  //
  // Show placement error feedback
  showPlacementError() {
    // Visual feedback
    this.temporaryElement.classList.add('placement-error')
    setTimeout(() => {
      if (this.temporaryElement) {
        this.temporaryElement.classList.remove('placement-error')
      }
    }, 1000)

    // Optionally show a toast message
    const errorMessage = document.createElement('div')
    errorMessage.className = 'placement-error-toast'
    errorMessage.textContent = 'Cannot place here - overlaps with existing element'
    document.body.appendChild(errorMessage)

    setTimeout(() => {
      errorMessage.remove()
    }, 3000)
  }
}
