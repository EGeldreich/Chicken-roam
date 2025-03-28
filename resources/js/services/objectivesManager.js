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
      // 'tree': 'shrubs', // Trees contribute to shrubs and perch, need exception
      fence: 'area',
      door: 'area', // Fence and door both contribute to area
    }

    // Mapping inversé (objectif -> outil)
    this.objectiveToToolMap = {}
    for (const [tool, objective] of Object.entries(this.toolToObjectiveMap)) {
      if (!this.objectiveToToolMap[objective]) {
        this.objectiveToToolMap[objective] = []
      }
      this.objectiveToToolMap[objective].push(tool)
    }

    // DOM elements
    this.currentObjectiveContent = document.getElementById('current-objective-content')
    this.currentObjectiveName = document.getElementById('current-objective-name')
    this.currentObjectiveTarget = document.getElementById('current-objective-target')
    this.currentObjectiveCompletion = document.getElementById('current-objective-completion')

    this.seeMoreBtn = document.getElementById('see-more-btn')
    this.seeMoreText = document.getElementById('see-more-text')
    this.seeLessText = document.getElementById('see-less-text')
    this.allObjectives = document.getElementById('all-objectives')

    // Initialisation
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
   * Update current objectives depending on current tool
   * @param {string} tool - Current tool
   */
  updateCurrentObjective(tool) {
    // Get objective linked to tool
    const objectiveName = this.toolToObjectiveMap[tool]

    if (objectiveName) {
      // Display objective
      this.currentObjectiveContent.classList.remove('hidden')

      // Find current objective from all objectives list
      const objectiveItem = document.querySelector(
        `.objective-item[data-objective-name="${objectiveName}"]`
      )

      if (objectiveItem) {
        // Update current objective value from data of objectives list
        this.currentObjectiveName.textContent = objectiveName
        this.currentObjectiveTarget.textContent =
          objectiveItem.querySelector('.objective-target').textContent
        this.currentObjectiveCompletion.textContent =
          objectiveItem.querySelector('.objective-completion').textContent
      }
    } else {
      // No objective linked to this tool
      this.currentObjectiveContent.classList.add('hidden')
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
    }

    // Update in current objective if necessary
    if (this.currentObjectiveName.textContent === objectiveName) {
      this.currentObjectiveCompletion.textContent = completion
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
    })

    // Update current objective
    this.updateCurrentObjective(this.planEditor.currentTool)
  }
}
