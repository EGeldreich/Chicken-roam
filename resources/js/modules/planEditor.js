import FenceDrawer from './fenceDrawer.js'
import ShelterDrawer from './shelterDrawer.js'
import WatererDrawer from './watererDrawer.js'
import PerchDrawer from './perchDrawer.js'
import ShrubDrawer from './shrubDrawer.js'
import InsectaryDrawer from './insectaryDrawer.js'
import DustbathDrawer from './dustbathDrawer.js'
import TreeDrawer from './treeDrawer.js'
import DoorDrawer from './doorDrawer.js'
import Selector from './selector.js'
import PointAdder from './pointAdder.js'
import CommonFunctionsService from '../services/commonFunctionsService.js'
import ObjectivesManager from '../services/objectivesManager.js'
import Mover from './mover.js'

export default class PlanEditor {
  constructor(planId) {
    this.planId = planId // Get plan ID
    this.currentTool = 'select' // Set select as default tool
    this.canvas = document.getElementById('planCanvas') // Get drawing area
    this.EPSILON = 1 // Margin of error

    // Zoom and pan related properties
    this.zoom = 1
    this.panX = -4500
    this.panY = -4500
    this.isPanning = false
    this.lastPanPoint = { x: 0, y: 0 }
    this.ZOOM_MAX = 3
    this.ZOOM_MIN = 0.3
    // For offset adjustment
    this.offsetAdjustment = { x: 0, y: 0 }
    // Scale elements
    this.scaleBar = document.getElementById('scale-bar')
    this.scaleNumber = document.getElementById('scale-number')
    this.updateScale()

    // Plan state properties
    this.planState = 'construction' // Default state: construction, enclosed, broken
    this.isEnclosureComplete = false
    // Get initial plan state from the server
    this.fetchPlanState()

    // Single shared array for all elements to avoid overlapping
    this.placedElements = []
    this.disabledElements = []

    // Initialize tool managers
    this.fenceDrawer = new FenceDrawer(this.canvas, this.planId, this)
    this.shelterDrawer = new ShelterDrawer(this.canvas, this.planId, this)
    this.watererDrawer = new WatererDrawer(this.canvas, this.planId, this)
    this.perchDrawer = new PerchDrawer(this.canvas, this.planId, this)
    this.shrubDrawer = new ShrubDrawer(this.canvas, this.planId, this)
    this.insectaryDrawer = new InsectaryDrawer(this.canvas, this.planId, this)
    this.dustbathDrawer = new DustbathDrawer(this.canvas, this.planId, this)
    this.treeDrawer = new TreeDrawer(this.canvas, this.planId, this)
    this.doorDrawer = new DoorDrawer(this.canvas, this.planId, this)
    this.selector = new Selector(this.canvas, this.planId, this)
    this.pointAdder = new PointAdder(this.canvas, this.planId, this)
    this.mover = new Mover(this.canvas, this.planId, this)

    // Add services instances
    this.commonFunctionsService = new CommonFunctionsService(this.canvas, this, this.EPSILON)
    this.objectivesManager = new ObjectivesManager(this)

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
      tree: this.treeDrawer,
      door: this.doorDrawer,
      point: this.pointAdder,
      move: this.mover,
    }

    // Set up event listeners
    this.initializeTools() // Tool selection
    this.initializeCanvasEvents() // Mouse events on canvas
    this.initializeZoomPanControls() // Zoom and pan controls

    // Apply first transform to get in the middle of canvas
    this.applyTransform()

