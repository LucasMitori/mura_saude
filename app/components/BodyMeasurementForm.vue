<template>
    <v-card class="bio-form">
        <v-card-title class="pa-4 d-flex align-center">
            <v-icon start color="primary">mdi-scale-bathroom</v-icon>
            <span>{{ existing ? "Editar Bioimpedância" : "Nova Medição de Bioimpedância" }}</span>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
            <v-select
                v-model="form.time"
                :items="[
                    { title: '☀️ Manhã (ao acordar)', value: 'morning' },
                    { title: '🌙 Noite (antes de dormir)', value: 'evening' },
                ]"
                label="Período"
                prepend-inner-icon="mdi-clock-time-eight"
                class="mb-3"
            />

            <v-row density="comfortable">
                <v-col cols="6" md="4">
                    <v-text-field
                        v-model.number="form.weight"
                        label="Peso (kg)"
                        type="number"
                        step="0.1"
                        prepend-inner-icon="mdi-weight-kilogram"
                    />
                </v-col>
                <v-col cols="6" md="4">
                    <v-text-field
                        v-model.number="form.bmi"
                        label="IMC"
                        type="number"
                        step="0.1"
                    />
                </v-col>
                <v-col cols="6" md="4">
                    <v-text-field
                        v-model.number="form.bodyFatPercentage"
                        label="Gordura (%)"
                        type="number"
                        step="0.1"
                    />
                </v-col>
                <v-col cols="6" md="4">
                    <v-text-field
                        v-model.number="form.bodyFatMass"
                        label="Peso da Gordura (kg)"
                        type="number"
                        step="0.1"
                    />
                </v-col>
                <v-col cols="6" md="4">
                    <v-text-field
                        v-model.number="form.skeletalMuscleMassPercentage"
                        label="Massa Musc. Esq. (%)"
                        type="number"
                        step="0.1"
                    />
                </v-col>
                <v-col cols="6" md="4">
                    <v-text-field
                        v-model.number="form.muscleMassRecord"
                        label="Reg. Massa Musc. (%)"
                        type="number"
                        step="0.1"
                    />
                </v-col>
                <v-col cols="6" md="4">
                    <v-text-field
                        v-model.number="form.skeletalMuscleMass"
                        label="Massa Musc. Esq. (kg)"
                        type="number"
                        step="0.1"
                    />
                </v-col>
                <v-col cols="6" md="4">
                    <v-text-field
                        v-model.number="form.muscleMass"
                        label="Massa Muscular (kg)"
                        type="number"
                        step="0.1"
                    />
                </v-col>
                <v-col cols="6" md="4">
                    <v-text-field
                        v-model.number="form.waterPercentage"
                        label="Água (%)"
                        type="number"
                        step="0.1"
                    />
                </v-col>
                <v-col cols="6" md="4">
                    <v-text-field
                        v-model.number="form.waterMass"
                        label="Peso Água (kg)"
                        type="number"
                        step="0.1"
                    />
                </v-col>
                <v-col cols="6" md="4">
                    <v-text-field
                        v-model.number="form.visceralFat"
                        label="Gordura Visceral"
                        type="number"
                    />
                </v-col>
                <v-col cols="6" md="4">
                    <v-text-field
                        v-model.number="form.boneMass"
                        label="Ossos (kg)"
                        type="number"
                        step="0.1"
                    />
                </v-col>
                <v-col cols="6" md="4">
                    <v-text-field
                        v-model.number="form.basalMetabolicRate"
                        label="Metabolismo (kcal)"
                        type="number"
                    />
                </v-col>
                <v-col cols="6" md="4">
                    <v-text-field
                        v-model.number="form.proteinPercentage"
                        label="Proteína (%)"
                        type="number"
                        step="0.1"
                    />
                </v-col>
                <v-col cols="6" md="4">
                    <v-text-field
                        v-model.number="form.obesityPercentage"
                        label="Obesidade (%)"
                        type="number"
                        step="0.1"
                    />
                </v-col>
                <v-col cols="6" md="4">
                    <v-text-field
                        v-model.number="form.metabolicAge"
                        label="Idade Metabólica"
                        type="number"
                    />
                </v-col>
            </v-row>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
            <v-btn variant="text" @click="$emit('cancel')">Cancelar</v-btn>
            <v-spacer />
            <v-btn color="primary" variant="elevated" prepend-icon="mdi-content-save" @click="submit">
                {{ existing ? "Salvar Alterações" : "Adicionar Medição" }}
            </v-btn>
        </v-card-actions>
    </v-card>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import type {
    BodyMeasurementEntry,
    BioimpedanceMeasurement,
    MeasurementTime,
} from "#shared/types/daily";

