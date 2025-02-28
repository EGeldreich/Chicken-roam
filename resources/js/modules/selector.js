export default class Selector {
  constructor(canvas, planId, planEditor) {
    this.canvas = canvas // Get canvas element (from planEditor)
    this.planId = planId // Get planId (from planEditor)
    this.planEditor = planEditor // Reference to planEditor

    // Default state
    this.isUsing = true
    this.selectedElement = null

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
    console.log('Selector ' + this.planEditor.placedElements)
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
      console.log(this.selectedElement)
      this.showMenu(this.selectedElement)
    } else if (targetElement !== deleteBtn) {
      this.hideMenu()
      this.selectedElement = null
    }
  }

  //_____________________________________________________________________________________________________________initializeMenu
  /**
   * Initialize event listener of delete menu
   */
  initializeMenu() {
    // Handle delete button click
    const deleteBtn = this.menu.querySelector('.delete-btn')
    if (deleteBtn) {
      deleteBtn.addEventListener('click', this.handleDelete.bind(this))
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
        this.planEditor.enclosureService.updateObjectivesDisplay(data.objectives)
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
      console.log('placedElements before delete ' + this.planEditor.placedElements)

      // Update placedElements array for non-fence elements
      if (!isFence && this.selectedElement.dataset.elementId) {
        const elementId = this.selectedElement.dataset.elementId
        this.planEditor.placedElements = this.planEditor.placedElements.filter(
          (el) => el.id !== parseInt(elementId)
        )
        console.log('placedElements after delete ' + this.planEditor.placedElements)
      }

      // Hide menu and reset selection
      this.hideMenu()
      this.selectedElement = null
    } catch (error) {
      console.error('Error during delete:', error)
    }
  }
}
