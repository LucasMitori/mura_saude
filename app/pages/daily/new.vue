<template>
    <div>
        <div class="d-flex align-center mb-6">
            <v-btn
                icon="mdi-arrow-left"
                variant="text"
                @click="$router.back()"
            />
            <h1 class="text-h4 ml-2">Nova Entrada Diária</h1>
            <v-spacer />
            <v-chip color="primary" variant="elevated" size="large">
                <v-icon start>mdi-calendar</v-icon>
                {{ dateFormatted }}
            </v-chip>
        </div>

        <!-- Date & Basic Config -->
        <v-card class="mb-4">
            <v-card-text>
                <v-row>
                    <v-col cols="12" md="4">
                        <v-text-field
                            v-model="form.date"
                            label="Data"
                            type="date"
                            variant="outlined"
                            prepend-inner-icon="mdi-calendar"
                        />
                    </v-col>
                    <v-col cols="12" md="4">
                        <v-text-field
                            v-model.number="form.caloricGoal"
                            label="Meta Calórica (kcal)"
                            type="number"
                            variant="outlined"
                            prepend-inner-icon="mdi-fire"
                        />
                    </v-col>
                    <v-col cols="12" md="4">
                        <v-row dense>
                            <v-col cols="8">
                                <v-text-field
                                    v-model.number="form.waterGoal"
                                    label="Meta de Água"
                                    type="number"
                                    step="0.1"
                                    variant="outlined"
                                    prepend-inner-icon="mdi-water"
                                />
                            </v-col>
                            <v-col cols="4">
                                <v-select
                                    v-model="form.waterGoalUnit"
                                    :items="['l', 'ml']"
                                    label="Unidade"
                                    variant="outlined"
                                />
                            </v-col>
                        </v-row>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>

        <!-- Main Tabs Table -->
        <v-card class="mb-4">
            <v-tabs v-model="activeTab" color="primary" grow>
                <v-tab value="measurements">
                    <v-icon start>mdi-scale-bathroom</v-icon>
                    Bioimpedância
                    <v-badge
                        v-if="form.bodyMeasurements.length > 0"
                        :content="form.bodyMeasurements.length"
                        color="success"
                        inline
                        class="ml-2"
                    />
                </v-tab>
                <v-tab value="meals">
                    <v-icon start>mdi-food</v-icon>
                    Refeições
                    <v-badge
                        v-if="form.meals.length > 0"
                        :content="form.meals.length"
                        color="success"
                        inline
                        class="ml-2"
                    />
                </v-tab>
                <v-tab value="workout">
                    <v-icon start>mdi-dumbbell</v-icon>
                    Treino
                    <v-badge
                        v-if="form.workout && form.workout.exercises.length > 0"
                        :content="form.workout.exercises.length"
                        color="success"
                        inline
                        class="ml-2"
                    />
                </v-tab>
                <v-tab value="water">
                    <v-icon start>mdi-water</v-icon>
                    Água
                </v-tab>
            </v-tabs>

            <v-divider />

            <v-tabs-window v-model="activeTab">
                <!-- ===== BIOIMPEDANCE TAB ===== -->
                <v-tabs-window-item value="measurements">
                    <v-card-text>
                        <div class="d-flex align-center mb-4">
                            <h3 class="text-h6">Medições de Bioimpedância</h3>
                            <v-spacer />
                            <v-btn
                                color="primary"
                                size="small"
                                prepend-icon="mdi-plus"
                                @click="showBioimpedanceForm = true"
                            >
                                Adicionar Medição
                            </v-btn>
                        </div>

                        <v-table
                            v-if="form.bodyMeasurements.length > 0"
                            density="compact"
                        >
                            <thead>
                                <tr>
                                    <th>Período</th>
                                    <th>Peso</th>
                                    <th>IMC</th>
                                    <th>Gordura %</th>
                                    <th>Massa Muscular</th>
                                    <th>Água %</th>
                                    <th>Gord. Visceral</th>
                                    <th>Metab.</th>
                                    <th>Idade Met.</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="(m, i) in form.bodyMeasurements"
                                    :key="i"
                                >
                                    <td>
                                        <v-chip
                                            :color="
                                                m.time === 'morning'
                                                    ? 'orange'
                                                    : 'indigo'
                                            "
                                            size="small"
                                        >
                                            {{
                                                m.time === "morning"
                                                    ? "☀️ Manhã"
                                                    : "🌙 Noite"
                                            }}
                                        </v-chip>
                                    </td>
                                    <td>{{ m.data.weight.value }} kg</td>
                                    <td>{{ m.data.bmi }}</td>
                                    <td>
                                        {{ m.data.bodyFatPercentage.value }}%
                                    </td>
                                    <td>{{ m.data.muscleMass.value }} kg</td>
                                    <td>{{ m.data.waterPercentage.value }}%</td>
                                    <td>{{ m.data.visceralFat }}</td>
                                    <td>
                                        {{ m.data.basalMetabolicRate.value }}
                                        kcal
                                    </td>
                                    <td>{{ m.data.metabolicAge.value }}</td>
                                    <td>
                                        <v-btn
                                            icon="mdi-delete"
                                            size="x-small"
                                            color="error"
                                            variant="text"
                                            @click="removeMeasurement(i)"
                                        />
                                    </td>
                                </tr>
                            </tbody>
                        </v-table>

                        <v-alert v-else type="info" variant="tonal">
                            Nenhuma medição adicionada. Pese-se na balança de
                            bioimpedância e adicione os dados.
                        </v-alert>
                    </v-card-text>
                </v-tabs-window-item>

                <!-- ===== MEALS TAB ===== -->
                <v-tabs-window-item value="meals">
                    <v-card-text>
                        <div class="d-flex align-center mb-4">
                            <h3 class="text-h6">Refeições do Dia</h3>
                            <v-spacer />
                            <v-btn
                                color="primary"
                                size="small"
                                prepend-icon="mdi-plus"
                                @click="addNewMeal"
                            >
                                Adicionar Refeição
                            </v-btn>
                        </div>

                        <!-- Meals Accordion -->
                        <v-expansion-panels
                            v-if="form.meals.length > 0"
                            variant="accordion"
                        >
                            <v-expansion-panel
                                v-for="(meal, mealIndex) in form.meals"
                                :key="mealIndex"
                            >
                                <v-expansion-panel-title>
                                    <div class="d-flex align-center w-100">
                                        <v-chip
                                            :color="getMealColor(meal.type)"
                                            size="small"
                                            class="mr-3"
                                        >
                                            {{ getMealLabel(meal.type) }}
                                        </v-chip>
                                        <span
                                            class="text-body-1 font-weight-medium"
                                        >
                                            {{ meal.label || "Sem nome" }}
                                        </span>
                                        <v-spacer />
                                        <v-chip
                                            size="small"
                                            color="warning"
                                            class="mr-2"
                                        >
                                            {{ meal.totalCalories }} kcal
                                        </v-chip>
                                        <v-chip size="small" color="info">
                                            {{ meal.totalWeight }}g
                                        </v-chip>
                                    </div>
                                </v-expansion-panel-title>

                                <v-expansion-panel-text>
                                    <v-row dense class="mb-3">
                                        <v-col cols="12" md="4">
                                            <v-select
                                                v-model="meal.type"
                                                :items="mealTypeOptions"
                                                item-title="label"
                                                item-value="value"
                                                label="Tipo da Refeição"
                                                variant="outlined"
                                                density="compact"
                                            />
                                        </v-col>
                                        <v-col cols="12" md="4">
                                            <v-text-field
                                                v-model="meal.label"
                                                label="Nome/Descrição"
                                                variant="outlined"
                                                density="compact"
                                            />
                                        </v-col>
                                        <v-col cols="12" md="2">
                                            <v-text-field
                                                v-model="meal.time"
                                                label="Horário"
                                                type="time"
                                                variant="outlined"
                                                density="compact"
                                            />
                                        </v-col>
                                        <v-col
                                            cols="12"
                                            md="2"
                                            class="d-flex align-center"
                                        >
                                            <v-btn
                                                color="error"
                                                variant="outlined"
                                                size="small"
                                                block
                                                @click="removeMeal(mealIndex)"
                                            >
                                                <v-icon start
                                                    >mdi-delete</v-icon
                                                >
                                                Remover
                                            </v-btn>
                                        </v-col>
                                    </v-row>

                                    <!-- Foods Table -->
                                    <v-table density="compact" class="mb-3">
                                        <thead>
                                            <tr>
                                                <th>Alimento</th>
                                                <th style="width: 100px">
                                                    Peso (g)
                                                </th>
                                                <th style="width: 100px">
                                                    Calorias
                                                </th>
                                                <th style="width: 90px">
                                                    Proteína
                                                </th>
                                                <th style="width: 90px">
                                                    Carbos
                                                </th>
                                                <th style="width: 90px">
                                                    Gordura
                                                </th>
                                                <th style="width: 90px">
                                                    Fibra
                                                </th>
                                                <th style="width: 50px"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr
                                                v-for="(
                                                    food, foodIndex
                                                ) in meal.foods"
                                                :key="foodIndex"
                                            >
                                                <td>
                                                    <v-text-field
                                                        v-model="food.name"
                                                        variant="plain"
                                                        density="compact"
                                                        hide-details
                                                        placeholder="Nome do alimento"
                                                    />
                                                </td>
                                                <td>
                                                    <v-text-field
                                                        v-model.number="
                                                            food.weightGrams
                                                        "
                                                        type="number"
                                                        variant="plain"
                                                        density="compact"
                                                        hide-details
                                                        @update:model-value="
                                                            recalculateMealTotals(
                                                                mealIndex,
                                                            )
                                                        "
                                                    />
                                                </td>
                                                <td>
                                                    <v-text-field
                                                        v-model.number="
                                                            food.calories
                                                        "
                                                        type="number"
                                                        variant="plain"
                                                        density="compact"
                                                        hide-details
                                                        @update:model-value="
                                                            recalculateMealTotals(
                                                                mealIndex,
                                                            )
                                                        "
                                                    />
                                                </td>
                                                <td>
                                                    <v-text-field
                                                        v-model.number="
                                                            food.protein
                                                        "
                                                        type="number"
                                                        variant="plain"
                                                        density="compact"
                                                        hide-details
                                                    />
                                                </td>
                                                <td>
                                                    <v-text-field
                                                        v-model.number="
                                                            food.carbs
                                                        "
                                                        type="number"
                                                        variant="plain"
                                                        density="compact"
                                                        hide-details
                                                    />
                                                </td>
                                                <td>
                                                    <v-text-field
                                                        v-model.number="
                                                            food.fats
                                                        "
                                                        type="number"
                                                        variant="plain"
                                                        density="compact"
                                                        hide-details
                                                    />
                                                </td>
                                                <td>
                                                    <v-text-field
                                                        v-model.number="
                                                            food.fiber
                                                        "
                                                        type="number"
                                                        variant="plain"
                                                        density="compact"
                                                        hide-details
                                                    />
                                                </td>
                                                <td>
                                                    <v-btn
                                                        icon="mdi-close"
                                                        size="x-small"
                                                        color="error"
                                                        variant="text"
                                                        @click="
                                                            removeFood(
                                                                mealIndex,
                                                                foodIndex,
                                                            )
                                                        "
                                                    />
                                                </td>
                                            </tr>
                                        </tbody>
                                        <tfoot>
                                            <tr
                                                class="font-weight-bold bg-grey-darken-3"
                                            >
                                                <td>TOTAL</td>
                                                <td>{{ meal.totalWeight }}g</td>
                                                <td>
                                                    {{ meal.totalCalories }}
                                                    kcal
                                                </td>
                                                <td>
                                                    {{
                                                        sumFoodField(
                                                            meal.foods,
                                                            "protein",
                                                        )
                                                    }}g
                                                </td>
                                                <td>
                                                    {{
                                                        sumFoodField(
                                                            meal.foods,
                                                            "carbs",
                                                        )
                                                    }}g
                                                </td>
                                                <td>
                                                    {{
                                                        sumFoodField(
                                                            meal.foods,
                                                            "fats",
                                                        )
                                                    }}g
                                                </td>
                                                <td>
                                                    {{
                                                        sumFoodField(
                                                            meal.foods,
                                                            "fiber",
                                                        )
                                                    }}g
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </v-table>

                                    <v-btn
                                        variant="outlined"
                                        size="small"
                                        prepend-icon="mdi-plus"
                                        @click="addFoodToMeal(mealIndex)"
                                    >
                                        Adicionar Alimento
                                    </v-btn>

                                    <v-textarea
                                        v-model="meal.notes"
                                        label="Observações da refeição"
                                        variant="outlined"
                                        density="compact"
                                        rows="2"
                                        class="mt-3"
                                    />
                                </v-expansion-panel-text>
                            </v-expansion-panel>
                        </v-expansion-panels>

                        <v-alert v-else type="info" variant="tonal">
                            Nenhuma refeição adicionada. Clique em "Adicionar
                            Refeição" para começar.
                        </v-alert>
                    </v-card-text>
                </v-tabs-window-item>

                <!-- ===== WORKOUT TAB ===== -->
                <v-tabs-window-item value="workout">
                    <v-card-text>
                        <div class="d-flex align-center mb-4">
                            <h3 class="text-h6">Treino do Dia</h3>
                            <v-spacer />
                            <v-btn
                                v-if="!form.workout"
                                color="primary"
                                size="small"
                                prepend-icon="mdi-plus"
                                @click="initWorkout"
                            >
                                Iniciar Treino
                            </v-btn>
                        </div>

                        <div v-if="form.workout">
                            <v-row dense class="mb-4">
                                <v-col cols="12" md="3">
                                    <v-text-field
                                        v-model="form.workout.startTime"
                                        label="Hora Início"
                                        type="time"
                                        variant="outlined"
                                        density="compact"
                                    />
                                </v-col>
                                <v-col cols="12" md="3">
                                    <v-text-field
                                        v-model="form.workout.endTime"
                                        label="Hora Fim"
                                        type="time"
                                        variant="outlined"
                                        density="compact"
                                        @update:model-value="
                                            recalculateWorkoutDuration
                                        "
                                    />
                                </v-col>
                                <v-col cols="12" md="3">
                                    <v-text-field
                                        :model-value="
                                            form.workout.totalDurationMinutes
                                        "
                                        label="Duração (min)"
                                        type="number"
                                        variant="outlined"
                                        density="compact"
                                        readonly
                                    />
                                </v-col>
                                <v-col cols="12" md="3">
                                    <v-text-field
                                        :model-value="
                                            form.workout.totalCaloriesBurned
                                        "
                                        label="Total Calorias Queimadas"
                                        variant="outlined"
                                        density="compact"
                                        readonly
                                        append-inner-icon="mdi-fire"
                                    />
                                </v-col>
                            </v-row>

                            <!-- Exercises Table -->
                            <v-table density="compact" class="mb-3">
                                <thead>
                                    <tr>
                                        <th>Exercício</th>
                                        <th style="width: 120px">Categoria</th>
                                        <th style="width: 130px">
                                            Grupo Muscular
                                        </th>
                                        <th style="width: 80px">Duração</th>
                                        <th style="width: 110px">
                                            Intensidade
                                        </th>
                                        <th style="width: 90px">Séries</th>
                                        <th style="width: 90px">Reps</th>
                                        <th style="width: 90px">Peso(kg)</th>
                                        <th style="width: 100px">Kcal</th>
                                        <th style="width: 50px"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr
                                        v-for="(exercise, exIndex) in form
                                            .workout.exercises"
                                        :key="exIndex"
                                    >
                                        <td>
                                            <v-text-field
                                                v-model="exercise.name"
                                                variant="plain"
                                                density="compact"
                                                hide-details
                                                placeholder="Nome"
                                            />
                                        </td>
                                        <td>
                                            <v-select
                                                v-model="exercise.category"
                                                :items="exerciseCategories"
                                                variant="plain"
                                                density="compact"
                                                hide-details
                                            />
                                        </td>
                                        <td>
                                            <v-select
                                                v-model="exercise.muscleGroup"
                                                :items="muscleGroupOptions"
                                                item-title="label"
                                                item-value="value"
                                                variant="plain"
                                                density="compact"
                                                hide-details
                                            />
                                        </td>
                                        <td>
                                            <v-text-field
                                                v-model.number="
                                                    exercise.durationMinutes
                                                "
                                                type="number"
                                                variant="plain"
                                                density="compact"
                                                hide-details
                                                suffix="min"
                                                @update:model-value="
                                                    recalculateExerciseCalories(
                                                        exIndex,
                                                    )
                                                "
                                            />
                                        </td>
                                        <td>
                                            <v-select
                                                v-model="exercise.intensity"
                                                :items="intensityOptions"
                                                item-title="label"
                                                item-value="value"
                                                variant="plain"
                                                density="compact"
                                                hide-details
                                                @update:model-value="
                                                    recalculateExerciseCalories(
                                                        exIndex,
                                                    )
                                                "
                                            />
                                        </td>
                                        <td>
                                            <v-text-field
                                                v-model.number="exercise.sets"
                                                type="number"
                                                variant="plain"
                                                density="compact"
                                                hide-details
                                            />
                                        </td>
                                        <td>
                                            <v-text-field
                                                v-model.number="exercise.reps"
                                                type="number"
                                                variant="plain"
                                                density="compact"
                                                hide-details
                                            />
                                        </td>
                                        <td>
                                            <v-text-field
                                                v-model.number="
                                                    exercise.weightKg
                                                "
                                                type="number"
                                                variant="plain"
                                                density="compact"
                                                hide-details
                                            />
                                        </td>
                                        <td>
                                            <v-text-field
                                                v-model.number="
                                                    exercise.estimatedCaloriesBurned
                                                "
                                                type="number"
                                                variant="plain"
                                                density="compact"
                                                hide-details
                                                @update:model-value="
                                                    recalculateWorkoutTotals
                                                "
                                            />
                                        </td>
                                        <td>
                                            <v-btn
                                                icon="mdi-close"
                                                size="x-small"
                                                color="error"
                                                variant="text"
                                                @click="removeExercise(exIndex)"
                                            />
                                        </td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr
                                        class="font-weight-bold bg-grey-darken-3"
                                    >
                                        <td colspan="8">TOTAL</td>
                                        <td>
                                            {{
                                                form.workout.totalCaloriesBurned
                                            }}
                                            kcal
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </v-table>

                            <v-btn
                                variant="outlined"
                                size="small"
                                prepend-icon="mdi-plus"
                                @click="addExercise"
                            >
                                Adicionar Exercício
                            </v-btn>

                            <v-textarea
                                v-model="form.workout.notes"
                                label="Observações do treino"
                                variant="outlined"
                                density="compact"
                                rows="2"
                                class="mt-3"
                            />

                            <v-btn
                                color="error"
                                variant="text"
                                size="small"
                                class="mt-2"
                                @click="form.workout = null"
                            >
                                Remover Treino
                            </v-btn>
                        </div>

                        <v-alert v-else type="info" variant="tonal">
                            Nenhum treino registrado. Clique em "Iniciar Treino"
                            para adicionar exercícios.
                        </v-alert>
                    </v-card-text>
                </v-tabs-window-item>

                <!-- ===== WATER TAB ===== -->
                <!-- ===== WATER TAB ===== -->
                <v-tabs-window-item value="water">
                    <v-card-text>
                        <div class="text-center mb-4">
                            <p class="text-h3 font-weight-bold">
                                {{ form.waterIntake }} / {{ form.waterGoal }}
                                {{ form.waterGoalUnit }}
                            </p>
                            <v-progress-linear
                                :model-value="waterPercentage"
                                color="blue"
                                height="20"
                                rounded
                                class="mt-2"
                                style="max-width: 400px; margin: 0 auto"
                            >
                                <template #default>
                                    <strong>{{ waterPercentage }}%</strong>
                                </template>
                            </v-progress-linear>
                        </div>

                        <v-row justify="center" class="mb-4">
                            <v-col
                                v-for="amount in quickWaterAmounts"
                                :key="amount"
                                cols="auto"
                            >
                                <v-btn
                                    color="blue"
                                    variant="outlined"
                                    @click="addWater(amount)"
                                >
                                    +{{ amount }}{{ form.waterGoalUnit }}
                                </v-btn>
                            </v-col>
                        </v-row>

                        <v-row justify="center">
                            <v-col cols="4">
                                <v-text-field
                                    v-model.number="customWaterAmount"
                                    label="Quantidade personalizada"
                                    type="number"
                                    step="0.1"
                                    variant="outlined"
                                    density="compact"
                                    hide-details
                                />
                            </v-col>
                            <v-col cols="auto" class="d-flex align-center">
                                <v-btn
                                    color="blue"
                                    @click="addWater(customWaterAmount)"
                                >
                                    Adicionar
                                </v-btn>
                            </v-col>
                            <v-col cols="auto" class="d-flex align-center">
                                <v-btn
                                    color="error"
                                    variant="text"
                                    @click="form.waterIntake = 0"
                                >
                                    Zerar
                                </v-btn>
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-tabs-window-item>
            </v-tabs-window>
        </v-card>

        <!-- Real-time Calorie Chart + Summary -->
        <v-row class="mb-4">
            <v-col cols="12" md="8">
                <v-card>
                    <v-card-title>
                        <v-icon start>mdi-chart-bar</v-icon>
                        Balanço Calórico do Dia
                    </v-card-title>
                    <v-card-text>
                        <Bar
                            v-if="chartData"
                            :data="chartData"
                            :options="chartOptions"
                            style="max-height: 300px"
                        />
                    </v-card-text>
                </v-card>
            </v-col>

            <v-col cols="12" md="4">
                <v-card
                    :color="
                        summaryData.isDeficit
                            ? 'green-darken-4'
                            : 'red-darken-4'
                    "
                    class="h-100"
                >
                    <v-card-title class="text-center">
                        <v-icon size="40">
                            {{
                                summaryData.isDeficit
                                    ? "mdi-trending-down"
                                    : "mdi-trending-up"
                            }}
                        </v-icon>
                    </v-card-title>
                    <v-card-text class="text-center">
                        <p class="text-h3 font-weight-bold">
                            {{ summaryData.isDeficit ? "-" : "+"
                            }}{{ Math.abs(summaryData.caloricBalance) }}
                        </p>
                        <p class="text-h6 mb-4">kcal</p>
                        <v-chip
                            :color="summaryData.isDeficit ? 'success' : 'error'"
                            size="large"
                        >
                            {{
                                summaryData.isDeficit
                                    ? "DÉFICIT CALÓRICO"
                                    : "SUPERÁVIT CALÓRICO"
                            }}
                        </v-chip>
                        <v-divider class="my-4" />
                        <v-row dense>
                            <v-col cols="6">
                                <p class="text-caption text-grey">Consumido</p>
                                <p class="text-h6">
                                    {{ summaryData.totalCaloriesConsumed }} kcal
                                </p>
                            </v-col>
                            <v-col cols="6">
                                <p class="text-caption text-grey">Queimado</p>
                                <p class="text-h6">
                                    {{ summaryData.totalCaloriesBurned }} kcal
                                </p>
                            </v-col>
                            <v-col cols="6">
                                <p class="text-caption text-grey">Meta</p>
                                <p class="text-h6">
                                    {{ form.caloricGoal }} kcal
                                </p>
                            </v-col>
                            <v-col cols="6">
                                <p class="text-caption text-grey">Líquido</p>
                                <p class="text-h6">
                                    {{ summaryData.netCalories }} kcal
                                </p>
                            </v-col>
                        </v-row>
                        <v-divider class="my-4" />
                        <v-row dense>
                            <v-col cols="6">
                                <p class="text-caption text-grey">
                                    Peso Inicial
                                </p>
                                <p class="text-h6">
                                    {{
                                        morningWeight
                                            ? morningWeight + " kg"
                                            : "--"
                                    }}
                                </p>
                            </v-col>
                            <v-col cols="6">
                                <p class="text-caption text-grey">Peso Final</p>
                                <p class="text-h6">
                                    {{
                                        eveningWeight
                                            ? eveningWeight + " kg"
                                            : "--"
                                    }}
                                </p>
                            </v-col>
                        </v-row>
                        <p
                            v-if="summaryData.weightChange !== null"
                            class="text-body-1 mt-2"
                        >
                            Variação:
                            <strong
                                :class="
                                    summaryData.weightChange <= 0
                                        ? 'text-success'
                                        : 'text-error'
                                "
                            >
                                {{ summaryData.weightChange > 0 ? "+" : ""
                                }}{{ summaryData.weightChange.toFixed(2) }} kg
                            </strong>
                        </p>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <!-- Notes -->
        <v-card class="mb-4">
            <v-card-text>
                <v-textarea
                    v-model="form.notes"
                    label="Anotações gerais do dia"
                    variant="outlined"
                    rows="3"
                    prepend-inner-icon="mdi-note-text"
                />
            </v-card-text>
        </v-card>

        <!-- Action Buttons -->
        <div class="d-flex justify-end gap-3 mb-8">
            <v-btn variant="outlined" @click="$router.back()"> Cancelar </v-btn>
            <v-btn
                color="primary"
                size="large"
                prepend-icon="mdi-content-save-check"
                @click="openReviewDialog"
            >
                Revisar e Salvar
            </v-btn>
        </div>

        <!-- ===== BIOIMPEDANCE FORM DIALOG ===== -->
        <v-dialog v-model="showBioimpedanceForm" max-width="700" persistent>
            <v-card>
                <v-card-title>
                    <v-icon start>mdi-scale-bathroom</v-icon>
                    Dados de Bioimpedância
                </v-card-title>
                <v-card-text>
                    <v-select
                        v-model="bioForm.time"
                        :items="[
                            {
                                title: '☀️ Manhã (ao acordar)',
                                value: 'morning',
                            },
                            {
                                title: '🌙 Noite (antes de dormir)',
                                value: 'evening',
                            },
                        ]"
                        label="Período"
                        variant="outlined"
                        class="mb-3"
                    />

                    <v-row dense>
                        <v-col cols="6" md="4">
                            <v-text-field
                                v-model.number="bioForm.weight"
                                label="Peso (kg)"
                                type="number"
                                step="0.1"
                                variant="outlined"
                                density="compact"
                            />
                        </v-col>
                        <v-col cols="6" md="4">
                            <v-text-field
                                v-model.number="bioForm.bmi"
                                label="IMC"
                                type="number"
                                step="0.1"
                                variant="outlined"
                                density="compact"
                            />
                        </v-col>
                        <v-col cols="6" md="4">
                            <v-text-field
                                v-model.number="bioForm.bodyFatPercentage"
                                label="Gordura (%)"
                                type="number"
                                step="0.1"
                                variant="outlined"
                                density="compact"
                            />
                        </v-col>
                        <v-col cols="6" md="4">
                            <v-text-field
                                v-model.number="bioForm.bodyFatMass"
                                label="Peso Gordura (kg)"
                                type="number"
                                step="0.1"
                                variant="outlined"
                                density="compact"
                            />
                        </v-col>
                        <v-col cols="6" md="4">
                            <v-text-field
                                v-model.number="
                                    bioForm.skeletalMuscleMassPercentage
                                "
                                label="Massa Musc. Esq. (%)"
                                type="number"
                                step="0.1"
                                variant="outlined"
                                density="compact"
                            />
                        </v-col>
                        <v-col cols="6" md="4">
                            <v-text-field
                                v-model.number="bioForm.muscleMassRecord"
                                label="Reg. Massa Musc. (%)"
                                type="number"
                                step="0.1"
                                variant="outlined"
                                density="compact"
                            />
                        </v-col>
                        <v-col cols="6" md="4">
                            <v-text-field
                                v-model.number="bioForm.skeletalMuscleMass"
                                label="Massa Musc. Esq. (kg)"
                                type="number"
                                step="0.1"
                                variant="outlined"
                                density="compact"
                            />
                        </v-col>
                        <v-col cols="6" md="4">
                            <v-text-field
                                v-model.number="bioForm.muscleMass"
                                label="Massa Muscular (kg)"
                                type="number"
                                step="0.1"
                                variant="outlined"
                                density="compact"
                            />
                        </v-col>
                        <v-col cols="6" md="4">
                            <v-text-field
                                v-model.number="bioForm.waterPercentage"
                                label="Água (%)"
                                type="number"
                                step="0.1"
                                variant="outlined"
                                density="compact"
                            />
                        </v-col>
                        <v-col cols="6" md="4">
                            <v-text-field
                                v-model.number="bioForm.waterMass"
                                label="Peso Água (kg)"
                                type="number"
                                step="0.1"
                                variant="outlined"
                                density="compact"
                            />
                        </v-col>
                        <v-col cols="6" md="4">
                            <v-text-field
                                v-model.number="bioForm.visceralFat"
                                label="Gordura Visceral"
                                type="number"
                                variant="outlined"
                                density="compact"
                            />
                        </v-col>
                        <v-col cols="6" md="4">
                            <v-text-field
                                v-model.number="bioForm.boneMass"
                                label="Ossos (kg)"
                                type="number"
                                step="0.1"
                                variant="outlined"
                                density="compact"
                            />
                        </v-col>
                        <v-col cols="6" md="4">
                            <v-text-field
                                v-model.number="bioForm.basalMetabolicRate"
                                label="Metabolismo (kcal)"
                                type="number"
                                variant="outlined"
                                density="compact"
                            />
                        </v-col>
                        <v-col cols="6" md="4">
                            <v-text-field
                                v-model.number="bioForm.proteinPercentage"
                                label="Proteína (%)"
                                type="number"
                                step="0.1"
                                variant="outlined"
                                density="compact"
                            />
                        </v-col>
                        <v-col cols="6" md="4">
                            <v-text-field
                                v-model.number="bioForm.obesityPercentage"
                                label="Obesidade (%)"
                                type="number"
                                step="0.1"
                                variant="outlined"
                                density="compact"
                            />
                        </v-col>
                        <v-col cols="6" md="4">
                            <v-text-field
                                v-model.number="bioForm.metabolicAge"
                                label="Idade Metabólica"
                                type="number"
                                variant="outlined"
                                density="compact"
                            />
                        </v-col>
                    </v-row>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn @click="showBioimpedanceForm = false"
                        >Cancelar</v-btn
                    >
                    <v-btn color="primary" @click="saveBioimpedance"
                        >Salvar Medição</v-btn
                    >
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- ===== REVIEW DIALOG ===== -->
        <v-dialog v-model="showReviewDialog" max-width="900" persistent>
            <v-card>
                <v-card-title class="text-h5 pa-4">
                    <v-icon start color="primary">mdi-clipboard-check</v-icon>
                    Revisão — {{ dateFormatted }}
                </v-card-title>

                <v-divider />

                <v-card-text
                    class="pa-4"
                    style="max-height: 70vh; overflow-y: auto"
                >
                    <!-- Body Measurements Summary -->
                    <h3 class="text-h6 mb-2">
                        <v-icon start>mdi-scale-bathroom</v-icon>
                        Bioimpedância
                    </h3>
                    <v-alert
                        v-if="form.bodyMeasurements.length === 0"
                        type="warning"
                        variant="tonal"
                        density="compact"
                        class="mb-4"
                    >
                        Sem medições
                    </v-alert>
                    <v-table v-else density="compact" class="mb-4">
                        <thead>
                            <tr>
                                <th>Período</th>
                                <th>Peso</th>
                                <th>IMC</th>
                                <th>Gordura</th>
                                <th>Massa Musc.</th>
                                <th>Água</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="(m, i) in form.bodyMeasurements"
                                :key="i"
                            >
                                <td>
                                    {{
                                        m.time === "morning" ? "Manhã" : "Noite"
                                    }}
                                </td>
                                <td>{{ m.data.weight.value }} kg</td>
                                <td>{{ m.data.bmi }}</td>
                                <td>{{ m.data.bodyFatPercentage.value }}%</td>
                                <td>{{ m.data.muscleMass.value }} kg</td>
                                <td>{{ m.data.waterPercentage.value }}%</td>
                            </tr>
                        </tbody>
                    </v-table>

                    <!-- Meals Summary -->
                    <h3 class="text-h6 mb-2">
                        <v-icon start>mdi-food</v-icon>
                        Refeições ({{ form.meals.length }})
                    </h3>
                    <v-table density="compact" class="mb-4">
                        <thead>
                            <tr>
                                <th>Tipo</th>
                                <th>Nome</th>
                                <th>Horário</th>
                                <th>Peso Total</th>
                                <th>Calorias</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(meal, i) in form.meals" :key="i">
                                <td>{{ getMealLabel(meal.type) }}</td>
                                <td>{{ meal.label }}</td>
                                <td>{{ meal.time }}</td>
                                <td>{{ meal.totalWeight }}g</td>
                                <td>{{ meal.totalCalories }} kcal</td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr class="font-weight-bold">
                                <td colspan="3">TOTAL</td>
                                <td>{{ summaryData.totalWeight }}g</td>
                                <td>
                                    {{ summaryData.totalCaloriesConsumed }} kcal
                                </td>
                            </tr>
                        </tfoot>
                    </v-table>

                    <!-- Workout Summary -->
                    <h3 class="text-h6 mb-2">
                        <v-icon start>mdi-dumbbell</v-icon>
                        Treino
                    </h3>
                    <v-alert
                        v-if="!form.workout"
                        type="info"
                        variant="tonal"
                        density="compact"
                        class="mb-4"
                    >
                        Sem treino registrado
                    </v-alert>
                    <div v-else class="mb-4">
                        <p class="text-body-2 mb-2">
                            <strong>Duração:</strong>
                            {{ form.workout.totalDurationMinutes }} min |
                            <strong>Calorias queimadas:</strong>
                            {{ form.workout.totalCaloriesBurned }} kcal
                        </p>
                        <v-chip
                            v-for="(ex, i) in form.workout.exercises"
                            :key="i"
                            size="small"
                            class="mr-1 mb-1"
                        >
                            {{ ex.name }} ({{ ex.durationMinutes }}min —
                            {{ ex.estimatedCaloriesBurned }}kcal)
                        </v-chip>
                    </div>

                    <!-- Water -->
                    <h3 class="text-h6 mb-2">
                        <v-icon start>mdi-water</v-icon>
                        Água
                    </h3>
                    <p class="text-body-1 mb-4">
                        {{ form.waterIntake }} / {{ form.waterGoal }}
                        {{ form.waterGoalUnit }} ({{ waterPercentage }}%)
                    </p>

                    <!-- Caloric Balance -->
                    <v-divider class="mb-4" />
                    <div class="text-center pa-4">
                        <v-chip
                            :color="summaryData.isDeficit ? 'success' : 'error'"
                            size="x-large"
                            class="text-h6"
                        >
                            {{
                                summaryData.isDeficit ? "DÉFICIT" : "SUPERÁVIT"
                            }}: {{ Math.abs(summaryData.caloricBalance) }} kcal
                        </v-chip>
                    </div>
                </v-card-text>

                <v-divider />

                <v-card-actions class="pa-4">
                    <v-btn variant="outlined" @click="showReviewDialog = false">
                        Voltar e Editar
                    </v-btn>
                    <v-spacer />
                    <v-btn
                        color="primary"
                        size="large"
                        prepend-icon="mdi-content-save"
                        :loading="saving"
                        @click="saveEntry"
                    >
                        Confirmar e Salvar
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- Snackbar -->
        <v-snackbar
            v-model="snackbar.show"
            :color="snackbar.color"
            timeout="4000"
        >
            {{ snackbar.message }}
        </v-snackbar>
    </div>
