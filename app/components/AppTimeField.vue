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
                :model-value="modelValue"
                :label="label"
                :prepend-inner-icon="prependInnerIcon ?? 'mdi-clock-outline'"
                :hide-details="hideDetails"
                :density="density"
                :variant="variant"
                placeholder="--:--"
                readonly
            />
        </template>

        <v-card class="app-time-popover" elevation="12" rounded="lg">
            <v-time-picker
                v-model="internal"
                format="24hr"
                color="primary"
                @update:model-value="onPicked"
            />
            <v-card-actions class="pa-2">
                <v-btn variant="text" size="small" @click="setNow">Agora</v-btn>
                <v-spacer />
                <v-btn variant="text" size="small" @click="open = false">
                    Fechar
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-menu>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { format } from "date-fns";

const props = defineProps<{
    modelValue: string;
    label?: string;
    hideDetails?: boolean;
    density?: "default" | "comfortable" | "compact";
    variant?: "outlined" | "filled" | "solo" | "underlined" | "plain";
    prependInnerIcon?: string;
}>();

const emit = defineEmits<{
    "update:modelValue": [value: string];
}>();

const open = ref(false);
const internal = ref<string>(props.modelValue || "");

watch(
    () => props.modelValue,
    (val) => {
        internal.value = val || "";
    },
);

function onPicked(val: string) {
    if (!val) return;
    emit("update:modelValue", val);
}

function setNow() {
    const now = format(new Date(), "HH:mm");
    internal.value = now;
    emit("update:modelValue", now);
    open.value = false;
}
</script>

<style scoped>
.app-time-popover {
    overflow: hidden;
}
</style>
