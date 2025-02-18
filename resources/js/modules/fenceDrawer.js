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
      // Set isFirstFence to false if there is at least 1 fence
      this.isFirstFence = fences.length === 0

      // For each fence
      fences.forEach((fence) => {
        // Create Fence HTML element
        this.renderFence(fence)
        // Track existing vertices
        this.trackVertex(fence.vertexStart)
        this.trackVertex(fence.vertexEnd)
      })

      this.updateConnectionPoints()
    }
  }
  //
  //
  // Fills up vertices Map() with (key,connections) in the form of ('100,200', 2)
  // Where '100' is X coords, '200' is Y coords, and '2' is the number of fences using that vertex
  trackVertex(vertex) {
    // Set key as 'coordX,coordY'
    const key = `${vertex.positionX},${vertex.positionY}`
    // Check for an already existing vertex with those coords (1), or set connections as (0)
    const connections = this.vertices.get(key) || 0
    // Increment connection count for this vertex (1) if first, (2) if second
    this.vertices.set(key, connections + 1)
  }
  //
  //
  // Connection points are used as starting point for any fence that isn't the first, and as closure point
  updateConnectionPoints() {
    // Remove connection points from html (point in an HTML element because that's what is pushed in the array)
    this.connectionPoints.forEach((point) => point.remove())
    // Set connectionPoints as empty array
    this.connectionPoints = []

    // Check each vertex from the vertices Map()
    this.vertices.forEach((connections, position) => {
      // If there is less that 2 fences using a vertex
      if (connections < 2) {
        // Get x and Y coords from the vertex position
        const [x, y] = position.split(',').map(Number)
        // Call addConnectionPoint function with coordinates
        this.addConnectionPoint(x, y)
      }
    })
  }
  //
  //
  // Create connection points HTML elements and style them
  addConnectionPoint(x, y) {
    // Create div element
    const point = document.createElement('div')
    // Give it classes
    point.className =
      'h-3 w-3 rounded-full bg-blue-500 absolute transform -translate-x-1/2 -translate-y-1/2'
    // Set it's position
    point.style.left = `${x}px`
    point.style.top = `${y}px`
    // Append to canvas
    this.canvas.appendChild(point)
    // Push into connectionPoints array
    this.connectionPoints.push(point)
  }
  //
  //
  // Seek out nearest connection point to snap to it
  findNearestConnectionPoint(point) {
    // Set up a snap distance
    const snapDistance = 50 // pixels
    // Set nearest as null
    let nearest = null
    // Define minDistance as snapDistance
    let minDistance = snapDistance

    // For each vertex
    this.vertices.forEach((connections, position) => {
      // If there is less than 2 connections
      if (connections < 2) {
        // Get x and Y coords from the vertex position
        const [x, y] = position.split(',').map(Number)
        // Calculate distance to vertex
        const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2))

        // If the distance is lower than the minDistance
        if (distance < minDistance) {
          // Set minDistance = distance, so for the remaining loops only vertex even closer will go in here
          minDistance = distance
          // Set nearest coordinates
          nearest = { x, y }
        }
      }
    })
    // Return coordinates of nearest connection point
    return nearest
  }
  //
  //
  // Handle mouse down event, mostly check conditions
  // get point coordinates from PlanEditor
  handleMouseDown(point) {
    // If no fence has been placed yet
    if (this.isFirstFence) {
      // Call startDrawing function at mouse point
      this.startDrawing(point)
      // If there is already at least one fence
    } else {
      // Seek nearest connection point via findNearestConnectionPoint method
      const nearestPoint = this.findNearestConnectionPoint(point)
      // If there is a connection point close enough
      if (nearestPoint) {
        // Call startDrawing function at connection point
        this.startDrawing(nearestPoint)
      }
    }
  }
  //
  //
  // Handle drawing state and creation of temporary fences HTML elements
  // get point from handleMouseDown (so either mouse point or nearest connection point)
  startDrawing(point) {
    // Set isDrawing state to true
    this.isDrawing = true
    // Set drawing start point to mouse point or nearest connection point
    this.drawStartPoint = point

    // Create a new element to show the fence line
    this.temporaryFence = document.createElement('div')
    // Add classes
    this.temporaryFence.className = 'absolute h-1 bg-black transform origin-left'
    // Handle placement via coordinates
    this.temporaryFence.style.left = `${point.x}px`
    this.temporaryFence.style.top = `${point.y}px`
    // Append a temporary fence to canva
    this.canvas.appendChild(this.temporaryFence)
  }
  //
  //
  //
  cancelDrawing() {
    if (this.temporaryFence) {
      this.temporaryFence.remove()
    }
    this.isDrawing = false
    this.drawStartPoint = null
    this.temporaryFence = null
  }
  //
  //
  // Handle temporary fence movement
  // get point from planEditor
  handleMouseMove(point) {
    // If we are not currently drawing, do nothing
    if (!this.isDrawing) return
    // Constantly seek nearest connection point
    const nearestPoint = this.findNearestConnectionPoint(point)
    // Define current endpoint of the temporary fence as mouse coordinates
    let endPoint = point

    // If a connection point is found
    if (nearestPoint) {
      // Snap to it
      endPoint = nearestPoint
      // Add styling class
      this.temporaryFence.classList.add('snapping-to-connection')
    } else {
      // Remove styling class if far enough
      this.temporaryFence.classList.remove('snapping-to-connection')
    }
    // Calculate the length and angle of the fence line
    // Get difference between startPoint and current endPoint on X and Y coordinates
    const deltaX = endPoint.x - this.drawStartPoint.x
    const deltaY = endPoint.y - this.drawStartPoint.y
    // Calculate length (Pythagore a²= b² + c² )
    const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    // Calculate angle
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)
    // atan2 returns radians, * (180 / Math.PI) transforms it into regular degrees

    // Update the temporary fence line according to length and angle
    this.temporaryFence.style.width = `${length}px`
    this.temporaryFence.style.transform = `rotate(${angle}deg)`
  }
  //
  //
  // Handle the creation of the fence
  // get point from planEditor
  async handleMouseUp(point) {
    // If not currently drawing, do nothing
    if (!this.isDrawing) return

    // Define default endpoint as current mouse position
    let endPoint = point

    // Seek near enough connection point
    const nearestPoint = this.findNearestConnectionPoint(point)
    // If we're near a connection point
    if (nearestPoint) {
      // overwrite default endpoint with connection point
      endPoint = nearestPoint
    }

    // If we are far enough from the starting point
    if (this.drawStartPoint.x !== endPoint.x || this.drawStartPoint.y !== endPoint.y) {
      try {
        // Redirect to FenceController 'create'
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

        // Get response data for error handling
        const responseData = await response.json()

        // If everything went alright in the FenceController
        if (response.ok) {
          // Set isFirstFence to false
          this.isFirstFence = false
          // Handle newly created fence's vertices
          this.trackVertex({ positionX: this.drawStartPoint.x, positionY: this.drawStartPoint.y })
          this.trackVertex({ positionX: endPoint.x, positionY: endPoint.y })
          // Upodate
          this.updateConnectionPoints()
          // Remove the temporary class
          this.temporaryFence.classList.remove('temporary-fence')

          // Use hasFormedEnclosure to check if the enclosure is now closed
          if (this.hasFormedEnclosure()) {
            // Handle enclosure
            this.handleEnclosureComplete()
          }
          // Error handling
        } else {
          console.error('Server error:', responseData)
          this.temporaryFence.remove()
        }
      } catch (error) {
        console.error('Failed to save fence:', error)
        this.temporaryFence.remove()
      }
    } else {
      // Remove temporary fence if not long enough
      this.temporaryFence.remove()
    }

    // Reinitialize states
    this.isDrawing = false
    this.drawStartPoint = null
    this.temporaryFence = null
  }
  //
  //
  // Render fences on load (called in loadingExistingFences)
  renderFence(fenceData) {
    // Create a fence HTML element
    const fenceElement = document.createElement('div')
    // Add classes and dataset
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
  //
  //
  // Used to check enclosure when adding a fence (called in handleMouseUp)
  // An enclosure is formed when all vertices have exactly 2 connections
  hasFormedEnclosure() {
    // define default state
    let hasOpenConnections = false
    // Check each vertex connections in vertices Map
    this.vertices.forEach((connections) => {
      // If at least one vertex has only one connection, it means the enclosure is not closed
      if (connections !== 2) {
        // Set state as true
        hasOpenConnections = true
      }
    })
    // return true if there is no open connection and at least 3 vertices
    return !hasOpenConnections && this.vertices.size > 2
  }
  //
  //
  // Call back-end response to handle enclosure completion
  async handleEnclosureComplete() {
    // Might want to:
    // 2. Calculate the enclosed area
    // 3. Validate the enclosure (e.g., minimum size)
    // 4. Update UI to show completion

    // Update DB to set Plan as 'isEnclosed' (PlanController -> completeEnclosure)
    try {
      const response = await fetch(`/api/plans/${this.planId}/complete-enclosure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
        },
      })

      // Once the plan is set as enclosed
      if (response.ok) {
        // Add visual feedback
        this.canvas.classList.add('enclosure-complete')

        // Observer pattern
        // Create ability to listen for an 'enclosureComplete' event on other files
        const event = new CustomEvent('enclosureComplete', {
          detail: { planId: this.planId },
        })
        // Dispatch the event from the canvas element
        this.canvas.dispatchEvent(event)
      }
    } catch (error) {
      console.error('Failed to complete enclosure:', error)
    }
  }
}
