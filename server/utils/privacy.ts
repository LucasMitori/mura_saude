import type { AuthContext } from "#server/utils/roles";
import { getPrivacySettings } from "#server/utils/app-settings";

interface WeightHolder {
    bodyMeasurements?: Array<{
        data?: { weight?: { value?: number | null; unit?: string; hidden?: boolean } } & Record<string, unknown>;
    } & Record<string, unknown>>;
    summary?: Record<string, unknown>;
    weightHidden?: boolean;
    [k: string]: unknown;
}

/**
 * Whether the caller is allowed to see the patient's body weight.
 * Admin (the patient) and managers (nutritionist / personal trainer — the
 * professionals) always may; plain "user" viewers are subject to the privacy
 * toggle. This is a SERVER-SIDE decision — the client never gets the real
 * value when it's hidden, so hiding cannot be bypassed by tampering.
 */
export function maySeeWeight(ctx: AuthContext): boolean {
    return ctx.role === "admin" || ctx.role === "manager";
}

/** Resolve, once per request, whether weight must be redacted for this caller. */
export async function shouldHideWeight(ctx: AuthContext): Promise<boolean> {
    if (maySeeWeight(ctx)) return false;
    const { hideWeight } = await getPrivacySettings();
    return hideWeight;
}

/**
 * Null out every weight value in a daily record (and the derived weightChange),
 * marking each as `hidden` so the UI can render "-" instead of silently
 * dropping the field. Mutates and returns the record.
 */
export function redactWeight<T extends WeightHolder>(rec: T): T {
    for (const m of rec.bodyMeasurements || []) {
        const w = m?.data?.weight;
        if (w && typeof w === "object") {
            m.data!.weight = { value: null, unit: w.unit || "kg", hidden: true };
        }
    }
    if (rec.summary && typeof rec.summary === "object") {
        rec.summary.weightChange = null;
    }
    rec.weightHidden = true;
    return rec;
}