const props = defineProps<{
    existing?: BodyMeasurementEntry | null;
}>();

const emit = defineEmits<{
    submit: [entry: BodyMeasurementEntry];
    cancel: [];
}>();

function flattenExisting(e: BodyMeasurementEntry | null | undefined) {
    const d = e?.data;
    return {
        time: (e?.time as MeasurementTime) || "morning",
        weight: d?.weight?.value ?? 0,
        bmi: d?.bmi ?? 0,
        bodyFatPercentage: d?.bodyFatPercentage?.value ?? 0,
        bodyFatMass: d?.bodyFatMass?.value ?? 0,
        skeletalMuscleMassPercentage: d?.skeletalMuscleMassPercentage?.value ?? 0,
        muscleMassRecord: d?.muscleMassRecord?.value ?? 0,
        skeletalMuscleMass: d?.skeletalMuscleMass?.value ?? 0,
        muscleMass: d?.muscleMass?.value ?? 0,
        waterPercentage: d?.waterPercentage?.value ?? 0,
        waterMass: d?.waterMass?.value ?? 0,
        visceralFat: d?.visceralFat ?? 0,
        boneMass: d?.boneMass?.value ?? 0,
        basalMetabolicRate: d?.basalMetabolicRate?.value ?? 0,
        proteinPercentage: d?.proteinPercentage?.value ?? 0,
        obesityPercentage: d?.obesityPercentage?.value ?? 0,
        metabolicAge: d?.metabolicAge?.value ?? 0,
    };
}

const form = ref(flattenExisting(props.existing));

watch(
    () => props.existing,
    (val) => {
        form.value = flattenExisting(val);
    },
);

function submit() {
    const data: BioimpedanceMeasurement = {
        weight: { value: form.value.weight, unit: "kg" },
        bmi: form.value.bmi,
        bodyFatPercentage: { value: form.value.bodyFatPercentage, unit: "%" },
        bodyFatMass: { value: form.value.bodyFatMass, unit: "kg" },
        skeletalMuscleMassPercentage: {
            value: form.value.skeletalMuscleMassPercentage,
            unit: "%",
        },
        muscleMassRecord: { value: form.value.muscleMassRecord, unit: "%" },
        skeletalMuscleMass: { value: form.value.skeletalMuscleMass, unit: "kg" },
        muscleMass: { value: form.value.muscleMass, unit: "kg" },
        waterPercentage: { value: form.value.waterPercentage, unit: "%" },
        waterMass: { value: form.value.waterMass, unit: "kg" },
        visceralFat: form.value.visceralFat,
        boneMass: { value: form.value.boneMass, unit: "kg" },
        basalMetabolicRate: { value: form.value.basalMetabolicRate, unit: "kcal" },
        proteinPercentage: { value: form.value.proteinPercentage, unit: "%" },
        obesityPercentage: { value: form.value.obesityPercentage, unit: "%" },
        metabolicAge: { value: form.value.metabolicAge, unit: "years" },
    };

    const entry: BodyMeasurementEntry = {
        id: props.existing?.id,
        time: form.value.time,
        timestamp: props.existing?.timestamp || new Date().toISOString(),
        data,
    };

    emit("submit", entry);
}
</script>

<style scoped>
.bio-form {
    border-radius: 16px;
}
</style>