</template>

<script setup lang="ts">
import { format } from "date-fns";
import { Bar } from "vue-chartjs";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";
import type {
    MealType,
    FoodItem,
    Meal,
    WorkoutSession,
    Exercise,
    BodyMeasurementEntry,
    BioimpedanceMeasurement,
    MeasurementTime,
    ExerciseCategory,
    MuscleGroup,
    WorkoutIntensity,
    DailyWater,
    MeasurementValue,
    VolumeUnit,
    MEAL_TYPE_LABELS,
    MUSCLE_GROUP_LABELS,
} from "~~/shared/types/daily";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
);

// ===== Constants =====
const mealTypeOptions: { label: string; value: MealType }[] = [
    { label: "Pré-Treino", value: "pre_workout" },
    { label: "Café da Manhã", value: "breakfast" },
    { label: "Lanche da Manhã", value: "morning_snack" },
    { label: "Almoço", value: "lunch" },
    { label: "Lanche da Tarde", value: "afternoon_snack" },
    { label: "Pré-Treino (Refeição)", value: "pre_workout_meal" },
    { label: "Pós-Treino", value: "post_workout" },
    { label: "Jantar", value: "dinner" },
    { label: "Ceia", value: "supper" },
    { label: "Lanche", value: "snack" },
];

const exerciseCategories: ExerciseCategory[] = [
    "strength",
    "cardio",
    "flexibility",
    "sport",
];

