export default class Selector {
  constructor(canvas, planId, planEditor) {
    this.canvas = canvas // Get canvas element (from planEditor)
    this.planId = planId // Get planId (from planEditor)
    this.planEditor = planEditor // Reference to planEditor

    // Default state
    this.isUsing = true
    this.selectedElement = null
    // Variables for deplacement
    this.isDragging = false
    this.elementIndex = null // store moved element index
    this.draggedElement = null // Used to store element while it is out of placedElement

    // Selected element menu
    this.menu = document.getElementById('elementMenu')
    this.initializeMenu()
  }

  //_____________________________________________________________________________________________________________startUsing
  /**
   * Change isUsing state
   */
  startUsing() {
    this.isUsing = true
  }

  //_____________________________________________________________________________________________________________stopUsing
  /**
   * Deselect any selected element, and reset states to default
   * @param {Object} point
   */
  stopUsing() {
    if (this.selectedElement) {
      this.selectedElement.classList.remove('selected')
    }
    this.hideMenu()
    this.isUsing = false
    this.selectedElement = null
  }

  //_____________________________________________________________________________________________________________selectElement
  /**
   * Handle selection of targeted element, add style for better visualization
   * @param {MouseEvent} event - sent by PlanEditor handleMouseDown
   */
  selectElement(event) {
    if (!this.isUsing) return

    // Remove previous selection
    if (this.selectedElement) {
      this.selectedElement.classList.remove('selected')
    }

    const deleteBtn = this.menu.querySelector('.delete-btn')
    // Get targeted element from event target
    const targetElement = event.target
    // If the targeted element is an element or a fence
    if (targetElement && targetElement.classList.contains('element')) {
      this.selectedElement = targetElement
      this.selectedElement.classList.add('selected')
      this.showMenu(this.selectedElement)
    } else if (targetElement !== deleteBtn) {
      this.hideMenu()
      this.selectedElement = null
    }
  }

  //_____________________________________________________________________________________________________________handleMouseMove
  /**
   * Handle movement of selected element
   * @param {Object} point {x, y} coordinates of mouseEvent
   */
  handleMouseMove(point) {
    if (point.x > 0 && point.y > 0 && this.isUsing && this.selectedElement) {
      // Add styling class to element
      this.selectedElement.classList.add('moving')
      console.log(this.selectedElement.dataset.elementId)
      // Logic to avoid selected object having collision with itself
      if (!this.isDragging) {
        this.isDragging = true

        // Get selected element dataset id
        const elementId = parseInt(this.selectedElement.dataset.elementId)
        // Find that same element in placedElements array
        this.elementIndex = this.planEditor.placedElements.findIndex((el) => el.id === elementId)

        if (this.elementIndex !== -1) {
          // Remove element and store it as dragged element
          this.draggedElement = this.planEditor.placedElements.splice(this.elementIndex, 1)[0]
        }
      }

      let width = parseFloat(this.selectedElement.style.width)
      let height = parseFloat(this.selectedElement.style.height)
      // Get center point of element
      const placementPoint = {
        x: point.x - width / 2,
        y: point.y - height / 2,
      }

      // Constantly update selected element position
      this.updateSelectedElementPosition(placementPoint)

      // Update visual display of moving element
      this.planEditor.commonFunctionsService.checkElementPlacement(
        placementPoint,
        this.selectedElement,
        width,
        height
      )
    }
  }

  //_____________________________________________________________________________________________________________updateTemporaryElementPosition
  /**
   * Update position of selected element to follow mouse cursor
   * @param {Object} point {x, y} coordinates of mouseEvent
   */
  updateSelectedElementPosition(point) {
    if (!this.selectedElement) return

    this.selectedElement.style.left = `${point.x}px`
    this.selectedElement.style.top = `${point.y}px`
  }

  //_____________________________________________________________________________________________________________handleMouseUp
  /**
   * Handle new placement of element
   * @param {Object} point {x, y} coordinates of mouseEvent
   * @throws {Error} if update failed
   */
  handleMouseUp(point) {
    // If an element was being dragged
    if (this.isDragging === true && this.selectedElement) {
      // Get width and height
      let width = parseFloat(this.selectedElement.style.width)
      let height = parseFloat(this.selectedElement.style.height)

      // Calculate placement point
      const placementPoint = {
        x: point.x - width / 2,
        y: point.y - height / 2,
      }

      // Check placement validity
      const placementErrorMessage = this.planEditor.commonFunctionsService.checkElementPlacement(
        placementPoint,
        this.selectedElement,
        width,
        height
      )

      // If there is no error message, placement is ok
      if (!placementErrorMessage && this.draggedElement) {
        // -- Reinsert element to placed elements array
        // Update coordinates
        this.draggedElement.x = placementPoint.x
        this.draggedElement.y = placementPoint.y

        // Update database
        this.updateElementPositionInBack(
          this.selectedElement.dataset.elementId,
          placementPoint.x,
          placementPoint.y
        )

        // Reinsert into array
        // (Replace the element currently at index 'this.elementIndex' by 'this.draggedElement')
        this.planEditor.placedElements.splice(this.elementIndex, 0, this.draggedElement)

        // Handle Front-end change
        this.selectedElement.classList.remove('moving', 'valid-placement')
        this.selectedElement.style.left = `${placementPoint.x}px`
        this.selectedElement.style.top = `${placementPoint.y}px`

        // Reset states
        this.isDragging = false
        this.draggedElement = null
        this.elementIndex = null
        this.selectedElement = null
        this.hideMenu()
      } else {
        // If there a is an error message, placement is not ok, show error and reset placement

        this.planEditor.commonFunctionsService.showPlacementError(
          placementErrorMessage,
          this.selectedElement
        )
        this.resetElementPlacement(this.selectedElement)
        return
      }
    }
  }

