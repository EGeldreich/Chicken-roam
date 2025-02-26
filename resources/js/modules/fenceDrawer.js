import EnclosureService from '../services/enclosureService'

export default class FenceDrawer {
  constructor(canvas, planId, placedElements, planEditor) {
    // Add EnclosureService instance
    this.enclosureService = new EnclosureService(this.EPSILON)

    // Get basic properties
    this.canvas = canvas // Defined in PlanEditor, drawing area HTML element
    this.planId = planId // Defined in PlanEditor, used to push elements
    this.placedElements = placedElements // Shared array of elements
    this.planEditor = planEditor // Reference planEditor for useful methods

    this.vertices = new Map() // Initialize Map() so we can store coordinates and number of fences linked
    this.connectionPoints = [] // Initialize empty array for connection points
    this.enclosureSnapDistance = 50 // Distance in pixels to snap to first vertex
    this.EPSILON = 0.001 // Margin of error value
    this.MIN_ANGLE_DEG = 15 // Minimum angle between 2 consecutive fences

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
      // Check for placement validity using helper method
      const checkResult = this.checkPlacementValidity(
        this.drawStartPoint.x,
        this.drawStartPoint.y,
        endPoint.x,
        endPoint.y
      )

      // If the placement is invalid
      if (checkResult.invalid) {
        // Create error display
        const errorMessage = document.createElement('div')
        errorMessage.className = 'placement-error-toast'

        if (checkResult.reason === 'angle') {
          errorMessage.textContent = `Angle between two fences should be at least ${this.MIN_ANGLE_DEG}°.`
        } else {
          errorMessage.textContent = 'Fences cannot intersect.'
        }

        // Append to DOM for 3 seconds
        document.body.appendChild(errorMessage)
        setTimeout(() => errorMessage.remove(), 3000)

        // Add error class to temporary fence
        this.temporaryFence.classList.add('invalid-placement')
        setTimeout(() => {
          this.temporaryFence.remove()
        }, 500)

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
  // Calls enslosureService method
  hasFormedEnclosure() {
    return this.enclosureService.isEnclosureComplete(this.vertices)
  }
  //
  //
  // Call back-end response to handle enclosure completion
  async handleEnclosureComplete() {
    // Calculate the area
    const enclosedArea = this.calculateEnclosedArea()

    // Before sending to the backend, check existing elements if plan was previously broken
    const wasInBrokenState = this.planEditor.planState === 'broken'

    // If the plan was previously broken, categorize existing elements
    let elementsToUpdate = []
    let elementsToRemove = []

    if (wasInBrokenState) {
      // Use the categorizeElements method from PlanEditor
      const { inside, outside } = this.planEditor.categorizeElements()

      // Elements inside the new enclosure should be reactivated
      elementsToUpdate = inside.map((el) => el.id)

      // Elements outside the new enclosure should be removed
      elementsToRemove = outside.map((el) => el.id)

      // Mark elements for visual update
      outside.forEach((el) => {
        const domElement = document.querySelector(`[data-element-id="${el.id}"]`)
        if (domElement) {
          domElement.classList.add('outside-enclosure')
        }
      })

      // Ask user for confirmation before removing elements
      if (elementsToRemove.length > 0) {
        const confirmRemoval = confirm(
          `${elementsToRemove.length} elements are now outside the enclosure and will be removed. Continue?`
        )

        if (!confirmRemoval) {
          // User canceled - clear visual markings
          document.querySelectorAll('.outside-enclosure').forEach((el) => {
            el.classList.remove('outside-enclosure')
          })
          return // Don't complete the enclosure
        }
      }
    }

    // Update DB to set Plan as 'isEnclosed' and handle elements
    try {
      const response = await fetch(`/api/plans/${this.planId}/complete-enclosure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
        },
        body: JSON.stringify({
          area: enclosedArea,
          elementsToUpdate, // Elements to reactivate
          elementsToRemove, // Elements to remove
        }),
      })

      // Once the plan is set as enclosed
      if (response.ok) {
        const responseData = await response.json()
        const areaCompletion = responseData.areaCompletion
        const newState = responseData.newState || 'enclosed'

        console.log('area Completion:' + areaCompletion)

        // Add visual feedback
        this.canvas.classList.add('enclosure-complete')

        // Update the plan state in the editor
        this.planEditor.updatePlanState(newState)

        // If elements were removed, remove them from the DOM and tracking array
        if (elementsToRemove.length > 0) {
          elementsToRemove.forEach((id) => {
            const element = document.querySelector(`[data-element-id="${id}"]`)
            if (element) element.remove()
          })

          // Update the placedElements array
          this.planEditor.placedElements = this.planEditor.placedElements.filter(
            (el) => !elementsToRemove.includes(el.id)
          )
        }

        // Observer pattern
        // Create ability to listen for an 'enclosureComplete' event on other files
        const event = new CustomEvent('enclosureComplete', {
          detail: {
            planId: this.planId,
            area: enclosedArea,
            elementsRemoved: elementsToRemove.length,
          },
        })
        // Dispatch the event from the canvas element
        this.canvas.dispatchEvent(event)
        // Update just the area objective
        const areaObjectiveEl = document.querySelector('#area')
        if (areaObjectiveEl) {
          areaObjectiveEl.textContent = areaCompletion
        }

        // If elements were removed or updated, show a message
        if (elementsToRemove.length > 0 || elementsToUpdate.length > 0) {
          const message = document.createElement('div')
          message.className = 'enclosure-update-toast'
          message.textContent = `Enclosure complete! ${elementsToUpdate.length} elements reactivated, ${elementsToRemove.length} elements removed.`
          document.body.appendChild(message)
          setTimeout(() => message.remove(), 5000)
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
    // Get all fences
    const fenceElements = Array.from(this.canvas.querySelectorAll('.fence'))

    // Use the service to get ordered vertices
    const orderedVertices = this.enclosureService.getOrderedVertices(fenceElements)

    console.log(`Found ${orderedVertices.length} ordered vertices`)

    // Use the service to calculate area
    const areaInSquareMeters = this.enclosureService.calculateArea(orderedVertices)

    console.log(`Area in square meters: ${areaInSquareMeters}`)
    return areaInSquareMeters
  }
  //
  //
  // Method to check if a fence would intersect with an existing fence
  wouldIntersectExistingFences(startX, startY, endX, endY) {
    // this.debugIntersection(startX, startY, endX, endY)
    // console.log(this.checkPlacementValidity(startX, startY, endX, endY))
    return this.checkPlacementValidity(startX, startY, endX, endY).invalid
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
      // If segments share an endpoint, this is not considered as an intersection
      return false
    }

    // Calculate the denominators
    const denominator = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3)

    // If the denominator is close to zero, the lines are parallel or colinear
    if (Math.abs(denominator) < this.EPSILON) return false

    // Calculate intersection point parameters
    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator

    return ua > this.EPSILON && ua < 1 - this.EPSILON && ub > this.EPSILON && ub < 1 - this.EPSILON
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
  // Method to calculate angle between 2 fences. Used to avoid superposition
  calculateAngleBetweenLines(line1Start, line1End, line2Start, line2End) {
    // Line verctors
    const vector1 = {
      x: line1End.x - line1Start.x,
      y: line1End.y - line1Start.y,
    }
    const vector2 = {
      x: line2End.x - line2Start.x,
      y: line2End.y - line2Start.y,
    }

    // Scalare product / Dot product
    const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y

    // Vectors length
    const magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y)
    const magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y)

    // Security to avoir dividing by 0
    if (magnitude1 < this.EPSILON || magnitude2 < this.EPSILON) {
      return 0 // length too small
    }

    // Angle cosinus
    const cosAngle = dotProduct / (magnitude1 * magnitude2)
    // Radial angle
    const angleRad = Math.acos(Math.max(-1, Math.min(1, cosAngle)))
    // Convert to degrees
    let angleDeg = angleRad * (180 / Math.PI)

    return 180 - angleDeg
  }

  checkPlacementValidity(startX, startY, endX, endY) {
    // Get all fences
    const fences = Array.from(this.canvas.querySelectorAll('.fence'))

    const newStart = { x: startX, y: startY } // Start point of new fence
    const newEnd = { x: endX, y: endY } // End point of new fence

    const result = { invalid: false, reason: null } // Default result

    // First, check angle
    // For each fence ...
    for (const fence of fences) {
      const endpoints = this.getFenceEndpoints(fence) // Get endpoints

      // Check if the new fence start point is used by another fence
      // (Should always be the case except for the first fence)
      const sharesStartPoint =
        this.arePointsEqual(newStart, endpoints.start) ||
        this.arePointsEqual(newStart, endpoints.end)

      // Check if the new fence end point is used by another fence
      // (Should be the case only on fence closure, or if a fence has been deleted)
      const sharesEndPoint =
        this.arePointsEqual(newEnd, endpoints.start) || this.arePointsEqual(newEnd, endpoints.end)

      // If there is a shared point
      if (sharesStartPoint || sharesEndPoint) {
        // Calculate angle
        const angle = this.calculateAngleBetweenLines(
          newStart,
          newEnd,
          endpoints.start,
          endpoints.end
        )

        // Check angle validity
        if (angle < this.MIN_ANGLE_DEG) {
          result.invalid = true
          result.reason = 'angle'
          return result
        }
      }
    }

    // Secondly, check for intersections
    // For each fence ...
    for (const fence of fences) {
      const endpoints = this.getFenceEndpoints(fence) // Get endpoints

      // Check if we share an endpoint
      const sharesEndpoint =
        this.arePointsEqual(newStart, endpoints.start) ||
        this.arePointsEqual(newStart, endpoints.end) ||
        this.arePointsEqual(newEnd, endpoints.start) ||
        this.arePointsEqual(newEnd, endpoints.end)

      // If an endpoint is shared, intersection is tolerated
      if (sharesEndpoint) {
        continue
      }

      // Check intersections on non-linked fences
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
        // Update result accordingly
        result.invalid = true
        result.reason = 'intersection'
        return result
      }
    }

    return result // Valid placement
  }
  //
  //
  //________________________________________________________________________________________________________
  // debugIntersection(startX, startY, endX, endY) {
  //   // Get all fences
  //   const fences = Array.from(this.canvas.querySelectorAll('.fence'))
  //   let intersectingFences = []

  //   // Pour chaque clôture...
  //   fences.forEach((fence, index) => {
  //     const endpoints = this.getFenceEndpoints(fence)

  //     // Vérifier si nous partageons une extrémité
  //     const sharesEndpoint =
  //       this.arePointsEqual({ x: startX, y: startY }, endpoints.start) ||
  //       this.arePointsEqual({ x: startX, y: startY }, endpoints.end) ||
  //       this.arePointsEqual({ x: endX, y: endY }, endpoints.start) ||
  //       this.arePointsEqual({ x: endX, y: endY }, endpoints.end)

  //     // Si nous partageons une extrémité, l'intersection est tolérée
  //     if (sharesEndpoint) {
  //       return
  //     }

  //     // Vérifier l'intersection
  //     const intersects = this.checkLineIntersection(
  //       startX,
  //       startY,
  //       endX,
  //       endY,
  //       endpoints.start.x,
  //       endpoints.start.y,
  //       endpoints.end.x,
  //       endpoints.end.y
  //     )

  //     if (intersects) {
  //       intersectingFences.push({
  //         index,
  //         fence,
  //         endpoints,
  //       })
  //     }
  //   })

  //   if (intersectingFences.length > 0) {
  //     console.log('=== INTERSECTIONS DÉTECTÉES ===')
  //     console.log(`Nouvelle clôture: (${startX}, ${startY}) → (${endX}, ${endY})`)
  //     intersectingFences.forEach(({ index, endpoints }) => {
  //       console.log(
  //         `Clôture #${index}: (${endpoints.start.x}, ${endpoints.start.y}) → (${endpoints.end.x}, ${endpoints.end.y})`
  //       )
  //     })
  //   }

  //   return intersectingFences.length > 0
  // }
}