const muscleGroupOptions: { label: string; value: MuscleGroup }[] = [
    { label: "Peito", value: "chest" },
    { label: "Costas", value: "back" },
    { label: "Ombros", value: "shoulders" },
    { label: "Bíceps", value: "biceps" },
    { label: "Tríceps", value: "triceps" },
    { label: "Antebraços", value: "forearms" },
    { label: "Abdômen", value: "abs" },
    { label: "Quadríceps", value: "quadriceps" },
    { label: "Posterior", value: "hamstrings" },
    { label: "Glúteos", value: "glutes" },
    { label: "Panturrilha", value: "calves" },
    { label: "Full Body", value: "full_body" },
    { label: "Outro", value: "other" },
];

const intensityOptions: { label: string; value: WorkoutIntensity }[] = [
    { label: "Baixa", value: "low" },
    { label: "Moderada", value: "moderate" },
    { label: "Alta", value: "high" },
    { label: "Muito Alta", value: "very_high" },
];

const INTENSITY_CALORIE_MULTIPLIER: Record<WorkoutIntensity, number> = {
    low: 4,
    moderate: 7,
    high: 10,
    very_high: 13,
};

// ===== State =====
const activeTab = ref("meals");
const showBioimpedanceForm = ref(false);
const showReviewDialog = ref(false);
const saving = ref(false);
const snackbar = ref({ show: false, message: "", color: "success" });