    // Listen for enclosure completion event
    this.canvas.addEventListener('enclosureComplete', (event) => {
      this.isEnclosureComplete = true
      this.setCurrentTool('select')
      this.updatePlanState('enclosed')
    })
  }

  // INITIALIZERS________
  //_____________________

  /**
   * Set up mouse event listeners on canvas
   * Redirect to relevant methods
   */
  initializeCanvasEvents() {
    this.canvas.addEventListener('mousedown', (e) => {
      // only listen to left clicks
      if (e.button === 0) {
        this.handleMouseDown(e)
      }
    })

    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e))

    this.canvas.addEventListener('mouseup', (e) => {
      // only listen to left clicks
      if (e.button === 0) {
        this.handleMouseUp(e)
      }
    })
  }

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

  /**
   * Set up event listeners related to zooms and pan
   */
  initializeZoomPanControls() {
    //____
    // Zoom with mouse wheel
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault() // Disable default behavior of wheel clicks

      const delta = -Math.sign(e.deltaY) * 0.1
      // e.deltaY get scroll value
      // Math.sign(value) returns either 1, 0 or -1 depending on the (value)
      // -Math.sign(e.deltaY) returns -1 for a scroll down, 1 for a scroll up

      const oldZoom = this.zoom // Store current zoom value

      this.zoom = Math.max(this.ZOOM_MIN, Math.min(this.ZOOM_MAX, this.zoom + delta))
      // Set new zoom value
      // Math.min(5, this.zoom + delta) returns the lowest value between 5 and the zoom value change
      // Math.max(0.5, ...) returns the highest value between 0.5 and the lowest value above
      // This set a minimal zoom of 0.5, and a max of 5, as those will always be chosen if the zoom is outside this range

      // If there is a zoom change
      if (this.zoom !== oldZoom) {
        // Get new bounding datas
        const rect = this.canvas.getBoundingClientRect()

        // Get mouse coordinates relative to viewport and canvas
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top

        // Adjust pan, so zoom is centered on mouse position
        this.panX += (mouseX * (oldZoom - this.zoom)) / oldZoom
        this.panY += (mouseY * (oldZoom - this.zoom)) / oldZoom

        // Call to apply transformation with updated zoom and pan
        this.applyTransform()
      }
    })

    //____
    // Handle movement via mover tool (mover tool handles isPanning State)

    // Go into panning mode
    this.canvas.addEventListener('mousedown', (e) => {
      // Only act if using the move tool
      if (this.currentTool === 'move') {
        this.lastPanPoint = { x: e.clientX, y: e.clientY } // Store current pan point
      }
    })

    // Move
    document.addEventListener('mousemove', (e) => {
      // Only act if currently panning
      if (this.isPanning) {
        // Every time the move is registered
        // get the displacement values related to last pan point
        const dx = e.clientX - this.lastPanPoint.x
        const dy = e.clientY - this.lastPanPoint.y

        // Update pan values
        this.panX += dx
        this.panY += dy

        // Update last pan point
        this.lastPanPoint = { x: e.clientX, y: e.clientY }

        // Apply transformation with new values
        this.applyTransform()
      }
    })

    // // Deactivate panning mode
    // document.addEventListener('mouseup', (e) => {
    //   // If wheel or right click
    //   if (e.button === 1 || e.button === 2) {
    //     // Change panning state
    //     this.isPanning = false
    //     // Remove class
    //     const container = document.querySelector('.viewport-container')
    //     if (container) container.classList.remove('panning')
    //   }
    // })

    //___
    // Deactivate right click menu
    // this.canvas.addEventListener('contextmenu', (e) => {
    //   e.preventDefault() // Added security to avoid right click menu appearing
    // })

    //___
    // Zoom control buttons

    // Get elements
    const zoomIn = document.getElementById('zoomIn')
    const zoomOut = document.getElementById('zoomOut')
    const resetView = document.getElementById('resetView')
    // const moveUp = document.getElementById('moveUp')
    // const moveLeft = document.getElementById('moveLeft')
    // const moveRight = document.getElementById('moveRight')
    // const moveDown = document.getElementById('moveDown')

    // Event listener on zoom in
    if (zoomIn) {
      zoomIn.addEventListener('click', () => {
        this.zoomCentered(0.1)
      })
    }

    // Event listener on zoom out
    if (zoomOut) {
      zoomOut.addEventListener('click', () => {
        this.zoomCentered(-0.1)
      })
    }

    // Event listener on reset
    if (resetView) {
      resetView.addEventListener('click', () => {
        // Set zoom to 1
        this.zoom = 1
        // Reset position
        this.panX = -4500
        this.panY = -4500

        this.applyTransform()
      })
    }

    // Event listener on movements
    // if (moveUp) {
    //   moveUp.addEventListener('click', () => {
    //     this.panY -= 50
    //     this.applyTransform()
    //   })
    // }
    // if (moveDown) {
    //   moveDown.addEventListener('click', () => {
    //     this.panY += 50
    //     this.applyTransform()
    //   })
    // }
    // if (moveRight) {
    //   moveRight.addEventListener('click', () => {
    //     this.panX -= 50
    //     this.applyTransform()
    //   })
    // }
    // if (moveLeft) {
    //   moveLeft.addEventListener('click', () => {
    //     this.panX += 50
    //     this.applyTransform()
    //   })
    // }
  }

  /**
   * Zoom on the center point of current view
   * @param {number} delta - Zoom change value + in, - out
   */
  zoomCentered(delta) {
    // Get necessary Rects
    const viewportRect = this.canvas.parentElement.getBoundingClientRect()
    const canvasRect = this.canvas.getBoundingClientRect()

    // Calculate the center of the viewport
    const viewportCenterX = viewportRect.left + viewportRect.width / 2
    const viewportCenterY = viewportRect.top + viewportRect.height / 2

    // Transform into canvas-related coordinates
    const canvasRelativeX = viewportCenterX - canvasRect.left
    const canvasRelativeY = viewportCenterY - canvasRect.top

    // Transform into world-related coordinates (account for zoom)
    const worldX = canvasRelativeX / this.zoom
    const worldY = canvasRelativeY / this.zoom

    // Store old zoom
    const oldZoom = this.zoom

    // Calculate new zoom
    this.zoom = Math.max(this.ZOOM_MIN, Math.min(this.ZOOM_MAX, this.zoom + delta))

    // Adjust pan to keep it centered
    if (this.zoom !== oldZoom) {
      this.panX += (canvasRelativeX * (oldZoom - this.zoom)) / oldZoom
      this.panY += (canvasRelativeY * (oldZoom - this.zoom)) / oldZoom

      // Apply transformations
      this.applyTransform()
    }
  }
  ///////////////////////

  // ZOOM AND PAN________
  //_____________________

  /**
   * Apply changes in zoom or pan
   */
  applyTransform() {
    // Change canvas style with new values
    this.canvas.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`

    // Update zoom level display
    const zoomLevel = document.getElementById('zoomLevel')
    if (zoomLevel) {
      zoomLevel.textContent = `${Math.round(this.zoom * 100)}%`
    }

    // Update zoom-dependent values
    this.updateZoomDependentValues()

    // Update scale
    this.updateScale()

    // Dispatch custom event containing transformation data
    const transformEvent = new CustomEvent('canvas:transform', {
      detail: {
        zoom: this.zoom,
        panX: this.panX,
        panY: this.panY,
      },
      bubbles: true,
    })

    const rect = this.canvas.getBoundingClientRect()
    const containerRect = this.canvas.parentElement.getBoundingClientRect()

    this.offsetAdjustment = {
      x: (containerRect.left - rect.left) / this.zoom,
      y: (containerRect.top - rect.top) / this.zoom,
    }
    this.canvas.dispatchEvent(transformEvent)
  }

  /**
   * Update EPSILON in planEditor and CommonFunctionsService
   * Update Snap Distances
   */
  updateZoomDependentValues() {
    // Update EPSILON according to zoom level
    this.EPSILON = 1 / this.zoom
    if (this.commonFunctionsService) {
      this.commonFunctionsService.EPSILON = this.EPSILON
    }

    // Update snap distances
    if (this.fenceDrawer && this.selector) {
      this.fenceDrawer.enclosureSnapDistance = 50 / this.zoom
      this.fenceDrawer.EPSILON = this.EPSILON

      this.selector.snapDistance = 50 / this.zoom
    }
  }
  updateScale() {
    if (!this.scaleBar || !this.scaleNumber) return
    // Initialize required variables
    let referenceLength, unit, barWidth, divisions

    if (this.zoom <= 0.5) {
      referenceLength = 3 // Number used for the whole scale, here 3
      unit = 'm' // Unit following the reference length, so here "3 m"
      barWidth = 100 * referenceLength * this.zoom // Automatically handle bar length via zoom level
      divisions = 3 // number of part the scale is divided in
    } else if (this.zoom <= 0.8) {
      referenceLength = 2
      unit = 'm'
      barWidth = 100 * referenceLength * this.zoom
      divisions = 2
    } else if (this.zoom <= 1.5) {
      referenceLength = 1
      unit = 'm'
      barWidth = 100 * referenceLength * this.zoom
      divisions = 5
    } else if (this.zoom <= 2) {
      referenceLength = 50
      unit = 'cm'
      barWidth = referenceLength * this.zoom
      divisions = 5
    } else {
      referenceLength = 20
      unit = 'cm'
      barWidth = referenceLength * this.zoom
      divisions = 2
    }

    // Update bar width
    this.scaleBar.style.width = `${barWidth}px`

    // Add divisions on scale bar
    this.scaleBar.innerHTML = '<div class="scale-bar-divisions"></div>'
    const divisionsContainer = this.scaleBar.querySelector('.scale-bar-divisions')

    for (let i = 0; i <= divisions; i++) {
      const divisionElement = document.createElement('div')
      divisionElement.className = 'scale-bar-division'
      divisionElement.style.left = `${(i * barWidth) / divisions}px`
      divisionsContainer.appendChild(divisionElement)
    }

    // Update text
    this.scaleNumber.textContent = referenceLength

    // Update unit if necessary
    const unitElement = document.querySelector('#scale-unit')
    if (unitElement && unitElement.textContent !== unit) {
      unitElement.textContent = ` ${unit}`
    }
  }
  ///////////////////////

  // PLAN STATE__________
  //_____________________
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
        this.updatePlanState(data.state, true)
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

  /**
   * Update plan UI according to new state
   * Mainly disable and reable element btns, show message, and change color
   * @param {String} newState - newState variable must contain 'construction', 'enclosed' or 'broken'
   * @param {Boolean} onLoad - true if the method is called on page load
   */
  updatePlanState(newState, onLoad = false) {
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
      stateLabel.className = `label-${newState}`
    }

    // Update tool availability based on state
    if (newState === 'construction' || newState === 'broken') {
      // In construction or broken state, disable element tools
      document.querySelectorAll('.element-tool-btn').forEach((btn) => {
        btn.classList.add('disabled')
      })
      document.querySelector('.fence-tool-btn').classList.remove('disabled')

      // If current tool is an element tool, switch to fence or select
      if (this.currentTool !== 'fence' && this.currentTool !== 'select') {
        this.setCurrentTool('fence')
      }

      // Show guidance message
      if (onLoad) {
        this.showGuidanceMessage(
          newState === 'construction'
            ? 'Complete the enclosure before placing elements'
            : 'Enclosure is broken! Fix it before placing more elements'
        )
      }

      // If in broken state, add visual indication to elements
      if (newState === 'broken') {
        this.disabledElements = this.placedElements
        this.placedElements = []
        document.querySelectorAll('.element:not(.fence)').forEach((element) => {
          element.classList.add('inactive-element')
        })
      }
    } else if (newState === 'enclosed') {
      // In enclosed state, enable all tools
      document.querySelectorAll('.tool-btn').forEach((btn) => {
        btn.classList.remove('disabled')
      })
      document.querySelector('.fence-tool-btn').classList.add('disabled')

      // Remove inactive indication from elements
      if (this.disabledElements.length > 0) {
        this.placedElements = this.disabledElements
        this.disabledElements = []
      }
      document.querySelectorAll('.inactive-element').forEach((element) => {
        element.classList.remove('inactive-element')
      })

      // Show guidance message
      this.showGuidanceMessage('Enclosure complete! You can now place elements')
    }
  }
  ///////////////////////

  // USER INTERFACE______
  //_____________________
  /**
   * Update the guidance message
   * Help users
   * @param {String} message - string with guidance message that will be displayed
   * @param {Boolean} isError - True if the message is an error message
   */
  showGuidanceMessage(message, isError = false) {
    // Get guidance message element
    const existingMessage = document.querySelector('.guidance-message')

    // Clear any existing timeouts associated with this message
    if (this.guidanceMessageTimeouts) {
      this.guidanceMessageTimeouts.forEach((timeout) => clearTimeout(timeout))
    }

    // Create a new array to store timeouts
    this.guidanceMessageTimeouts = []

    // Change textContent
    if (existingMessage) {
      existingMessage.textContent = message
      // Remove hidden class
      existingMessage.classList.remove('hidden', 'border-gray-300', 'border-red-400')
      // Animate to draw attention
      existingMessage.classList.add('pulse')
      if (isError) {
        existingMessage.classList.add('border-red-400')
      } else {
        existingMessage.classList.add('border-gray-300')
      }

      // Remove pulse after 1s
      let pulseTimeout = setTimeout(() => existingMessage.classList.remove('pulse'), 1000)
      this.guidanceMessageTimeouts.push(pulseTimeout)

      // Hide element after 4s
      let hideTimeout = setTimeout(() => existingMessage.classList.add('hidden'), 4000)
      this.guidanceMessageTimeouts.push(hideTimeout)
    }
  }

  /**
   * Change tool btns bg and font color
   * @param {String} currentTool - string sent by setCurrentTool, correspond to btn dataset
   */
  updateToolButtonStyles(currentTool) {
    document.querySelectorAll('.tool-btn').forEach((btn) => {
      if (btn.dataset.tool === currentTool) {
        btn.classList.add('active-tool')
      } else {
        btn.classList.remove('active-tool')
      }
    })
  }
  ///////////////////////

  // GENERAL USE_________
  //_____________________
  /**
   * Load all elements of the plan
   * GET request, response includes everything needed for element placement
   * @throws {Error} if request failed to fetch elements
   */
  async loadAllElements() {
    try {
      // fetch all element from DB
      const response = await fetch(`/api/elements/${this.planId}`)

      if (response.ok) {
        const elements = await response.json()
        // Add each element from the response into placedElements array for collisions
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

  /**
   * Function to find canvas coordinates when called
   * @param {MouseEvent} event - Mouse event sent by different methods, initially defined in InitializeCanvasEvents
   * @returns {Object} Coordinates of the mouse on the canvas
   */
  getCanvasPoint(event) {
    // getBoundingClientRect() gets position of the canvas in the page
    const rect = this.canvas.getBoundingClientRect()

    // Calculate mouse position relative to canvas offset
    const transformedX = event.clientX - rect.left
    const transformedY = event.clientY - rect.top
    // Take zoom into account
    const worldX = transformedX / this.zoom
    const worldY = transformedY / this.zoom

    return {
      x: Math.round(worldX),
      y: Math.round(worldY),
    }
  }

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
      if (this.planState === 'construction' || this.planState === 'broken') {
        this.showGuidanceMessage('Complete the enclosure before using this tool')
      } else if (this.planState === 'enclosed') {
        this.showGuidanceMessage('Break your enclosure to place new fences')
      }
      return // Don't change the tool
    }

    // -- Stop any active placement when switching tools
    const previousHandler = this.toolHandlers[this.currentTool]
    if (previousHandler && previousHandler.stopUsing) {
      previousHandler.stopUsing()
    }

    // Update current tool
    this.currentTool = tool
    this.updateToolButtonStyles(tool)
    if (this.objectivesManager) {
      this.objectivesManager.updateCurrentObjective(tool)
    }

    // Start placement mode for elements if that tool is selected
    const newHandler = this.toolHandlers[this.currentTool]
    if (newHandler && newHandler.startUsing && tool !== 'fence') {
      newHandler.startUsing()
    }
  }
  ///////////////////////

  // EVENTS REDIRECTION__
  //_____________________
  /**
   * Get mouse coordinates and call correct tool method
   * @param {MouseEvent} event - Mouse event, initially defined in InitializeCanvasEvents
   */
  handleMouseDown(event) {
    const point = this.getCanvasPoint(event)
    const handler = this.toolHandlers[this.currentTool]
    if (handler === this.fenceDrawer || handler === this.pointAdder || handler === this.mover) {
      handler.handleMouseDown(point)
    } else if (handler === this.selector) {
      handler.selectElement(event)
    } else if (handler) {
      handler.placeElement(point)
    }
  }

  /**
   * Get mouse coordinates and call correct tool method
   * @param {MouseEvent} event - Mouse event, initially defined in InitializeCanvasEvents
   */
  handleMouseMove(event) {
    const point = this.getCanvasPoint(event)
    const handler = this.toolHandlers[this.currentTool]
    if (handler === this.mover) {
      return
    } else if (handler) {
      handler.handleMouseMove(point)
    }
  }

  /**
   * Get mouse coordinates and call correct tool method
   * @param {MouseEvent} event - Mouse event, initially defined in InitializeCanvasEvents
   */
  handleMouseUp(event) {
    const point = this.getCanvasPoint(event)
    const handler = this.toolHandlers[this.currentTool]
    if (handler === this.fenceDrawer || handler === this.selector || handler === this.mover) {
      handler.handleMouseUp(point)
    }
  }
  ///////////////////////

  // OUTSIDE INSIDE______
  //_____________________
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

  /**
   * Get fences ordered vertices (as if walking along the fences)
   * Use CommonFunctionsService
   * @returns {Array} Array of [x, y] coordinates in order
   */
  getOrderedEnclosureVertices() {
    const fenceElements = Array.from(this.canvas.querySelectorAll('.fence'))
    return this.commonFunctionsService.getOrderedVertices(fenceElements)
  }

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

    this.disabledElements.forEach((element) => {
      if (this.isElementInEnclosure(element)) {
        result.inside.push(element)
      } else {
        result.outside.push(element)
      }
    })

    return result
  }
  ///////////////////////
}
