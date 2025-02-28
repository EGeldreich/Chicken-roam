import FenceDrawer from './fenceDrawer.js'
import ShelterDrawer from './shelterDrawer.js'
import WatererDrawer from './watererDrawer.js'
import PerchDrawer from './perchDrawer.js'
import ShrubDrawer from './shrubDrawer.js'
import InsectaryDrawer from './insectaryDrawer.js'
import DustbathDrawer from './dustbathDrawer.js'
import Selector from './selector.js'
import CommonFunctionsService from '../services/commonFunctionsService.js'

export default class PlanEditor {
  constructor(planId) {
    this.planId = planId // Get plan ID
    this.currentTool = 'select' // Set select as default tool
    this.canvas = document.getElementById('planCanvas') // Get drawing area
    this.toolDisplay = document.getElementById('toolDisplay') // Get tool tooltip display HTML element
    this.EPSILON = 1 // Margin of error

    // Plan state property
    this.planState = 'construction' // Default state: construction, enclosed, broken
    this.isEnclosureComplete = false
    // Get initial plan state from the server
    this.fetchPlanState()

    // Single shared array for all elements to avoid overlapping
    this.placedElements = []

    // Initialize tool managers
    this.fenceDrawer = new FenceDrawer(this.canvas, this.planId, this)
    this.shelterDrawer = new ShelterDrawer(this.canvas, this.planId, this)
    this.watererDrawer = new WatererDrawer(this.canvas, this.planId, this)
    this.perchDrawer = new PerchDrawer(this.canvas, this.planId, this)
    this.shrubDrawer = new ShrubDrawer(this.canvas, this.planId, this)
    this.insectaryDrawer = new InsectaryDrawer(this.canvas, this.planId, this)
    this.dustbathDrawer = new DustbathDrawer(this.canvas, this.planId, this)
    this.selector = new Selector(this.canvas, this.planId, this)

    // Add CommonFunctionsService instance
    this.commonFunctionsService = new CommonFunctionsService(this.canvas, this, this.EPSILON)

    // Load all elements once
    this.loadAllElements()

    // Map tools for easier access
    this.toolHandlers = {
      fence: this.fenceDrawer,
      shelter: this.shelterDrawer,
      waterer: this.watererDrawer,
      perch: this.perchDrawer,
      shrub: this.shrubDrawer,
      insectary: this.insectaryDrawer,
      dustbath: this.dustbathDrawer,
      select: this.selector,
    }

    // Set up event listeners
    this.initializeTools()
    this.initializeCanvasEvents()

    // Listen for enclosure completion event
    this.canvas.addEventListener('enclosureComplete', (event) => {
      this.isEnclosureComplete = true
      this.updatePlanState('enclosed')
    })
  }

  //_____________________________________________________________________________________________________________fetchPlanState
  /**
   * Send a GET request to fetch the current state of plan
   * Calls updatePlanState with that state
   * @throws {Error} if request failed to fetch plan state
   */
  async fetchPlanState() {
    try {
      const response = await fetch(`/api/plans/${this.planId}/state`)
      if (response.ok) {
        const data = await response.json()
        this.updatePlanState(data.state)
        data.isEnclosed === 1 ? (this.isEnclosureComplete = true) : false

        // Add enclosure-complete class if enclosure is complete
        if (data.isEnclosed) {
          this.canvas.classList.add('enclosure-complete')
        }
      }
    } catch (error) {
      console.error('Failed to fetch plan state:', error)
    }
  }

  //_____________________________________________________________________________________________________________updatePlanState
  /**
   * Update plan UI according to new state
   * Mainly disable and reable element btns, show message, and change color
   * @param {String} newState - newState variable must contain 'construction', 'enclosed' or 'broken'
   */
  updatePlanState(newState) {
    // Update state property
    this.planState = newState

    // Add state class to canvas
    this.canvas.classList.remove('state-construction', 'state-enclosed', 'state-broken')
    this.canvas.classList.add(`state-${newState}`)

    // Update UI based on state
    const stateLabel = document.getElementById('planStateLabel')
    if (stateLabel) {
      const stateLabels = {
        construction: 'Under Construction',
        enclosed: 'Enclosure Complete',
        broken: 'Enclosure Broken',
      }
      stateLabel.textContent = stateLabels[newState] || 'Unknown State'
      stateLabel.className = `state-label state-${newState}`
    }

    // Update tool availability based on state
    if (newState === 'construction' || newState === 'broken') {
      // In construction or broken state, disable element tools
      document.querySelectorAll('.element-tool-btn').forEach((btn) => {
        btn.classList.add('disabled')
      })

      // If current tool is an element tool, switch to fence or select
      if (this.currentTool !== 'fence' && this.currentTool !== 'select') {
        this.setCurrentTool('fence')
      }

      // Show guidance message
      this.showGuidanceMessage(
        newState === 'construction'
          ? 'Complete the enclosure before placing elements'
          : 'Enclosure is broken! Fix it before placing more elements'
      )

      // If in broken state, add visual indication to elements
      if (newState === 'broken') {
        document.querySelectorAll('.element:not(.fence)').forEach((element) => {
          element.classList.add('inactive-element')
        })
      }
    } else if (newState === 'enclosed') {
      // In enclosed state, enable all tools
      document.querySelectorAll('.tool-btn').forEach((btn) => {
        btn.classList.remove('disabled')
      })

      // Remove inactive indication from elements
      document.querySelectorAll('.inactive-element').forEach((element) => {
        element.classList.remove('inactive-element')
      })

      // Show guidance message
      this.showGuidanceMessage('Enclosure complete! You can now place elements')
    }
  }

