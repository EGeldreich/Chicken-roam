# Guide du fonctionnement Chicken Roam

## Initialisation sur une nouvelle machine

Récupérer les modules nécessaires.

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

### PlanEditor

Pour la partie **Front-end** du plan, tout transite par la classe javascript **PlanEditor**.  
Cette classe sert de base d'appel pour initialiser tous les outils.  
Elle sert également à gérer les évènements (mouse up, move et down) et à appeler les bonnes méthodes.

En plus de cela, c'est ici que ce gère tout ce qui est lié au plan en dehors de la zone de dessin. Comme la boite à outil, le nom du plan, la capacité à zoomer ...

### PlanController

Pour la partie **Back-end** du plan, cela se passe dans le plan controller pour les manoeuvres générales.

1. **guestPlan** s'occupe de récupérer les informations liées au plan d'invité (et potentiellement de supprimer l'ancien plan temporaire si besoin).
2. **plan** recupère les informations liées à un plan d'utilisateur spécifique, via son id.
3. **completeEnclosure** permet de faire passer la valeur stockée en base de donnée **_isEnclosed_** à vraie. Cela n'implique pour le moment que l'impossibilté de rajouter de nouvelles clôtures, mais impliquera plus dans le futur.

## Elements

### ElementDrawer

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

### ElementController

Gère la partie **Back-end** des éléments du plan.  
Se compose des méthodes suivantes :

1. **create**, ajoute les éléments en base de données, et va chercher les informations liées à la complétion des objectifs.

**MUST DO**
**MUST DO**
Ajout d'un validator pour les éléments
**MUST DO**
**MUST DO**

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

## Système de detection des collisions AABB

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

## Récupération en temps réel de la complétion des objectifs

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
