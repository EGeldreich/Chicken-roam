INSERT INTO objectives (name, description, goal, unit, per_nb_chicken) VALUES
    /* Total area needed - each chicken needs 15 square meters of space
       This ensures they have enough room to move, forage, and exhibit natural behaviors */
    ('area', 'Total area needed per chicken', 15, 'm²', 1),

    /* Perch space - each chicken needs 20cm of perching space
       This allows them to roost comfortably at night without crowding */
    ('perch', 'Perch length needed per chicken', 20, 'cm', 1),

    /* Shelter area - every 10 chickens need 3 square meters of covered space
       This provides protection from weather and predators */
    ('shelter', 'Shelter area needed for 10 chickens', 3, 'm²', 10),

    /* Edible shrubs - every 10 chickens need 3 shrubs
       These provide both food and natural shelter */
    ('shrubs', 'Edible shrubs needed for 10 chickens', 3, 'shrubs', 10),

    /* Insect-hosting structures - every 5 chickens need 1 structure
       These encourage beneficial insects that chickens can forage */
    ('insectary', 'Insect-hosting structures needed for 5 chickens', 1, 'structure', 5),

    /* Dust bath area - every 10 chickens need 3 square meters for dust bathing
       Essential for feather maintenance and parasite control */
    ('dustbath', 'Dust bath area needed for 10 chickens', 3, 'm²', 10),

    /* Water points - every 5 chickens need 1 water point
       Ensures adequate access to fresh water */
    ('waterer', 'Water points needed for 5 chickens', 1, 'water point', 5);