  //_____________________________________________________________________________________________________________showGuidanceMessage
  /**
   * Update the guidance message
   * Useful to help users
   * @param {String} message - string with guidance message that will be displayed
   */
  showGuidanceMessage(message) {
    const existingMessage = document.querySelector('.guidance-message')
    if (existingMessage) {
      existingMessage.textContent = message
      // Animate to draw attention
      existingMessage.classList.add('pulse')
      setTimeout(() => existingMessage.classList.remove('pulse'), 1000)
    } else {
      const messageEl = document.createElement('div')
      messageEl.className = 'guidance-message'
      messageEl.textContent = message
      this.canvas.parentNode.appendChild(messageEl)
    }
  }

  //_____________________________________________________________________________________________________________loadAllElements
  /**
   * Load all elements of the plan
   * GET request, response includes everything needed for element placement
   * @throws {Error} if request failed to fetch elements
   */
  async loadAllElements() {
    try {
      const response = await fetch(`/api/elements/${this.planId}`)
      if (response.ok) {
        const elements = await response.json()
        elements.forEach((element) => {
          // Add to the shared tracking array
          this.placedElements.push({
            id: element.id,
            type: element.type,
            x: parseFloat(element.vertex.positionX),
            y: parseFloat(element.vertex.positionY),
            width: parseFloat(element.width),
            height: parseFloat(element.height),
          })
        })

        // Have each drawer render its own elements
        Object.values(this.toolHandlers).forEach((handler) => {
          if (handler && handler.loadElements) {
            handler.loadElements()
          }
        })
      }
    } catch (error) {
      console.error('Failed to load elements:', error)
    }
  }

  // //_____________________________________________________________________________________________________________renderElement
  // /**
  //  * Render all pre-existing elements
  //  * Useful to help users
  //  * @param {String} message - string with guidance message that will be displayed
  //  */
  // renderElement(element) {
  //   const domElement = document.createElement('div')
  //   domElement.className = `absolute ${element.type}`
  //   domElement.dataset.elementId = element.id
  //   domElement.dataset.elementType = element.type

  //   domElement.style.left = `${element.vertex.positionX}px`
  //   domElement.style.top = `${element.vertex.positionY}px`
  //   domElement.style.width = `${element.width}px`
  //   domElement.style.height = `${element.height}px`

