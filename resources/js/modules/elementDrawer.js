// Serve as base for all elements (except fence)
export default class ElementDrawer {
  constructor(canvas, planId, planEditor) {
    this.canvas = canvas // Get canvas element (from planEditor)
    this.planId = planId // Get planId (from planEditor)
    this.planEditor = planEditor // Reference planEditor for useful methods

    // To be overridden by subclasses
    this.objectiveValue = null
    this.elementType = 'generic'
    this.elementSize = { width: 60, height: 60 }

    // Default states
    this.isUsing = false
    this.temporaryElement = null
  }
  //
  // COMMON METHODS
  //_____________________________________________________________________________________________________________loadElements
  /**
   * Called in constructor to load each type of elements
   * In turn, calls renderPlacedElement
   * @throws {Error} if request failed to fetch plan elements
   */
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

  //_____________________________________________________________________________________________________________stopUsing
  /**
   * Stop placing elements (when tool is deselected)
   *
   */
  stopUsing() {
    this.isUsing = false
    if (this.temporaryElement) {
      this.temporaryElement.remove()
      this.temporaryElement = null
    }
  }

  //_____________________________________________________________________________________________________________startUsing
  /**
   * Start the placement process - create temporary element that follows mouse
   * Called in PlanEditor setCurrentTool()
   * Calls createTemporaryElement()
   */
  startUsing() {
    this.isUsing = true
    this.createTemporaryElement()
  }

  //_____________________________________________________________________________________________________________createTemporaryElement
  /**
   * Create temporary visual element that follows mouse
   * Called in startUsing()
   */
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

  //_____________________________________________________________________________________________________________handleMouseMove
  /**
   * Handle placement of temporary element according to mouse with updateTemporaryElementPosition()
   * Check if element is in enclosure with isPointInEnclosure()
   * Add or remove style accordingly
   * @param {Object} point Object containing coordinates {x, y}
   */
  handleMouseMove(point) {
    if (point.x > 0 && point.y > 0 && this.isUsing && this.temporaryElement) {
      this.updateTemporaryElementPosition(point)

      // Calculate placement position
      const placementPoint = {
        x: point.x - this.elementSize.width / 2,
        y: point.y - this.elementSize.height / 2,
      }

      this.planEditor.commonFunctionsService.checkElementPlacement(
        placementPoint,
        this.temporaryElement,
        this.elementSize.width,
        this.elementSize.height
      )
    }
  }

  //_____________________________________________________________________________________________________________updateTemporaryElementPosition
  /**
   * Update position of temporary element to follow mouse cursor
   * @param {Object} point {x, y} coordinates of mouseEvent
   */
  updateTemporaryElementPosition(point) {
    if (!this.temporaryElement) return

    this.temporaryElement.style.left = `${point.x}px`
    this.temporaryElement.style.top = `${point.y}px`
  }

  //_____________________________________________________________________________________________________________placeElement
  /**
   * Check if element is in enclosure ( isPointInEnclosure () ), and is not overlaping ( wouldOverlap() ).
   * Display error if needed ( showPlacementError() ), or add element to DataBase.
   * POST request to api/elements.
   * Then render permanent element with renderPlacedElement().
   * And update objectives display with updateObjectivesDisplay()
   * @param {Object} point Object containing mouse coordinates {x, y}
   * @throws {Error} if request failed to post new element
   */
  async placeElement(point) {
    // Calculate the position where the top-left corner should be
    // This accounts for the element being centered on the cursor
    const placementPoint = {
      x: point.x - this.elementSize.width / 2,
      y: point.y - this.elementSize.height / 2,
    }

    // Check placement validity
    const placementErrorMessage = this.planEditor.commonFunctionsService.checkElementPlacement(
      placementPoint,
      this.temporaryElement,
      this.elementSize.width,
      this.elementSize.height
    )

    // If there a is an error message, placement is not ok, show error and get out
    if (placementErrorMessage) {
      this.planEditor.commonFunctionsService.showPlacementError(
        placementErrorMessage,
        this.temporaryElement
      )
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
        this.planEditor.placedElements.push({
          id: element.id,
          type: element.type,
          x: parseFloat(element.vertex.positionX),
          y: parseFloat(element.vertex.positionY),
          width: parseFloat(element.width),
          height: parseFloat(element.height),
        })

        // If objectives were returned, update their display
        if (data.objectives) {
          this.planEditor.commonFunctionsService.updateObjectivesDisplay(data.objectives)
        }

        // Continue placing elements until tool is deselected
      } else {
        console.error('Failed to save element:', await response.json())
      }
    } catch (error) {
      console.error('Error saving element:', error)
    }
  }

  //_____________________________________________________________________________________________________________renderPlacedElement
  /**
   * Create permanent DOM version of added element
   * @param {Object} elementData Object containing all relevant element information (id, type, x, y, width, height)
   */
  renderPlacedElement(elementData) {
    const element = document.createElement('div')
    element.className = `${elementData.type} selectable`
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
