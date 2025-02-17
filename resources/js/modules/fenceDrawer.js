export default class FenceDrawer {
  constructor(canvas, planId) {
    this.canvas = canvas
    this.planId = planId
    this.isDrawing = false
    this.drawStartPoint = null
    this.temporaryFence = null
    this.vertices = new Map()
    this.connectionPoints = []
    this.isFirstFence = true

    this.loadExistingFences()
  }

  // Get existing fences and update ConnectionPoints
  async loadExistingFences() {
    try {
      const response = await fetch(`/api/fences/${this.planId}`)
      if (response.ok) {
        const fences = await response.json()
        console.log('Loaded fences:', fences) // Check what fences we're getting
        this.isFirstFence = fences.length === 0
        console.log('Is first fence:', this.isFirstFence) // Check if this is set correctly

        fences.forEach((fence) => {
          this.renderFence(fence)
          this.trackVertex(fence.vertexStart)
          this.trackVertex(fence.vertexEnd)
        })
        console.log('Vertices map:', this.vertices) // Check what vertices we're tracking

        this.updateConnectionPoints()
      }
    } catch (error) {
      console.error('Failed to load fences:', error)
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

    // Calculate the length and angle of the fence line
    const deltaX = point.x - this.drawStartPoint.x
    const deltaY = point.y - this.drawStartPoint.y
    const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)

    // Update the temporary fence line
    this.temporaryFence.style.width = `${length}px`
    this.temporaryFence.style.transform = `rotate(${angle}deg)`
  }

  async handleMouseUp(point) {
    if (!this.isDrawing) return

    if (this.drawStartPoint.x !== point.x || this.drawStartPoint.y !== point.y) {
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
            endX: point.x,
            endY: point.y,
          }),
        })

        const responseData = await response.json() // Read the body once

        if (response.ok) {
          // Use the responseData
          this.isFirstFence = false
          this.trackVertex({ positionX: this.drawStartPoint.x, positionY: this.drawStartPoint.y })
          this.trackVertex({ positionX: point.x, positionY: point.y })
          this.updateConnectionPoints()
          this.temporaryFence.classList.remove('temporary-fence')
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
}
