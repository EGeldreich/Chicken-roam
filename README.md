# Chicken Run Planner

An interactive web application that helps users design optimal chicken runs based on their flock size. This tool automatically calculates space requirements and provides real-time validation of essential elements like shelter, perches, and water points.

## Project Overview

The Chicken Run Planner emerged from the desire to create a front-end heavy project, while making something that could be useful and fun. By automating calculations and providing immediate feedback, it helps ensure that chickens have adequate space and access to essential facilities.

### Key Features

The application automatically calculates and validates different requirements from flock size, such as: - total area - perch length - water stations - ...
The goal is to have a nicely animated and evolutive result depending on objectives completion.

### Technical Stack

- Backend: AdonisJS 6 (Node.js framework)
- Database: MySQL
- Frontend: Vanilla JavaScript with interactive canvas-based interface
- Styling: Tailwind CSS

## Getting Started

### Prerequisites

- Node.js (v20 or higher)
- MySQL (v8.0 or higher)
- Git

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/chicken-run-planner.git
cd chicken-run-planner
```

2. Install dependencies:

```bash
npm install
```

3. Configure your environment:

```bash
# Copy the example environment file
cp .env.example .env

# Update the .env file with your database credentials
```

4. Run database migrations and seeding:

```bash
node ace migration:run
node ace db:seed
```

5. Start de development server:

```bash
npm run dev
```

The application will be available at http://localhost:3333

## Project Structure

```text
chicken-run-planner/
├── app/                    # Application core code
│   ├── controllers/       # Request handlers
│   ├── models/           # Database models
│   └── validators/       # Input validation
├── database/
│   └── migrations/       # Database structure
├── public/
│   └── js/              # Frontend JavaScript
│       ├── modules/     # Modular JS components
│       └── utils/       # Utility functions
├── resources/
│   └── views/           # Edge templates
└── start/
    └── routes.ts        # Application routes
```

## Roadmap

This project roadmap focuses on implementing features one by one, while **_trying_** to understand and learn on every step.

### Phase 1: MVP

- Implement all necessary features
  - Plan CRUD
  - User authentification
  - Objectives implementation

### Phase 2: Confort

- Add ease-of-use features
  - Movable elements
  - Snap to grid
  - Saves
  - Plan export

### Phase 3: Animation

- Add visually pleasing effects

## Resources & Documentation

- [AdonisJS Documentation](https://docs.adonisjs.com/)

## License

This is a personal project, all rights reserved.

## Author

- EGeldreich
