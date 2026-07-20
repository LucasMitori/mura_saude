<template>
    <div class="diet-page">
        <div class="d-flex align-center mb-4 flex-wrap ga-2">
            <div>
                <h1
                    class="text-h5 text-md-h4 font-weight-bold d-flex align-center"
                >
                    <v-icon size="28" color="primary" class="mr-2"
                        >mdi-food-apple</v-icon
                    >
                    Dietas
                </h1>
                <p class="text-body-2 text-grey mb-0">
                    {{
                        canEdit
                            ? "Monte planos alimentares com alimentos brasileiros (tabela TACO) e ative o plano atual do paciente."
                            : "Planos alimentares montados pelo nutricionista. O plano ativo aparece no dashboard."
                    }}
                </p>
            </div>
            <v-spacer />
            <v-btn
                v-if="canEdit"
                color="primary"
                variant="flat"
                prepend-icon="mdi-plus"
                @click="openEditor(null)"
            >
                Nova Dieta
            </v-btn>
        </div>

        <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>

        <div v-if="loading && diets.length === 0" class="text-center py-10">
            <v-progress-circular indeterminate color="primary" size="64" />
        </div>

        <v-alert v-else-if="diets.length === 0" type="info" variant="tonal">
            Nenhuma dieta cadastrada ainda.
            <template v-if="canEdit">
                Clique em "Nova Dieta" para montar o primeiro plano alimentar.
            </template>
        </v-alert>

        <v-row v-else>
            <v-col
                v-for="diet in diets"
                :key="diet._id"
                cols="12"
                md="6"
                lg="4"
            >
                <v-card
                    variant="outlined"
                    class="diet-card h-100 d-flex flex-column"
                    :class="{ 'diet-card--active': diet.active }"
                >
                    <v-card-title class="d-flex align-center pa-4">
                        <span
                            class="text-body-1 font-weight-bold text-truncate"
                        >
                            {{ diet.name }}
                        </span>
                        <v-spacer />
                        <v-chip
                            v-if="diet.active"
                            color="success"
                            variant="flat"
                            size="small"
                            class="font-weight-bold"
                        >
                            <v-icon start size="14">mdi-check-circle</v-icon>
                            Ativa
                        </v-chip>
                    </v-card-title>
                    <v-divider />
                    <v-card-text class="flex-grow-1">
                        <p
                            v-if="diet.description"
                            class="text-body-2 text-medium-emphasis mb-3"
                        >
                            {{ diet.description }}
                        </p>
                        <div class="d-flex flex-wrap ga-1 mb-3">
                            <v-chip
                                size="small"
                                variant="tonal"
                                color="warning"
                            >
                                <v-icon start size="14">mdi-fire</v-icon>
                                {{ diet.totalCalories }} kcal
                            </v-chip>
                            <v-chip
                                v-if="diet.targetCalories"
                                size="small"
                                variant="tonal"
                                color="info"
                            >
                                <v-icon start size="14">mdi-target</v-icon>
                                Meta {{ diet.targetCalories }} kcal
                            </v-chip>
                            <v-chip size="small" variant="tonal">
                                <v-icon start size="14"
                                    >mdi-silverware-fork-knife</v-icon
                                >
                                {{ diet.meals.length }}
                                {{
                                    diet.meals.length === 1
                                        ? "refeição"
                                        : "refeições"
                                }}
                            </v-chip>
                        </div>
                        <div class="text-caption text-medium-emphasis">
                            P {{ diet.totalProtein }}g · C
                            {{ diet.totalCarbs }}g · G {{ diet.totalFats }}g · F
                            {{ diet.totalFiber }}g
                        </div>
                        <div class="text-caption text-grey mt-2">
                            Por {{ diet.createdByName }} ·
                            {{ formatUpdated(diet.updatedAt) }}
                        </div>
                    </v-card-text>
                    <v-divider />
                    <v-card-actions class="pa-3">
                        <v-btn
                            size="small"
                            variant="text"
                            prepend-icon="mdi-eye"
                            @click="openViewer(diet)"
                        >
                            Ver
                        </v-btn>
                        <template v-if="canEdit">
                            <v-btn
                                size="small"
                                variant="text"
                                prepend-icon="mdi-pencil"
                                @click="openEditor(diet)"
                            >
                                Editar
                            </v-btn>
                        </template>
                        <v-spacer />
                        <template v-if="canEdit">
                            <v-btn
                                size="small"
                                variant="tonal"
                                :color="diet.active ? 'warning' : 'success'"
                                @click="toggleActive(diet)"
                            >
                                {{ diet.active ? "Desativar" : "Ativar" }}
                            </v-btn>
                            <v-btn
                                size="small"
                                variant="text"
                                color="error"
                                icon="mdi-delete"
                                @click="confirmDelete(diet)"
                            />
                        </template>
                    </v-card-actions>
                </v-card>
            </v-col>
        </v-row>

        <!-- ===== BELOW THE CARDS: active plan insights ===== -->
        <v-row v-if="activePlan" class="mt-5">
            <!-- Daily schedule of the active plan -->
            <v-col cols="12" md="7">
                <v-card class="h-100">
                    <v-card-title class="d-flex align-center pa-4">
                        <v-icon start color="primary"
                            >mdi-timeline-clock</v-icon
                        >
                        Cronograma — {{ activePlan.name }}
                        <v-spacer />
                        <v-chip
                            size="x-small"
                            color="success"
                            variant="flat"
                            class="font-weight-bold"
                        >
                            Plano ativo
                        </v-chip>
                    </v-card-title>
                    <v-divider />
                    <v-card-text>
                        <div
                            v-for="meal in scheduledMeals"
                            :key="meal.id"
                            class="schedule-row d-flex align-center ga-3 py-2"
                        >
                            <div
                                class="schedule-time text-caption font-weight-bold"
                            >
                                {{ meal.time || "--:--" }}
                            </div>
                            <v-avatar
                                :color="mealColor(meal.type)"
                                variant="flat"
                                size="34"
                            >
                                <v-icon size="18" color="white">{{
                                    mealIcon(meal.type)
                                }}</v-icon>
                            </v-avatar>
                            <div class="flex-grow-1" style="min-width: 0">
                                <p
                                    class="text-body-2 font-weight-medium mb-0 text-truncate"
                                >
                                    {{ meal.label || mealTypeLabel(meal.type) }}
                                </p>
                                <p
                                    class="text-caption text-medium-emphasis mb-0 text-truncate"
                                >
                                    {{ mealFoodsPreview(meal) }}
                                </p>
                            </div>
                            <v-chip
                                size="x-small"
                                color="warning"
                                variant="tonal"
                                class="flex-shrink-0"
                            >
                                {{ meal.totalCalories }} kcal
                            </v-chip>
                        </div>
                        <v-divider class="my-2" />
                        <div class="d-flex align-center flex-wrap ga-2">
                            <span class="text-caption text-medium-emphasis">
                                Distribuição calórica dos macros:
                            </span>
                            <div class="macro-bar flex-grow-1">
                                <div
                                    class="macro-bar__seg macro-bar__seg--p"
                                    :style="{ width: macroSplit.p + '%' }"
                                />
                                <div
                                    class="macro-bar__seg macro-bar__seg--c"
                                    :style="{ width: macroSplit.c + '%' }"
                                />
                                <div
                                    class="macro-bar__seg macro-bar__seg--g"
                                    :style="{ width: macroSplit.g + '%' }"
                                />
                            </div>
                        </div>
                        <div class="d-flex flex-wrap ga-3 mt-1">
                            <span class="text-caption"
                                ><span class="dot dot--p" /> Proteína
                                {{ macroSplit.p }}%</span
                            >
                            <span class="text-caption"
                                ><span class="dot dot--c" /> Carboidratos
                                {{ macroSplit.c }}%</span
                            >
                            <span class="text-caption"
                                ><span class="dot dot--g" /> Gorduras
                                {{ macroSplit.g }}%</span
                            >
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>

            <!-- Real consumption vs the plan -->
            <v-col cols="12" md="5">
                <v-card class="h-100">
                    <v-card-title class="d-flex align-center pa-4">
                        <v-icon start color="info">mdi-chart-donut</v-icon>
                        Aderência ao Plano
                        <v-spacer />
                        <v-chip size="x-small" variant="tonal"
                            >últimos 7 dias</v-chip
                        >
                    </v-card-title>
                    <v-divider />
                    <v-card-text>
                        <template v-if="adherence.days > 0">
                            <p class="text-caption text-medium-emphasis mb-3">
                                Média diária registrada ({{ adherence.days }}
                                {{ adherence.days === 1 ? "dia" : "dias" }})
                                comparada ao plano.
                            </p>
                            <div
                                v-for="row in adherenceRows"
                                :key="row.label"
                                class="mb-3"
                            >
                                <div class="d-flex justify-space-between mb-1">
                                    <span
                                        class="text-caption font-weight-medium"
                                        >{{ row.label }}</span
                                    >
                                    <span class="text-caption">
                                        {{ row.actual }}{{ row.unit }} /
                                        {{ row.plan }}{{ row.unit }}
                                        <strong :class="row.pctClass"
                                            >({{ row.pct }}%)</strong
                                        >
                                    </span>
                                </div>
                                <v-progress-linear
                                    :model-value="Math.min(row.pct, 130)"
                                    :max="130"
                                    :color="row.color"
                                    height="8"
                                    rounded
                                />
                            </div>
                            <v-alert
                                :type="adherenceVerdict.type"
                                variant="tonal"
                                density="compact"
                                class="mt-2"
                            >
                                <span class="text-caption">{{
                                    adherenceVerdict.text
                                }}</span>
                            </v-alert>
                        </template>
                        <div v-else class="text-center py-6">
                            <v-icon size="42" color="grey"
                                >mdi-calendar-blank-outline</v-icon
                            >
                            <p class="text-body-2 text-grey mt-2 mb-0">
                                Sem registros de refeições nos últimos 7 dias.
                            </p>
                            <p class="text-caption text-medium-emphasis">
                                Quando houver refeições registradas, a aderência
                                ao plano aparece aqui automaticamente.
                            </p>
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <v-alert
            v-else-if="diets.length > 0"
            type="info"
            variant="tonal"
            class="mt-2"
        >
            <span class="text-body-2">
                Nenhum plano ativo no momento.
                <template v-if="canEdit">
                    Clique em <strong>Ativar</strong> em uma dieta para exibi-la
                    no dashboard e acompanhar a aderência aqui.
                </template>
            </span>
        </v-alert>

        <!-- ===== VIEWER DIALOG (read-only) ===== -->
        <v-dialog v-model="viewer.show" max-width="820" scrollable>
            <v-card v-if="viewer.diet">
                <v-card-title class="d-flex align-center pa-4">
                    <v-icon start color="primary">mdi-food-apple</v-icon>
                    {{ viewer.diet.name }}
                    <v-chip
                        v-if="viewer.diet.active"
                        color="success"
                        variant="flat"
                        size="x-small"
                        class="ml-2 font-weight-bold"
                    >
                        Ativa
                    </v-chip>
                    <v-spacer />
                    <v-btn
                        icon="mdi-close"
                        variant="text"
                        @click="viewer.show = false"
                    />
                </v-card-title>
                <v-divider />
                <v-card-text>
                    <p v-if="viewer.diet.description" class="text-body-2 mb-4">
                        {{ viewer.diet.description }}
                    </p>
                    <div
                        v-for="meal in viewer.diet.meals"
                        :key="meal.id"
                        class="mb-4"
                    >
                        <div class="d-flex align-center mb-1">
                            <v-avatar
                                :color="mealColor(meal.type)"
                                variant="flat"
                                size="26"
                                class="mr-2"
                            >
                                <v-icon size="14" color="white">{{
                                    mealIcon(meal.type)
                                }}</v-icon>
                            </v-avatar>
                            <v-chip
                                size="small"
                                variant="tonal"
                                color="primary"
                                class="mr-2"
                            >
                                {{ mealTypeLabel(meal.type) }}
                            </v-chip>
                            <span class="font-weight-medium">{{
                                meal.label || "—"
                            }}</span>
                            <v-chip
                                v-if="meal.time"
                                size="x-small"
                                variant="outlined"
                                class="ml-2"
                            >
                                {{ meal.time }}
                            </v-chip>
                            <v-spacer />
                            <v-chip
                                size="x-small"
                                color="warning"
                                variant="tonal"
                            >
                                {{ meal.totalCalories }} kcal
                            </v-chip>
                        </div>
                        <v-table density="compact">
                            <tbody>
                                <tr v-for="(f, i) in meal.foods" :key="i">
                                    <td>{{ f.name }}</td>
                                    <td class="text-right" style="width: 90px">
                                        {{ f.weightGrams }}g
                                    </td>
                                    <td class="text-right" style="width: 90px">
                                        {{ f.calories }} kcal
                                    </td>
                                </tr>
                            </tbody>
                        </v-table>
                        <p
                            v-if="meal.notes"
                            class="text-caption text-medium-emphasis mt-1 mb-0"
                        >
                            {{ meal.notes }}
                        </p>
                    </div>
                    <v-divider class="my-3" />
                    <div class="d-flex flex-wrap ga-2">
                        <v-chip color="warning" variant="tonal">
                            Total: {{ viewer.diet.totalCalories }} kcal
                        </v-chip>
                        <v-chip
                            v-if="viewer.diet.targetCalories"
                            color="info"
                            variant="tonal"
                        >
                            Meta: {{ viewer.diet.targetCalories }} kcal
                        </v-chip>
                        <v-chip variant="tonal">
                            P {{ viewer.diet.totalProtein }}g · C
                            {{ viewer.diet.totalCarbs }}g · G
                            {{ viewer.diet.totalFats }}g · F
                            {{ viewer.diet.totalFiber }}g
                        </v-chip>
                    </div>
                </v-card-text>
            </v-card>
        </v-dialog>

        <!-- ===== EDITOR DIALOG ===== -->
        <v-dialog v-model="editor.show" max-width="1150" scrollable persistent>
            <v-card>
                <v-card-title class="d-flex align-center pa-4">
                    <v-icon start color="primary">
                        {{ editor.id ? "mdi-pencil" : "mdi-plus-circle" }}
                    </v-icon>
                    {{ editor.id ? "Editar Dieta" : "Nova Dieta" }}
                    <v-spacer />
                    <v-btn
                        icon="mdi-close"
                        variant="text"
                        @click="editor.show = false"
                    />
                </v-card-title>
                <v-divider />

                <!-- Live plan summary — always visible while building -->
                <div
                    class="editor-summary px-4 py-3 d-flex align-center flex-wrap ga-4"
                >
                    <div class="d-flex align-center ga-2">
                        <v-icon size="20" color="warning">mdi-fire</v-icon>
                        <span class="text-body-2">
                            <strong>{{ editorTotal }}</strong> kcal planejadas
                        </span>
                    </div>
                    <div
                        v-if="editor.form.targetCalories > 0"
                        class="d-flex align-center ga-2 flex-grow-1"
                        style="min-width: 220px; max-width: 420px"
                    >
                        <v-progress-linear
                            :model-value="editorTargetPct"
                            :color="editorTargetColor"
                            height="10"
                            rounded
                        />
                        <span
                            class="text-caption text-no-wrap font-weight-bold"
                        >
                            {{ editorTargetPct }}% da meta
                        </span>
                    </div>
                    <v-spacer />
                    <span class="text-caption text-medium-emphasis">
                        P {{ editorMacros.protein }}g · C
                        {{ editorMacros.carbs }}g · G {{ editorMacros.fats }}g
                    </span>
                </div>
                <v-divider />

                <v-card-text style="max-height: 64vh">
                    <v-row density="comfortable" class="mt-1">
                        <v-col cols="12" md="5">
                            <v-text-field
                                v-model="editor.form.name"
                                label="Nome da dieta *"
                                prepend-inner-icon="mdi-format-title"
                                placeholder="Ex: Cutting 1800 kcal"
                            />
                        </v-col>
                        <v-col cols="12" md="3">
                            <v-text-field
                                v-model.number="editor.form.targetCalories"
                                label="Meta calórica (kcal/dia)"
                                type="number"
                                min="0"
                                prepend-inner-icon="mdi-target"
                            />
                        </v-col>
                        <v-col cols="12" md="4">
                            <v-text-field
                                v-model="editor.form.description"
                                label="Descrição"
                                prepend-inner-icon="mdi-text"
                                placeholder="Objetivo, observações gerais…"
                            />
                        </v-col>
                    </v-row>

                    <div class="d-flex align-center mb-2">
                        <h3 class="text-subtitle-1">
                            <v-icon start size="20"
                                >mdi-silverware-fork-knife</v-icon
                            >
                            Refeições do plano
                        </h3>
                        <v-spacer />
                        <v-btn
                            size="small"
                            variant="tonal"
                            color="primary"
                            prepend-icon="mdi-plus"
                            @click="addMeal"
                        >
                            Adicionar Refeição
                        </v-btn>
                    </div>

                    <v-alert
                        v-if="editor.form.meals.length === 0"
                        type="info"
                        variant="tonal"
                        density="compact"
                        class="mb-2"
                    >
                        Adicione as refeições do plano (café, almoço, jantar…).
                    </v-alert>

                    <v-card
                        v-for="(meal, mi) in editor.form.meals"
                        :key="meal.id"
                        variant="outlined"
                        class="editor-meal mb-3"
                        :style="{ borderLeftColor: mealBorderColor(meal.type) }"
                    >
                        <v-card-title class="d-flex align-center py-2 px-3">
                            <v-avatar
                                :color="mealColor(meal.type)"
                                variant="flat"
                                size="30"
                                class="mr-2"
                            >
                                <v-icon size="16" color="white">{{
                                    mealIcon(meal.type)
                                }}</v-icon>
                            </v-avatar>
                            <span class="text-body-2 font-weight-medium">
                                {{ meal.label || mealTypeLabel(meal.type) }}
                            </span>
                            <v-chip
                                v-if="meal.time"
                                size="x-small"
                                variant="outlined"
                                class="ml-2"
                            >
                                {{ meal.time }}
                            </v-chip>
                            <v-spacer />
                            <v-chip
                                size="small"
                                color="warning"
                                variant="tonal"
                                class="mr-1 font-weight-bold"
                            >
                                {{ mealCalories(meal) }} kcal
                            </v-chip>
                            <v-btn
                                icon="mdi-delete"
                                size="small"
                                variant="text"
                                color="error"
                                @click="removeMeal(mi)"
                            />
                        </v-card-title>
                        <v-divider />
                        <v-card-text class="pt-3">
                            <v-row density="compact">
                                <v-col cols="12" md="4">
                                    <v-select
                                        v-model="meal.type"
                                        :items="mealTypeOptions"
                                        item-title="label"
                                        item-value="value"
                                        label="Período"
                                        density="compact"
                                        hide-details
                                    />
                                </v-col>
                                <v-col cols="6" md="3">
                                    <AppTimeField
                                        v-model="meal.time"
                                        label="Horário sugerido"
                                        variant="outlined"
                                        density="compact"
                                        hide-details
                                    />
                                </v-col>
                                <v-col cols="6" md="5">
                                    <v-text-field
                                        v-model="meal.label"
                                        label="Nome da refeição"
                                        density="compact"
                                        hide-details
                                        placeholder="Ex: Café reforçado"
                                    />
                                </v-col>
                            </v-row>

                            <FoodSearch
                                class="mt-3 mb-1"
                                label="Buscar alimento (TACO BR + Open Food Facts)"
                                @select="(f) => onFoodSelected(mi, f)"
                            />
                            <p class="text-caption text-medium-emphasis mb-2">
                                <v-icon size="13" class="mr-1"
                                    >mdi-gesture-tap</v-icon
                                >
                                Selecione um alimento para preencher os valores
                                — ajuste o peso e os macros se recalculam.
                            </p>

                            <div
                                class="foods-grid"
                                :class="{
                                    'foods-grid--empty':
                                        meal.foods.length === 0,
                                }"
                            >
                                <template v-if="meal.foods.length > 0">
                                    <div class="foods-grid__head">
                                        <span>Alimento</span>
                                        <span class="text-center"
                                            >Peso (g)</span
                                        >
                                        <span class="text-center">Kcal</span>
                                        <span class="text-center"
                                            >Prot (g)</span
                                        >
                                        <span class="text-center"
                                            >Carbs (g)</span
                                        >
                                        <span class="text-center"
                                            >Gord (g)</span
                                        >
                                        <span />
                                    </div>
                                    <div
                                        v-for="(food, fi) in meal.foods"
                                        :key="fi"
                                        class="foods-grid__row"
                                    >
                                        <v-text-field
                                            v-model="food.name"
                                            density="compact"
                                            variant="outlined"
                                            hide-details
                                            placeholder="Nome do alimento"
                                        />
                                        <v-text-field
                                            v-model.number="food.weightGrams"
                                            type="number"
                                            min="0"
                                            density="compact"
                                            variant="outlined"
                                            hide-details
                                            class="num-field"
                                            @update:model-value="
                                                rescaleRow(mi, fi)
                                            "
                                        />
                                        <v-text-field
                                            v-model.number="food.calories"
                                            type="number"
                                            min="0"
                                            density="compact"
                                            variant="outlined"
                                            hide-details
                                            class="num-field"
                                        />
                                        <v-text-field
                                            v-model.number="food.protein"
                                            type="number"
                                            min="0"
                                            density="compact"
                                            variant="outlined"
                                            hide-details
                                            class="num-field"
                                        />
                                        <v-text-field
                                            v-model.number="food.carbs"
                                            type="number"
                                            min="0"
                                            density="compact"
                                            variant="outlined"
                                            hide-details
                                            class="num-field"
                                        />
                                        <v-text-field
                                            v-model.number="food.fats"
                                            type="number"
                                            min="0"
                                            density="compact"
                                            variant="outlined"
                                            hide-details
                                            class="num-field"
                                        />
                                        <v-btn
                                            icon="mdi-close"
                                            size="x-small"
                                            variant="text"
                                            color="error"
                                            @click="meal.foods.splice(fi, 1)"
                                        />
                                    </div>
                                    <div class="foods-grid__totals">
                                        <span class="font-weight-bold"
                                            >TOTAL</span
                                        >
                                        <span
                                            class="text-center font-weight-bold"
                                            >{{ mealWeight(meal) }}g</span
                                        >
                                        <span
                                            class="text-center font-weight-bold"
                                            >{{ mealCalories(meal) }}</span
                                        >
                                        <span class="text-center"
                                            >{{
                                                mealMacro(meal, "protein")
                                            }}g</span
                                        >
                                        <span class="text-center"
                                            >{{
                                                mealMacro(meal, "carbs")
                                            }}g</span
                                        >
                                        <span class="text-center"
                                            >{{
                                                mealMacro(meal, "fats")
                                            }}g</span
                                        >
                                        <span />
                                    </div>
                                </template>
                                <p
                                    v-else
                                    class="text-center text-grey text-caption py-3 mb-0"
                                >
                                    Nenhum alimento ainda — busque acima ou
                                    adicione manualmente.
                                </p>
                            </div>

                            <v-btn
                                variant="tonal"
                                size="small"
                                prepend-icon="mdi-plus"
                                class="mt-2"
                                @click="addManualFood(mi)"
                            >
                                Alimento manual
                            </v-btn>

                            <v-textarea
                                v-model="meal.notes"
                                label="Observações da refeição"
                                rows="1"
                                auto-grow
                                density="compact"
                                class="mt-3"
                                hide-details
                            />
                        </v-card-text>
                    </v-card>
                </v-card-text>
                <v-divider />
                <v-card-actions class="pa-4 ga-3">
                    <v-btn
                        variant="outlined"
                        size="large"
                        @click="editor.show = false"
                    >
                        Cancelar
                    </v-btn>
                    <v-spacer />
                    <v-btn
                        color="primary"
                        variant="flat"
                        size="large"
                        prepend-icon="mdi-content-save"
                        :loading="saving"
                        :disabled="!editor.form.name.trim()"
                        @click="saveDiet"
                    >
                        {{ editor.id ? "Salvar Alterações" : "Criar Dieta" }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- Confirm delete -->
        <v-dialog v-model="confirmDialog.show" max-width="420">
            <v-card>
                <v-card-title>Excluir dieta?</v-card-title>
                <v-card-text>
                    "{{ confirmDialog.name }}" será excluída permanentemente.
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn variant="text" @click="confirmDialog.show = false"
                        >Cancelar</v-btn
                    >
                    <v-btn
                        color="error"
                        variant="flat"
                        :loading="saving"
                        @click="confirmDialog.onConfirm"
                    >
                        Excluir
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-snackbar
            v-model="snackbar.show"
            :color="snackbar.color"
            timeout="3500"
            location="bottom"
        >
            {{ snackbar.message }}
        </v-snackbar>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { $fetch } from "ofetch";
import { format, formatDistanceToNow, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Diet, DietMeal } from "#shared/types/diet";
import type { MealType } from "#shared/types/daily";
import { MEAL_TYPE_LABELS } from "#shared/types/daily";
import type { NutritionFood, NutritionPer100g } from "#shared/types/nutrition";
import { useAuthStore } from "~/stores/auth.store";

definePageMeta({ requiresPermission: "diet.view" });

const authStore = useAuthStore();
const { listDiets, createDiet, updateDiet, deleteDiet, setDietActive } =
    useDiets();

const canEdit = computed(() => authStore.can("diet.edit"));

const diets = ref<Diet[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);

const snackbar = ref({ show: false, message: "", color: "success" });
function notify(message: string, color: "success" | "error" = "success") {
    snackbar.value = { show: true, message, color };
}

const mealTypeOptions: { label: string; value: MealType }[] = Object.entries(
    MEAL_TYPE_LABELS,
).map(([value, label]) => ({ value: value as MealType, label }));

function mealTypeLabel(type: string): string {
    return MEAL_TYPE_LABELS[type as MealType] || type;
}

const MEAL_COLORS: Record<string, string> = {
    pre_workout: "purple",
    breakfast: "orange",
    morning_snack: "amber",
    lunch: "green",
    afternoon_snack: "teal",
    pre_workout_meal: "deep-purple",
    post_workout: "indigo",
    dinner: "blue",
    supper: "blue-grey",
    snack: "grey",
};
const MEAL_ICONS: Record<string, string> = {
    pre_workout: "mdi-run-fast",
    breakfast: "mdi-coffee",
    morning_snack: "mdi-food-apple",
    lunch: "mdi-food-fork-drink",
    afternoon_snack: "mdi-cookie",
    pre_workout_meal: "mdi-dumbbell",
    post_workout: "mdi-arm-flex",
    dinner: "mdi-food-turkey",
    supper: "mdi-cup",
    snack: "mdi-food",
};
const MEAL_BORDERS: Record<string, string> = {
    pre_workout: "#7E57C2",
    breakfast: "#FFA726",
    morning_snack: "#FFC107",
    lunch: "#66BB6A",
    afternoon_snack: "#26A69A",
    pre_workout_meal: "#5E35B1",
    post_workout: "#5C6BC0",
    dinner: "#42A5F5",
    supper: "#78909C",
    snack: "#90A4AE",
};
const mealColor = (t: string) => MEAL_COLORS[t] || "grey";
const mealIcon = (t: string) => MEAL_ICONS[t] || "mdi-food";
const mealBorderColor = (t: string) => MEAL_BORDERS[t] || "#666";

function formatUpdated(iso: string): string {
    try {
        return formatDistanceToNow(parseISO(iso), {
            addSuffix: true,
            locale: ptBR,
        });
    } catch {
        return iso;
    }
}

// ===== Active plan insights (below the cards) =====
const activePlan = computed(() => diets.value.find((d) => d.active) || null);

const scheduledMeals = computed(() => {
    if (!activePlan.value) return [];
    return [...activePlan.value.meals].sort((a, b) =>
        (a.time || "99:99").localeCompare(b.time || "99:99"),
    );
});

function mealFoodsPreview(meal: DietMeal): string {
    const names = meal.foods.map((f) => f.name).filter(Boolean);
    if (names.length === 0) return "Sem alimentos";
    return (
        names.slice(0, 3).join(", ") +
        (names.length > 3 ? ` +${names.length - 3}` : "")
    );
}

// Caloric split of the plan's macros (4 kcal/g protein & carbs, 9 kcal/g fat).
const macroSplit = computed(() => {
    const d = activePlan.value;
    if (!d) return { p: 0, c: 0, g: 0 };
    const pk = d.totalProtein * 4;
    const ck = d.totalCarbs * 4;
    const gk = d.totalFats * 9;
    const total = pk + ck + gk;
    if (!total) return { p: 0, c: 0, g: 0 };
    const p = Math.round((pk / total) * 100);
    const c = Math.round((ck / total) * 100);
    return { p, c, g: Math.max(0, 100 - p - c) };
});

// Real consumption (last 7 days) vs the plan.
const adherence = ref({ days: 0, kcal: 0, protein: 0, carbs: 0, fats: 0 });

async function loadAdherence() {
    try {
        const from = format(subDays(new Date(), 7), "yyyy-MM-dd");
        const records = await $fetch<
            Array<{ summary?: Record<string, number> }>
        >("/api/daily", {
            query: { from, light: 1 },
            headers: authStore.authHeaders,
        });
        const withMeals = (records || []).filter(
            (r) => (r.summary?.totalCaloriesConsumed || 0) > 0,
        );
        const n = withMeals.length;
        const avg = (key: string) =>
            n === 0
                ? 0
                : Math.round(
                      withMeals.reduce(
                          (s, r) => s + (r.summary?.[key] || 0),
                          0,
                      ) / n,
                  );
        adherence.value = {
            days: n,
            kcal: avg("totalCaloriesConsumed"),
            protein: avg("totalProtein"),
            carbs: avg("totalCarbs"),
            fats: avg("totalFats"),
        };
    } catch {
        adherence.value = { days: 0, kcal: 0, protein: 0, carbs: 0, fats: 0 };
    }
}

const adherenceRows = computed(() => {
    const d = activePlan.value;
    if (!d) return [];
    const target = d.targetCalories || d.totalCalories;
    const rows = [
        {
            label: "Calorias",
            actual: adherence.value.kcal,
            plan: target,
            unit: " kcal",
        },
        {
            label: "Proteína",
            actual: adherence.value.protein,
            plan: d.totalProtein,
            unit: "g",
        },
        {
            label: "Carboidratos",
            actual: adherence.value.carbs,
            plan: d.totalCarbs,
            unit: "g",
        },
        {
            label: "Gorduras",
            actual: adherence.value.fats,
            plan: d.totalFats,
            unit: "g",
        },
    ];
    return rows.map((r) => {
        const pct = r.plan > 0 ? Math.round((r.actual / r.plan) * 100) : 0;
        // 85–115% of the plan = on track; below = under; above = over.
        const color =
            pct >= 85 && pct <= 115 ? "success" : pct < 85 ? "info" : "warning";
        return {
            ...r,
            plan: Math.round(r.plan),
            pct,
            color,
            pctClass: `text-${color}`,
        };
    });
});

const adherenceVerdict = computed<{
    type: "success" | "info" | "warning";
    text: string;
}>(() => {
    const kcalRow = adherenceRows.value[0];
    if (!kcalRow) return { type: "info", text: "" };
    if (kcalRow.pct >= 85 && kcalRow.pct <= 115) {
        return {
            type: "success",
            text: "Dentro do plano — o consumo médio está alinhado à meta calórica.",
        };
    }
    if (kcalRow.pct < 85) {
        return {
            type: "info",
            text: "Consumo abaixo do planejado — avalie se a meta está adequada.",
        };
    }
    return {
        type: "warning",
        text: "Consumo acima do planejado — atenção ao balanço calórico.",
    };
});

// ===== Editor =====
interface FoodRow {
    name: string;
    weightGrams: number;
    calories: number;
    protein?: number;
    carbs?: number;
    fats?: number;
    fiber?: number;
    _per100g?: NutritionPer100g;
}

interface EditorMeal extends Omit<DietMeal, "foods"> {
    foods: FoodRow[];
}

const editor = ref<{
    show: boolean;
    id: string | null;
    form: {
        name: string;
        description: string;
        targetCalories: number;
        meals: EditorMeal[];
    };
}>({
    show: false,
    id: null,
    form: { name: "", description: "", targetCalories: 0, meals: [] },
});

const viewer = ref<{ show: boolean; diet: Diet | null }>({
    show: false,
    diet: null,
});

const confirmDialog = ref<{
    show: boolean;
    name: string;
    onConfirm: () => void;
}>({
    show: false,
    name: "",
    onConfirm: () => {},
});

const editorTotal = computed(() =>
    Math.round(
        editor.value.form.meals.reduce(
            (s, m) =>
                s + m.foods.reduce((a, f) => a + (Number(f.calories) || 0), 0),
            0,
        ),
    ),
);

const editorMacros = computed(() => {
    const sum = (key: "protein" | "carbs" | "fats") =>
        Math.round(
            editor.value.form.meals.reduce(
                (s, m) =>
                    s + m.foods.reduce((a, f) => a + (Number(f[key]) || 0), 0),
                0,
            ) * 10,
        ) / 10;
    return { protein: sum("protein"), carbs: sum("carbs"), fats: sum("fats") };
});

const editorTargetPct = computed(() => {
    const t = editor.value.form.targetCalories;
    if (!t || t <= 0) return 0;
    return Math.min(999, Math.round((editorTotal.value / t) * 100));
});
const editorTargetColor = computed(() => {
    const pct = editorTargetPct.value;
    if (pct >= 90 && pct <= 110) return "success";
    if (pct < 90) return "info";
    return "warning";
});

function mealCalories(meal: EditorMeal): number {
    return Math.round(
        meal.foods.reduce((s, f) => s + (Number(f.calories) || 0), 0),
    );
}
function mealWeight(meal: EditorMeal): number {
    return Math.round(
        meal.foods.reduce((s, f) => s + (Number(f.weightGrams) || 0), 0),
    );
}
function mealMacro(
    meal: EditorMeal,
    key: "protein" | "carbs" | "fats",
): number {
    return (
        Math.round(
            meal.foods.reduce((s, f) => s + (Number(f[key]) || 0), 0) * 10,
        ) / 10
    );
}

function round1(n: number): number {
    return Math.round(n * 10) / 10;
}

async function load() {
    loading.value = true;
    error.value = null;
    try {
        diets.value = await listDiets();
    } catch (e: unknown) {
        const err = e as { data?: { message?: string }; message?: string };
        error.value =
            err?.data?.message || err?.message || "Erro ao carregar dietas";
    } finally {
        loading.value = false;
    }
}

function openViewer(diet: Diet) {
    viewer.value = { show: true, diet };
}

function openEditor(diet: Diet | null) {
    if (diet) {
        editor.value = {
            show: true,
            id: diet._id || null,
            form: JSON.parse(
                JSON.stringify({
                    name: diet.name,
                    description: diet.description,
                    targetCalories: diet.targetCalories,
                    meals: diet.meals,
                }),
            ),
        };
    } else {
        editor.value = {
            show: true,
            id: null,
            form: {
                name: "",
                description: "",
                targetCalories: 2000,
                meals: [],
            },
        };
        addMeal();
    }
}

function addMeal() {
    editor.value.form.meals.push({
        id: Math.random().toString(16).slice(2, 18).padEnd(16, "0"),
        type: "breakfast",
        time: "",
        label: "",
        notes: "",
        foods: [],
        totalCalories: 0,
        totalWeight: 0,
    });
}

function removeMeal(index: number) {
    editor.value.form.meals.splice(index, 1);
}

function addManualFood(mealIndex: number) {
    editor.value.form.meals[mealIndex]?.foods.push({
        name: "",
        weightGrams: 100,
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        fiber: 0,
    });
}

function onFoodSelected(mealIndex: number, food: NutritionFood) {
    const grams = food.servingSizeGrams || 100;
    const factor = grams / 100;
    editor.value.form.meals[mealIndex]?.foods.push({
        name:
            food.brand && food.brand !== "TACO (BR)"
                ? `${food.name} (${food.brand})`
                : food.name,
        weightGrams: grams,
        calories: Math.round(food.per100g.calories * factor),
        protein: round1(food.per100g.protein * factor),
        carbs: round1(food.per100g.carbs * factor),
        fats: round1(food.per100g.fats * factor),
        fiber: round1(food.per100g.fiber * factor),
        _per100g: { ...food.per100g },
    });
}

function rescaleRow(mealIndex: number, foodIndex: number) {
    const f = editor.value.form.meals[mealIndex]?.foods[foodIndex];
    if (!f?._per100g) return;
    const factor = (Number(f.weightGrams) || 0) / 100;
    f.calories = Math.round(f._per100g.calories * factor);
    f.protein = round1(f._per100g.protein * factor);
    f.carbs = round1(f._per100g.carbs * factor);
    f.fats = round1(f._per100g.fats * factor);
    f.fiber = round1(f._per100g.fiber * factor);
}

async function saveDiet() {
    saving.value = true;
    try {
        const payload = {
            name: editor.value.form.name,
            description: editor.value.form.description,
            targetCalories: editor.value.form.targetCalories,
            meals: editor.value.form.meals.map((m) => ({
                ...m,
                // Strip the transient per-100g basis before persisting.
                foods: m.foods.map(({ _per100g, ...rest }) => rest),
            })),
        };
        if (editor.value.id) {
            await updateDiet(editor.value.id, payload as Partial<Diet>);
            notify("Dieta atualizada");
        } else {
            await createDiet(payload as Partial<Diet>);
            notify("Dieta criada");
        }
        editor.value.show = false;
        await load();
    } catch (e: unknown) {
        const err = e as { data?: { message?: string }; message?: string };
        notify(err?.data?.message || err?.message || "Erro ao salvar", "error");
    } finally {
        saving.value = false;
    }
}

async function toggleActive(diet: Diet) {
    if (!diet._id) return;
    try {
        await setDietActive(diet._id, !diet.active);
        notify(
            diet.active
                ? "Dieta desativada"
                : `"${diet.name}" agora é a dieta ativa`,
        );
        await load();
    } catch (e: unknown) {
        const err = e as { data?: { message?: string }; message?: string };
        notify(err?.data?.message || err?.message || "Erro", "error");
    }
}

function confirmDelete(diet: Diet) {
    confirmDialog.value = {
        show: true,
        name: diet.name,
        onConfirm: async () => {
            if (!diet._id) return;
            saving.value = true;
            try {
                await deleteDiet(diet._id);
                notify("Dieta excluída");
                confirmDialog.value.show = false;
                await load();
            } catch (e: unknown) {
                const err = e as {
                    data?: { message?: string };
                    message?: string;
                };
                notify(
                    err?.data?.message || err?.message || "Erro ao excluir",
                    "error",
                );
            } finally {
                saving.value = false;
            }
        },
    };
}

onMounted(async () => {
    await load();
    await loadAdherence();
});
</script>

<style scoped>
.diet-page {
    width: 100%;
}
.diet-card {
    transition:
        transform 0.15s ease,
        box-shadow 0.15s ease;
}
.diet-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.15);
}
.diet-card--active {
    border-color: rgb(var(--v-theme-success));
    border-width: 2px;
}

