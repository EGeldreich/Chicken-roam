// Serve as base for all elements (except fence)
export default class ElementDrawer {
  constructor(canvas, planId, placedElementsRef, planEditor) {
    this.canvas = canvas // Get canvas element (from planEditor)
    this.planId = planId // Get planId (from planEditor)
    this.planEditor = planEditor // Reference planEditor for useful methods

    // To be overridden by subclasses
    this.objectiveValue = null
    this.elementType = 'generic'
    this.elementSize = { width: 60, height: 60 }

    this.placedElements = placedElementsRef

    // Default states
    this.isUsing = false
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
  stopUsing() {
    this.isUsing = false
    if (this.temporaryElement) {
      this.temporaryElement.remove()
      this.temporaryElement = null
    }
  }
  //
  //
  // Start the placement process - create temporary element that follows mouse
  startUsing() {
    this.isUsing = true
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
    if (point.x > 0 && point.y > 0 && this.isUsing && this.temporaryElement) {
      this.updateTemporaryElementPosition(point)

      // Calculate placement position
      const placementPoint = {
        x: point.x - this.elementSize.width / 2,
        y: point.y - this.elementSize.height / 2,
      }

      // Check if the placement point would be inside the enclosure
      const wouldBeInside =
        !this.planEditor.isEnclosureComplete ||
        this.planEditor.isPointInEnclosure({
          x: point.x,
          y: point.y,
        })

      // First, check enclosure restriction
      if (!wouldBeInside) {
        this.temporaryElement.classList.add('invalid-placement')
        this.temporaryElement.classList.remove('valid-placement')
      }
      // Then check for collision with other elements
      else if (this.wouldOverlap(placementPoint)) {
        this.temporaryElement.classList.add('invalid-placement')
        this.temporaryElement.classList.remove('valid-placement')
      }
      // Finally check for collision with fences
      else if (this.wouldOverlapFence(placementPoint)) {
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
  // Add element to SB, then calls renderPlacedElement
  async placeElement(point) {
    // Calculate the position where the top-left corner should be
    // This accounts for the element being centered on the cursor
    const placementPoint = {
      x: point.x - this.elementSize.width / 2,
      y: point.y - this.elementSize.height / 2,
    }

    // Check if the enclosure is complete
    const isEnclosureComplete = this.planEditor.isEnclosureComplete
    //  and if the element would be inside
    const wouldBeInside =
      !isEnclosureComplete ||
      this.planEditor.isPointInEnclosure({
        x: point.x,
        y: point.y,
      })

    // First, check enclosure restriction
    if (isEnclosureComplete && !wouldBeInside) {
      this.showPlacementError('Elements must be placed inside the enclosure')
      return
    }

    // Do not place the element if it would overlap with another element
    if (this.wouldOverlap(placementPoint)) {
      this.showPlacementError('Elements cannot overlap')
      return
    }
    // Do not place the element if it would overlap with a fence
    if (this.wouldOverlapFence(placementPoint)) {
      this.showPlacementError('Elements cannot overlap with fences')
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
        const data = await response.json()
        const element = data.element

        // Render the placed element
        this.renderPlacedElement(element)

        // Add to tracking array
        this.placedElements.push({
          id: element.id,
          type: element.type,
          x: parseFloat(element.vertex.positionX),
          y: parseFloat(element.vertex.positionY),
          width: parseFloat(element.width),
          height: parseFloat(element.height),
        })

        // If objectives were returned, update their display
        if (data.objectives) {
          this.updateObjectivesDisplay(data.objectives)
        }

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
    element.className = `${elementData.type} element`
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
  showPlacementError(message) {
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
    errorMessage.textContent = message
    document.body.appendChild(errorMessage)

    setTimeout(() => {
      errorMessage.remove()
    }, 3000)
  }
  //
  //
  //
  updateObjectivesDisplay(objectives) {
    objectives.forEach((objective) => {
      // Finf the correct HTML element
      const objectiveEl = document.querySelector(`#${objective.name}`)
      if (objectiveEl) {
        objectiveEl.textContent = objective.completion_percentage
      }
    })
  }
  //
  //
  // Method to check overlaping with fences
  wouldOverlapFence(newElementPosition) {
    // Get all fences
    const fences = Array.from(this.canvas.querySelectorAll('.fence'))

    // Calculate the bounds of the new element
    const newElement = {
      left: newElementPosition.x,
      top: newElementPosition.y,
      right: newElementPosition.x + this.elementSize.width,
      bottom: newElementPosition.y + this.elementSize.height,
    }

    // Check each fence for collision
    for (const fence of fences) {
      const endpoints = this.planEditor.fenceDrawer.getFenceEndpoints(fence)

      // Simple bounding box check first for performance
      const fenceBounds = {
        left: Math.min(endpoints.start.x, endpoints.end.x),
        top: Math.min(endpoints.start.y, endpoints.end.y),
        right: Math.max(endpoints.start.x, endpoints.end.x),
        bottom: Math.max(endpoints.start.y, endpoints.end.y),
      }

      // If bounding boxes don't intersect, skip more complex check
      if (
        newElement.right < fenceBounds.left ||
        newElement.left > fenceBounds.right ||
        newElement.bottom < fenceBounds.top ||
        newElement.top > fenceBounds.bottom
      ) {
        continue
      }

      // For more accurate detection, check if the fence line intersects any of the element edges
      // This is a simplified version - full implementation would check all four edges of the element
      if (
        this.planEditor.fenceDrawer.checkLineIntersection(
          newElement.left,
          newElement.top,
          newElement.right,
          newElement.top,
          endpoints.start.x,
          endpoints.start.y,
          endpoints.end.x,
          endpoints.end.y
        ) ||
        this.planEditor.fenceDrawer.checkLineIntersection(
          newElement.right,
          newElement.top,
          newElement.right,
          newElement.bottom,
          endpoints.start.x,
          endpoints.start.y,
          endpoints.end.x,
          endpoints.end.y
        ) ||
        this.planEditor.fenceDrawer.checkLineIntersection(
          newElement.right,
          newElement.bottom,
          newElement.left,
          newElement.bottom,
          endpoints.start.x,
          endpoints.start.y,
          endpoints.end.x,
          endpoints.end.y
        ) ||
        this.planEditor.fenceDrawer.checkLineIntersection(
          newElement.left,
          newElement.bottom,
          newElement.left,
          newElement.top,
          endpoints.start.x,
          endpoints.start.y,
          endpoints.end.x,
          endpoints.end.y
        )
      ) {
        return true // Collision detected
      }
    }

    return false // No collision
  }
}
