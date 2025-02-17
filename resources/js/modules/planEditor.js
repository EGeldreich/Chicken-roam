import FenceDrawer from './fenceDrawer.js'

export default class PlanEditor {
  constructor(planId) {
    this.planId = planId
    this.currentTool = 'select' // Set select as default tool
    this.canvas = document.getElementById('planCanvas') // Get drawing area
    this.toolDisplay = document.getElementById('toolDisplay') // GET tool tooltip display HTML element

    // Initialize tool managers
    this.fenceDrawer = new FenceDrawer(this.canvas, this.planId)

    // Set up event listeners
    this.initializeTools()
    this.initializeCanvasEvents()
  }

  // Add mouse event listeners to our canvas
  initializeCanvasEvents() {
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e))
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e))
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e))
  }

  // Set up event listeners for tool btns
  initializeTools() {
    const toolButtons = document.querySelectorAll('.tool-btn')
    toolButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const tool = button.dataset.tool
        this.setCurrentTool(tool)
      })
    })
  }

  // Change display according to tool selection
  setCurrentTool(tool) {
    this.currentTool = tool
    this.toolDisplay.textContent = tool
    this.updateToolButtonStyles(tool)
  }

  // Change tool btns bg
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

  // Function to ensure a click is in Canvas, and to call correct tool Class
  handleMouseDown(event) {
    const point = this.getCanvasPoint(event)
    if (this.currentTool === 'fence') {
      this.fenceDrawer.handleMouseDown(point)
    }
    // Future: else if (this.currentTool === 'element') { this.elementPlacer.handleMouseDown(point); }
  }

  handleMouseMove(event) {
    const point = this.getCanvasPoint(event)
    if (this.currentTool === 'fence') {
      this.fenceDrawer.handleMouseMove(point)
    }
    // Future: else if (this.currentTool === 'element') { this.elementPlacer.handleMouseDown(point); }
  }

  handleMouseUp(event) {
    const point = this.getCanvasPoint(event)
    if (this.currentTool === 'fence') {
      this.fenceDrawer.handleMouseUp(point)
    }
    // Future: else if (this.currentTool === 'element') { this.elementPlacer.handleMouseDown(point); }
  }
}