const form = ref({
    date: format(new Date(), "yyyy-MM-dd"),
    caloricGoal: 2000,
    waterGoal: 3,
    waterGoalUnit: "l" as "l" | "ml",
    waterIntake: 0,
    bodyMeasurements: [] as BodyMeasurementEntry[],
    meals: [] as Meal[],
    workout: null as WorkoutSession | null,
    notes: "",
});

const dateFormatted = computed(() => {
    try {
        return format(
            new Date(form.value.date + "T12:00:00"),
            "EEEE, dd/MM/yyyy",
        );
    } catch {
        return form.value.date;
    }
});

// ===== Bioimpedance Form =====
const bioForm = ref({
    time: "morning" as MeasurementTime,
    weight: 0,
    bmi: 0,
    bodyFatPercentage: 0,
    bodyFatMass: 0,
    skeletalMuscleMassPercentage: 0,
    muscleMassRecord: 0,
    skeletalMuscleMass: 0,
    muscleMass: 0,
    waterPercentage: 0,
    waterMass: 0,
    visceralFat: 0,
    boneMass: 0,
    basalMetabolicRate: 0,
    proteinPercentage: 0,
    obesityPercentage: 0,
    metabolicAge: 0,
});

function resetBioForm() {
    bioForm.value = {
        time: "morning",
        weight: 0,
        bmi: 0,
        bodyFatPercentage: 0,
        bodyFatMass: 0,
        skeletalMuscleMassPercentage: 0,
        muscleMassRecord: 0,
        skeletalMuscleMass: 0,
        muscleMass: 0,
        waterPercentage: 0,
        waterMass: 0,
        visceralFat: 0,
        boneMass: 0,
        basalMetabolicRate: 0,
        proteinPercentage: 0,
        obesityPercentage: 0,
        metabolicAge: 0,
    };
}

