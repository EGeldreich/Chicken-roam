import FenceDrawer from './fenceDrawer.js'
import ShelterDrawer from './shelterDrawer.js'
import WatererDrawer from './watererDrawer.js'
import PerchDrawer from './perchDrawer.js'
import ShrubDrawer from './shrubDrawer.js'
import InsectaryDrawer from './insectaryDrawer.js'
import DustbathDrawer from './dustbathDrawer.js'
import Selector from './selector.js'

export default class PlanEditor {
  constructor(planId) {
    this.planId = planId // Get plan ID
    this.currentTool = 'select' // Set select as default tool
    this.canvas = document.getElementById('planCanvas') // Get drawing area
    this.toolDisplay = document.getElementById('toolDisplay') // Get tool tooltip display HTML element

    // Single shared array for all elements to avoid overlapping
    this.placedElements = []

    // Initialize tool managers
    this.fenceDrawer = new FenceDrawer(this.canvas, this.planId, this.placedElements)
    this.shelterDrawer = new ShelterDrawer(this.canvas, this.planId, this.placedElements)
    this.watererDrawer = new WatererDrawer(this.canvas, this.planId, this.placedElements)
    this.perchDrawer = new PerchDrawer(this.canvas, this.planId, this.placedElements)
    this.shrubDrawer = new ShrubDrawer(this.canvas, this.planId, this.placedElements)
    this.insectaryDrawer = new InsectaryDrawer(this.canvas, this.planId, this.placedElements)
    this.dustbathDrawer = new DustbathDrawer(this.canvas, this.planId, this.placedElements)
    this.selector = new Selector(this.canvas, this.planId, this.placedElements)

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
  }
  //
  //
  // Load all elements of the plan
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
  //
  //
  // Render all pre-existing elements
  renderElement(element) {
    const domElement = document.createElement('div')
    domElement.className = `absolute ${element.type}`
    domElement.dataset.elementId = element.id
    domElement.dataset.elementType = element.type

    domElement.style.left = `${element.vertex.positionX}px`
    domElement.style.top = `${element.vertex.positionY}px`
    domElement.style.width = `${element.width}px`
    domElement.style.height = `${element.height}px`

    this.canvas.appendChild(domElement)
  }
  //
  //
  // Add mouse event listeners to our canvas
  initializeCanvasEvents() {
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e))
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e))
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e))
  }
  //
  //
  // Set up event listeners for tool btns
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
  //
  //
  // Return previous tool to default state
  // Change display according to tool selection
  // Activate new tool placement mode if necessary
  setCurrentTool(tool) {
    // -- Stop any active placement when switching tools
    // Get previous tool
    const previousHandler = this.toolHandlers[this.currentTool]
    // if there is a stopUsing method, use it
    if (previousHandler && previousHandler.stopUsing) {
      previousHandler.stopUsing()
    }
    // currentTool change
    this.currentTool = tool
    this.toolDisplay.textContent = tool
    this.updateToolButtonStyles(tool)

    // Start placement mode for elements if that tool is selected
    const newHandler = this.toolHandlers[this.currentTool]
    if (newHandler && newHandler.startUsing && tool !== 'fence') {
      newHandler.startUsing()
    }
  }
  //
  //
  // Change tool btns bg and font color
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
  //
  //
  // Function to find canvas coordinates on click
  getCanvasPoint(event) {
    // getBoundingClientRect() gets position of the canvas in the page
    const rect = this.canvas.getBoundingClientRect()
    return {
      // Get canvas coordinate by getting page coordinates - canvas displacement
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }
  //
  //
  // Keep track of mouse coordinates and call correct tool method
  handleMouseDown(event) {
    const point = this.getCanvasPoint(event)
    const handler = this.toolHandlers[this.currentTool]
    if (handler === this.fenceDrawer) {
      handler.handleMouseDown(point)
    } else if (handler === this.selector) {
      handler.selectElement(point)
    } else if (handler) {
      handler.placeElement(point)
    }
  }
  //
  //
  // Keep track of mouse coordinates and call correct tool method
  handleMouseMove(event) {
    const point = this.getCanvasPoint(event)
    const handler = this.toolHandlers[this.currentTool]
    if (handler === this.selector) {
      return
    } else if (handler) {
      handler.handleMouseMove(point)
    }
  }
  //
  //
  // Keep track of mouse coordinates and call correct tool method
  handleMouseUp(event) {
    const point = this.getCanvasPoint(event)
    const handler = this.toolHandlers[this.currentTool]
    if (handler === this.fenceDrawer) {
      handler.handleMouseUp(point)
    }
  }
}