  async updateElementPositionInBack(elementId, x, y) {
    try {
      const response = await fetch(`/api/elements/${elementId}/position`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
        },
        body: JSON.stringify({
          positionX: x,
          positionY: y,
        }),
      })
      if (!response.ok) {
        console.error('Failed to update element position:', await response.json())
      }
    } catch (error) {
      console.error('Error updating element position:', error)
    }
  }
  //_____________________________________________________________________________________________________________resetElementPlacement
  /**
   * Reset element placement in case of wrong new placement
   * @param {Object} element dragged element that needs to reset
   */
  resetElementPlacement(element) {
    // Put dragged element back into placed elements array
    if (this.draggedElement && this.elementIndex !== null) {
      this.planEditor.placedElements.splice(this.elementIndex, 0, this.draggedElement)
    }

    // Reset placement
    element.style.left = `${this.draggedElement.x}px`
    element.style.top = `${this.draggedElement.y}px`
    element.classList.remove('moving', 'invalid-placement')

    // Reset states
    this.isDragging = false
    this.selectedElement = null
    this.draggedElement = null
    this.elementIndex = null
    this.hideMenu()
  }

  //_____________________________________________________________________________________________________________initializeMenu
  /**
   * Initialize event listener of delete menu
   * Also initialize Del and Backspace keys to delete selected element
   */
  initializeMenu() {
    // Handle delete button click
    const deleteBtn = this.menu.querySelector('.delete-btn')
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => this.handleDelete())
      document.addEventListener('keydown', (event) => {
        if (event.key == 'Delete' || event.key == 'Backspace') {
          this.handleDelete()
        }
      })
    }
  }

  //_____________________________________________________________________________________________________________showMenu
  /**
   * Remove hidden class of menu when called
   */
  showMenu() {
    // Position menu near the selected element
    // this.menu.style.left = `25px`
    // this.menu.style.top = `${element.style.top}px`
    this.menu.classList.remove('hidden')
  }

  //_____________________________________________________________________________________________________________hideMenu
  /**
   * Add the hidden class to menu when called
   * @param {Object} point
   */
  hideMenu() {
    this.menu.classList.add('hidden')
  }

  //_____________________________________________________________________________________________________________handleDelete
  /**
   * Delete element from Database and from DOM
   * @throws {Error} error on deletion
   */
  async handleDelete() {
    // If no element selected, do nothing
    if (!this.selectedElement) {
      return
    }

    let response

    try {
      // Check if selected element is a fence
      const isFence = this.selectedElement.classList.contains('fence')

      // Act differently if a fence or an element is selected

      if (isFence) {
        // If it's a fence, call api/fences/:id and delete
        const fenceId = this.selectedElement.dataset.fenceId
        response = await fetch(`/api/fences/${fenceId}`, {
          method: 'DELETE',
          headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
          },
        })
      } else {
        // If it's an element, call api/elements/:id and delete
        const elementId = this.selectedElement.dataset.elementId
        response = await fetch(`/api/elements/${elementId}`, {
          method: 'DELETE',
          headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
          },
        })
      }

      // Return error if necessary
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Delete failed:', errorData)
        return
      }

      // Get response data
      const data = await response.json()

      // Update objectives display
      if (data.objectives) {
        this.planEditor.commonFunctionsService.updateObjectivesDisplay(data.objectives)
      }

      // Handle plan state change if fence was deleted
      if (isFence && data.planState) {
        // Notify PlanEditor of state change
        if (this.planEditor && typeof this.planEditor.updatePlanState === 'function') {
          this.planEditor.updatePlanState(data.planState)
        }

        // If state changed to 'broken', show a notification
        if (data.planState === 'broken') {
          const breakMessage = document.createElement('div')
          breakMessage.className = 'enclosure-break-toast warning'
          breakMessage.textContent =
            'Enclosure is now broken! Elements will be inactive until enclosure is complete.'
          document.body.appendChild(breakMessage)
          setTimeout(() => breakMessage.remove(), 5000)

          // Add visual indication to all elements that they're inactive
          document.querySelectorAll('.element:not(.fence)').forEach((element) => {
            element.classList.add('inactive-element')
          })
        }

        // Send out event for fence deletion
        const event = new CustomEvent('fenceDeleted', {
          detail: {
            fenceId: this.selectedElement.dataset.fenceId,
            planState: data.planState,
          },
        })
        this.canvas.dispatchEvent(event)
      }

      // Remove element from DOM
      this.selectedElement.remove()

      // Update placedElements array for non-fence elements
      if (!isFence && this.selectedElement.dataset.elementId) {
        const elementId = this.selectedElement.dataset.elementId
        this.planEditor.placedElements = this.planEditor.placedElements.filter(
          (el) => el.id !== parseInt(elementId)
        )
      }

      // Hide menu and reset selection
      this.hideMenu()
      this.selectedElement = null
    } catch (error) {
      console.error('Error during delete:', error)
    }
  }
}