function getMealLabel(type: MealType): string {
    const option = mealTypeOptions.find((opt) => opt.value === type);
    return option ? option.label : type;
}

function getMealColor(type: MealType): string {
    const colors: Record<MealType, string> = {
        pre_workout: "purple",
        breakfast: "orange",
        morning_snack: "amber",
        lunch: "green",
        afternoon_snack: "teal",
        pre_workout_meal: "purple-darken-2",
        post_workout: "indigo",
        dinner: "blue",
        supper: "blue-grey",
        snack: "grey",
    };
    return colors[type] || "grey";
}

function removeMeasurement(index: number) {
    form.value.bodyMeasurements.splice(index, 1);
}

function addNewMeal() {
    const newMeal: Meal = {
        type: "lunch",
        label: "",
        time: "",
        foods: [],
        totalCalories: 0,
        totalWeight: 0,
        notes: "",
    };
    form.value.meals.push(newMeal);
}

async function saveEntry() {
    saving.value = true;
    try {
        const authStore = useAuthStore();

        const payload = {
            date: form.value.date,
            caloricGoal: form.value.caloricGoal,
            waterGoal: {
                value: form.value.waterGoal,
                unit: form.value.waterGoalUnit,
            },
            bodyMeasurements: form.value.bodyMeasurements,
            meals: form.value.meals,
            workout: form.value.workout,
            water: {
                intake: {
                    value: form.value.waterIntake,
                    unit: form.value.waterGoalUnit,
                },
                goal: {
                    value: form.value.waterGoal,
                    unit: form.value.waterGoalUnit,
                },
            },
            summary: {
                totalCaloriesConsumed: summaryData.value.totalCaloriesConsumed,
                totalCaloriesBurned: summaryData.value.totalCaloriesBurned,
                netCalories: summaryData.value.netCalories,
                caloricGoal: form.value.caloricGoal,
                caloricBalance: summaryData.value.caloricBalance,
                isDeficit: summaryData.value.isDeficit,
                deficitPercentage:
                    form.value.caloricGoal > 0
                        ? Math.round(
                              (summaryData.value.caloricBalance /
                                  form.value.caloricGoal) *
                                  100,
                          )
                        : 0,
                weightChange: summaryData.value.weightChange,
                waterPercentage: waterPercentage.value,
                totalProtein: form.value.meals.reduce(
                    (sum, m) =>
                        sum + m.foods.reduce((s, f) => s + (f.protein || 0), 0),
                    0,
                ),
                totalCarbs: form.value.meals.reduce(
                    (sum, m) =>
                        sum + m.foods.reduce((s, f) => s + (f.carbs || 0), 0),
                    0,
                ),
                totalFats: form.value.meals.reduce(
                    (sum, m) =>
                        sum + m.foods.reduce((s, f) => s + (f.fats || 0), 0),
                    0,
                ),
                totalFiber: form.value.meals.reduce(
                    (sum, m) =>
                        sum + m.foods.reduce((s, f) => s + (f.fiber || 0), 0),
                    0,
                ),
            },
            notes: form.value.notes,
        };

        await $fetch("/api/daily", {
            method: "POST",
            body: payload,
            headers: authStore.authHeaders,
        });

        snackbar.value = {
            show: true,
            message: "Entrada salva com sucesso!",
            color: "success",
        };
        showReviewDialog.value = false;

        // Navigate to the daily view page
        await navigateTo(`/daily/${form.value.date}`);
    } catch (e: unknown) {
        const message =
            e instanceof Error
                ? e.message
                : "Erro ao salvar entrada. Tente novamente.";
        snackbar.value = {
            show: true,
            message,
            color: "error",
        };
    } finally {
        saving.value = false;
    }
}

