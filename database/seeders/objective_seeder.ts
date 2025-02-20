import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Objective from '#models/objective'
export default class extends BaseSeeder {
  async run() {
    await Objective.createMany([
      {
        name: 'area',
        description: 'Total area needed per chicken',
        goal: 15,
        unit: 'm²',
        perNbChicken: 1,
      },
      {
        name: 'perch',
        description: 'Perch length needed per chicken',
        goal: 20,
        unit: 'cm',
        perNbChicken: 1,
      },
      {
        name: 'shelter',
        description: 'Shelter area needed for 10 chickens',
        goal: 3,
        unit: 'm²',
        perNbChicken: 10,
      },
      {
        name: 'shrubs',
        description: 'Edible shrubs needed for 10 chickens',
        goal: 3,
        unit: 'shrubs',
        perNbChicken: 10,
      },
      {
        name: 'insectary',
        description: 'Insect-hosting structures needed for 5 chickens',
        goal: 1,
        unit: 'structure',
        perNbChicken: 5,
      },
      {
        name: 'dustbath',
        description: 'Dust bath area needed for 10 chickens',
        goal: 3,
        unit: 'm²',
        perNbChicken: 10,
      },
      {
        name: 'waterer',
        description: 'Water points needed for 5 chickens',
        goal: 1,
        unit: 'water point',
        perNbChicken: 5,
      },
    ])
  }
}
