/**
 * Handle objectives display
 */
export default class ObjectivesManager {
  constructor(planEditor) {
    this.planEditor = planEditor

    // Map to link tools and objectives
    this.toolToObjectiveMap = {
      select: 'area',
      point: 'area',
      shelter: 'shelter',
      waterer: 'waterer',
      perch: 'perch',
      shrub: 'shrubs',
      insectary: 'insectary',
      dustbath: 'dustbath',
      tree: 'shrubs', // Trees contribute to shrubs and perch, need exception
      fence: 'area',
      door: 'area', // Fence and door both contribute to area
    }

    // Same map but inversed
    this.objectiveToToolMap = {}
    for (const [tool, objective] of Object.entries(this.toolToObjectiveMap)) {
      if (!this.objectiveToToolMap[objective]) {
        this.objectiveToToolMap[objective] = []
      }
      this.objectiveToToolMap[objective].push(tool)
    }

    this.seeAllBtn = document.getElementById('see-all-btn')
    this.seeMoreBtn = document.querySelectorAll('.see-more-btn')
    this.allObjectives = document.getElementById('all-objectives')
    this.moreObjectives = document.getElementById('more-objectives')

    this.completeBar = document.getElementById('main-progress-bar')
    this.completeText = document.getElementById('complete-text')
    this.completionComment = document.getElementById('completion-comment')
    this.successIcon = document.getElementById('completion-success-icon')

    this.isComplete = false

    this.infoIcon = document.querySelector('.info-icon')
    this.objectiveTooltip = document.getElementById('objective-tooltip')
    this.objectiveDescription = document.getElementById('objective-description')

    // Store objective descriptions
    this.objectiveDescriptions = {
      shelter:
        'A shelter provides protection from predators and weather for the chickens. It should be well-ventilated and easy to clean.',
      waterer:
        'Fresh water is essential for chicken health. Waterers should be cleaned regularly and positioned to prevent contamination.',
      perch:
        'Chickens naturally want to roost off the ground. Perches give them a comfortable place to rest.',
      shrubs: 'Shrubs provide shade, protection, and natural foraging opportunities for chickens.',
      insectary:
        'Insectaries attract beneficial insects that chickens can eat, supporting natural feeding behaviors.',
      dustbath:
        'Dust bathing is essential for chickens to maintain feather health and prevent parasites.',
      area: 'The enclosed area provides space for movement and exercise. Larger areas allow for more natural behaviors.',
    }

    // Store current state of objectives
    this.objectives = []

    // Initialisation
    this.setupTooltip()
    this.initializeObjectives()
    this.initializeCurrentValues()
    this.initializeEventListeners()
    this.updateCurrentObjective(this.planEditor.currentTool)
  }