function saveBioimpedance() {
    const entry: BodyMeasurementEntry = {
        time: bioForm.value.time,
        timestamp: new Date().toISOString(),
        data: {
            weight: { value: bioForm.value.weight, unit: "kg" },
            bmi: bioForm.value.bmi,
            bodyFatPercentage: {
                value: bioForm.value.bodyFatPercentage,
                unit: "%",
            },
            bodyFatMass: { value: bioForm.value.bodyFatMass, unit: "kg" },
            skeletalMuscleMassPercentage: {
                value: bioForm.value.skeletalMuscleMassPercentage,
                unit: "%",
            },
            muscleMassRecord: {
                value: bioForm.value.muscleMassRecord,
                unit: "%",
            },
            skeletalMuscleMass: {
                value: bioForm.value.skeletalMuscleMass,
                unit: "kg",
            },
            muscleMass: { value: bioForm.value.muscleMass, unit: "kg" },
            waterPercentage: {
                value: bioForm.value.waterPercentage,
                unit: "%",
            },
            waterMass: { value: bioForm.value.waterMass, unit: "kg" },
            visceralFat: bioForm.value.visceralFat,
            boneMass: { value: bioForm.value.boneMass, unit: "kg" },
            basalMetabolicRate: {
                value: bioForm.value.basalMetabolicRate,
                unit: "kcal",
            },
            proteinPercentage: {
                value: bioForm.value.proteinPercentage,
                unit: "%",
            },
            obesityPercentage: {
                value: bioForm.value.obesityPercentage,
                unit: "%",
            },
            metabolicAge: { value: bioForm.value.metabolicAge, unit: "years" },
        },
    };
    form.value.bodyMeasurements.push(entry);
    showBioimpedanceForm.value = false;
    resetBioForm();
}