/* ===== Schedule (below the cards) ===== */
.schedule-row + .schedule-row {
    border-top: 1px dashed rgba(128, 128, 128, 0.25);
}
.schedule-time {
    width: 46px;
    flex-shrink: 0;
    color: rgb(var(--v-theme-primary));
}
.macro-bar {
    display: flex;
    height: 10px;
    min-width: 160px;
    border-radius: 6px;
    overflow: hidden;
    background: rgba(128, 128, 128, 0.15);
}
.macro-bar__seg--p {
    background: #ef5350;
}
.macro-bar__seg--c {
    background: #ffa726;
}
.macro-bar__seg--g {
    background: #42a5f5;
}
.dot {
    display: inline-block;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    margin-right: 4px;
}
.dot--p {
    background: #ef5350;
}
.dot--c {
    background: #ffa726;
}
.dot--g {
    background: #42a5f5;
}

/* ===== Editor ===== */
.editor-summary {
    background: rgba(76, 175, 80, 0.06);
}
.editor-meal {
    border-left: 4px solid;
    border-radius: 12px;
}

/* Foods grid: aligned columns with real outlined inputs — numbers are easy to
   read and type (no clipped spinner controls). */
.foods-grid {
    border: 1px solid rgba(128, 128, 128, 0.25);
    border-radius: 10px;
    padding: 8px;
}
.foods-grid--empty {
    border-style: dashed;
}
.foods-grid__head,
.foods-grid__row,
.foods-grid__totals {
    display: grid;
    grid-template-columns: minmax(160px, 1fr) 96px 96px 88px 88px 88px 36px;
    gap: 6px;
    align-items: center;
}
.foods-grid__head {
    padding: 2px 4px 8px;
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    opacity: 0.7;
}
.foods-grid__row {
    padding: 3px 0;
}
.foods-grid__totals {
    margin-top: 6px;
    padding: 8px 4px 2px;
    border-top: 2px solid rgba(76, 175, 80, 0.4);
    font-size: 0.82rem;
}
/* Right-aligned numbers, no native spinners eating the width. */
.num-field :deep(input) {
    text-align: right;
    -moz-appearance: textfield;
    appearance: textfield;
}
.num-field :deep(input::-webkit-outer-spin-button),
.num-field :deep(input::-webkit-inner-spin-button) {
    -webkit-appearance: none;
    margin: 0;
}
/* On small screens the grid scrolls horizontally instead of crushing inputs. */
@media (max-width: 900px) {
    .foods-grid {
        overflow-x: auto;
    }
    .foods-grid__head,
    .foods-grid__row,
    .foods-grid__totals {
        min-width: 720px;
    }
}
</style>
