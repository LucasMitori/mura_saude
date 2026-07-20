import type { NutritionFood } from "../../shared/types/nutrition";

// Curated Brazilian staple foods with per-100g macros, based on the TACO table
// (Tabela Brasileira de Composição de Alimentos, UNICAMP — approximate values).
// Served ahead of Open Food Facts results so the diet builder and meal forms
// always find the everyday brazilian foods instantly and offline.

interface BrFood {
    name: string;
    kcal: number;
    p: number; // protein g
    c: number; // carbs g
    f: number; // fats g
    fb: number; // fiber g
    serving?: number; // typical serving in grams
}

const BR_FOODS: BrFood[] = [
    // ===== Cereais e derivados =====
    { name: "Arroz branco cozido", kcal: 128, p: 2.5, c: 28.1, f: 0.2, fb: 1.6, serving: 150 },
    { name: "Arroz integral cozido", kcal: 124, p: 2.6, c: 25.8, f: 1.0, fb: 2.7, serving: 150 },
    { name: "Macarrão cozido", kcal: 158, p: 5.8, c: 30.9, f: 0.9, fb: 1.8, serving: 150 },
    { name: "Aveia em flocos", kcal: 394, p: 13.9, c: 66.6, f: 8.5, fb: 9.1, serving: 30 },
    { name: "Pão francês", kcal: 300, p: 8.0, c: 58.6, f: 3.1, fb: 2.3, serving: 50 },
    { name: "Pão de forma integral", kcal: 253, p: 9.4, c: 49.9, f: 3.7, fb: 6.9, serving: 50 },
    { name: "Pão de queijo", kcal: 363, p: 5.1, c: 34.2, f: 24.6, fb: 0.6, serving: 60 },
    { name: "Tapioca (goma hidratada)", kcal: 240, p: 0, c: 59.4, f: 0, fb: 0.5, serving: 80 },
    { name: "Cuscuz de milho cozido", kcal: 113, p: 2.2, c: 25.3, f: 0.7, fb: 2.1, serving: 135 },
    { name: "Polenta cozida", kcal: 103, p: 2.3, c: 23.3, f: 0.2, fb: 2.4, serving: 150 },
    { name: "Granola", kcal: 421, p: 10.2, c: 67.5, f: 12.2, fb: 8.7, serving: 40 },
    { name: "Farofa pronta", kcal: 406, p: 2.5, c: 76.7, f: 9.1, fb: 6.4, serving: 30 },
    { name: "Farinha de mandioca", kcal: 361, p: 1.6, c: 87.9, f: 0.3, fb: 6.4, serving: 30 },

    // ===== Leguminosas =====
    { name: "Feijão carioca cozido", kcal: 76, p: 4.8, c: 13.6, f: 0.5, fb: 8.5, serving: 140 },
    { name: "Feijão preto cozido", kcal: 77, p: 4.5, c: 14.0, f: 0.5, fb: 8.4, serving: 140 },
    { name: "Feijoada", kcal: 117, p: 8.7, c: 11.6, f: 6.5, fb: 4.9, serving: 250 },
    { name: "Lentilha cozida", kcal: 93, p: 6.3, c: 16.3, f: 0.5, fb: 7.9, serving: 130 },
    { name: "Grão-de-bico cozido", kcal: 130, p: 8.4, c: 21.2, f: 2.1, fb: 5.1, serving: 130 },
    { name: "Soja cozida", kcal: 151, p: 15.4, c: 8.1, f: 7.3, fb: 5.6, serving: 100 },

    // ===== Carnes e ovos =====
    { name: "Peito de frango grelhado", kcal: 159, p: 32.0, c: 0, f: 2.5, fb: 0, serving: 120 },
    { name: "Coxa de frango assada", kcal: 215, p: 26.9, c: 0, f: 11.0, fb: 0, serving: 100 },
    { name: "Carne bovina patinho grelhado", kcal: 219, p: 35.9, c: 0, f: 7.3, fb: 0, serving: 120 },
    { name: "Carne bovina acém moído cozido", kcal: 212, p: 26.7, c: 0, f: 10.9, fb: 0, serving: 100 },
    { name: "Picanha grelhada", kcal: 289, p: 26.4, c: 0, f: 19.5, fb: 0, serving: 120 },
    { name: "Carne de porco lombo assado", kcal: 210, p: 32.1, c: 0, f: 8.1, fb: 0, serving: 100 },
    { name: "Ovo de galinha cozido", kcal: 146, p: 13.3, c: 0.6, f: 9.5, fb: 0, serving: 50 },
    { name: "Ovo frito", kcal: 240, p: 15.6, c: 1.2, f: 18.6, fb: 0, serving: 50 },

    // ===== Peixes e frutos do mar =====
    { name: "Tilápia grelhada", kcal: 128, p: 26.2, c: 0, f: 2.7, fb: 0, serving: 120 },
    { name: "Salmão grelhado", kcal: 208, p: 20.0, c: 0, f: 13.4, fb: 0, serving: 120 },
    { name: "Sardinha assada", kcal: 164, p: 24.1, c: 0, f: 7.0, fb: 0, serving: 100 },
    { name: "Atum em lata (água)", kcal: 108, p: 25.7, c: 0, f: 0.9, fb: 0, serving: 80 },
    { name: "Camarão cozido", kcal: 90, p: 19.0, c: 0, f: 1.0, fb: 0, serving: 100 },

    // ===== Laticínios =====
    { name: "Leite integral", kcal: 61, p: 2.9, c: 4.6, f: 3.2, fb: 0, serving: 200 },
    { name: "Leite desnatado", kcal: 35, p: 2.9, c: 4.9, f: 0.2, fb: 0, serving: 200 },
    { name: "Iogurte natural", kcal: 51, p: 4.1, c: 1.9, f: 3.0, fb: 0, serving: 170 },
    { name: "Iogurte natural desnatado", kcal: 42, p: 3.8, c: 5.8, f: 0.3, fb: 0, serving: 170 },
    { name: "Queijo minas frescal", kcal: 264, p: 17.4, c: 3.2, f: 20.2, fb: 0, serving: 30 },
    { name: "Queijo mussarela", kcal: 330, p: 22.6, c: 3.0, f: 25.2, fb: 0, serving: 30 },
    { name: "Requeijão cremoso", kcal: 257, p: 9.6, c: 2.4, f: 23.4, fb: 0, serving: 30 },

    // ===== Frutas =====
    { name: "Banana prata", kcal: 98, p: 1.3, c: 26.0, f: 0.1, fb: 2.0, serving: 70 },
    { name: "Banana nanica", kcal: 92, p: 1.4, c: 23.8, f: 0.1, fb: 1.9, serving: 90 },
    { name: "Maçã", kcal: 56, p: 0.3, c: 15.2, f: 0, fb: 1.3, serving: 130 },
    { name: "Mamão papaia", kcal: 40, p: 0.5, c: 10.4, f: 0.1, fb: 1.0, serving: 150 },
    { name: "Laranja pera", kcal: 37, p: 1.0, c: 8.9, f: 0.1, fb: 0.8, serving: 130 },
    { name: "Manga", kcal: 64, p: 0.4, c: 16.7, f: 0.3, fb: 1.7, serving: 140 },
    { name: "Abacate", kcal: 96, p: 1.2, c: 6.0, f: 8.4, fb: 6.3, serving: 100 },
    { name: "Melancia", kcal: 33, p: 0.9, c: 8.1, f: 0, fb: 0.1, serving: 150 },
    { name: "Uva", kcal: 53, p: 0.7, c: 13.6, f: 0.2, fb: 0.9, serving: 100 },
    { name: "Morango", kcal: 30, p: 0.9, c: 6.8, f: 0.3, fb: 1.7, serving: 100 },
    { name: "Açaí polpa", kcal: 58, p: 0.8, c: 6.2, f: 3.9, fb: 2.6, serving: 200 },

    // ===== Verduras e legumes =====
    { name: "Alface", kcal: 11, p: 1.3, c: 1.7, f: 0.2, fb: 1.7, serving: 40 },
    { name: "Tomate", kcal: 15, p: 1.1, c: 3.1, f: 0.2, fb: 1.2, serving: 80 },
    { name: "Cenoura crua", kcal: 34, p: 1.3, c: 7.7, f: 0.2, fb: 3.2, serving: 60 },
    { name: "Brócolis cozido", kcal: 25, p: 2.1, c: 4.4, f: 0.5, fb: 3.4, serving: 90 },
    { name: "Couve refogada", kcal: 90, p: 1.7, c: 8.7, f: 6.6, fb: 5.7, serving: 60 },
    { name: "Abobrinha cozida", kcal: 15, p: 1.1, c: 3.0, f: 0.2, fb: 1.6, serving: 90 },
    { name: "Quiabo cozido", kcal: 26, p: 1.9, c: 5.1, f: 0.3, fb: 3.9, serving: 80 },
    { name: "Beterraba cozida", kcal: 32, p: 1.3, c: 7.2, f: 0.1, fb: 1.9, serving: 60 },
    { name: "Pepino", kcal: 10, p: 0.9, c: 2.0, f: 0, fb: 1.1, serving: 60 },

    // ===== Tubérculos =====
    { name: "Batata inglesa cozida", kcal: 52, p: 1.2, c: 11.9, f: 0, fb: 1.3, serving: 150 },
    { name: "Batata-doce cozida", kcal: 77, p: 0.6, c: 18.4, f: 0.1, fb: 2.2, serving: 150 },
    { name: "Mandioca cozida", kcal: 125, p: 0.6, c: 30.1, f: 0.3, fb: 1.6, serving: 130 },
    { name: "Inhame cozido", kcal: 78, p: 1.5, c: 18.9, f: 0.1, fb: 1.7, serving: 130 },

    // ===== Oleaginosas e sementes =====
    { name: "Castanha-de-caju torrada", kcal: 570, p: 18.5, c: 29.1, f: 46.3, fb: 3.7, serving: 30 },
    { name: "Castanha-do-pará", kcal: 643, p: 14.5, c: 15.1, f: 63.5, fb: 7.9, serving: 20 },
    { name: "Amendoim torrado", kcal: 606, p: 22.5, c: 18.7, f: 54.0, fb: 8.0, serving: 30 },
    { name: "Paçoca de amendoim", kcal: 487, p: 16.0, c: 52.4, f: 26.1, fb: 3.4, serving: 30 },
    { name: "Chia (semente)", kcal: 486, p: 16.5, c: 42.1, f: 30.7, fb: 34.4, serving: 15 },

    // ===== Suplementos e outros =====
    { name: "Whey protein (pó)", kcal: 400, p: 80.0, c: 10.0, f: 3.3, fb: 0, serving: 30 },
    { name: "Azeite de oliva", kcal: 884, p: 0, c: 0, f: 100.0, fb: 0, serving: 13 },
    { name: "Manteiga", kcal: 726, p: 0.4, c: 0.1, f: 82.4, fb: 0, serving: 10 },
    { name: "Mel de abelha", kcal: 309, p: 0, c: 84.0, f: 0, fb: 0.4, serving: 20 },
    { name: "Açúcar cristal", kcal: 387, p: 0, c: 99.6, f: 0, fb: 0, serving: 10 },
    { name: "Café infusão (sem açúcar)", kcal: 4, p: 0.7, c: 0.7, f: 0.1, fb: 0, serving: 100 },
    { name: "Suco de laranja natural", kcal: 39, p: 0.7, c: 8.7, f: 0.1, fb: 0.1, serving: 250 },
];

function slugify(name: string): string {
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

function normalize(text: string): string {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
}

const CATALOG: NutritionFood[] = BR_FOODS.map((f) => ({
    code: `br-${slugify(f.name)}`,
    name: f.name,
    brand: "TACO (BR)",
    imageUrl: null,
    servingSizeGrams: f.serving ?? null,
    per100g: {
        calories: f.kcal,
        protein: f.p,
        carbs: f.c,
        fats: f.f,
        fiber: f.fb,
    },
}));

/** Accent-insensitive substring search over the Brazilian catalog. Every
 *  query term must match somewhere in the name ("frango grelh" → matches). */
export function searchBrFoods(term: string, limit = 8): NutritionFood[] {
    const words = normalize(term).split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];
    return CATALOG.filter((food) => {
        const name = normalize(food.name);
        return words.every((w) => name.includes(w));
    }).slice(0, limit);
}
