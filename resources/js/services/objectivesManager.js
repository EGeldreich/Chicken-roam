/**
 * Handle objectives display
 */
export default class ObjectivesManager {
  constructor(planEditor) {
    this.planEditor = planEditor

    // Map to link tools and objectives
    this.toolToObjectiveMap = {
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

    // DOM elements
    this.currentObjective = document.getElementById('current-objective')
    this.currentObjectiveContent = document.getElementById('current-objective-content')
    this.currentObjectiveName = document.getElementById('current-objective-name')
    this.currentObjectiveTarget = document.getElementById('current-objective-target')
    this.currentObjectiveUnit = document.getElementById('current-objective-unit')
    this.currentObjectiveCompletion = document.getElementById('current-objective-completion')

    this.seeMoreBtn = document.getElementById('see-more-btn')
    this.seeMoreText = document.getElementById('see-more-text')
    this.seeLessText = document.getElementById('see-less-text')
    this.allObjectives = document.getElementById('all-objectives')

    this.completeBar = document.getElementById('complete-bar')
    this.completeText = document.getElementById('complete-text')

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
    this.seeMoreBtn.addEventListener('click', () => {
      this.toggleAllObjectives()
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
   * Initialize tooltip functionality
   */
  setupTooltip() {
    // Security, DOM elements needed
    if (!this.infoIcon || !this.objectiveTooltip) return

    // Define hover timeout
    let hoverTimeout
    // Define delay before showing tooltip
    const HOVER_DELAY = 500

    // Show tooltip after delay on hover
    this.infoIcon.addEventListener('mouseenter', () => {
      clearTimeout(hoverTimeout)
      hoverTimeout = setTimeout(() => {
        this.objectiveTooltip.classList.add('tooltip-show')
      }, HOVER_DELAY)
    })

    // Show on focus (for accessibility)
    this.infoIcon.addEventListener('focus', () => {
      clearTimeout(hoverTimeout)
      hoverTimeout = setTimeout(() => {
        this.objectiveTooltip.classList.add('tooltip-show')
      }, HOVER_DELAY)
    })

    // Hide tooltip when mouse leaves
    this.infoIcon.addEventListener('mouseleave', () => {
      clearTimeout(hoverTimeout)
      this.objectiveTooltip.classList.remove('tooltip-show')
    })

    // Hide tooltip when focus is lost
    this.infoIcon.addEventListener('blur', () => {
      clearTimeout(hoverTimeout)
      this.objectiveTooltip.classList.remove('tooltip-show')
    })
  }

  /**
   * Update current objectives depending on current tool
   * @param {string} tool - Current tool
   */
  updateCurrentObjective(tool) {
    // Get objective linked to tool
    const objectiveName = this.toolToObjectiveMap[tool]

    if (objectiveName) {
      // Display objective
      this.currentObjective.classList.remove('hidden')

      // Find current objective from all objectives list
      const objectiveItem = document.querySelector(
        `.objective-item[data-objective-name="${objectiveName}"]`
      )

      if (objectiveItem) {
        // Update current objective value from data of objectives list
        this.currentObjectiveName.textContent = objectiveName
        this.currentObjectiveTarget.textContent =
          objectiveItem.querySelector('.objective-target').textContent
        this.currentObjectiveUnit.textContent =
          objectiveItem.querySelector('.objective-unit').textContent

        // Get completion percentage
        const completionValue = objectiveItem.querySelector('.objective-completion').textContent
        this.currentObjectiveCompletion.textContent = completionValue

        // Update progress bar width
        const progressBar = document.getElementById('current-objective-progress-bar')
        if (progressBar) {
          progressBar.style.width = `${completionValue}%`

          // Set color class based on completion value
          this.updateProgressBarColor(progressBar, parseInt(completionValue, 10))
        }
      }

      if (objectiveName && this.objectiveDescription) {
        // Update tooltip description based on the current objective
        this.objectiveDescription.textContent =
          this.objectiveDescriptions[objectiveName] ||
          `Information about the ${objectiveName} objective.`
      }
    } else {
      // No objective linked to this tool
      this.currentObjective.classList.add('hidden')
    }
  }

  /**
   * Show / hide all objectives
   */
  toggleAllObjectives() {
    const isVisible = !this.allObjectives.classList.contains('hidden')

    if (isVisible) {
      // Hide all objectives
      this.allObjectives.classList.add('hidden')
      this.seeMoreText.classList.remove('hidden')
      this.seeLessText.classList.add('hidden')
    } else {
      // Show all objectives
      this.allObjectives.classList.remove('hidden')
      this.seeMoreText.classList.add('hidden')
      this.seeLessText.classList.remove('hidden')
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
      const progressBar = document.querySelector(
        `.objective-progress-bar[data-objective-name="${objectiveName}"]`
      )
      if (progressBar) {
        progressBar.style.width = `${completion}%`

        // Update color based on completion value
        this.updateProgressBarColor(progressBar, completion)

        // Add pulse animation for visual feedback
        progressBar.classList.remove('pulse-update')
        // Trigger reflow to restart animation
        void progressBar.offsetWidth
        progressBar.classList.add('pulse-update')
      }
    }

    // Update in current objective if necessary
    if (this.currentObjectiveName.textContent === objectiveName) {
      this.currentObjectiveCompletion.textContent = completion

      // Update current objective progress bar
      const currentProgressBar = document.getElementById('current-objective-progress-bar')
      if (currentProgressBar) {
        currentProgressBar.style.width = `${completion}%`

        // Update color based on completion value
        this.updateProgressBarColor(currentProgressBar, completion)

        // Add pulse animation
        currentProgressBar.classList.remove('pulse-update')
        void currentProgressBar.offsetWidth
        currentProgressBar.classList.add('pulse-update')
      }
    }

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

    // Update current objective
    this.updateCurrentObjective(this.planEditor.currentTool)
  }

  /**
   * Calculate and update total completion percentage
   * Updates both progress bar width and completion text
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

    // Update progress bar width
    if (this.completeBar) {
      this.completeBar.style.width = `${roundedCompletion}%`
    }

    // Update percentage text
    if (this.completeText) {
      this.completeText.textContent = roundedCompletion
    }
  }

  /**
   * Change progress bar color acording to completion
   * @param {HTMLElement} progressBar progress bar DOM element
   * @param {Number} completion completion percentage
   */
  updateProgressBarColor(progressBar, completion) {
    // Remove all existing color classes
    progressBar.classList.remove(
      'bg-blue-600',
      'bg-green-500',
      'bg-yellow-500',
      'bg-orange-500',
      'bg-red-500'
    )

    // Add appropriate color class based on percentage
    if (completion === 100) {
      progressBar.classList.add('bg-green-500') // Green for 100%
    } else if (completion >= 70) {
      progressBar.classList.add('bg-blue-600') // Blue for 70-99%
    } else if (completion >= 50) {
      progressBar.classList.add('bg-blue-400') // Light blue for 50-69%
    } else if (completion >= 30) {
      progressBar.classList.add('bg-yellow-500') // Yellow for 30-49%
    } else if (completion >= 10) {
      progressBar.classList.add('bg-orange-500') // Orange for 10-29%
    } else {
      progressBar.classList.add('bg-red-500') // Red for 0-9%
    }
  }
}
