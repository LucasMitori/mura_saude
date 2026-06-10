<template>
    <v-menu
        v-model="open"
        :close-on-content-click="false"
        location="bottom start"
        :offset="6"
    >
        <template #activator="{ props: activatorProps }">
            <v-text-field
                v-bind="activatorProps"
                :model-value="displayValue"
                :label="label"
                :prepend-inner-icon="prependInnerIcon ?? 'mdi-calendar'"
                :hide-details="hideDetails"
                :density="density"
                :variant="variant"
                readonly
            />
        </template>

        <v-card class="app-date-popover" elevation="12" rounded="lg">
            <v-date-picker
                v-model="internalDate"
                :max="max"
                :min="min"
                show-adjacent-months
                color="primary"
                hide-header
                @update:model-value="onPicked"
            />
            <v-card-actions class="pa-2">
                <v-btn variant="text" size="small" @click="setToday">Hoje</v-btn>
                <v-spacer />
                <v-btn variant="text" size="small" @click="open = false">
                    Fechar
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-menu>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const props = defineProps<{
    modelValue: string;
    label?: string;
    hideDetails?: boolean;
    density?: "default" | "comfortable" | "compact";
    variant?: "outlined" | "filled" | "solo" | "underlined" | "plain";
    prependInnerIcon?: string;
    min?: string;
    max?: string;
}>();

const emit = defineEmits<{
    "update:modelValue": [value: string];
}>();

const open = ref(false);

const internalDate = ref<Date | null>(
    props.modelValue ? safeParse(props.modelValue) : new Date(),
);

watch(
    () => props.modelValue,
    (val) => {
        internalDate.value = val ? safeParse(val) : new Date();
    },
);

const displayValue = computed(() => {
    if (!props.modelValue) return "";
    try {
        return format(parseISO(props.modelValue), "dd 'de' MMM 'de' yyyy", {
            locale: ptBR,
        });
    } catch {
        return props.modelValue;
    }
});

function safeParse(iso: string): Date {
    try {
        return parseISO(iso);
    } catch {
        return new Date();
    }
}

function onPicked(val: unknown) {
    if (!val) return;
    const date = Array.isArray(val) ? val[0] : val;
    if (!(date instanceof Date)) return;
    const iso = format(date, "yyyy-MM-dd");
    emit("update:modelValue", iso);
    open.value = false;
}

function setToday() {
    const iso = format(new Date(), "yyyy-MM-dd");
    internalDate.value = new Date();
    emit("update:modelValue", iso);
    open.value = false;
}
</script>

<style scoped>
.app-date-popover {
    overflow: hidden;
}
</style>
