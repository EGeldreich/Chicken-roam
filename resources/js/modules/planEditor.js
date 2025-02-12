export default class PlanEditor {
  constructor(planId) {
    // Store important references and state
    this.planId = planId
    this.currentTool = 'select'
    this.canvas = document.getElementById('planCanvas')
    this.toolDisplay = document.getElementById('toolDisplay')

    // Add new properties for fence drawing
    this.isDrawing = false // Tracks if we're currently drawing a fence
    this.drawStartPoint = null // Where the fence starts
    this.temporaryFence = null // The fence line we're currently drawing

    // Set up our event listeners
    this.initializeTools()
    this.initializeCanvasEvents()

    // Log so we can see it's working
    console.log('PlanEditor initialized with plan ID:', planId)
  }

  // Set up our tool buttons
  initializeTools() {
    // Find all tool buttons
    const toolButtons = document.querySelectorAll('.tool-btn')

    // Add click handlers to each button
    toolButtons.forEach((button) => {
      button.addEventListener('click', () => {
        // When clicked, update the current tool
        const tool = button.dataset.tool
        this.setCurrentTool(tool)

        // Log the tool change
        console.log('Tool changed to:', tool)
      })
    })
  }

  // Update the current tool and UI
  setCurrentTool(tool) {
    // Update our stored current tool
    this.currentTool = tool

    // Update the display
    this.toolDisplay.textContent = tool

    // Update button styling
    document.querySelectorAll('.tool-btn').forEach((btn) => {
      if (btn.dataset.tool === tool) {
        btn.classList.add('bg-green-500')
        btn.classList.remove('bg-blue-500')
      } else {
        btn.classList.add('bg-blue-500')
        btn.classList.remove('bg-green-500')
      }
    })
  }

  initializeCanvasEvents() {
    // Add mouse event listeners to our canvas
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e))
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e))
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e))
  }

  // Helper function to get mouse position relative to canvas
  getCanvasPoint(event) {
    const rect = this.canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  handleMouseDown(event) {
    if (this.currentTool !== 'fence') return

    this.isDrawing = true
    this.drawStartPoint = this.getCanvasPoint(event)

    // Create a new element to show the fence line
    this.temporaryFence = document.createElement('div')
    this.temporaryFence.className = 'absolute h-1 bg-black transform origin-left'
    this.temporaryFence.style.left = `${this.drawStartPoint.x}px`
    this.temporaryFence.style.top = `${this.drawStartPoint.y}px`
    this.canvas.appendChild(this.temporaryFence)
  }

  handleMouseMove(event) {
    if (!this.isDrawing || this.currentTool !== 'fence') return

    const currentPoint = this.getCanvasPoint(event)

    // Calculate the length and angle of the fence line
    const deltaX = currentPoint.x - this.drawStartPoint.x
    const deltaY = currentPoint.y - this.drawStartPoint.y
    const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)

    // Update the temporary fence line
    this.temporaryFence.style.width = `${length}px`
    this.temporaryFence.style.transform = `rotate(${angle}deg)`
  }

  async handleMouseUp(event) {
    if (!this.isDrawing || this.currentTool !== 'fence') return

    const endPoint = this.getCanvasPoint(event)

    // Only create a fence if it has some length
    if (this.drawStartPoint.x !== endPoint.x || this.drawStartPoint.y !== endPoint.y) {
      try {
        // Save the fence to the database
        const response = await fetch('/api/fences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Add CSRF token if needed
          },
          body: JSON.stringify({
            planId: this.planId,
            startX: this.drawStartPoint.x,
            startY: this.drawStartPoint.y,
            endX: endPoint.x,
            endY: endPoint.y,
          }),
        })

        if (response.ok) {
          // Keep the fence line visible since it was saved successfully
          this.temporaryFence.classList.remove('temporary-fence')
        } else {
          // Remove the temporary line if save failed
          this.temporaryFence.remove()
        }
      } catch (error) {
        console.error('Failed to save fence:', error)
        this.temporaryFence.remove()
      }
    } else {
      // Remove the temporary line if it has no length
      this.temporaryFence.remove()
    }

    // Reset drawing state
    this.isDrawing = false
    this.drawStartPoint = null
    this.temporaryFence = null
  }
}
