export default class FenceDrawer {
  constructor(canvas, planId) {
    // Get basic properties
    this.canvas = canvas // Defined in PlanEditor, drawing area HTML element
    this.planId = planId // Defined in PlanEditor, used to push elements

    this.vertices = new Map() // Initialize Map() so we can store coordinates and number of fences linked
    this.connectionPoints = [] // Initialize empty array for connection points
    this.enclosureSnapDistance = 50 // Distance in pixels to snap to first vertex
    this.EPSILON = 0.001 // Margin of error value

    // Set default states
    this.temporaryFence = null // used to show fences that are being drawn but not confirmed yet
    this.drawStartPoint = null // used to calculate length and angle of fences and calculate vertex coords
    this.isDrawing = false // State required to not triggers mouse events constantly
    this.isFirstFence = true // Needed to be able to draw first fence without any connection point

    this.loadExistingFences() // Get existings fences from DB

    // Listen for fence deletions
    this.canvas.addEventListener('fenceDeleted', (event) => {
      this.loadExistingFences()
    })
  }

  // Get existing fences and update ConnectionPoints
  async loadExistingFences() {
    // GET fences from db
    const response = await fetch(`/api/fences/${this.planId}`)
    if (response.ok) {
      const fences = await response.json()
      // Set isFirstFence to false if there is at least 1 fence
      this.isFirstFence = fences.length === 0

      // Clear existing vertices and connection points
      this.vertices.clear()
      this.connectionPoints.forEach((point) => point.remove())
      this.connectionPoints = []

      // Remove all existing fence elements from the DOM
      const existingFences = this.canvas.querySelectorAll('.fence')
      existingFences.forEach((fence) => fence.remove())

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
    // Normalize coordinates to integers
    const x = Math.round(parseFloat(vertex.positionX))
    const y = Math.round(parseFloat(vertex.positionY))

    // Seek out 'almost indentical' vertex
    let existingKey = null
    this.vertices.forEach((connections, key) => {
      // Get coordinates from the key
      const [existingX, existingY] = key.split(',').map(Number)
      // Compare existing Vertex and potential new one with epsilon
      if (Math.abs(existingX - x) < this.EPSILON && Math.abs(existingY - y) < this.EPSILON) {
        existingKey = key
      }
    })

    // If we found a indentical Vertex
    if (existingKey) {
      // Use it and increment connections
      const connections = this.vertices.get(existingKey)
      this.vertices.set(existingKey, connections + 1)
    } else {
      // Create new vertex
      const key = `${x},${y}`
      this.vertices.set(key, 1)
    }
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
  stopPlacement() {
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

    // Check for potential intersection
    const wouldIntersect = this.wouldIntersectExistingFences(
      this.drawStartPoint.x,
      this.drawStartPoint.y,
      endPoint.x,
      endPoint.y
    )

    // Update visual feedback
    if (wouldIntersect) {
      this.temporaryFence.classList.add('invalid-placement')
      this.temporaryFence.classList.remove('valid-placement')
    } else {
      this.temporaryFence.classList.add('valid-placement')
      this.temporaryFence.classList.remove('invalid-placement')
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
      // Check for intersections before placing fence
      if (
        this.wouldIntersectExistingFences(
          this.drawStartPoint.x,
          this.drawStartPoint.y,
          endPoint.x,
          endPoint.y
        )
      ) {
        // Show error feedback
        this.temporaryFence.classList.add('invalid-placement')
        setTimeout(() => {
          this.temporaryFence.remove()
        }, 500)

        // Show a message to the user
        const errorMessage = document.createElement('div')
        errorMessage.className = 'placement-error-toast'
        errorMessage.textContent = 'Fences cannot cross each other'
        document.body.appendChild(errorMessage)
        setTimeout(() => errorMessage.remove(), 3000)

        return
      }
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
          this.trackVertex({
            positionX: Math.round(this.drawStartPoint.x),
            positionY: Math.round(this.drawStartPoint.y),
          })
          this.trackVertex({
            positionX: Math.round(endPoint.x),
            positionY: Math.round(endPoint.y),
          })
          // Upodate
          this.updateConnectionPoints()
          // Transform classes to permanent ones
          this.temporaryFence.className = 'fence element'
          // Add a dataset id
          this.temporaryFence.dataset.fenceId = responseData.id

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
    fenceElement.className = 'fence element'
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
    // Calculate the area
    const enclosedArea = this.calculateEnclosedArea()
    console.log('in handleEnclosureComplete')

    // Update DB to set Plan as 'isEnclosed' (PlanController -> completeEnclosure)
    try {
      const response = await fetch(`/api/plans/${this.planId}/complete-enclosure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
        },
        body: JSON.stringify({
          area: enclosedArea,
        }),
      })

      // Once the plan is set as enclosed
      if (response.ok) {
        const { areaCompletion } = await response.json()
        console.log('area Completion:' + areaCompletion)
        // Add visual feedback
        this.canvas.classList.add('enclosure-complete')

        // Observer pattern
        // Create ability to listen for an 'enclosureComplete' event on other files
        const event = new CustomEvent('enclosureComplete', {
          detail: { planId: this.planId, area: enclosedArea },
        })
        // Dispatch the event from the canvas element
        this.canvas.dispatchEvent(event)
        // Update just the area objective
        const areaObjectiveEl = document.querySelector('#area')
        if (areaObjectiveEl) {
          areaObjectiveEl.textContent = areaCompletion
        }
      }
    } catch (error) {
      console.error('Failed to complete enclosure:', error)
    }
  }
  //
  //
  // Define fences in order, and calculate enclosed area as a polygon
  calculateEnclosedArea() {
    // Get all fences of the plan
    // Convert Node to Array for ease of use
    const fenceElements = Array.from(this.canvas.querySelectorAll('.fence'))

    // Initilize empty array of ordered Vertices
    let orderedVertices = []
    // Initialize current vertex
    let currentVertex = null
    // Keep track of which fences are used
    let usedFences = new Set()

    // Start with the start vertex of first fence (which fence we start with is irrelevant)
    if (fenceElements.length > 0) {
      // Security check to avoid error
      const firstFence = fenceElements[0]
      const endpoints = this.getFenceEndpoints(firstFence)

      orderedVertices.push([endpoints.start.x, endpoints.start.y]) // Store vertex object into array
      currentVertex = [endpoints.start.x, endpoints.start.y] // Set just stored vertex as current
      usedFences.add(firstFence) // Set fence as used
    }

    // Seek all connected vertices until the loop is closed
    // __
    // For each fence, check start vertex (from style left and top), and end vertex (calculation)
    // Check if either start or end correspond to currentVertex, then go to other end
    // Avoid back and forth by storing usedFences
    while (usedFences.size < fenceElements.length) {
      // Function to seek out the next fence we'll use
      const nextFence = fenceElements.find((fence) => {
        if (usedFences.has(fence)) return false // Return false if the fence is used

        // Get fence Endpoints
        const endpoints = this.getFenceEndpoints(fence)

        // Return true if connects to our current vertex (either endpoint OR startpoint)
        const isConnected =
          (Math.abs(endpoints.start.x - currentVertex[0]) < 1 &&
            Math.abs(endpoints.start.y - currentVertex[1]) < 1) ||
          (Math.abs(endpoints.end.x - currentVertex[0]) < 1 &&
            Math.abs(endpoints.end.y - currentVertex[1]) < 1)

        if (isConnected) {
        }

        return isConnected
      })

      if (!nextFence) {
        break // Add safety break to prevent infinite loop
      }

      // If we found a nextFence (true returned)
      if (nextFence) {
        usedFences.add(nextFence) // Add this fence to used set
        // Get relevant informations again
        const startX = parseFloat(nextFence.style.left)
        const startY = parseFloat(nextFence.style.top)
        const angle = parseFloat(
          nextFence.style.transform.replace('rotate(', '').replace('deg)', '')
        )
        const width = parseFloat(nextFence.style.width)
        // Calculate end point
        const endX = startX + width * Math.cos((angle * Math.PI) / 180)
        const endY = startY + width * Math.sin((angle * Math.PI) / 180)

        // Add the vertex we haven't seen yet
        if (Math.abs(startX - currentVertex[0]) < 1 && Math.abs(startY - currentVertex[1]) < 1) {
          currentVertex = [endX, endY]
        } else {
          currentVertex = [startX, startY]
        }
        // Add new 'currentVertex' to array
        orderedVertices.push(currentVertex)
      }
    }

    // Apply Shoelace formula
    // It calculates the area of a polygon using its vertices
    let area = 0 // Initialize area as 0
    for (let i = 0; i < orderedVertices.length; i++) {
      const j = (i + 1) % orderedVertices.length
      area += orderedVertices[i][0] * orderedVertices[j][1]
      area -= orderedVertices[j][0] * orderedVertices[i][1]
    }
    area = Math.abs(area) / 2

    // Convert square pixels to square meters
    const pixelsPerMeter = 100 // scale
    const areaInSquareMeters = area / (pixelsPerMeter * pixelsPerMeter)

    console.log('total square meters: ' + areaInSquareMeters)
    return areaInSquareMeters
  }
  //
  //
  // Method to check if a fence would intersect with an existing fence
  wouldIntersectExistingFences(startX, startY, endX, endY) {
    // Get all fences
    const fences = Array.from(this.canvas.querySelectorAll('.fence'))

    // Get starting and ending point of new fence
    const newStart = { x: startX, y: startY }
    const newEnd = { x: endX, y: endY }

    // For each fence
    for (const fence of fences) {
      // Get the end points
      const endpoints = this.getFenceEndpoints(fence)
      // Starting point
      const existingStart = endpoints.start
      // Ending point
      const existingEnd = endpoints.end

      // Check for common endpoints between new and existing fences
      const sharesEndpoint =
        this.arePointsEqual(newStart, existingStart) ||
        this.arePointsEqual(newStart, existingEnd) ||
        this.arePointsEqual(newEnd, existingStart) ||
        this.arePointsEqual(newEnd, existingEnd)

      // If there is a shared endpoint, intersection authorized
      if (sharesEndpoint) {
        continue // Go to nect fence
      }

      if (
        this.checkLineIntersection(
          startX,
          startY,
          endX,
          endY,
          endpoints.start.x,
          endpoints.start.y,
          endpoints.end.x,
          endpoints.end.y
        )
      ) {
        return true // Intersection detected
      }
    }
    return false // No intersection
  }
  //
  //
  // Helper method to compare 2 points, with epsilon margin of error
  arePointsEqual(point1, point2) {
    return (
      Math.abs(point1.x - point2.x) < this.EPSILON && Math.abs(point1.y - point2.y) < this.EPSILON
    )
  }
  //
  //
  // Method called in wouldIntersectExistingFences to check intersection
  checkLineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
    // Check for shared endpoints
    if (
      (Math.abs(x1 - x3) < this.EPSILON && Math.abs(y1 - y3) < this.EPSILON) ||
      (Math.abs(x1 - x4) < this.EPSILON && Math.abs(y1 - y4) < this.EPSILON) ||
      (Math.abs(x2 - x3) < this.EPSILON && Math.abs(y2 - y3) < this.EPSILON) ||
      (Math.abs(x2 - x4) < this.EPSILON && Math.abs(y2 - y4) < this.EPSILON)
    ) {
      // If segments share an endpoint, this is not condidered as an intersection
      return false
    }
    // Calculate the denominators
    const denominator = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3)
    if (Math.abs(denominator) < this.EPSILON) return false // Lines are parallel if denominator is null

    // Calculate intersection point parameters
    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator

    // Return true if the intersection is within both line segments
    return (
      ua >= -this.EPSILON && ua <= 1 + this.EPSILON && ub >= -this.EPSILON && ub <= 1 + this.EPSILON
    )
  }
  //
  //
  // DRY method to get endpoint from a fence element
  getFenceEndpoints(fence) {
    // Get relevant informations from style
    const startX = parseFloat(fence.style.left)
    const startY = parseFloat(fence.style.top)
    const angle = parseFloat(fence.style.transform.replace('rotate(', '').replace('deg)', ''))
    const width = parseFloat(fence.style.width)

    // Calculate end point
    const endX = startX + width * Math.cos((angle * Math.PI) / 180)
    const endY = startY + width * Math.sin((angle * Math.PI) / 180)

    // return result
    return {
      start: { x: startX, y: startY },
      end: { x: endX, y: endY },
    }
  }
  //
  //
  // Method implementing the use of EPSILON as a margin of error
  arePointsEqual(point1, point2) {
    return (
      Math.abs(point1.x - point2.x) < this.EPSILON && Math.abs(point1.y - point2.y) < this.EPSILON
    )
  }
}
