export default class Selector {
  constructor(canvas, planId, placedElementsRef, planEditor) {
    this.canvas = canvas // Get canvas element (from planEditor)
    this.planId = planId // Get planId (from planEditor)
    this.placedElements = placedElementsRef // Get elements coordinates from planEditor
    this.planEditor = planEditor // Reference to planEditor

    // Default state
    this.isUsing = true
    this.selectedElement = null

    // Selected element menu
    this.menu = document.getElementById('elementMenu')
    this.initializeMenu()
  }
  //
  //
  // Start selection process
  startUsing() {
    this.isUsing = true
  }
  //
  //
  // Stop selection process
  stopUsing() {
    if (this.selectedElement) {
      this.selectedElement.classList.remove('selected')
    }
    this.hideMenu()
    this.isUsing = false
    this.selectedElement = null
  }
  //
  //
  // Use event.target to select clicked-on element or fence
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
  //
  //
  //
  initializeMenu() {
    // Handle delete button click
    const deleteBtn = this.menu.querySelector('.delete-btn')
    if (deleteBtn) {
      deleteBtn.addEventListener('click', this.handleDelete.bind(this))
    }
  }
  //
  //
  showMenu(element) {
    // Position menu near the selected element
    // this.menu.style.left = `25px`
    // this.menu.style.top = `${element.style.top}px`
    this.menu.classList.remove('hidden')
  }
  //
  //
  hideMenu() {
    this.menu.classList.add('hidden')
  }
  //
  //
  //   Delete element from database and DOM
  async handleDelete() {
    if (!this.selectedElement) {
      return
    }

    let response
    try {
      const isFence = this.selectedElement.classList.contains('fence')

      if (isFence) {
        const fenceId = this.selectedElement.dataset.fenceId
        response = await fetch(`/api/fences/${fenceId}`, {
          method: 'DELETE',
          headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
          },
        })
      } else {
        const elementId = this.selectedElement.dataset.elementId
        response = await fetch(`/api/elements/${elementId}`, {
          method: 'DELETE',
          headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
          },
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Delete failed:', errorData)
        return
      }

      const data = await response.json()

      // Update objectives display
      if (data.objectives) {
        this.updateObjectivesDisplay(data.objectives)
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
        console.log('sending fenceDeleted event')
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
        this.placedElements = this.placedElements.filter((el) => el.id !== parseInt(elementId))
      }

      // Hide menu and reset selection
      this.hideMenu()
      this.selectedElement = null
    } catch (error) {
      console.error('Error during delete:', error)
    }
  }
  //
  //
  // Update objective display via data from response
  updateObjectivesDisplay(objectives) {
    objectives.forEach((objective) => {
      // Finf the correct HTML element
      const objectiveEl = document.querySelector(`#${objective.name}`)
      if (objectiveEl) {
        console.log(objectiveEl)
        console.log(objective.completion_percentage)
        objectiveEl.textContent = objective.completion_percentage
      }
    })
  }
}
