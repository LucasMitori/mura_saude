<template>
    <v-card variant="outlined" class="measurement-card">
        <v-card-title class="d-flex align-center pa-3">
            <v-chip
                :color="entry.time === 'morning' ? 'orange' : 'indigo'"
                size="small"
                variant="tonal"
            >
                {{ entry.time === "morning" ? "☀️ Manhã" : "🌙 Noite" }}
            </v-chip>
            <span class="text-body-2 text-grey ml-2">
                {{ formattedTimestamp }}
            </span>
            <v-spacer />
            <template v-if="editable">
                <v-btn
                    icon="mdi-pencil"
                    size="x-small"
                    variant="text"
                    @click="$emit('edit', entry)"
                />
                <v-btn
                    icon="mdi-delete"
                    size="x-small"
                    color="error"
                    variant="text"
                    @click="$emit('delete', entry)"
                />
            </template>
        </v-card-title>
        <v-card-text>
            <div class="bio-grid">
                <div v-for="item in items" :key="item.label" class="bio-tile">
                    <v-avatar
                        :color="item.color"
                        size="34"
                        variant="tonal"
                        class="mb-1"
                    >
                        <v-icon size="18">{{ item.icon }}</v-icon>
                    </v-avatar>
                    <p class="bio-label">{{ item.label }}</p>
                    <p class="bio-value">
                        {{ item.value
                        }}<span v-if="item.unit" class="bio-unit">{{ item.unit }}</span>
                    </p>
                </div>
            </div>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { format } from "date-fns";
import type { BodyMeasurementEntry } from "#shared/types/daily";

const props = defineProps<{
    entry: BodyMeasurementEntry;
    editable?: boolean;
}>();

defineEmits<{
    edit: [entry: BodyMeasurementEntry];
    delete: [entry: BodyMeasurementEntry];
}>();

const formattedTimestamp = computed(() => {
    try {
        return format(new Date(props.entry.timestamp), "HH:mm");
    } catch {
        return "";
    }
});

// Read a metric defensively: handles both `{ value }` objects and plain numbers,
// and missing fields (older/partial records won't crash the card).
function num(x: unknown): number | undefined {
    if (x && typeof x === "object" && "value" in x) {
        const v = (x as { value: unknown }).value;
        return typeof v === "number" ? v : undefined;
    }
    return typeof x === "number" ? x : undefined;
}

const items = computed(() => {
    const d = (props.entry.data ?? {}) as Record<string, unknown>;
    // Weight redacted by the privacy setting arrives as { value: null, hidden: true }.
    const weightHidden =
        !!d.weight && typeof d.weight === "object" && (d.weight as { hidden?: boolean }).hidden;
    const all = [
        weightHidden
            ? { label: "Peso", value: "—", unit: "", icon: "mdi-eye-off", color: "grey" }
            : { label: "Peso", value: num(d.weight), unit: "kg", icon: "mdi-weight-kilogram", color: "primary" },
        { label: "IMC", value: num(d.bmi), unit: "", icon: "mdi-human", color: "info" },
        { label: "Gordura", value: num(d.bodyFatPercentage), unit: "%", icon: "mdi-water-percent", color: "orange" },
        { label: "Massa Muscular", value: num(d.muscleMass), unit: "kg", icon: "mdi-arm-flex", color: "red" },
        { label: "Água", value: num(d.waterPercentage), unit: "%", icon: "mdi-water", color: "blue" },
        { label: "Gord. Visceral", value: num(d.visceralFat), unit: "", icon: "mdi-stomach", color: "deep-orange" },
        { label: "Ossos", value: num(d.boneMass), unit: "kg", icon: "mdi-bone", color: "blue-grey" },
        { label: "Metabolismo", value: num(d.basalMetabolicRate), unit: "kcal", icon: "mdi-fire", color: "amber" },
        { label: "Proteína", value: num(d.proteinPercentage), unit: "%", icon: "mdi-egg", color: "green" },
        { label: "Idade Met.", value: num(d.metabolicAge), unit: "anos", icon: "mdi-calendar-heart", color: "purple" },
    ];
    // Only show metrics that are actually present.
    return all.filter((i) => i.value !== undefined);
});
</script>

<style scoped>
.measurement-card {
    border-radius: 12px;
}
/* Uniform auto-fitting grid — every tile is the same width/height regardless of
   how many metrics are present. */
.bio-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
    gap: 8px;
}
.bio-tile {
    text-align: center;
    padding: 12px 6px 10px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    transition: background 0.15s ease, transform 0.15s ease;
}
.bio-tile:hover {
    background: rgba(76, 175, 80, 0.08);
    transform: translateY(-1px);
}
.bio-label {
    font-size: 0.7rem;
    line-height: 1.1;
    opacity: 0.7;
    margin: 0;
    min-height: 1.6em;
}
.bio-value {
    font-size: 1.05rem;
    font-weight: 700;
    margin: 2px 0 0;
    white-space: nowrap;
}
.bio-unit {
    font-size: 0.68rem;
    font-weight: 400;
    opacity: 0.6;
    margin-left: 2px;
}
</style>
