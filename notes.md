# Guide du fonctionnement Chicken Roam

## Initialisation sur une nouvelle machine

Installer node.js si nécessaire

Récupérer les modules du projet.

```bash
npm install
```

Vérifier le fichier .env, en dupliquant et modifiant .env.exemple
Créer une nouvelle **APP_KEY**.

```bash
node ace generate:key
```

Créer une table 'chicken_roam', puis

```bash
node ace migration:run
node ace db:seed
```

## Middlewares

> Dans AdonisJs, un middleware forment une série de fonctions qui s'éxécutent durant une requête HTTP. Chaque middleware sert de **_checkpoint_** avec une condition à remplir

#### Utilisation de **Router Middleware**

L'usage de middleware dans mon application se limite aux middleware liés aux routes.  
Ils sont liés à une route, et sont éxécuté à chaque appel de ces routes.  
Le **guest** middleware rend une route innaccessible aux utilisateurs connectés.  
A l'inverse, le **auth** middleware rend une route innaccessible aux utilisateurs non connectés.

## Authentification

#### Session Guard

Mon application utilise le **_Session Guard_** d'AdonisJS.  
Défini dans le fichier **config/auth.ts.**

#### Register

Dirige vers la vue **auth/register**.  
Sur cette vue, un formulaire redirige vers **_AuthController handleRegister_**.  
Valide les inputs (**_RegisterUserValidator_**).  
Crée un nouvel utilisateur en utilisant le User model.

```typescript
const user = await User.create({ username, email, password })
```

#### Login

Dirige vers la vue **auth/login**.  
Formulaire redirige vers **_AuthController handleLogin_**.  
Utilise la méthode verifyCredentials d'AdonisJs pour trouver le bon utilisateur.

```typescript
const user = await User.verifyCredentials(email, password)
```

Utilise ensuite la methode login pour enregister l'utilisateur en session.

```typescript
await auth.use('web').login(user, !!request.input('remember_me'))
```

#### Logout

Utilise simplement la méthode logout d'AdonisJs.  
Cette méthode supprime l'utilisateur de la session

```typescript
await auth.use('web').logout()
```

On utilise une requête de type **delete**.

```typescript
router.delete('/login', [AuthController, 'logout']).as('auth.logout')
```

Pour cela, il a fallu activer le **Method Spoofing**.
**_allowMethodSpoofing: true_** dans **_config/app.ts_**

#### Remember Me Tokens

Pour une meilleure experience utilisateur, j'utilise la fonction **Se souvenir de moi**.  
On crée une table pour les tokens :

> node ace make:migration remember_me_tokens
> Un utilisateur qui se connecte récupère également un cookie.  
> Le cookie est comparé à la base de donnée lors de la prochaine ouverture du site.

#### Temporary Plan sauvegarde

Lors d'un register, si un plan est en session comme plan temporaire (càd un plan créé comme guest).  
Le plan temporaire est modifié pour appartenir au nouvel utilisateur.  
Cela se fait simplement en modifiant le **userID: null** dans la base de donnée en **userId: user.id**. **User.id** étant récupéré lors de la création du nouvel utilisateur.

## Onboarding

#### Utilisateur vs invité

Pour traiter différement les plans des utilisateurs et des invités, je redirige chacun différement.  
J'ai créé deux formulaires. Un dans lequel l'utilisateur choisis son nombre de poules, et l'autre dans lequel il y a par defaut 10 poules, pour aller plus vite.  
L'ouverture de ces formulaires est soumis à une condition, afin de rediriger en fonction de l'état connecté ou non.

```html
@if(auth.use('web').isAuthenticated)
<form action="/plan" method="POST">
  @else
  <form action="/plan/guest" method="POST">@end</form>
</form>
```

#### Limité à un seul plan d'invité

Puisqu'un invité est automatiquement redirigé vers un plan sans **userID**. Je fais en sorte qu'il ne puisse y avoir qu'un seul **plan d'invité** par session.

Pour cela, dans **_HomeController guestLanding_**, je vérifie la présence d'une plen temporaire, et le supprime si il y a création d'un nouveau plan.

