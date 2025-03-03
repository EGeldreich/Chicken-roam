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
    this.mouseDownTime = null // Used to start dragging only after a certain time
    this.dragDelay = 100 // Delay before dragging in ms

    // Selected element menu
    this.menu = document.getElementById('elementMenu')
    this.initializeMenu()
  }

  /**
   * Change isUsing state
   */
  startUsing() {
    this.isUsing = true
  }

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

    // Get delete btn, needed to create exception
    const deleteBtn = this.menu.querySelector('.delete-btn')

    // Get targeted element from event target
    const targetElement = event.target

    // If the targeted element is an element or a fence
    if (targetElement && targetElement.classList.contains('selectable')) {
      // Set selected element
      this.selectedElement = targetElement
      // Add styling class
      this.selectedElement.classList.add('selected')
      // Store time
      this.mouseDownTime = Date.now()

      if (!this.selectedElement.classList.contains('movable-point')) {
        // Do not display menu for movable points
        this.showMenu(this.selectedElement)
      }
    } else if (targetElement !== deleteBtn) {
      // Deselect and hide menu if click on nothing
      this.hideMenu()
      this.selectedElement = null
    }
  }

  /**
   * Handle movement of selected element
   * @param {Object} point {x, y} coordinates of mouseEvent
   */
  handleMouseMove(point) {
    // Check if in canvas, correct tool, and an element is selected
    if (point.x > 0 && point.y > 0 && this.isUsing && this.selectedElement) {
      //
      // Fences cannot be moved
      if (this.selectedElement.classList.contains('fence')) {
        return
      }

      // Check drag delay
      if (!this.isDragging && this.mouseDownTime) {
        const elapsedTime = Date.now() - this.mouseDownTime

        // Get out if it's to soon to start moving
        if (elapsedTime < this.dragDelay) {
          return
        }

        // If here, delay is long enough

        // Add styling class to element
        this.selectedElement.classList.add('moving')
        // change is dragging state
        this.isDragging = true
      }

      // Set correct dragged element
      // and if it's an element, remove it from placedElement array to avoid collision with itself
      if (!this.selectedElement.classList.contains('movable-point')) {
        // Get selected element dataset id
        const elementId = parseInt(this.selectedElement.dataset.elementId)
        // Find that same element in placedElements array
        this.elementIndex = this.planEditor.placedElements.findIndex((el) => el.id === elementId)
        // Remove element and store it as dragged element
        if (this.elementIndex !== -1) {
          this.draggedElement = this.planEditor.placedElements.splice(this.elementIndex, 1)[0]
        }
      } else {
        // dragged element is a fence intersection
        this.draggedElement = this.selectedElement
      }

      if (this.isDragging) {
        // BASIC ELEMENTS
        if (!this.selectedElement.classList.contains('movable-point')) {
          // Get relevant data
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
          // FENCE INTERSECTIONS
        } else {
          if (!this.isDragging) {
            this.isDragging = true
            this.draggedElement = this.selectedElement
          }
          // Get vertex id
          const vertexId = parseInt(this.selectedElement.dataset.vertexId)

          // Update position of fences
          this.updateSelectedVertexPosition(vertexId, point)

          // Visual indicators
          const connectedFences = Array.from(this.canvas.querySelectorAll('.fence')).filter(
            (fence) => {
              // Find fence's vertices
              const vertexStartId = parseInt(fence.dataset.vertexStartId)
              const vertexEndId = parseInt(fence.dataset.vertexEndId)

              // Check for correspondance with selected vertex
              return vertexStartId === vertexId || vertexEndId === vertexId
            }
          )

          this.planEditor.commonFunctionsService.checkVertexPlacement(connectedFences)
        }
      }
    }
  }

  /**
   * Update position of selected element to follow mouse cursor
   * @param {Object} placementPoint {x, y} coordinates of mouseEvent taking width and height into account
   */
  updateSelectedElementPosition(placementPoint) {
    if (!this.selectedElement) return

    this.selectedElement.style.left = `${placementPoint.x}px`
    this.selectedElement.style.top = `${placementPoint.y}px`
  }

  /**
   * Move selected vertex and linked fences
   * @param {Number} vertexId Id of moved vertex
   * @param {Object} point {x, y} coordinates of mouseEvent
   */
  updateSelectedVertexPosition(vertexId, point) {
    if (!this.selectedElement) return
    // Move point itself
    this.selectedElement.style.left = `${point.x}px`
    this.selectedElement.style.top = `${point.y}px`

    // Find all linked fences
    const connectedFences = Array.from(this.canvas.querySelectorAll('.fence')).filter((fence) => {
      // Find fence's vertices
      const vertexStartId = parseInt(fence.dataset.vertexStartId)
      const vertexEndId = parseInt(fence.dataset.vertexEndId)

      // Check for correspondance with selected vertex
      return vertexStartId === vertexId || vertexEndId === vertexId
    })

    // Save original positions for eventual reset
    const originalPositions = {}
    // Vertex
    const vertexElement = document.querySelector(`[data-vertex-id="${vertexId}"]`)
    if (vertexElement) {
      originalPositions.vertex = {
        left: vertexElement.style.left,
        top: vertexElement.style.top,
      }
    }
    // Fences
    connectedFences.forEach((fence, index) => {
      originalPositions[index] = {
        left: fence.style.left,
        top: fence.style.top,
        width: fence.style.width,
        transform: fence.style.transform,
      }
    })

    // For both linked fence
    connectedFences.forEach((fence) => {
      // Check if the vertex is the starting point of the fence
      const isStartVertex = parseInt(fence.dataset.vertexStartId) === vertexId

      if (isStartVertex) {
        // If it is the start vertex, we need to
        // 1. Get end point coordinates
        // 2. Update starting point
        // 3. Constantly update length and angle

        // 1. Get end point coordinates
        // Get relevant data from current style
        const currentAngle = parseFloat(
          fence.style.transform.replace('rotate(', '').replace('deg)', '')
        )
        const currentLength = parseFloat(fence.style.width)
        const currentStartX = parseFloat(fence.style.left)
        const currentStartY = parseFloat(fence.style.top)

        // Calculate end point
        const angleRad = currentAngle * (Math.PI / 180)
        const endX = currentStartX + Math.cos(angleRad) * currentLength
        const endY = currentStartY + Math.sin(angleRad) * currentLength

        // Update starting point
        fence.style.left = `${point.x}px`
        fence.style.top = `${point.y}px`

        // Recalculate length and angle
        const deltaX = endX - point.x
        const deltaY = endY - point.y
        const newLength = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
        const newAngle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)

        // Constantly update length and angle
        fence.style.width = `${newLength}px`
        fence.style.transform = `rotate(${newAngle}deg)`
        //
      } else {
        // If it's not the starting point, it is the end, just need to calculate new length and angle
        const startX = parseFloat(fence.style.left)
        const startY = parseFloat(fence.style.top)

        // Calculate new length
        const deltaX = point.x - startX
        const deltaY = point.y - startY
        const newLength = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

        // Calculate new angle
        const newAngle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)

        // Update with new datas
        fence.style.width = `${newLength}px`
        fence.style.transform = `rotate(${newAngle}deg)`
      }
    })
  }

  /**
   * Handle new placement of element
   * @param {Object} point {x, y} coordinates of mouseEvent
   * @throws {Error} if update failed
   */
  handleMouseUp(point) {
    // Reset drag delay
    this.mouseDownTime = null
    // If not currently dragging, get out
    if (!this.isDragging === true || !this.selectedElement) return

    // ELEMENTS ONLY
    if (!this.selectedElement.classList.contains('movable-point')) {
      // Get width and height of selected element
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
        // If there a is an error message, placement is not ok, show error
        this.planEditor.commonFunctionsService.showPlacementError(
          placementErrorMessage,
          this.selectedElement
        )
        // and reset placement
        this.resetElementPlacement(this.selectedElement)
        return
      }
      // ___________FENCE INTERSECTION
    } else {
      const vertexId = parseInt(this.selectedElement.dataset.vertexId)

      // Find all linked fences
      const connectedFences = Array.from(this.canvas.querySelectorAll('.fence')).filter((fence) => {
        // Find fence's vertices
        const vertexStartId = parseInt(fence.dataset.vertexStartId)
        const vertexEndId = parseInt(fence.dataset.vertexEndId)

        // Check for correspondance with selected vertex
        return vertexStartId === vertexId || vertexEndId === vertexId
      })

      // Save original positions for eventual reset
      const originalPositions = {}
      // Vertex
      const vertexElement = document.querySelector(`[data-vertex-id="${vertexId}"]`)
      if (vertexElement) {
        originalPositions.vertex = {
          left: vertexElement.style.left,
          top: vertexElement.style.top,
        }
      }
      // Fences
      connectedFences.forEach((fence, index) => {
        originalPositions[index] = {
          left: fence.style.left,
          top: fence.style.top,
          width: fence.style.width,
          transform: fence.style.transform,
        }
      })

      // Check placement
      const displacementErrorMsg =
        this.planEditor.commonFunctionsService.checkVertexPlacement(connectedFences)

      if (displacementErrorMsg) {
        // Display error message
        this.planEditor.commonFunctionsService.showPlacementError(
          displacementErrorMsg,
          this.selectedElement
        )

        // Reset placement
        // Of vertex
        if (vertexElement) {
          vertexElement.style.left = originalPositions.vertex.left
          vertexElement.style.top = originalPositions.vertex.top
        }
        // And fences
        connectedFences.forEach((fence, index) => {
          fence.style.left = originalPositions[index].left
          fence.style.top = originalPositions[index].top
          fence.style.width = originalPositions[index].width
          fence.style.transform = originalPositions[index].transform
        })

        // Reset states
        this.isDragging = false
        this.draggedElement = null
        this.elementIndex = null
        this.selectedElement = null
        this.hideMenu()
        return
      }

      // If here, everything was validated
      // Update in DB
      this.updateVertexPositionInBack(vertexId, point.x, point.y)

      this.planEditor.commonFunctionsService.calculateEnclosedArea()
      // Handle Front-end change
      this.selectedElement.classList.remove('moving', 'selected')

      // Reset states
      this.isDragging = false
      this.draggedElement = null
      this.elementIndex = null
      this.selectedElement = null
      this.hideMenu()
    }
  }

  /**
   * Patch the element position in DB
   * @param {Number} elementId id of the element to update
   * @param {Number} x new coordinate on x axis
   * @param {Number} y new coordinate on y axis
   */
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

  /**
   * Patch the vertex position in DB
   * @param {Number} vertexId id of the vertex to update
   * @param {Number} x new coordinate on x axis
   * @param {Number} y new coordinate on y axis
   */
  async updateVertexPositionInBack(vertexId, x, y) {
    try {
      const response = await fetch(`/api/vertices/${vertexId}/position`, {
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
      if (response.ok) {
        this.planEditor.fenceDrawer.handleEnclosureComplete()
      } else {
        console.error('Failed to update vertex position:', await response.json())
      }
    } catch (error) {
      console.error('Error updating vertex position:', error)
    }
  }

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

  /**
   * Remove hidden class of menu when called
   */
  showMenu() {
    // Position menu near the selected element
    // this.menu.style.left = `25px`
    // this.menu.style.top = `${element.style.top}px`
    this.menu.classList.remove('hidden')
  }

  /**
   * Add the hidden class to menu when called
   * @param {Object} point
   */
  hideMenu() {
    this.menu.classList.add('hidden')
  }

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