function removeMeal(index: number) {
    form.value.meals.splice(index, 1);
}

function addFoodToMeal(mealIndex: number) {
    const meal = form.value.meals[mealIndex];
    if (!meal) return;
    const newFood: FoodItem = {
        name: "",
        weightGrams: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        fiber: 0,
    };
    meal.foods.push(newFood);
}

// ===== Water =====
const customWaterAmount = ref(0.5);

const quickWaterAmounts = computed(() => {
    return form.value.waterGoalUnit === "l" ? [0.25, 0.5, 1] : [250, 500, 1000];
});

function addWater(amount: number) {
    form.value.waterIntake =
        Math.round((form.value.waterIntake + amount) * 100) / 100;
}

function removeFood(mealIndex: number, foodIndex: number) {
    const meal = form.value.meals[mealIndex];
    if (!meal) return;
    meal.foods.splice(foodIndex, 1);
    recalculateMealTotals(mealIndex);
}

function recalculateMealTotals(mealIndex: number) {
    const meal = form.value.meals[mealIndex];
    if (!meal) return;
    meal.totalCalories = meal.foods.reduce(
        (sum, f) => sum + (f.calories || 0),
        0,
    );
    meal.totalWeight = meal.foods.reduce(
        (sum, f) => sum + (f.weightGrams || 0),
        0,
    );
}

