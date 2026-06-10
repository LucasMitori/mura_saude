import { getAuthUser } from "#server/utils/auth";
import { offBarcode } from "#server/utils/nutrition";
import type { NutritionFood } from "../../../../shared/types/nutrition";

// GET /api/nutrition/barcode/7891000100103 — single product by barcode.
export default defineEventHandler(async (event): Promise<NutritionFood> => {
    getAuthUser(event);

    const code = getRouterParam(event, "code") || "";
    if (!/^\d{6,16}$/.test(code)) {
        throw createError({ statusCode: 400, message: "Código de barras inválido" });
    }

    try {
        const food = await offBarcode(code);
        if (!food) {
            throw createError({ statusCode: 404, message: "Produto não encontrado" });
        }
        return food;
    } catch (e: unknown) {
        if (e && typeof e === "object" && "statusCode" in e) throw e;
        throw createError({
            statusCode: 502,
            message: "Falha ao consultar a base de alimentos (Open Food Facts)",
        });
    }
});
