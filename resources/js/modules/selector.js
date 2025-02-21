export default class Selector {
  constructor(canvas, planId, placedElementsRef) {
    this.canvas = canvas // Get canvas element (from planEditor)
    this.planId = planId // Get planId (from planEditor)
    this.placedElements = placedElementsRef // Get elements coordinates from planEditor

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
    console.log('hidding menu')
    this.menu.classList.add('hidden')
  }
  //
  //
  //   Delete element from database and DOM
  async handleDelete() {
    if (!this.selectedElement) {
      console.log('No element selected')
      return
    }
    console.log('trying to delete')
    let response
    try {
      if (this.selectedElement.classList.contains('fence')) {
        const fenceId = this.selectedElement.dataset.fenceId
        console.log('Deleting fence with ID:', fenceId)
        response = await fetch(`/api/fences/${fenceId}`, {
          method: 'DELETE',
          headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
          },
        })
      } else {
        const elementId = this.selectedElement.dataset.elementId
        console.log('Deleting element with ID:', elementId)
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
      if (data.objectives) {
        this.updateObjectivesDisplay(data.objectives)
      }
      // Remove from DOM
      this.selectedElement.remove()
      // Remove from placedElements array
      const elementId = this.selectedElement.dataset.elementId
      this.placedElements = this.placedElements.filter((el) => el.id !== parseInt(elementId))
      // Hide menu
      this.hideMenu()
      // Clear selection
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
        objectiveEl.textContent = objective.completion_percentage
      }
    })
  }
}