  //   this.canvas.appendChild(domElement)
  // }
  //
  //
  // Add mouse event listeners to our canvas
  //_____________________________________________________________________________________________________________initializeCanvasEvents
  /**
   * Initialize the mouse events
   * Redirect to relevant methods
   */
  initializeCanvasEvents() {
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e))
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e))
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e))
  }

  //_____________________________________________________________________________________________________________initializeTools
  /**
   * Setup event listeners for tools
   * Listen for a click and calls setCurrentTool
   */
  initializeTools() {
    // Find tool btns
    const toolButtons = document.querySelectorAll('.tool-btn')
    // For each of them
    toolButtons.forEach((button) => {
      // Add click event listener
      button.addEventListener('click', () => {
        // Get information from dataset
        const tool = button.dataset.tool
        // Set clicked tool as current tool
        this.setCurrentTool(tool)
      })
    })
  }

  //_____________________________________________________________________________________________________________setCurrentTool
  /**
   * Show guidance if a tool is disabled
   * Return previous tool to default state
   * Change display according to tool selection
   * Activate new tool placement mode if relevant
   * @param {String} tool - string sent by initializeTools, correspond to btn dataset
   */
  setCurrentTool(tool) {
    // Check if tool is disabled based on state
    const toolBtn = document.querySelector(`[data-tool="${tool}"]`)
    if (toolBtn && toolBtn.classList.contains('disabled')) {
      // Show message explaining why the tool can't be used
      this.showGuidanceMessage(
        this.planState === 'construction'
          ? 'Complete the enclosure before using this tool'
          : 'Fix the enclosure before using this tool'
      )
      return // Don't change the tool
    }

    // -- Stop any active placement when switching tools
    const previousHandler = this.toolHandlers[this.currentTool]
    if (previousHandler && previousHandler.stopUsing) {
      previousHandler.stopUsing()
    }

    // Update current tool
    this.currentTool = tool
    this.toolDisplay.textContent = tool
    this.updateToolButtonStyles(tool)

    // Start placement mode for elements if that tool is selected
    const newHandler = this.toolHandlers[this.currentTool]
    if (newHandler && newHandler.startUsing && tool !== 'fence') {
      newHandler.startUsing()
    }
  }

  //_____________________________________________________________________________________________________________updateToolButtonStyles
  /**
   * Change tool btns bg and font color
   * @param {String} currentTool - string sent by setCurrentTool, correspond to btn dataset
   */
  updateToolButtonStyles(currentTool) {
    document.querySelectorAll('.tool-btn').forEach((btn) => {
      if (btn.dataset.tool === currentTool) {
        btn.classList.add('bg-gray-800', 'text-gray-200')
        btn.classList.remove('bg-gray-200', 'text-gray-800')
      } else {
        btn.classList.add('bg-gray-200', 'text-gray-800')
        btn.classList.remove('bg-gray-800', 'text-gray-200')
      }
    })
  }

  //_____________________________________________________________________________________________________________getCanvasPoint
  /**
   * Function to find canvas coordinates when called
   * @param {MouseEvent} event - Mouse event sent by different methods, initially defined in InitializeCanvasEvents
   * @returns {Object} Coordinates of the mouse on the canvas
   */
  getCanvasPoint(event) {
    // getBoundingClientRect() gets position of the canvas in the page
    const rect = this.canvas.getBoundingClientRect()
    return {
      // Get canvas coordinate by getting page coordinates - canvas displacement
      x: Math.round(event.clientX - rect.left),
      y: Math.round(event.clientY - rect.top),
    }
  }

  //_____________________________________________________________________________________________________________handleMouseDown
  /**
   * Get mouse coordinates and call correct tool method
   * @param {MouseEvent} event - Mouse event, initially defined in InitializeCanvasEvents
   */
  handleMouseDown(event) {
    const point = this.getCanvasPoint(event)
    const handler = this.toolHandlers[this.currentTool]
    if (handler === this.fenceDrawer) {
      handler.handleMouseDown(point)
    } else if (handler === this.selector) {
      handler.selectElement(event)
    } else if (handler) {
      handler.placeElement(point)
    }
  }

  //_____________________________________________________________________________________________________________handleMouseMove
  /**
   * Get mouse coordinates and call correct tool method
   * @param {MouseEvent} event - Mouse event, initially defined in InitializeCanvasEvents
   */
  handleMouseMove(event) {
    const point = this.getCanvasPoint(event)
    const handler = this.toolHandlers[this.currentTool]
    // if (handler === this.selector) {
    //   return
    // } else if (handler) {
    handler.handleMouseMove(point)
    // }
  }

  //_____________________________________________________________________________________________________________handleMouseUp
  /**
   * Get mouse coordinates and call correct tool method
   * @param {MouseEvent} event - Mouse event, initially defined in InitializeCanvasEvents
   */
  handleMouseUp(event) {
    const point = this.getCanvasPoint(event)
    const handler = this.toolHandlers[this.currentTool]
    if (handler === this.fenceDrawer || handler === this.selector) {
      handler.handleMouseUp(point)
    }
  }

  //_____________________________________________________________________________________________________________isPointInEnclosure
  /**
   * Check if a given point is in enclosure (the enclosure must be complete)
   * @param {Object} point - Coordinates to check
   * @returns {Boolean} True if in enclosure, false if outside or enclosure incomplete
   */
  isPointInEnclosure(point) {
    // If there's no enclosure yet, return false
    if (!this.isEnclosureComplete) return false

    // Get ordered vertices
    const enclosureVertices = this.getOrderedEnclosureVertices()
    if (enclosureVertices.length < 3) return false

    // Use service to check if point is inside
    return this.commonFunctionsService.isPointInPolygon(point, enclosureVertices)
  }

  //_____________________________________________________________________________________________________________getOrderedEnclosureVertices
  /**
   * Get fences ordered vertices (as if walking along the fences)
   * Use CommonFunctionsService
   * @returns {Array} Array of [x, y] coordinates in order
   */
  getOrderedEnclosureVertices() {
    const fenceElements = Array.from(this.canvas.querySelectorAll('.fence'))
    return this.commonFunctionsService.getOrderedVertices(fenceElements)
  }

  //_____________________________________________________________________________________________________________isElementInEnclosure
  /**
   * Check if an element is inside the enclosure
   * Calls isPointInEnclosure
   * @param {Object} element Object containing all relevant element information (id, type, x, y, width, height)
   * @returns {Boolean} True if the element is in the enclosure
   */
  isElementInEnclosure(element) {
    // Check if the center of the element is inside the enclosure
    const centerX = element.x + element.width / 2
    const centerY = element.y + element.height / 2

    return this.isPointInEnclosure({ x: centerX, y: centerY })
  }

  //_____________________________________________________________________________________________________________categorizeElements
  /**
   * Set elements as either inside or outside
   * Calls isElementInEnclosure
   * @returns {Object} result = {inside: [...],outside: [...],}
   */
  categorizeElements() {
    const result = {
      inside: [],
      outside: [],
    }

    this.placedElements.forEach((element) => {
      if (this.isElementInEnclosure(element)) {
        result.inside.push(element)
      } else {
        result.outside.push(element)
      }
    })

    return result
  }
}