  /**
   * Initialise All event listeners
   */
  initializeEventListeners() {
    // Listen for tool change
    document.querySelectorAll('.tool-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        // Small setTimeout to give time to the planEditor, get new current tool from planEditor
        setTimeout(() => {
          this.updateCurrentObjective(this.planEditor.currentTool)
        }, 50)
      })
    })

    // See more btn event listener
    this.seeAllBtn.addEventListener('click', () => {
      this.toggleObjectives()
    })
  }

  /**
   * Fills this.objectives array {name: ... , completion: ...}
   * Calls function to update total completion
   */
  initializeObjectives() {
    // For each objective DOM element
    document.querySelectorAll('.objective-item').forEach((item) => {
      // Find name and completion
      const name = item.dataset.objectiveName
      const completionElement = item.querySelector('.objective-completion')
      const completion = completionElement ? parseInt(completionElement.textContent, 10) : 0

      // Push into this.objectives
      this.objectives.push({
        name: name,
        completion: completion,
      })
    })

    // Calculate and update total completion for initial display
    this.updateTotalCompletion()
  }

  /**
   * Initialize current values for all objectives
   * based on completion percentage
   */
  initializeCurrentValues() {
    // Select all objective items
    const objectiveItems = document.querySelectorAll('#more-objectives .objective-item')

    objectiveItems.forEach((item) => {
      // Find relevant elements
      const completionElement = item.querySelector('.objective-completion')
      const targetElement = item.querySelector('.objective-target')
      const currentValueElement = item.querySelector('.current-value')

      if (completionElement && targetElement && currentValueElement) {
        // Get values
        const completionPercentage = parseFloat(completionElement.textContent)
        const targetValue = parseFloat(targetElement.textContent)
        const completionCrown = item.querySelector('.completion-crown')

        // Calculate and round
        const currentValue = Math.round((completionPercentage * targetValue) / 100)

        // Update display
        currentValueElement.textContent = currentValue

        // Check if this objective is complete
        if (completionCrown && completionPercentage >= 100) {
          // Show crown
          completionCrown.classList.remove('hidden')
        }
      }
    })
  }

  /**
   * Initialize tooltip functionality
   */
  setupTooltip() {
    // Security, DOM elements needed
    if (!this.objectiveTooltip) return

    // Define hover timeout (so it can be cleared)
    let hoverTimeout
    // Define delay before showing the tooltip
    const HOVER_DELAY = 500

    // Helper function to add event listeners to a container
    const addTooltipListeners = (containerId) => {
      const container = document.getElementById(containerId)
      if (!container) return

      // Add mouseover event listener with delegation (to avoid problem with template cloning)
      container.addEventListener(
        'mouseover',
        (e) => {
          // Check if the mouse is over the info-icon or any of its children
          const infoIcon = e.target.closest('.info-icon')
          if (infoIcon) {
            clearTimeout(hoverTimeout)
            hoverTimeout = setTimeout(() => {
              this.positionTooltip(infoIcon)
              this.objectiveTooltip.classList.add('tooltip-show')
            }, HOVER_DELAY)
          }
        },
        true
      )

      // Handle mouseout with event delegation
      container.addEventListener(
        'mouseout',
        (e) => {
          const fromElement = e.target
          const toElement = e.relatedTarget

          // Check if we're leaving the info-icon area completely
          if (fromElement.closest('.info-icon') && !toElement?.closest('.info-icon')) {
            clearTimeout(hoverTimeout)
            this.objectiveTooltip.classList.remove('tooltip-show')
          }
        },
        true
      )

      // Additional handler for focus events (accessibility)
      container.addEventListener(
        'focus',
        (e) => {
          const infoIcon = e.target.closest('.info-icon')
          if (infoIcon) {
            clearTimeout(hoverTimeout)
            hoverTimeout = setTimeout(() => {
              this.positionTooltip(infoIcon)
              this.objectiveTooltip.classList.add('tooltip-show')
            }, HOVER_DELAY)
          }
        },
        true
      )

      // Remove tooltip on blur
      container.addEventListener(
        'blur',
        (e) => {
          const infoIcon = e.target.closest('.info-icon')
          if (infoIcon) {
            clearTimeout(hoverTimeout)
            this.objectiveTooltip.classList.remove('tooltip-show')
          }
        },
        true
      )
    }

    // Add listeners to both containers
    addTooltipListeners('current-objectives-container')
    addTooltipListeners('more-objectives')
  }

  /**
   * Position the tooltip relative to an info icon
   * @param {HTMLElement} infoIcon - The info icon element
   */
  positionTooltip(infoIcon) {
    // Get the objective name from the parent element
    const objectiveItem = infoIcon.closest('.objective-item')
    const objectiveName = objectiveItem.querySelector('.objective-name').textContent.trim()

    // Update the tooltip content based on the objective
    if (objectiveName && this.objectiveDescription) {
      this.objectiveDescription.textContent =
        this.objectiveDescriptions[objectiveName] ||
        `Information about the ${objectiveName} objective.`
    }

    // Use the container and the objective coordinates to place the tooltip
    const objectiveItemRect = objectiveItem.getBoundingClientRect()
    const containerRect = this.objectiveTooltip.parentElement.getBoundingClientRect()

    this.objectiveTooltip.style.top = `${objectiveItemRect.top - containerRect.top}px`
  }

  /**
   * Get objectives linked to a tool
   * @param {string} tool - Current tool
   * @returns {Array} Array of objective names
   */
  getObjectivesForTool(tool) {
    if (tool === 'tree') {
      // A tree counts as a perch and a shrub combined
      return ['perch', 'shrubs']
    } else {
      // Get objective from corresponding map
      const objectiveName = this.toolToObjectiveMap[tool]
      return objectiveName ? [objectiveName] : []
    }
  }

  /**
   * Update current objectives depending on current tool
   * @param {string} tool - Current tool
   */
  updateCurrentObjective(tool) {
    // Get relevant elements
    const container = document.getElementById('current-objectives-container')
    const template = document.getElementById('objective-template')

    // Remove everything inside the container except the template
    const existingItems = container.querySelectorAll('.objective-item:not(#objective-template)')
    existingItems.forEach((item) => item.remove())

    // Get objective(s) linked to tool
    const objectiveNames = this.getObjectivesForTool(tool)

    // Security, if we found the objectives
    if (objectiveNames && objectiveNames.length > 0) {
      // For each one
      objectiveNames.forEach((objectiveName, index) => {
        // Find the wanted objective from the list of all objectives
        const objectiveItem = document.querySelector(
          `.objective-item[data-objective-name="${objectiveName}"]`
        )

        if (objectiveItem) {
          // Clone the template
          const clone = template.content.cloneNode(true)

          // Set data attribute (used for styling)
          const cloneItem = clone.querySelector('.objective-item')
          if (cloneItem) {
            cloneItem.dataset.objectiveName = objectiveName
            cloneItem.querySelector('.objective-progress-bar').dataset.objectiveName = objectiveName
          }

          // Set objective name
          clone.querySelector('.objective-name').textContent = objectiveName

          // Get completion values
          const completionValue = parseInt(
            objectiveItem.querySelector('.objective-completion').textContent,
            10
          )
          const targetValue = parseInt(
            objectiveItem.querySelector('.objective-target').textContent,
            10
          )

          // Calculate current value from percentage
          const currentValue = Math.round((completionValue * targetValue) / 100)

          // Set current value
          const currentValueElement = clone.querySelector('.current-value')
          if (currentValueElement) {
            currentValueElement.textContent = currentValue
          }

          // Update progress bar
          const progressBar = clone.querySelector('.objective-progress-bar')
          progressBar.style.width = `${completionValue}%`
          // Add data-objective-name attribute to the progress bar
          progressBar.dataset.objectiveName = objectiveName

          // Set target values
          clone.querySelector('.objective-target').textContent =
            objectiveItem.querySelector('.objective-target').textContent
          clone.querySelector('.objective-unit').textContent =
            objectiveItem.querySelector('.objective-unit').textContent

          // Hide the "See more" button if this is not the last objective
          const seeMoreBtn = clone.querySelector('.see-more-btn')
          if (index < objectiveNames.length - 1) {
            // This is not the last objective, hide the button
            seeMoreBtn.classList.add('hidden')
          }

          // Check if we need to show completion crown
          const completionCrown = clone.querySelector('.completion-crown')

          if (completionCrown && completionValue >= 100) {
            // Show crown
            completionCrown.classList.remove('hidden')
          }

          // Append the clone to the container
          container.appendChild(clone)
        }
      })

      // Update tooltip for the first objective
      if (this.objectiveDescription) {
        this.objectiveDescription.textContent =
          this.objectiveDescriptions[objectiveNames[0]] ||
          `Information about the ${objectiveNames[0]} objective.`
      }

      // Initialize event listeners on see less/more btn
      this.initializeTargetsToggles()
    }
  }

  /**
   * Initialize event listeners for the "See more/less targets" buttons
   */
  initializeTargetsToggles() {
    // Get all "See more" buttons in the current objectives container
    const seeMoreButtons = document.querySelectorAll('#current-objectives-container .see-more-btn')

    // Add click event listener to each button
    seeMoreButtons.forEach((button) => {
      // Remove any existing event listeners to prevent duplicates
      button.removeEventListener('click', this.handleSeeMoreClick)

      // Add new event listener
      button.addEventListener('click', () => {
        const seeMore = button.querySelector('.see-more-targets')
        const seeLess = button.querySelector('.see-less-targets')

        if (this.moreObjectives.classList.contains('hidden')) {
          // Show more objectives
          this.moreObjectives.classList.remove('hidden')
          seeMore.classList.add('hidden')
          seeLess.classList.remove('hidden')
        } else {
          // Hide more objectives
          this.moreObjectives.classList.add('hidden')
          seeMore.classList.remove('hidden')
          seeLess.classList.add('hidden')
        }
      })
    })
  }

  /**
   * Show / hide objectives
   */
  toggleObjectives() {
    const isVisible = !this.allObjectives.classList.contains('hidden')

    if (isVisible) {
      // Hide all objectives
      this.allObjectives.classList.add('hidden')
      // Rotate arrow
      this.seeAllBtn.classList.remove('expanded')
      // Update aria-label
      this.seeAllBtn.setAttribute('aria-label', 'Deploy objectives')
      // Update aria expanded
      this.seeAllBtn.setAttribute('aria-expanded', 'false')

      // Also hide more objectives if they're visible
      if (!this.moreObjectives.classList.contains('hidden')) {
        this.moreObjectives.classList.add('hidden')

        // Reset the "See more/less" buttons state
        const seeMoreButtons = document.querySelectorAll(
          '#current-objectives-container .see-more-btn'
        )
        seeMoreButtons.forEach((button) => {
          const seeMore = button.querySelector('.see-more-targets')
          const seeLess = button.querySelector('.see-less-targets')

          seeMore.classList.remove('hidden')
          seeLess.classList.add('hidden')
        })
      }
    } else {
      // Show all objectives
      this.allObjectives.classList.remove('hidden')
      // Rotate arrow
      this.seeAllBtn.classList.add('expanded')
      // Update aria-label
      this.seeAllBtn.setAttribute('aria-label', 'Hide objectives')
      // Update aria expanded
      this.seeAllBtn.setAttribute('aria-expanded', 'true')
    }
  }

  /**
   * Update completion percentage of an objective
   * @param {String} objectiveName Name of the objective to update
   * @param {Number} completion completion percentage
   */
  updateObjectiveCompletion(objectiveName, completion) {
    // Update in list
    const objectiveSpan = document.getElementById(objectiveName)
    if (objectiveSpan) {
      objectiveSpan.textContent = completion

      // Also update progress bar width in list
      const listProgressBar = document.querySelector(
        `#more-objectives .objective-progress-bar[data-objective-name="${objectiveName}"]`
      )
      if (listProgressBar) {
        listProgressBar.style.width = `${completion}%`
      }

      // Update current value in more-objectives container
      const moreObjectivesItem = document.querySelector(
        `#more-objectives .objective-item[data-objective-name="${objectiveName}"]`
      )
      if (moreObjectivesItem) {
        const targetElement = moreObjectivesItem.querySelector('.objective-target')
        const currentValueElement = moreObjectivesItem.querySelector('.current-value')

        if (targetElement && currentValueElement) {
          const targetValue = parseFloat(targetElement.textContent)
          const currentValue = Math.round((completion * targetValue) / 100)
          currentValueElement.textContent = currentValue
        }

        // Update completion crown visibility
        const completionCrown = moreObjectivesItem.querySelector('.completion-crown')

        if (completionCrown) {
          if (completion >= 100) {
            completionCrown.classList.remove('hidden')
          } else {
            completionCrown.classList.add('hidden')
          }
        }
      }
    }

    // Update in current objective if visible
    const currentObjectiveItems = document.querySelectorAll(
      `#current-objectives-container .objective-item[data-objective-name="${objectiveName}"]`
    )

    currentObjectiveItems.forEach((item) => {
      // Find the progress bar element inside the current objective item
      const progressBar = item.querySelector('.objective-progress-bar')

      if (progressBar) {
        // Update progress bar width
        setTimeout(() => {
          progressBar.style.width = `${completion}%`
        }, 10)
      }

      // Update current value
      const targetElement = item.querySelector('.objective-target')
      const currentValueElement = item.querySelector('.current-value')

      if (targetElement && currentValueElement) {
        const targetValue = parseFloat(targetElement.textContent)
        const currentValue = Math.round((completion * targetValue) / 100)
        currentValueElement.textContent = currentValue
      }

      // Update completion crown in current objectives
      const completionCrown = item.querySelector('.completion-crown')

      if (completionCrown) {
        if (completion >= 100) {
          // Show crown
          completionCrown.classList.remove('hidden')
        } else {
          // Hide crown
          completionCrown.classList.add('hidden')
        }
      }
    })

    // Update this.objectives array
    const index = this.objectives.findIndex((obj) => obj.name === objectiveName)
    if (index !== -1) {
      this.objectives[index].completion = completion

      // Recalculate total completion after objective update
      this.updateTotalCompletion()
    }
  }

  /**
   * Update all objectives simultaneously
   * @param {Array} objectives - Objectives array with objective name and completion percentage
   */
  updateAllObjectives(objectives) {
    //updateObjectiveCompletion for each objective
    objectives.forEach((objective) => {
      this.updateObjectiveCompletion(objective.name, objective.completion_percentage)

      // Also update this.objectives array
      const index = this.objectives.findIndex((obj) => obj.name === objective.name)
      if (index !== -1) {
        this.objectives[index].completion = objective.completion_percentage
      }
    })

    // Calculate and update total completion
    this.updateTotalCompletion()
  }

  /**
   * Calculate and update total completion percentage
   * Update both progress bar width and completion text
   * Show success icon at 100% completion
   */
  updateTotalCompletion() {
    // Skip if no objectives are available
    if (!this.objectives || this.objectives.length === 0) return

    // Calculate average completion percentage
    const totalCompletion =
      this.objectives.reduce((sum, objective) => {
        return sum + objective.completion
      }, 0) / this.objectives.length

    // Round to nearest integer
    const roundedCompletion = Math.round(totalCompletion)

    // Determine if the status changed from/to 100%
    const wasComplete = this.isComplete
    const isNowComplete = roundedCompletion === 100

    // Update the status
    this.isComplete = isNowComplete

    // Handle transition between progress bar and success icon
    if (isNowComplete !== wasComplete) {
      this.toggleCompletionDisplay(isNowComplete)
    }

    // Update circular progress bar only if not complete
    if (!isNowComplete) {
      if (this.completeBar) {
        this.completeBar.style.setProperty('--percentage', `${roundedCompletion}%`)
      }
    }

    // Update percentage text only if not complete
    if (this.completeText && !isNowComplete) {
      this.completeText.textContent = roundedCompletion
    }

    // Update completion comment based on percentage
    if (this.completionComment) {
      let commentText = ''

      if (roundedCompletion === 100) {
        commentText = 'Your hens live like royalty'
      } else if (roundedCompletion >= 66) {
        commentText = 'Almost worthy of the crown'
      } else if (roundedCompletion >= 33) {
        commentText = 'Not yet fit for the realm'
      } else {
        commentText = 'Nowhere near a royal coop'
      }

      this.completionComment.textContent = commentText
    }
  }

  /**
   * Toggle between progress bar and success icon
   * @param {Boolean} isComplete - Whether completion is 100%
   */
  toggleCompletionDisplay(isComplete) {
    if (!this.completeBar || !this.successIcon) return

    if (isComplete) {
      // Transition to success icon
      this.completeBar.classList.add('hidden')
      this.successIcon.classList.remove('hidden')
    } else {
      // Transition back to progress bar
      this.successIcon.classList.add('hidden')
      this.completeBar.classList.remove('hidden')
    }
  }
}