function sumFoodField(foods: FoodItem[], field: keyof FoodItem): number {
    return foods.reduce((sum, f) => sum + (Number(f[field]) || 0), 0);
}

function initWorkout() {
    form.value.workout = {
        startTime: "",
        endTime: "",
        totalDurationMinutes: 0,
        exercises: [],
        totalCaloriesBurned: 0,
        notes: "",
    };
}

function addExercise() {
    if (!form.value.workout) return;
    const newExercise: Exercise = {
        name: "",
        category: "strength",
        muscleGroup: "other",
        durationMinutes: 0,
        intensity: "moderate",
        sets: 0,
        reps: 0,
        weightKg: 0,
        estimatedCaloriesBurned: 0,
    };
    form.value.workout.exercises.push(newExercise);
}

function removeExercise(index: number) {
    if (!form.value.workout) return;
    form.value.workout.exercises.splice(index, 1);
    recalculateWorkoutTotals();
}

function recalculateExerciseCalories(index: number) {
    if (!form.value.workout) return;
    const ex = form.value.workout.exercises[index];
    if (!ex) return;
    const multiplier = INTENSITY_CALORIE_MULTIPLIER[ex.intensity] || 7;
    ex.estimatedCaloriesBurned = Math.round(
        (ex.durationMinutes || 0) * multiplier,
    );
    recalculateWorkoutTotals();
}

function recalculateWorkoutTotals() {
    if (!form.value.workout) return;
    form.value.workout.totalCaloriesBurned =
        form.value.workout.exercises.reduce(
            (sum, ex) => sum + (ex.estimatedCaloriesBurned || 0),
            0,
        );
}

function recalculateWorkoutDuration() {
    if (
        !form.value.workout ||
        !form.value.workout.startTime ||
        !form.value.workout.endTime
    )
        return;
    const startParts = form.value.workout.startTime.split(":").map(Number);
    const endParts = form.value.workout.endTime.split(":").map(Number);
    const startH = startParts[0];
    const startM = startParts[1];
    const endH = endParts[0];
    const endM = endParts[1];
    if (
        startH === undefined ||
        startM === undefined ||
        endH === undefined ||
        endM === undefined
    )
        return;
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    form.value.workout.totalDurationMinutes = Math.max(
        0,
        endMinutes - startMinutes,
    );
}

// ===== Water =====
const waterData = computed<DailyWater>(() => ({
    goal: {
        value: form.value.waterGoal,
        unit: form.value.waterGoalUnit as VolumeUnit,
    },
    intake: {
        value: form.value.waterIntake,
        unit: form.value.waterGoalUnit as VolumeUnit,
    },
}));

function updateWaterIntake(data: { consumed: number }) {
    form.value.waterIntake = data.consumed;
}

const waterPercentage = computed(() => {
    if (form.value.waterGoal <= 0) return 0;
    return Math.min(
        Math.round((form.value.waterIntake / form.value.waterGoal) * 100),
        100,
    );
});
// ===== Summary =====
const morningWeight = computed(() => {
    const morning = form.value.bodyMeasurements.find(
        (m) => m.time === "morning",
    );
    return morning ? morning.data.weight.value : null;
});

const eveningWeight = computed(() => {
    const evening = form.value.bodyMeasurements.find(
        (m) => m.time === "evening",
    );
    return evening ? evening.data.weight.value : null;
});

const summaryData = computed(() => {
    const totalCaloriesConsumed = form.value.meals.reduce(
        (sum, m) => sum + m.totalCalories,
        0,
    );
    const totalCaloriesBurned = form.value.workout?.totalCaloriesBurned || 0;
    const netCalories = totalCaloriesConsumed - totalCaloriesBurned;
    const caloricBalance = netCalories - form.value.caloricGoal;
    const isDeficit = caloricBalance < 0;
    const totalWeight = form.value.meals.reduce(
        (sum, m) => sum + m.totalWeight,
        0,
    );
    const weightChange =
        morningWeight.value && eveningWeight.value
            ? eveningWeight.value - morningWeight.value
            : null;

    return {
        totalCaloriesConsumed,
        totalCaloriesBurned,
        netCalories,
        caloricBalance,
        isDeficit,
        totalWeight,
        weightChange,
    };
});

// ===== Chart =====
const chartData = computed(() => ({
    labels: ["Consumido", "Queimado", "Meta", "Líquido"],
    datasets: [
        {
            label: "Calorias",
            data: [
                summaryData.value.totalCaloriesConsumed,
                summaryData.value.totalCaloriesBurned,
                form.value.caloricGoal,
                summaryData.value.netCalories,
            ],
            backgroundColor: ["#FFA726", "#EF5350", "#42A5F5", "#66BB6A"],
        },
    ],
}));

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
    },
};

function openReviewDialog() {
    showReviewDialog.value = true;
}
</script>
