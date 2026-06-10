import type { ExerciseSuggestion } from "../../shared/types/workout-routine";

// Curated list of common exercises in Portuguese. wger's free API has weak
// Portuguese coverage, so this guarantees that everyday terms ("supino",
// "agachamento", "corrida") always return results even when wger returns
// nothing or is unreachable. `category` uses wger-style names so the client's
// muscle/category guessing keeps working. Merged with wger results in the proxy.
interface LocalExercise {
    name: string;
    category: string; // Chest | Back | Legs | Shoulders | Arms | Abs | Cardio
    muscles: string; // PT description
}

const LOCAL_EXERCISES: LocalExercise[] = [
    // Peito
    { name: "Supino Reto", category: "Chest", muscles: "Peitoral" },
    { name: "Supino Inclinado", category: "Chest", muscles: "Peitoral superior" },
    { name: "Supino Declinado", category: "Chest", muscles: "Peitoral inferior" },
    { name: "Supino com Halteres", category: "Chest", muscles: "Peitoral" },
    { name: "Crucifixo", category: "Chest", muscles: "Peitoral" },
    { name: "Crucifixo Inclinado", category: "Chest", muscles: "Peitoral superior" },
    { name: "Crossover", category: "Chest", muscles: "Peitoral" },
    { name: "Peck Deck (Voador)", category: "Chest", muscles: "Peitoral" },
    { name: "Flexão de Braço", category: "Chest", muscles: "Peitoral, Tríceps" },
    // Costas
    { name: "Puxada Frontal", category: "Back", muscles: "Dorsais" },
    { name: "Puxada Aberta", category: "Back", muscles: "Dorsais" },
    { name: "Barra Fixa", category: "Back", muscles: "Dorsais" },
    { name: "Remada Curvada", category: "Back", muscles: "Dorsais" },
    { name: "Remada Unilateral (Serrote)", category: "Back", muscles: "Dorsais" },
    { name: "Remada Cavalinho", category: "Back", muscles: "Dorsais" },
    { name: "Remada Baixa", category: "Back", muscles: "Dorsais" },
    { name: "Levantamento Terra", category: "Back", muscles: "Lombar, Posterior" },
    { name: "Pulldown", category: "Back", muscles: "Dorsais" },
    // Pernas
    { name: "Agachamento Livre", category: "Legs", muscles: "Quadríceps, Glúteos" },
    { name: "Agachamento Búlgaro", category: "Legs", muscles: "Quadríceps, Glúteos" },
    { name: "Leg Press", category: "Legs", muscles: "Quadríceps" },
    { name: "Cadeira Extensora", category: "Legs", muscles: "Quadríceps" },
    { name: "Cadeira Flexora", category: "Legs", muscles: "Posterior de coxa" },
    { name: "Mesa Flexora", category: "Legs", muscles: "Posterior de coxa" },
    { name: "Afundo (Avanço)", category: "Legs", muscles: "Quadríceps, Glúteos" },
    { name: "Stiff", category: "Legs", muscles: "Posterior, Glúteos" },
    { name: "Hack Machine", category: "Legs", muscles: "Quadríceps" },
    { name: "Cadeira Adutora", category: "Legs", muscles: "Adutores" },
    { name: "Cadeira Abdutora", category: "Legs", muscles: "Abdutores, Glúteos" },
    { name: "Panturrilha em Pé", category: "Legs", muscles: "Panturrilha" },
    { name: "Panturrilha Sentado", category: "Legs", muscles: "Panturrilha" },
    { name: "Elevação Pélvica", category: "Legs", muscles: "Glúteos" },
    // Ombros
    { name: "Desenvolvimento com Halteres", category: "Shoulders", muscles: "Deltoides" },
    { name: "Desenvolvimento Arnold", category: "Shoulders", muscles: "Deltoides" },
    { name: "Elevação Lateral", category: "Shoulders", muscles: "Deltoide lateral" },
    { name: "Elevação Frontal", category: "Shoulders", muscles: "Deltoide anterior" },
    { name: "Crucifixo Inverso", category: "Shoulders", muscles: "Deltoide posterior" },
    { name: "Remada Alta", category: "Shoulders", muscles: "Deltoides, Trapézio" },
    { name: "Encolhimento", category: "Shoulders", muscles: "Trapézio" },
    // Braços
    { name: "Rosca Direta", category: "Arms", muscles: "Bíceps" },
    { name: "Rosca Alternada", category: "Arms", muscles: "Bíceps" },
    { name: "Rosca Martelo", category: "Arms", muscles: "Bíceps, Antebraço" },
    { name: "Rosca Scott", category: "Arms", muscles: "Bíceps" },
    { name: "Rosca Concentrada", category: "Arms", muscles: "Bíceps" },
    { name: "Tríceps Pulley", category: "Arms", muscles: "Tríceps" },
    { name: "Tríceps Testa", category: "Arms", muscles: "Tríceps" },
    { name: "Tríceps Francês", category: "Arms", muscles: "Tríceps" },
    { name: "Tríceps Coice", category: "Arms", muscles: "Tríceps" },
    { name: "Mergulho (Paralelas)", category: "Arms", muscles: "Tríceps, Peitoral" },
    // Abdômen
    { name: "Abdominal Supra", category: "Abs", muscles: "Abdômen" },
    { name: "Abdominal Infra", category: "Abs", muscles: "Abdômen inferior" },
    { name: "Abdominal Oblíquo", category: "Abs", muscles: "Oblíquos" },
    { name: "Prancha", category: "Abs", muscles: "Core" },
    { name: "Elevação de Pernas", category: "Abs", muscles: "Abdômen inferior" },
    // Cardio
    { name: "Corrida", category: "Cardio", muscles: "Corpo todo" },
    { name: "Caminhada", category: "Cardio", muscles: "Corpo todo" },
    { name: "Esteira", category: "Cardio", muscles: "Corpo todo" },
    { name: "Bicicleta Ergométrica", category: "Cardio", muscles: "Pernas" },
    { name: "Elíptico", category: "Cardio", muscles: "Corpo todo" },
    { name: "Pular Corda", category: "Cardio", muscles: "Corpo todo" },
    { name: "Burpee", category: "Cardio", muscles: "Corpo todo" },
    { name: "Remo Ergômetro", category: "Cardio", muscles: "Corpo todo" },
];

export function searchLocalExercises(term: string): ExerciseSuggestion[] {
    const q = term.trim().toLowerCase();
    if (q.length < 2) return [];
    return LOCAL_EXERCISES.filter((e) => e.name.toLowerCase().includes(q)).map((e) => ({
        id: "local:" + e.name,
        name: e.name,
        category: e.category,
        muscles: e.muscles,
        imageUrl: null,
    }));
}