```typescript
const tempPlanId = session.get('temporaryPlanId')
if (tempPlanId) {
  let oldPlan = await Plan.query().where('id', tempPlanId).preload('objectives').firstOrFail()
  oldPlan.delete()
}
```

## Plan

#### PlanEditor

Pour la partie **Front-end** du plan, tout transite par la classe javascript **PlanEditor**.  
Cette classe sert de base d'appel pour initialiser tous les outils.  
Elle sert également à gérer les évènements (mouse up, move et down) et à appeler les bonnes méthodes.

En plus de cela, c'est ici que ce gère tout ce qui est lié au plan en dehors de la zone de dessin. Comme la boite à outil, le nom du plan, la capacité à zoomer ...

#### PlanController

Pour la partie **Back-end** du plan, cela se passe dans le plan controller pour les manoeuvres générales.

1. **guestPlan** s'occupe de récupérer les informations liées au plan d'invité (et potentiellement de supprimer l'ancien plan temporaire si besoin).
2. **plan** recupère les informations liées à un plan d'utilisateur spécifique, via son id.
3. **completeEnclosure** permet de faire passer la valeur stockée en base de donnée **_isEnclosed_** à vraie. Cela n'implique pour le moment que l'impossibilté de rajouter de nouvelles clôtures, mais impliquera plus dans le futur.

## Elements

#### ElementDrawer

C'est ici que se passe la partie **Front-end** des éléments.  
J'y définie les informations et les méthodes générales, puis fait hériter ces valeurs aux éléments plus spécifiques.

```javascript
export default class ShrubDrawer extends ElementDrawer {...}
```

l'ElementDrawer s'occupe de :

1. **loadElements()**, récupérer les éléments déjà existants du plan
2. **stopPlacement()**, arrêter le placement d'éléments
3. **startPlacement()**, commencer le placement d'un élément.
4. **createTemporaryElement()**, créer un élément HTML temporaire qui suit la souris, représentant le placement potentiel d'un élément.
5. **handleMouseMove**, transmet une coordonnée correspondant au placement de la souris.
6. **updateTemporaryElement()**, si un élément est en cours de placement, utilise les coordonnées données par **handleMouseMove** pour que la prévisualisation suive la souris.
7. **placeElement()**, vérifie l'absence de superposition (via **wouldOverlap()**), et le cas échéant, appelle **renderPlacedElement()**. Sert également à mettre à jour les objectifs via **updateObjectivesDisplay()**
8. **renderPlacedElement()**, créer un élément HTML qui représente l'élément ajouté. Le placement est gérer par les coordonnées récupérées par **handleMouseMove()** et un calcule simple.
9. **wouldOverlap()**, vérifie l'absence de superposition. On utilise pour cela l'algorithme de detection de collision **_Axis-Aligned Bounding Box (AABB)_**
10. **showPlacementError()**, renvoie un signal visuel si l'utilisateur tente de placer incorrectement un élément
11. **updateObjectivesDisplay()**, s'occupe de mettre à jour le contenu textuel des objectifs.

#### ElementController

Gère la partie **Back-end** des éléments du plan.  
Se compose des méthodes suivantes :

1. **create**, ajoute les éléments en base de données, et va chercher les informations liées à la complétion des objectifs.

L'ajout d'un élément en base de donnée se fait en récupérant les informations fournies par l'**ElementDrawer**.  
Toute la logique d'ajout se fait avec un trx.
Dans un premier temps, à l'aide des positions, on crée un nouveau vertex.

```typescript
const vertex = await Vertex.create(
  {
    positionX,
    positionY,
    planId,
  },
  { client: trx }
)
```

Ce vertex s'ajoute aux autres informations pour la création de l'élément.

```typescript
const element = await Element.create(
  {
    planId,
    type,
    vertexId: vertex.id,
    objectiveValue,
    width,
    height,
    description: '',
  },
  { client: trx }
)
```

Une fois l'élément ajouté en base de données, on appelle l'**ObjectiveService** pour recalculer l'avancée des objectifs.  
On renvoit au **_front_** toutes les informations dont il a besoin.

```typescript
return response.created({
  element,
  objectives: plan.objectives.map((objective) => ({
    id: objective.id,
    name: objective.name,
    description: objective.description,
    target_value: objective.$extras.pivot_target_value,
    completion_percentage: objective.$extras.pivot_completion_percentage,
    unit: objective.unit,
  })),
})
```

2. **getByPlan()**, beaucoup plus simple, cette méthode se contente de chercher tous les éléments d'un plan dont on connait l'id. L'information est renvoyée au **_front_** pour être utilisée dans la méthode **loadElements()**

## Récupération en temps réel de la complétion des objectifs

Afin de mettre à jour la complétion des objectifs, la logique est la suivante :

1. Lors du placement d'un élément (**_placeElement() dans ElementDrawer_**), **objectiveValue** est envoyé parmis les infos concernant l'élément.
2. Dans **_create() de l'ElementsController_**, on appelle l'**ObjectiveService** et sa méthode **recalculateForPlan**.
3. Dans cette méthode, on trouve le plan par son id, on calcule le taux de complétion de tous les objectifs, on update la base de donnée avec le nouveau taux.
4. Dans la suite de **_create() de l'ElementsController_**, dans la réponse envoyée, on inclut le taux de completion.
5. Dans la suite de **_placeElement() de l'ElementDrawer_**, on appelle la méthode **updateObjectivesDisplay()**.
6. **updateObjectivesDisplay()** remplace le **_textContent_** des taux de complétion.

## TRX

trx est le nom données aux variables qui englobent une **database transaction**.  
Le principe d'une transaction est de faire un certain nombre de requête avec un logique de paquet.
Une transaction suit la principe ACID :

1. Atomicité
   > Toutes les opérations de la transaction sont soit complètement effectués, soit toutes échouées.
2. Cohérence
   > La base de données reste dans un état cohérent avant et après la transaction. Oblige la transaction à respecter les règles d'intégrités définies.
3. Isolation
   > Les transactions sont isolées les unes des autres jusqu'à ce qu'elles soient terminées. Les transactions ne peuvent dont pas causer d'interférences entre elles.
4. Durabilité
   > Une fois qu'une transaction est validée (**_commit_**), ses effets sont permanents et survivent en cas de problème technique après la validation.

## Pseudo systeme d'API

Bien que le site ne nécessite pas réellement d'API, on utilise la syntaxe d'une API et le fonctionnement d'endpoints.  
Ainsi, lors de l'ajout d'un élément à la pase de donnée, on utilise /api/elements avec une requête POST.  
Pour récupérer toutes les clôtures d'un plan, on utilise /api/fences/:idPlan en GET.

```typescript
// Routes for fence operations
router.get('/api/fences/:planId', [FencesController, 'getByPlan'])
router.post('/api/fences', [FencesController, 'create'])
router.delete('/api/fences/:id', [FencesController, 'delete'])
router.post('/api/plans/:planId/complete-enclosure', [PlansController, 'completeEnclosure'])
```

## Selecteur

Le selecteur est simplement lié au **PlanEditor** via la méthode **_handleMouseDown()_** qui appelle la méthode **_selectElement()_** du **Selector**.  
En plus d'un petit peu de logique pour déselectionner l'ancien élément, la méthode repose seulement sur l'**event.target** qui est fourni par le **PlanEditor**

```typescript
const targetElement = event.target
```

C'est également dans le selecteur que se gère la suppression d'éléments.

## Supression d'élement ou de clôture

Dans le **Selector**, méthode **_handleDelete()_**.  
On gère la supression des clôtures et des éléments de manière indépendantes, afin de coller avec la construction de la base de donnée et du fonctionnement en **_endpoint API_**.  
On appelle l'endpoint lié, avec une méthode DELETE.  
En back, dans le controller lié, on supprime la ligne de la base de donnée.  
Retour dans le front, pour une clotûre, on envoit un évènement **_fenceDeleted_** qui sera receptionné dans le **fenceDrawer**.  
Pour un élément, on récupère les data lié aux objectives et on redirige vers la méthode **_updateObjectivesDisplay()_**. On retire également l'élément du tableau **_placedElements_** qui s'occupe des collisions.  
Dans les deux cas, on **_remove()_** l'élément du **DOM**.

## Etats du plan

Le plan a 3 états possible.

1. **'Construction'**
2. **'Enclosed'**
3. **'Broken'**

Chaque état induit une logique.

1. **'Construction'**
   Dans cet état, la clôture n'a jamais été complète, il est uniquement possible de placer des clôtures.
2. **'Enclosed'**
   Dans cet état, la clôture est complète, il est possible de placer / supprimer des éléments, ou déplacer / supprimer des clôtures.  
   Il est impossible d'ajouter de nouvelles clôtures
3. **'Broken'**
   Dans cet état, la clôture a détà été complète, mais au moins une clôture à été supprimée.  
   Il est de nouveau uniquement possible de placer ou déplacer des clôtures jusqu'à une nouvelle complétion de l'enclos.  
   Durant l'état **_broken_**, les éléments sont désactivés.  
   Lorsque l'enclos est complété à nouveaux, les éléments qui ne sont plus à l'intérieur sont supprimés.

## Changement de position des éléments

#### Déplacement de l'élément

Avec la même logique que lors du placement, l'élément selectionné se place en fonction de la souris en mettant constament à jour le style.

```javascript
updateSelectedElementPosition(point) {
    if (!this.selectedElement) return

    this.selectedElement.style.left = `${point.x}px`
    this.selectedElement.style.top = `${point.y}px`
  }
```

#### Vérification de la validité

Encore une fois même logique que lors du placement, on appelle d'ailleurs la même fonction.  
Petite subtilité tout de même, il faut temporairement supprimé l'élément selectionné du tableau de l'ensemble des éléments qui est utilisé pour detecter les collisions.

```javascript
this.draggedElement = this.planEditor.placedElements.splice(this.elementIndex, 1)[0]
```

On le replace une fois le déplacement terminé.

```javascript
this.planEditor.placedElements.splice(this.elementIndex, 0, this.draggedElement)
```

#### Update dans la database

La seule chose à changer en base de donnée est finalement les coordonnées du vertex lié à l'élément.  
On trouve le vertex via l'élément, puis on modifie le vertex et on sauvegarde les changements.
On fait tous ces changements dans une transaction, pour éviter un changement partiel.

```typescript
const element = await Element.findOrFail(params.id, { client: trx })

// Find linked vertex
element.useTransaction(trx)
await element.load('vertex')
// Update it
const vertex = element.vertex
vertex.positionX = positionX
vertex.positionY = positionY

// Save update
vertex.useTransaction(trx)
await vertex.save()
```

## Changement de position des vertex

#### Selection des vertices

Lors de la création d'une clôture dans le fenceDrawer, on ajoute systématiquement les sommets à la map this.vertices.  
Si un point n'est lié qu'à une clôture, c'est un **_connection-point_**.  
Si il est lié à 2 clôtures, c'est un **_movable-point_**.

Ces points sont sélectionnables et déplacables. Ils ne peuvent pas être supprimé directement.

#### Validations lors du mouvement

Peu importe le type de point, des validations sont à faire.  
Ce sont les mêmes que lors de la création d'une nouvelle clôture.

1. Pas d'intersection.
2. Pas d'angle inférieur à 15°.
3. Pas de collision avec les éléments.
4. Pas d'élément en dehors de la clôture.

Pour cela, on vérifie toutes les conditions dans **checkVertexPlacement()** du commonFunctionsService.

#### Snapping et fusion de vertex

Lors du déplacement d'un **_connection-point_** sur un autre **_connection-point_** libre, ils "fusionnent".  
C'est à dire que le vertex qui se fait déplacer est effacé, et son id (soit **vertexEnd** soit **vertexStart**) est remplacé par celui sur lequel il s'est déplacé.  
De cette façon, le **_connection-point_** devient un **_movable-point_**, puisqu'il a deux connections.

```typescript
// Find the fence to update
const fence = await Fence.findOrFail(params.id)

// Load vertices
await fence.load('vertexStart')
await fence.load('vertexEnd')

// Find the oldVertex in relation to the fence
let isStartVertex = false
if (fence.vertexStartId === parseInt(oldVertex)) {
  isStartVertex = true
} else if (fence.vertexEndId === parseInt(oldVertex)) {
  isStartVertex = false
} else {
  return response.badRequest({
    error: 'Cannot find specified oldVertex',
  })
}

// Replace the old vertex by the new one
if (isStartVertex) {
  fence.vertexStartId = parseInt(newVertex)
} else {
  fence.vertexEndId = parseInt(newVertex)
}

// Save Fence change
await fence.save()
```

## Formules mathématiques utilisées

#### Système de detection des collisions AABB

Se base sur la logique que 2 boîtes se chevauchent si et seulement si :

> La droite de A est à droite de la gauche de B
> La gauche de A est à gauche de la droite de B
> Le bas de A est en-dessous du haut de B
> Le haut de A est au-dessus du bas de B

Ce qui devient dans **_ElementDrawer_** :

```typescript
if (
  newElement.left < existingElement.right &&
  newElement.right > existingElement.left &&
  newElement.top < existingElement.bottom &&
  newElement.bottom > existingElement.top
) {
  return true // Collision detectée
}
```

#### Trouver la longueur et l'angle d'une clôture

```javascript
// Calculate length and angle
const deltaX = endX - startX
const deltaY = endY - startY
const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)
```

Utilisation de Pythagore pour la longueur.

> a² = b² + c²

Pour l'angle, calcule de l'arc tangente avec Math.atan2, puis transformation en degrés avec \* (180 / Math.pi)

#### Trouver le point le plus proche

```javascript
// In fenceDrawer.js
const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2))
```

Utilisation de la formule euclidienne.  
Comparaison de la distance avec chaque point déjà présent.

> Distance entre A et B est égal à Racine carrée de ((Ax - Bx)² + (Ay - By)²)

#### Détection d'intersection pour les clôtures

```javascript
checkLineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
    // Calculate the denominators
    const denominator = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3)
    if (denominator === 0) return false // Lines are parallel

    // Calculate intersection point parameters
    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator

    // Return true if the intersection is within both line segments
    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1
}
```

Utilisation de l'algorithme d'intersection de segments de droite basé sur les équations paramétriques.  
Si le dénominateur est nul, les lignes sont parallèles ou colinéaires.  
Les paramètres ua et ub indiquent où l'intersection se produit le long de chaque segment.

> Une intersection existe si et seulement si 0 ≤ ua ≤ 1 et 0 ≤ ub ≤ 1

#### Calcul de la surface d'un enclos

```javascript
// Apply Shoelace formula
let area = 0
for (let i = 0; i < orderedVertices.length; i++) {
  const j = (i + 1) % orderedVertices.length
  area += orderedVertices[i][0] * orderedVertices[j][1]
  area -= orderedVertices[j][0] * orderedVertices[i][1]
}
area = Math.abs(area) / 2
```

Utilisation de la formule du lacet (ou formule de Gauss) pour calculer l'aire d'un polygone simple.  
Chaque paire de points consécutifs contribue à l'aire totale.  
La valeur absolue et la division par 2 sont nécessaires pour obtenir l'aire correcte, indépendamment de l'ordre des sommets.

> Aire = (1/2) × |∑(x₁y₂ - x₂y₁ + x₂y₃ - x₃y₂ + ... + xₙy₁ - x₁yₙ)|

#### EPSILON

Afin d'éviter des problèmes liés à la précision limitée des chiffres en mémoire :

```javascript
0.1 + 0.2 === 0.3 // Retourne false!
// Le résultat réel est 0.30000000000000004
```

On utilise une valeur **epsilon**, qui définit une marge d'erreur acceptée.

## Différence Espace de l'écran et espace du canvas

Puisque la zone de travail n'est pas fixe (possibilité de zoomer et de la déplacer), il faut différencier deux espaces :

1. L'écran
2. Le canvas

Les évènements lié à la souris renvoient des coordonnées dans l'espace **écran**.  
Pour les transformer en coordonnées **espace de travail**, il faut faire quelques opérations.

```javascript
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
```

Grâce à cette méthode, le point retourné (qui sera envoyé dans les diverses autres méthodes comme variable) correspond aux coordonnées du canvas, et non plus de l'écran.

## Amélioration d'élement

Les clôtures, buissons et perchoirs peuvent être améliorés.  
Lors d'une amélioration, ils deviennent autre chose.

> Clôture -> **Porte**

> Buisson / Perchoir -> **Arbre**

Une porte ne sert que pour l'utilisateur, pour mieux se projeter.  
Un arbre quant à lui, fait avancer les objectifs autant qu'un perchoir et un buisson réunis.

#### Système d'amélioration

Lorsqu'un élément qui peut être améliorer est selectionné, le boutton **_upgrade_** est disponible.  
L'amélioration se passe avec la méthode **_handleUpgrade_** du **Selector**.

Exemple pour une amélioration en arbre, une amélioration en porte étant plus simple :

1. Vérifier que l'agrandissement de l'élément ne va pas causer de superposition

```javascript
// Check for space availability
// Get position
let elementPosition = {
  x: parseFloat(this.selectedElement.style.left),
  y: parseFloat(this.selectedElement.style.top),
}
// Check placement
const placementResult = this.planEditor.commonFunctionsService.checkElementPlacement(
  elementPosition,
  this.selectedElement,
  200,
  200
)

// handle unavailability
if (placementResult.invalid) {
  this.planEditor.commonFunctionsService.showPlacementError(
    placementResult.reason,
    this.selectedElement
  )
  this.selectedElement.classList.remove('invalid-placement')

  // Place available :
} else {...}
```

2. Appeler le back-end, avec l'id de l'objet selectionné en paramètre.

```javascript
// Get element id
const elementId = parseInt(this.selectedElement.dataset.elementId)
// Call back for upgrade
response = await fetch(`/api/elements/${elementId}/upgrade`, {
  method: 'PATCH',
  headers: {
    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
  },
})
```

3. Dans le back, effectuer les changements nécessaires

```typescript
// Find element to upgrade
const elementToUpgrade = await Element.findOrFail(params.id)
// Change it's type
elementToUpgrade.type = 'tree'
// Change it's objective value
elementToUpgrade.objectiveValue = 0
// Change Size
elementToUpgrade.width = 200
elementToUpgrade.height = 200
// Save
await elementToUpgrade.save()
```

4. Recalculer l'avancée des objectifs.

```typescript
// Recalculate objectives for this plan
await ObjectiveService.recalculateForPlan(planId)
// Get plan with new objectives values for the response
const plan = await Plan.query().where('id', planId).preload('objectives').firstOrFail()
```

5. Envoyer une réponse avec les éléments nécessaire à la suite

```typescript
return response.status(200).json({
  objectives: plan.objectives.map((objective) => ({
    id: objective.id,
    name: objective.name,
    description: objective.description,
    target_value: objective.$extras.pivot_target_value,
    completion_percentage: objective.$extras.pivot_completion_percentage,
    unit: objective.unit,
  })),
  element: elementData,
})
```

6. En front, récupérer la réponse et faire les changement nécessaires
   C'est à dire :

- Mettre à jour le tableau des éléments en place
- Mettre à jour les objectifs
- Mettre à jour les classes et le style de l'élément
- Mettre à jour le menu contextuel

```javascript
// Get response data
const data = await response.json()

// Update placedElements for new size
// Find the index
this.elementIndex = this.planEditor.placedElements.findIndex((el) => el.id === elementId)
// Update it
if (this.elementIndex !== -1) {
  this.planEditor.placedElements[this.elementIndex] = {
    id: data.element.id,
    type: data.element.type,
    x: parseFloat(data.element.vertexPositionX),
    y: parseFloat(data.element.vertexPositionY),
    width: parseFloat(data.element.width),
    height: parseFloat(data.element.height),
  }
}

// Update objectives display
if (data.objectives) {
  this.planEditor.commonFunctionsService.updateObjectivesDisplay(data.objectives)
}

// Update element display
this.selectedElement.classList.remove('perch')
this.selectedElement.classList.remove('shrub')
this.selectedElement.classList.add('tree')
this.selectedElement.style.width = `${data.element.width}px`
this.selectedElement.style.height = `${data.element.width}px`
// Remove helper class
this.selectedElement.classList.remove('valid-placement')
// Update menu to remove upgrade btn
this.showMenu()
```

## TO DO

Pas satisfait par la gestion du 'plan state' (PlanEditor.js - updatePlanState)
**MUST DO**
**MUST DO**
Ajout d'un validator pour les éléments
**MUST DO**
**MUST DO**
