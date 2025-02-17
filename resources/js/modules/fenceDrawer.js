export default class FenceDrawer {
  constructor(canvas, planId) {
    // Get basic properties
    this.canvas = canvas // Defined in PlanEditor, drawing area HTML element
    this.planId = planId // Defined in PlanEditor, used to push elements

    this.vertices = new Map() // Initialize Map() so we can store coordinates and number of fences linked
    this.connectionPoints = [] // Initialize empty array for connection points
    this.enclosureSnapDistance = 50 // Distance in pixels to snap to first vertex

    // Set default states
    this.temporaryFence = null // used to show fences that are being drawn but not confirmed yet
    this.drawStartPoint = null // used to calculate length and angle of fences and calculate vertex coords
    this.isDrawing = false // State required to not triggers mouse events constantly
    this.isFirstFence = true // Needed to be able to draw first fence without any connection point

    this.loadExistingFences() // Get existings fences from DB
  }

  // Get existing fences and update ConnectionPoints
  async loadExistingFences() {
    // GET fences from pseudo 'API'
    const response = await fetch(`/api/fences/${this.planId}`)
    if (response.ok) {
      const fences = await response.json()
      this.isFirstFence = fences.length === 0

      fences.forEach((fence) => {
        this.renderFence(fence)
        this.trackVertex(fence.vertexStart)
        this.trackVertex(fence.vertexEnd)
      })

      this.updateConnectionPoints()
    }
  }

  trackVertex(vertex) {
    const key = `${vertex.positionX},${vertex.positionY}`
    const connections = this.vertices.get(key) || 0
    this.vertices.set(key, connections + 1)
  }
  updateConnectionPoints() {
    // Remove existing connection points
    this.connectionPoints.forEach((point) => point.remove())
    this.connectionPoints = []

    // Add connection points for vertices with less than 2 connections
    this.vertices.forEach((connections, position) => {
      if (connections < 2) {
        const [x, y] = position.split(',').map(Number)
        this.addConnectionPoint(x, y)
      }
    })
  }

  addConnectionPoint(x, y) {
    const point = document.createElement('div')
    point.className =
      'h-3 w-3 rounded-full bg-blue-500 absolute transform -translate-x-1/2 -translate-y-1/2'
    point.style.left = `${x}px`
    point.style.top = `${y}px`
    this.canvas.appendChild(point)
    this.connectionPoints.push(point)
  }
  findNearestConnectionPoint(point) {
    const snapDistance = 50 // pixels
    let nearest = null
    let minDistance = snapDistance

    // Check all vertices that have fewer than 2 connections
    this.vertices.forEach((connections, position) => {
      if (connections < 2) {
        const [x, y] = position.split(',').map(Number)
        const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2))

        if (distance < minDistance) {
          minDistance = distance
          nearest = { x, y }
        }
      }
    })

    return nearest
  }

  handleMouseDown(point) {
    console.log('Mouse down with point:', point) // Log the incoming point
    console.log('Is first fence:', this.isFirstFence) // Check the flag's current value

    if (this.isFirstFence) {
      console.log('Starting first fence')

      this.startDrawing(point)
    } else {
      console.log('Looking for nearest point')

      const nearestPoint = this.findNearestConnectionPoint(point)
      console.log('Nearest point found:', nearestPoint)
      if (nearestPoint) {
        console.log(nearestPoint)
        this.startDrawing(nearestPoint)
      }
    }
  }

  startDrawing(point) {
    this.isDrawing = true
    this.drawStartPoint = point

    // Create a new element to show the fence line
    this.temporaryFence = document.createElement('div')
    this.temporaryFence.className = 'absolute h-1 bg-black transform origin-left'
    this.temporaryFence.style.left = `${point.x}px`
    this.temporaryFence.style.top = `${point.y}px`
    this.canvas.appendChild(this.temporaryFence)
  }

  handleMouseMove(point) {
    if (!this.isDrawing) return

    const nearestPoint = this.findNearestConnectionPoint(point)
    let endPoint = point

    // If we're near a connection point, snap to it
    if (nearestPoint) {
      endPoint = nearestPoint
      this.temporaryFence.classList.add('snapping-to-connection')
    } else {
      this.temporaryFence.classList.remove('snapping-to-connection')
    }
    // Calculate the length and angle of the fence line
    const deltaX = endPoint.x - this.drawStartPoint.x
    const deltaY = endPoint.y - this.drawStartPoint.y
    const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)

    // Update the temporary fence line
    this.temporaryFence.style.width = `${length}px`
    this.temporaryFence.style.transform = `rotate(${angle}deg)`
  }

  async handleMouseUp(point) {
    if (!this.isDrawing) return

    // Find the nearest valid connection point
    const nearestPoint = this.findNearestConnectionPoint(point)
    let endPoint = point

    // If we're near a connection point, use it
    if (nearestPoint) {
      endPoint = nearestPoint
    }

    if (this.drawStartPoint.x !== endPoint.x || this.drawStartPoint.y !== endPoint.y) {
      try {
        const response = await fetch('/api/fences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
          },
          body: JSON.stringify({
            planId: this.planId,
            startX: this.drawStartPoint.x,
            startY: this.drawStartPoint.y,
            endX: endPoint.x,
            endY: endPoint.y,
          }),
        })

        const responseData = await response.json()

        if (response.ok) {
          this.isFirstFence = false
          this.trackVertex({ positionX: this.drawStartPoint.x, positionY: this.drawStartPoint.y })
          this.trackVertex({ positionX: endPoint.x, positionY: endPoint.y })
          this.updateConnectionPoints()
          this.temporaryFence.classList.remove('temporary-fence')

          // If we've closed the enclosure, trigger completion
          if (this.hasFormedEnclosure()) {
            this.handleEnclosureComplete()
          }
        } else {
          console.error('Server error:', responseData)
          this.temporaryFence.remove()
        }
      } catch (error) {
        console.error('Failed to save fence:', error)
        this.temporaryFence.remove()
      }
    } else {
      this.temporaryFence.remove()
    }

    this.isDrawing = false
    this.drawStartPoint = null
    this.temporaryFence = null
  }

  renderFence(fenceData) {
    // Create a fence element
    const fenceElement = document.createElement('div')
    fenceElement.className = 'absolute h-1 bg-black transform origin-left'
    fenceElement.dataset.fenceId = fenceData.id

    // Get start and end positions from the fence data
    const startX = parseFloat(fenceData.vertexStart.positionX)
    const startY = parseFloat(fenceData.vertexStart.positionY)
    const endX = parseFloat(fenceData.vertexEnd.positionX)
    const endY = parseFloat(fenceData.vertexEnd.positionY)

    // Calculate length and angle
    const deltaX = endX - startX
    const deltaY = endY - startY
    const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)

    // Apply styles
    fenceElement.style.left = `${startX}px`
    fenceElement.style.top = `${startY}px`
    fenceElement.style.width = `${length}px`
    fenceElement.style.transform = `rotate(${angle}deg)`

    // Add to canvas
    this.canvas.appendChild(fenceElement)
  }

  hasFormedEnclosure() {
    // An enclosure is formed when all vertices have exactly 2 connections
    let hasOpenConnections = false
    this.vertices.forEach((connections) => {
      if (connections !== 2) {
        hasOpenConnections = true
      }
    })
    return !hasOpenConnections && this.vertices.size > 2
  }

  async handleEnclosureComplete() {
    // You might want to:
    // 1. Notify the server that the enclosure is complete
    // 2. Calculate the enclosed area
    // 3. Validate the enclosure (e.g., minimum size)
    // 4. Update UI to show completion

    try {
      const response = await fetch(`/api/plans/${this.planId}/complete-enclosure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
        },
      })

      if (response.ok) {
        // Add visual feedback that enclosure is complete
        this.canvas.classList.add('enclosure-complete')

        // Trigger any necessary UI updates
        const event = new CustomEvent('enclosureComplete', {
          detail: { planId: this.planId },
        })
        this.canvas.dispatchEvent(event)
      }
    } catch (error) {
      console.error('Failed to complete enclosure:', error)
    }
  }
}
