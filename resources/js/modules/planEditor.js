import FenceDrawer from './fenceDrawer.js'

export default class PlanEditor {
  constructor(planId) {
    this.planId = planId // Get plan ID
    this.currentTool = 'select' // Set select as default tool
    this.canvas = document.getElementById('planCanvas') // Get drawing area
    this.toolDisplay = document.getElementById('toolDisplay') // Get tool tooltip display HTML element

    // Initialize tool managers
    this.fenceDrawer = new FenceDrawer(this.canvas, this.planId)

    // Set up event listeners
    this.initializeTools()
    this.initializeCanvasEvents()
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
  // Change display according to tool selection
  setCurrentTool(tool) {
    this.currentTool = tool
    this.toolDisplay.textContent = tool
    this.updateToolButtonStyles(tool)
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
    if (this.currentTool === 'fence') {
      this.fenceDrawer.handleMouseDown(point)
    }
    // Future: else if (this.currentTool === 'element') { this.elementPlacer.handleMouseDown(point); }
  }
  //
  //
  // Keep track of mouse coordinates and call correct tool method
  handleMouseMove(event) {
    const point = this.getCanvasPoint(event)
    if (this.currentTool === 'fence') {
      this.fenceDrawer.handleMouseMove(point)
    }
    // Future: else if (this.currentTool === 'element') { this.elementPlacer.handleMouseDown(point); }
  }
  //
  //
  // Keep track of mouse coordinates and call correct tool method
  handleMouseUp(event) {
    const point = this.getCanvasPoint(event)
    if (this.currentTool === 'fence') {
      this.fenceDrawer.handleMouseUp(point)
    }
    // Future: else if (this.currentTool === 'element') { this.elementPlacer.handleMouseDown(point); }
  }
}
