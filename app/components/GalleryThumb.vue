<template>
    <div class="gallery-thumb" @click="$emit('view')">
        <v-skeleton-loader v-if="loading" type="image" height="150" />
        <v-img
            v-else-if="url"
            :src="url"
            height="150"
            cover
            eager
            class="thumb"
        />
        <div v-else class="thumb-error d-flex align-center justify-center">
            <v-icon color="grey">mdi-image-broken-variant</v-icon>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";

const props = defineProps<{ imageId: string }>();
defineEmits<{ view: [] }>();

const { getImageObjectUrl } = useMealImages();
const url = ref<string | null>(null);
const loading = ref(true);

async function load() {
    loading.value = true;
    url.value = null;
    try {
        url.value = await getImageObjectUrl(props.imageId);
    } catch {
        // Broken-image placeholder is rendered below.
    } finally {
        loading.value = false;
    }
}

watch(() => props.imageId, load);
onMounted(load);
</script>

<style scoped>
.gallery-thumb {
    cursor: zoom-in;
}
.thumb-error {
    height: 150px;
    background: rgba(128, 128, 128, 0.08);
}
</style>
