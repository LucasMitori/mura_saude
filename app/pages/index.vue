<template>
    <div>
        <!-- Header -->
        <div class="d-flex align-center mb-6">
            <div>
                <h1 class="text-h4 font-weight-bold">Dashboard</h1>
                <p class="text-body-2 text-grey mt-1">
                    {{ greeting }}, {{ authStore.user?.name || "User" }}
                </p>
            </div>
            <v-spacer />
            <v-btn
                v-if="authStore.isAdmin"
                color="primary"
                size="large"
                prepend-icon="mdi-plus"
                to="/daily/new"
                class="mr-2"
            >
                Nova Entrada
            </v-btn>
            <v-btn
                icon="mdi-refresh"
                variant="outlined"
                :loading="loading"
                @click="loadAllData"
            />
        </div>

        <!-- Top Stats Cards -->
        <v-row class="mb-4">
            <v-col cols="12" sm="6" md="3">
                <v-card class="stat-card" color="primary" variant="elevated">
                    <v-card-text class="d-flex align-center">
                        <v-avatar color="white" size="48" class="mr-4">
                            <v-icon color="primary" size="28"
                                >mdi-scale-bathroom</v-icon
                            >
                        </v-avatar>
                        <div>
                            <p class="text-caption text-primary-lighten-3">
                                Peso Atual
                            </p>
                            <p class="text-h5 font-weight-bold">
                                {{
                                    latestWeight
                                        ? latestWeight.toFixed(1) + " kg"
                                        : "--"
                                }}
                            </p>
                            <p v-if="weightTrend !== null" class="text-caption">
                                <v-icon
                                    size="14"
                                    :color="
                                        weightTrend <= 0 ? 'success' : 'error'
                                    "
                                >
                                    {{
                                        weightTrend <= 0
                                            ? "mdi-trending-down"
                                            : "mdi-trending-up"
                                    }}
                                </v-icon>
                                {{ weightTrend > 0 ? "+" : ""
                                }}{{ weightTrend.toFixed(1) }} kg (7d)
                            </p>
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>

            <v-col cols="12" sm="6" md="3">
                <v-card
                    class="stat-card"
                    color="orange-darken-2"
                    variant="elevated"
                >
                    <v-card-text class="d-flex align-center">
                        <v-avatar color="white" size="48" class="mr-4">
                            <v-icon color="orange-darken-2" size="28"
                                >mdi-fire</v-icon
                            >
                        </v-avatar>
                        <div>
                            <p
                                class="text-caption"
                                style="color: rgba(255, 255, 255, 0.7)"
                            >
                                Calorias Hoje
                            </p>
                            <p class="text-h5 font-weight-bold">
                                {{
                                    todaySummary?.totalCaloriesConsumed ?? "--"
                                }}
                                kcal
                            </p>
                            <p v-if="todaySummary" class="text-caption">
                                Meta:
                                {{ todaySummary.caloricGoal || 2000 }} kcal
                            </p>
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>

            <v-col cols="12" sm="6" md="3">
                <v-card
                    class="stat-card"
                    color="blue-darken-2"
                    variant="elevated"
                >
                    <v-card-text class="d-flex align-center">
                        <v-avatar color="white" size="48" class="mr-4">
                            <v-icon color="blue-darken-2" size="28"
                                >mdi-water</v-icon
                            >
                        </v-avatar>
                        <div>
                            <p
                                class="text-caption"
                                style="color: rgba(255, 255, 255, 0.7)"
                            >
                                Água Hoje
                            </p>
                            <p class="text-h5 font-weight-bold">
                                {{ todayWater.intake }} / {{ todayWater.goal }}
                                {{ todayWater.unit }}
                            </p>
                            <v-progress-linear
                                :model-value="todayWater.percentage"
                                color="white"
                                bg-color="rgba(255,255,255,0.2)"
                                height="4"
                                rounded
                                class="mt-1"
                            />
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>

            <v-col cols="12" sm="6" md="3">
                <v-card
                    class="stat-card"
                    :color="todayDeficit ? 'green-darken-2' : 'red-darken-2'"
                    variant="elevated"
                >
                    <v-card-text class="d-flex align-center">
                        <v-avatar color="white" size="48" class="mr-4">
                            <v-icon
                                :color="
                                    todayDeficit
                                        ? 'green-darken-2'
                                        : 'red-darken-2'
                                "
                                size="28"
                            >
                                {{
                                    todayDeficit
                                        ? "mdi-trending-down"
                                        : "mdi-trending-up"
                                }}
                            </v-icon>
                        </v-avatar>
                        <div>
                            <p
                                class="text-caption"
                                style="color: rgba(255, 255, 255, 0.7)"
                            >
                                Balanço Hoje
                            </p>
                            <p class="text-h5 font-weight-bold">
                                {{
                                    todaySummary
                                        ? (todayBalance >= 0 ? "+" : "") +
                                          todayBalance +
                                          " kcal"
                                        : "--"
                                }}
                            </p>
                            <v-chip
                                v-if="todaySummary"
                                size="x-small"
                                :color="todayDeficit ? 'success' : 'error'"
                                variant="flat"
                            >
                                {{ todayDeficit ? "Déficit" : "Superávit" }}
                            </v-chip>
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <!-- Today's Quick View -->
        <v-card v-if="todayRecord" class="mb-4">
            <v-card-title class="d-flex align-center">
                <v-icon start>mdi-calendar-today</v-icon>
                Resumo de Hoje — {{ todayFormatted }}
                <v-spacer />
                <v-btn
                    color="primary"
                    variant="text"
                    size="small"
                    :to="`/daily/${today}`"
                >
                    Ver Detalhes
                    <v-icon end>mdi-arrow-right</v-icon>
                </v-btn>
            </v-card-title>
            <v-card-text>
                <v-row>
                    <v-col cols="12" md="3">
                        <div class="text-center">
                            <v-progress-circular
                                :model-value="todayCaloriePercentage"
                                :size="100"
                                :width="10"
                                :color="todayDeficit ? 'success' : 'error'"
                            >
                                <div>
                                    <p class="text-h6 font-weight-bold">
                                        {{ todayCaloriePercentage }}%
                                    </p>
                                    <p class="text-caption">da meta</p>
                                </div>
                            </v-progress-circular>
                        </div>
                    </v-col>
                    <v-col cols="12" md="3">
                        <p class="text-caption text-grey">Refeições</p>
                        <p class="text-h5">
                            {{ todayRecord.meals?.length || 0 }}
                        </p>
                        <div class="mt-2">
                            <v-chip
                                v-for="meal in (todayRecord.meals || []).slice(
                                    0,
                                    3,
                                )"
                                :key="meal.label"
                                size="x-small"
                                class="mr-1 mb-1"
                            >
                                {{ meal.label || meal.type }}
                            </v-chip>
                            <v-chip
                                v-if="(todayRecord.meals?.length || 0) > 3"
                                size="x-small"
                                color="grey"
                            >
                                +{{ (todayRecord.meals?.length || 0) - 3 }}
                            </v-chip>
                        </div>
                    </v-col>
                    <v-col cols="12" md="3">
                        <p class="text-caption text-grey">Treino</p>
                        <template v-if="todayRecord.workout">
                            <p class="text-h5">
                                {{ todayRecord.workout.totalDurationMinutes }}
                                min
                            </p>
                            <p class="text-body-2">
                                {{ todayRecord.workout.totalCaloriesBurned }}
                                kcal queimadas
                            </p>
                        </template>
                        <p v-else class="text-body-2 text-grey">Sem treino</p>
                    </v-col>
                    <v-col cols="12" md="3">
                        <p class="text-caption text-grey">Macros</p>
                        <div v-if="todayMacros">
                            <div class="d-flex justify-space-between">
                                <span class="text-caption">Proteína</span>
                                <span class="text-caption font-weight-bold"
                                    >{{ todayMacros.protein }}g</span
                                >
                            </div>
                            <v-progress-linear
                                :model-value="todayMacros.proteinPct"
                                color="red"
                                height="4"
                                rounded
                                class="mb-1"
                            />
                            <div class="d-flex justify-space-between">
                                <span class="text-caption">Carboidratos</span>
                                <span class="text-caption font-weight-bold"
                                    >{{ todayMacros.carbs }}g</span
                                >
                            </div>
                            <v-progress-linear
                                :model-value="todayMacros.carbsPct"
                                color="amber"
                                height="4"
                                rounded
                                class="mb-1"
                            />
                            <div class="d-flex justify-space-between">
                                <span class="text-caption">Gorduras</span>
                                <span class="text-caption font-weight-bold"
                                    >{{ todayMacros.fats }}g</span
                                >
                            </div>
                            <v-progress-linear
                                :model-value="todayMacros.fatsPct"
                                color="blue"
                                height="4"
                                rounded
                            />
                        </div>
                        <p v-else class="text-body-2 text-grey">Sem dados</p>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>

        <!-- Entries Table -->
        <v-card class="mb-4">
            <v-card-title class="d-flex align-center">
                <v-icon start>mdi-table</v-icon>
                Histórico de Entradas
                <v-spacer />
                <v-text-field
                    v-model="tableSearch"
                    prepend-inner-icon="mdi-magnify"
                    label="Buscar..."
                    variant="outlined"
                    density="compact"
                    hide-details
                    style="max-width: 250px"
                    class="mr-2"
                />
                <v-btn
                    icon="mdi-download"
                    variant="text"
                    size="small"
                    title="Exportar CSV"
                    @click="exportCSV"
                />
            </v-card-title>

            <v-data-table
                :headers="tableHeaders"
                :items="tableItems"
                :search="tableSearch"
                :items-per-page="10"
                :loading="loading"
                hover
                class="entries-table"
                @click:row="
                    (_e: Event, item: any) =>
                        navigateTo(`/daily/${item.item.date}`)
                "
            >
                <template #item.date="{ item }">
                    <div class="d-flex align-center">
                        <v-icon size="18" class="mr-2" color="primary"
                            >mdi-calendar</v-icon
                        >
                        <div>
                            <p class="font-weight-medium">
                                {{ formatDateShort(item.date) }}
                            </p>
                            <p class="text-caption text-grey">
                                {{ formatWeekday(item.date) }}
                            </p>
                        </div>
                    </div>
                </template>

                <template #item.weight="{ item }">
                    <span v-if="item.weight">{{ item.weight }} kg</span>
                    <span v-else class="text-grey">--</span>
                </template>

                <template #item.calories="{ item }">
                    <v-chip size="small" color="orange">
                        {{ item.calories }} kcal
                    </v-chip>
                </template>

                <template #item.burned="{ item }">
                    <v-chip v-if="item.burned > 0" size="small" color="red">
                        {{ item.burned }} kcal
                    </v-chip>
                    <span v-else class="text-grey">--</span>
                </template>

                <template #item.balance="{ item }">
                    <v-chip
                        size="small"
                        :color="item.balance < 0 ? 'success' : 'error'"
                    >
                        {{ item.balance >= 0 ? "+" : "" }}{{ item.balance }}
                    </v-chip>
                </template>

                <template #item.status="{ item }">
                    <v-icon
                        :color="item.balance < 0 ? 'success' : 'error'"
                        size="20"
                    >
                        {{
                            item.balance < 0
                                ? "mdi-check-circle"
                                : "mdi-alert-circle"
                        }}
                    </v-icon>
                </template>

                <template #item.meals="{ item }">
                    {{ item.meals }}
                </template>

                <template #item.water="{ item }">
                    <span v-if="item.water">{{ item.water }}%</span>
                    <span v-else class="text-grey">--</span>
                </template>

                <template #item.actions="{ item }">
                    <v-btn
                        icon="mdi-eye"
                        size="x-small"
                        variant="text"
                        :to="`/daily/${item.date}`"
                        @click.stop
                    />
                </template>
            </v-data-table>
        </v-card>

        <!-- Dynamic Widgets Area -->
        <div class="d-flex align-center mb-3">
            <h2 class="text-h5">Análises & Gráficos</h2>
            <v-spacer />
            <v-btn
                icon="mdi-cog"
                variant="outlined"
                size="small"
                @click="showWidgetConfig = true"
                title="Configurar widgets"
            />
        </div>

        <v-row>
            <!-- Left Column (cols 8) -->
            <v-col cols="12" md="8">
                <template v-for="widget in leftWidgets" :key="widget.id">
                    <!-- Weight Trend Chart -->
                    <v-card
                        v-if="widget.id === 'weightTrend' && widget.visible"
                        class="mb-4"
                    >
                        <v-card-title class="d-flex align-center">
                            <v-icon start>mdi-chart-line</v-icon>
                            Evolução de Peso
                            <v-spacer />
                            <v-btn-toggle
                                v-model="weightChartRange"
                                density="compact"
                                mandatory
                            >
                                <v-btn value="7" size="small">7d</v-btn>
                                <v-btn value="14" size="small">14d</v-btn>
                                <v-btn value="30" size="small">30d</v-btn>
                            </v-btn-toggle>
                        </v-card-title>
                        <v-card-text>
                            <Line
                                v-if="weightChartData.labels.length > 0"
                                :data="weightChartData"
                                :options="lineChartOptions"
                                style="max-height: 300px"
                            />
                            <p v-else class="text-center text-grey pa-8">
                                Sem dados de peso suficientes para exibir o
                                gráfico.
                            </p>
                        </v-card-text>
                    </v-card>

                    <!-- Calorie History Chart -->
                    <v-card
                        v-if="widget.id === 'calorieHistory' && widget.visible"
                        class="mb-4"
                    >
                        <v-card-title class="d-flex align-center">
                            <v-icon start>mdi-chart-bar</v-icon>
                            Histórico Calórico
                            <v-spacer />
                            <v-btn-toggle
                                v-model="calorieChartRange"
                                density="compact"
                                mandatory
                            >
                                <v-btn value="7" size="small">7d</v-btn>
                                <v-btn value="14" size="small">14d</v-btn>
                                <v-btn value="30" size="small">30d</v-btn>
                            </v-btn-toggle>
                        </v-card-title>
                        <v-card-text>
                            <Bar
                                v-if="calorieChartData.labels.length > 0"
                                :data="calorieChartData as any"
                                :options="barChartOptions"
                                style="max-height: 300px"
                            />
                            <p v-else class="text-center text-grey pa-8">
                                Sem dados calóricos suficientes.
                            </p>
                        </v-card-text>
                    </v-card>

                    <!-- Macros Trend Chart -->
                    <v-card
                        v-if="widget.id === 'macrosTrend' && widget.visible"
                        class="mb-4"
                    >
                        <v-card-title class="d-flex align-center">
                            <v-icon start>mdi-chart-areaspline</v-icon>
                            Evolução de Macros
                        </v-card-title>
                        <v-card-text>
                            <Line
                                v-if="macrosChartData.labels.length > 0"
                                :data="macrosChartData"
                                :options="lineChartOptions"
                                style="max-height: 300px"
                            />
                            <p v-else class="text-center text-grey pa-8">
                                Sem dados de macros suficientes.
                            </p>
                        </v-card-text>
                    </v-card>

                    <!-- Water History -->
                    <v-card
                        v-if="widget.id === 'waterHistory' && widget.visible"
                        class="mb-4"
                    >
                        <v-card-title class="d-flex align-center">
                            <v-icon start>mdi-water</v-icon>
                            Histórico de Água
                        </v-card-title>
                        <v-card-text>
                            <Bar
                                v-if="waterChartData.labels.length > 0"
                                :data="waterChartData as any"
                                :options="waterChartOptions"
                                style="max-height: 250px"
                            />
                            <p v-else class="text-center text-grey pa-8">
                                Sem dados de água suficientes.
                            </p>
                        </v-card-text>
                    </v-card>
                </template>
            </v-col>

            <!-- Right Column (cols 4) -->
            <v-col cols="12" md="4">
                <template v-for="widget in rightWidgets" :key="widget.id">
                    <!-- Body Composition -->
                    <v-card
                        v-if="widget.id === 'bodyComposition' && widget.visible"
                        class="mb-4"
                    >
                        <v-card-title>
                            <v-icon start>mdi-human</v-icon>
                            Composição Corporal
                        </v-card-title>
                        <v-card-text v-if="latestMeasurement">
                            <Doughnut
                                :data="bodyCompositionData"
                                :options="doughnutOptions"
                                style="max-height: 200px"
                            />
                            <v-list density="compact" class="mt-3">
                                <v-list-item
                                    v-for="item in bodyCompositionList"
                                    :key="item.label"
                                >
                                    <template #prepend>
                                        <v-avatar
                                            :color="item.color"
                                            size="12"
                                            class="mr-3"
                                        />
                                    </template>
                                    <v-list-item-title class="text-body-2">{{
                                        item.label
                                    }}</v-list-item-title>
                                    <template #append>
                                        <span class="font-weight-bold">{{
                                            item.value
                                        }}</span>
                                    </template>
                                </v-list-item>
                            </v-list>
                        </v-card-text>
                        <v-card-text v-else>
                            <p class="text-center text-grey pa-4">
                                Sem dados de bioimpedância.
                            </p>
                        </v-card-text>
                    </v-card>

                    <!-- Weekly Stats -->
                    <v-card
                        v-if="widget.id === 'weeklyStats' && widget.visible"
                        class="mb-4"
                    >
                        <v-card-title>
                            <v-icon start>mdi-calendar-week</v-icon>
                            Resumo Semanal
                        </v-card-title>
                        <v-card-text>
                            <v-list density="compact">
                                <v-list-item>
                                    <v-list-item-title
                                        >Dias registrados</v-list-item-title
                                    >
                                    <template #append>
                                        <v-chip size="small" color="primary"
                                            >{{ weeklyStats.daysLogged }} /
                                            7</v-chip
                                        >
                                    </template>
                                </v-list-item>
                                <v-list-item>
                                    <v-list-item-title
                                        >Média calórica</v-list-item-title
                                    >
                                    <template #append>
                                        <span class="font-weight-bold"
                                            >{{
                                                weeklyStats.avgCalories
                                            }}
                                            kcal</span
                                        >
                                    </template>
                                </v-list-item>
                                <v-list-item>
                                    <v-list-item-title
                                        >Dias em déficit</v-list-item-title
                                    >
                                    <template #append>
                                        <v-chip size="small" color="success">{{
                                            weeklyStats.deficitDays
                                        }}</v-chip>
                                    </template>
                                </v-list-item>
                                <v-list-item>
                                    <v-list-item-title
                                        >Treinos realizados</v-list-item-title
                                    >
                                    <template #append>
                                        <v-chip size="small" color="info">{{
                                            weeklyStats.workouts
                                        }}</v-chip>
                                    </template>
                                </v-list-item>
                                <v-list-item>
                                    <v-list-item-title
                                        >Cal. queimadas total</v-list-item-title
                                    >
                                    <template #append>
                                        <span class="font-weight-bold"
                                            >{{
                                                weeklyStats.totalBurned
                                            }}
                                            kcal</span
                                        >
                                    </template>
                                </v-list-item>
                                <v-list-item>
                                    <v-list-item-title
                                        >Média água/dia</v-list-item-title
                                    >
                                    <template #append>
                                        <span class="font-weight-bold">{{
                                            weeklyStats.avgWater
                                        }}</span>
                                    </template>
                                </v-list-item>
                            </v-list>
                        </v-card-text>
                    </v-card>

                    <!-- Streak & Achievements -->
                    <v-card
                        v-if="widget.id === 'streaks' && widget.visible"
                        class="mb-4"
                    >
                        <v-card-title>
                            <v-icon start>mdi-trophy</v-icon>
                            Conquistas
                        </v-card-title>
                        <v-card-text>
                            <div class="d-flex align-center mb-3">
                                <v-icon color="orange" size="40" class="mr-3"
                                    >mdi-fire</v-icon
                                >
                                <div>
                                    <p class="text-h4 font-weight-bold">
                                        {{ streak }}
                                    </p>
                                    <p class="text-caption text-grey">
                                        dias consecutivos
                                    </p>
                                </div>
                            </div>
                            <v-divider class="mb-3" />
                            <div
                                v-for="badge in badges"
                                :key="badge.label"
                                class="d-flex align-center mb-2"
                            >
                                <v-icon
                                    :color="badge.earned ? badge.color : 'grey'"
                                    class="mr-2"
                                >
                                    {{ badge.icon }}
                                </v-icon>
                                <span
                                    :class="badge.earned ? '' : 'text-grey'"
                                    >{{ badge.label }}</span
                                >
                                <v-spacer />
                                <v-icon
                                    v-if="badge.earned"
                                    color="success"
                                    size="16"
                                    >mdi-check</v-icon
                                >
                            </div>
                        </v-card-text>
                    </v-card>

                    <!-- Recent Workouts -->
                    <v-card
                        v-if="widget.id === 'recentWorkouts' && widget.visible"
                        class="mb-4"
                    >
                        <v-card-title>
                            <v-icon start>mdi-dumbbell</v-icon>
                            Últimos Treinos
                        </v-card-title>
                        <v-card-text>
                            <div v-if="recentWorkouts.length > 0">
                                <div
                                    v-for="w in recentWorkouts"
                                    :key="w.date"
                                    class="d-flex align-center mb-3 pa-2 rounded"
                                    style="
                                        background: rgba(255, 255, 255, 0.05);
                                    "
                                >
                                    <v-avatar
                                        color="red"
                                        size="36"
                                        class="mr-3"
                                    >
                                        <v-icon size="20">mdi-dumbbell</v-icon>
                                    </v-avatar>
                                    <div class="flex-grow-1">
                                        <p
                                            class="text-body-2 font-weight-medium"
                                        >
                                            {{ formatDateShort(w.date) }}
                                        </p>
                                        <p class="text-caption text-grey">
                                            {{ w.duration }} min ·
                                            {{ w.exercises }} exercícios
                                        </p>
                                    </div>
                                    <v-chip size="small" color="red"
                                        >{{ w.burned }} kcal</v-chip
                                    >
                                </div>
                            </div>
                            <p v-else class="text-center text-grey pa-4">
                                Nenhum treino registrado.
                            </p>
                        </v-card-text>
                    </v-card>

                    <!-- Goals Progress -->
                    <v-card
                        v-if="widget.id === 'goalsProgress' && widget.visible"
                        class="mb-4"
                    >
                        <v-card-title>
                            <v-icon start>mdi-target</v-icon>
                            Progresso Mensal
                        </v-card-title>
                        <v-card-text>
                            <div class="mb-4">
                                <div class="d-flex justify-space-between mb-1">
                                    <span class="text-body-2"
                                        >Dias registrados</span
                                    >
                                    <span class="text-body-2 font-weight-bold">
                                        {{ monthlyStats.daysLogged }} /
                                        {{ monthlyStats.daysInMonth }}
                                    </span>
                                </div>
                                <v-progress-linear
                                    :model-value="
                                        (monthlyStats.daysLogged /
                                            monthlyStats.daysInMonth) *
                                        100
                                    "
                                    color="primary"
                                    height="8"
                                    rounded
                                />
                            </div>
                            <div class="mb-4">
                                <div class="d-flex justify-space-between mb-1">
                                    <span class="text-body-2"
                                        >Dias em déficit</span
                                    >
                                    <span class="text-body-2 font-weight-bold">
                                        {{ monthlyStats.deficitDays }} /
                                        {{ monthlyStats.daysLogged || 1 }}
                                    </span>
                                </div>
                                <v-progress-linear
                                    :model-value="
                                        monthlyStats.daysLogged > 0
                                            ? (monthlyStats.deficitDays /
                                                  monthlyStats.daysLogged) *
                                              100
                                            : 0
                                    "
                                    color="success"
                                    height="8"
                                    rounded
                                />
                            </div>
                            <div>
                                <div class="d-flex justify-space-between mb-1">
                                    <span class="text-body-2">Treinos</span>
                                    <span class="text-body-2 font-weight-bold">
                                        {{ monthlyStats.workouts }}
                                    </span>
                                </div>
                                <v-progress-linear
                                    :model-value="
                                        Math.min(
                                            (monthlyStats.workouts / 20) * 100,
                                            100,
                                        )
                                    "
                                    color="info"
                                    height="8"
                                    rounded
                                />
                            </div>
                        </v-card-text>
                    </v-card>
                </template>
            </v-col>
        </v-row>

        <!-- Widget Configuration Dialog -->
        <v-dialog v-model="showWidgetConfig" max-width="600">
            <v-card>
                <v-card-title>
                    <v-icon start>mdi-cog</v-icon>
                    Configurar Widgets
                </v-card-title>
                <v-card-text>
                    <p class="text-body-2 text-grey mb-4">
                        Ative ou desative widgets e arraste para reordenar.
                    </p>

                    <h3 class="text-subtitle-1 mb-2">
                        Coluna Esquerda (Gráficos)
                    </h3>
                    <v-list density="compact" class="mb-4">
                        <v-list-item
                            v-for="widget in widgetConfig.left"
                            :key="widget.id"
                        >
                            <template #prepend>
                                <v-icon class="mr-2" size="20">{{
                                    widget.icon
                                }}</v-icon>
                            </template>
                            <v-list-item-title>{{
                                widget.label
                            }}</v-list-item-title>
                            <template #append>
                                <v-switch
                                    v-model="widget.visible"
                                    hide-details
                                    density="compact"
                                    color="primary"
                                />
                            </template>
                        </v-list-item>
                    </v-list>

                    <h3 class="text-subtitle-1 mb-2">Coluna Direita (Infos)</h3>
                    <v-list density="compact">
                        <v-list-item
                            v-for="widget in widgetConfig.right"
                            :key="widget.id"
                        >
                            <template #prepend>
                                <v-icon class="mr-2" size="20">{{
                                    widget.icon
                                }}</v-icon>
                            </template>
                            <v-list-item-title>{{
                                widget.label
                            }}</v-list-item-title>
                            <template #append>
                                <v-switch
                                    v-model="widget.visible"
                                    hide-details
                                    density="compact"
                                    color="primary"
                                />
                            </template>
                        </v-list-item>
                    </v-list>
                </v-card-text>
                <v-card-actions>
                    <v-btn variant="text" @click="resetWidgets"
                        >Restaurar Padrão</v-btn
                    >
                    <v-spacer />
                    <v-btn color="primary" @click="saveWidgetConfig"
                        >Salvar</v-btn
                    >
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup lang="ts">
import { format, subDays, parseISO, getDaysInMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Line, Bar, Doughnut } from "vue-chartjs";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from "chart.js";
import { useAuthStore } from "~/stores/auth.store";
import type { DailyRecord } from "~~/shared/types/daily";

interface DailySummary {
    totalCaloriesConsumed: number;
    totalCaloriesBurned: number;
    netCalories: number;
    caloricGoal: number;
    caloricBalance: number;
    isDeficit: boolean;
    deficitPercentage: number;
    weightChange: number | null;
    waterPercentage?: number;
    totalProtein: number;
    totalCarbs: number;
    totalFats: number;
    totalFiber: number;
}

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
);

// ===== Auth & State =====
const authStore = useAuthStore();

const loading = ref(false);
const allRecords = ref<DailyRecord[]>([]);
const today = format(new Date(), "yyyy-MM-dd");
const todayFormatted = format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", {
    locale: ptBR,
});
const tableSearch = ref("");
const showWidgetConfig = ref(false);

// Chart ranges
const weightChartRange = ref("14");
const calorieChartRange = ref("14");

// ===== Greeting =====
const greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
});

// ===== Widget Configuration =====
interface WidgetItem {
    id: string;
    label: string;
    icon: string;
    visible: boolean;
}

const widgetConfig = ref<{ left: WidgetItem[]; right: WidgetItem[] }>({
    left: [
        {
            id: "weightTrend",
            label: "Evolução de Peso",
            icon: "mdi-chart-line",
            visible: true,
        },
        {
            id: "calorieHistory",
            label: "Histórico Calórico",
            icon: "mdi-chart-bar",
            visible: true,
        },
        {
            id: "macrosTrend",
            label: "Evolução de Macros",
            icon: "mdi-chart-areaspline",
            visible: true,
        },
        {
            id: "waterHistory",
            label: "Histórico de Água",
            icon: "mdi-water",
            visible: true,
        },
    ],
    right: [
        {
            id: "bodyComposition",
            label: "Composição Corporal",
            icon: "mdi-human",
            visible: true,
        },
        {
            id: "weeklyStats",
            label: "Resumo Semanal",
            icon: "mdi-calendar-week",
            visible: true,
        },
        {
            id: "streaks",
            label: "Conquistas",
            icon: "mdi-trophy",
            visible: true,
        },
        {
            id: "recentWorkouts",
            label: "Últimos Treinos",
            icon: "mdi-dumbbell",
            visible: true,
        },
        {
            id: "goalsProgress",
            label: "Progresso Mensal",
            icon: "mdi-target",
            visible: true,
        },
    ],
});

const leftWidgets = computed(() => widgetConfig.value.left);
const rightWidgets = computed(() => widgetConfig.value.right);

function resetWidgets() {
    widgetConfig.value.left.forEach((w) => (w.visible = true));
    widgetConfig.value.right.forEach((w) => (w.visible = true));
}

function saveWidgetConfig() {
    if (typeof window !== "undefined") {
        localStorage.setItem(
            "dashboard_widgets",
            JSON.stringify(widgetConfig.value),
        );
    }
    showWidgetConfig.value = false;
}

function loadWidgetConfig() {
    if (typeof window !== "undefined") {
        const saved = localStorage.getItem("dashboard_widgets");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Merge saved visibility with current config
                parsed.left?.forEach((saved: WidgetItem) => {
                    const w = widgetConfig.value.left.find(
                        (x) => x.id === saved.id,
                    );
                    if (w) w.visible = saved.visible;
                });
                parsed.right?.forEach((saved: WidgetItem) => {
                    const w = widgetConfig.value.right.find(
                        (x) => x.id === saved.id,
                    );
                    if (w) w.visible = saved.visible;
                });
            } catch {
                // Ignore parse errors
            }
        }
    }
}

async function loadAllData() {
    loading.value = true;
    try {
        const from = format(subDays(new Date(), 60), "yyyy-MM-dd");
        const records = await $fetch<DailyRecord[]>("/api/daily", {
            query: { from },
            headers: authStore.authHeaders,
        });
        allRecords.value = Array.isArray(records) ? records : [];
    } catch {
        allRecords.value = [];
    } finally {
        loading.value = false;
    }
}
// ===== Today's Data =====
const todayRecord = computed(() =>
    allRecords.value.find((r) => r.date === today),
);

const todaySummary = computed(
    () => todayRecord.value?.summary as DailySummary | undefined,
);
const todayBalance = computed(() => todaySummary.value?.caloricBalance ?? 0);
const todayDeficit = computed(() => todayBalance.value < 0);

const todayCaloriePercentage = computed(() => {
    if (!todaySummary.value) return 0;
    const goal = todaySummary.value.caloricGoal || 2000;
    return Math.min(
        Math.round(((todaySummary.value.netCalories ?? 0) / goal) * 100),
        150,
    );
});

const todayWater = computed(() => {
    if (!todayRecord.value?.water)
        return { intake: 0, goal: 3, unit: "l", percentage: 0 };
    const intake = todayRecord.value.water.intake?.value ?? 0;
    const goal = todayRecord.value.water.goal?.value ?? 3;
    const unit = todayRecord.value.water.goal?.unit ?? "l";
    return {
        intake,
        goal,
        unit,
        percentage: goal > 0 ? Math.round((intake / goal) * 100) : 0,
    };
});

const todayMacros = computed(() => {
    const summary = todaySummary.value;
    if (!summary) return null;
    const protein = summary.totalProtein ?? 0;
    const carbs = summary.totalCarbs ?? 0;
    const fats = summary.totalFats ?? 0;
    const total = protein + carbs + fats || 1;
    return {
        protein,
        carbs,
        fats,
        proteinPct: Math.round((protein / total) * 100),
        carbsPct: Math.round((carbs / total) * 100),
        fatsPct: Math.round((fats / total) * 100),
    };
});

// ===== Weight Data =====
const latestWeight = computed(() => {
    for (const record of [...allRecords.value].sort((a, b) =>
        b.date.localeCompare(a.date),
    )) {
        const measurements = record.bodyMeasurements as
            | Array<{ time: string; data: { weight: { value: number } } }>
            | undefined;
        if (measurements && measurements.length > 0) {
            const morning = measurements.find((m) => m.time === "morning");
            if (morning) return morning.data.weight.value;
            return measurements[0]!.data.weight.value;
        }
    }
    return null;
});

const weightTrend = computed(() => {
    const sorted = [...allRecords.value].sort((a, b) =>
        a.date.localeCompare(b.date),
    );
    const weights: number[] = [];
    for (const r of sorted) {
        const m = r.bodyMeasurements as
            | Array<{ time: string; data: { weight: { value: number } } }>
            | undefined;
        if (m && m.length > 0) {
            const morning = m.find((x) => x.time === "morning");
            weights.push(
                morning ? morning.data.weight.value : m[0]!.data.weight.value,
            );
        }
    }
    if (weights.length < 2) return null;
    return (
        weights[weights.length - 1]! - weights[Math.max(0, weights.length - 8)]!
    );
});

const latestMeasurement = computed(() => {
    for (const record of [...allRecords.value].sort((a, b) =>
        b.date.localeCompare(a.date),
    )) {
        const m = record.bodyMeasurements as
            | Array<{ data: Record<string, unknown> }>
            | undefined;
        if (m && m.length > 0) return m[0]!.data;
    }
    return null;
});

// ===== Table =====
const tableHeaders = [
    { title: "Data", key: "date", sortable: true },
    { title: "Peso", key: "weight", sortable: true },
    { title: "Consumido", key: "calories", sortable: true },
    { title: "Queimado", key: "burned", sortable: true },
    { title: "Balanço", key: "balance", sortable: true },
    { title: "Status", key: "status", sortable: false },
    { title: "Refeições", key: "meals", sortable: true },
    { title: "Água", key: "water", sortable: true },
    { title: "", key: "actions", sortable: false },
];
const tableItems = computed(() => {
    return [...allRecords.value]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((r) => {
            const summary = r.summary as DailySummary | undefined;
            const measurements = r.bodyMeasurements as
                | Array<{ time: string; data: { weight: { value: number } } }>
                | undefined;
            let weight: number | null = null;
            if (measurements && measurements.length > 0) {
                const morning = measurements.find((m) => m.time === "morning");
                weight = morning
                    ? morning.data.weight.value
                    : measurements[0]!.data.weight.value;
            }
            return {
                date: r.date,
                weight,
                calories: summary?.totalCaloriesConsumed ?? 0,
                burned: summary?.totalCaloriesBurned ?? 0,
                balance: summary?.caloricBalance ?? 0,
                meals: r.meals?.length ?? 0,
                water: summary?.waterPercentage ?? null,
            };
        });
});

// ===== Helper Functions =====
function formatDateShort(dateStr: string): string {
    try {
        return format(parseISO(dateStr), "dd/MM/yyyy");
    } catch {
        return dateStr;
    }
}

function formatWeekday(dateStr: string): string {
    try {
        return format(parseISO(dateStr), "EEEE", { locale: ptBR });
    } catch {
        return "";
    }
}

// ===== Charts =====
function getRecordsForRange(range: string): DailyRecord[] {
    const days = parseInt(range);
    const cutoff = format(subDays(new Date(), days), "yyyy-MM-dd");
    return allRecords.value
        .filter((r) => r.date >= cutoff)
        .sort((a, b) => a.date.localeCompare(b.date));
}

// Weight Chart
const weightChartData = computed(() => {
    const records = getRecordsForRange(weightChartRange.value);
    const labels: string[] = [];
    const data: number[] = [];

    for (const r of records) {
        const m = r.bodyMeasurements as
            | Array<{ time: string; data: { weight: { value: number } } }>
            | undefined;
        if (m && m.length > 0) {
            labels.push(formatDateShort(r.date));
            const morning = m.find((x) => x.time === "morning");
            data.push(
                morning ? morning.data.weight.value : m[0]!.data.weight.value,
            );
        }
    }

    return {
        labels,
        datasets: [
            {
                label: "Peso (kg)",
                data,
                borderColor: "#4CAF50",
                backgroundColor: "rgba(76, 175, 80, 0.1)",
                tension: 0.4,
                fill: true,
            },
        ],
    };
});

// Calorie Chart
const calorieChartData = computed(() => {
    const records = getRecordsForRange(calorieChartRange.value);
    const labels = records.map((r) => formatDateShort(r.date));
    const consumed = records.map(
        (r) =>
            (r.summary as DailySummary | undefined)?.totalCaloriesConsumed ?? 0,
    );
    const burned = records.map(
        (r) =>
            (r.summary as DailySummary | undefined)?.totalCaloriesBurned ?? 0,
    );
    const goals = records.map(
        (r) =>
            ((r as unknown as Record<string, unknown>).caloricGoal as number) ??
            2000,
    );

    return {
        labels,
        datasets: [
            {
                label: "Consumido",
                data: consumed,
                backgroundColor: "rgba(255, 167, 38, 0.8)",
            },
            {
                label: "Queimado",
                data: burned,
                backgroundColor: "rgba(239, 83, 80, 0.8)",
            },
            {
                label: "Meta",
                data: goals,
                type: "line" as const,
                borderColor: "#26A69A",
                borderDash: [5, 5],
                pointRadius: 0,
                fill: false,
            },
        ],
    };
});

// Macros Chart
const macrosChartData = computed(() => {
    const records = getRecordsForRange("14");
    const labels = records.map((r) => formatDateShort(r.date));
    const protein = records.map(
        (r) => (r.summary as DailySummary | undefined)?.totalProtein ?? 0,
    );
    const carbs = records.map(
        (r) => (r.summary as DailySummary | undefined)?.totalCarbs ?? 0,
    );
    const fats = records.map(
        (r) => (r.summary as DailySummary | undefined)?.totalFats ?? 0,
    );

    return {
        labels,
        datasets: [
            {
                label: "Proteína (g)",
                data: protein,
                borderColor: "#EF5350",
                backgroundColor: "rgba(239,83,80,0.1)",
                tension: 0.4,
                fill: false,
            },
            {
                label: "Carboidratos (g)",
                data: carbs,
                borderColor: "#FFA726",
                backgroundColor: "rgba(255,167,38,0.1)",
                tension: 0.4,
                fill: false,
            },
            {
                label: "Gorduras (g)",
                data: fats,
                borderColor: "#42A5F5",
                backgroundColor: "rgba(66,165,245,0.1)",
                tension: 0.4,
                fill: false,
            },
        ],
    };
});

// Water Chart
const waterChartData = computed(() => {
    const records = getRecordsForRange("14");
    const labels = records.map((r) => formatDateShort(r.date));
    const intake = records.map((r) => r.water?.intake?.value ?? 0);
    const goals = records.map((r) => r.water?.goal?.value ?? 3);

    return {
        labels,
        datasets: [
            {
                label: "Consumido",
                data: intake,
                backgroundColor: "rgba(66, 165, 245, 0.8)",
            },
            {
                label: "Meta",
                data: goals,
                type: "line" as const,
                borderColor: "#26A69A",
                borderDash: [5, 5],
                pointRadius: 0,
                fill: false,
            },
        ],
    };
});

// Body Composition Doughnut
const bodyCompositionData = computed(() => {
    const m = latestMeasurement.value;
    if (!m) return { labels: [], datasets: [] };

    const fat = (m.bodyFatPercentage as { value: number })?.value ?? 0;
    const muscle =
        (m.skeletalMuscleMassPercentage as { value: number })?.value ?? 0;
    const water = (m.waterPercentage as { value: number })?.value ?? 0;
    const other = Math.max(0, 100 - fat - muscle - water);

    return {
        labels: ["Gordura", "Músculo", "Água", "Outros"],
        datasets: [
            {
                data: [fat, muscle, water, other],
                backgroundColor: ["#EF5350", "#66BB6A", "#42A5F5", "#78909C"],
                borderWidth: 0,
            },
        ],
    };
});

const bodyCompositionList = computed(() => {
    const m = latestMeasurement.value;
    if (!m) return [];
    return [
        {
            label: "Gordura",
            value: `${(m.bodyFatPercentage as { value: number })?.value ?? 0}%`,
            color: "#EF5350",
        },
        {
            label: "Músculo",
            value: `${(m.skeletalMuscleMassPercentage as { value: number })?.value ?? 0}%`,
            color: "#66BB6A",
        },
        {
            label: "Água",
            value: `${(m.waterPercentage as { value: number })?.value ?? 0}%`,
            color: "#42A5F5",
        },
        {
            label: "Peso",
            value: `${(m.weight as { value: number })?.value ?? 0} kg`,
            color: "#78909C",
        },
    ];
});

const weeklyStats = computed(() => {
    const cutoff = format(subDays(new Date(), 7), "yyyy-MM-dd");
    const weekRecords = allRecords.value.filter((r) => r.date >= cutoff);
    const daysLogged = weekRecords.length;
    const totalCalories = weekRecords.reduce(
        (sum, r) =>
            sum +
            ((r.summary as DailySummary | undefined)?.totalCaloriesConsumed ??
                0),
        0,
    );
    const deficitDays = weekRecords.filter(
        (r) =>
            ((r.summary as DailySummary | undefined)?.caloricBalance ?? 0) < 0,
    ).length;
    const workouts = weekRecords.filter(
        (r) =>
            r.workout && r.workout.exercises && r.workout.exercises.length > 0,
    ).length;
    const totalBurned = weekRecords.reduce(
        (sum, r) =>
            sum +
            ((r.summary as DailySummary | undefined)?.totalCaloriesBurned ?? 0),
        0,
    );
    const totalWater = weekRecords.reduce(
        (sum, r) => sum + (r.water?.intake?.value ?? 0),
        0,
    );

    return {
        daysLogged,
        avgCalories:
            daysLogged > 0 ? Math.round(totalCalories / daysLogged) : 0,
        deficitDays,
        workouts,
        totalBurned,
        avgWater:
            daysLogged > 0 ? (totalWater / daysLogged).toFixed(1) + "L" : "0L",
    };
});

const monthlyStats = computed(() => {
    const now = new Date();
    const monthStart = format(
        new Date(now.getFullYear(), now.getMonth(), 1),
        "yyyy-MM-dd",
    );
    const monthRecords = allRecords.value.filter((r) => r.date >= monthStart);

    return {
        daysLogged: monthRecords.length,
        daysInMonth: getDaysInMonth(now),
        deficitDays: monthRecords.filter(
            (r) =>
                ((r.summary as DailySummary | undefined)?.caloricBalance ?? 0) <
                0,
        ).length,
        workouts: monthRecords.filter(
            (r) =>
                r.workout &&
                r.workout.exercises &&
                r.workout.exercises.length > 0,
        ).length,
    };
});

// ===== Streak =====
const streak = computed(() => {
    const sorted = [...allRecords.value].sort((a, b) =>
        b.date.localeCompare(a.date),
    );
    let count = 0;
    const todayDate = new Date();
    for (let i = 0; i < sorted.length; i++) {
        const expectedDate = format(subDays(todayDate, i), "yyyy-MM-dd");
        if (sorted[i]?.date === expectedDate) {
            count++;
        } else {
            break;
        }
    }
    return count;
});

const badges = computed(() => [
    {
        label: "7 dias seguidos",
        icon: "mdi-fire",
        color: "orange",
        earned: streak.value >= 7,
    },
    {
        label: "30 dias seguidos",
        icon: "mdi-trophy",
        color: "yellow",
        earned: streak.value >= 30,
    },
    {
        label: "10 treinos",
        icon: "mdi-dumbbell",
        color: "red",
        earned: allRecords.value.filter((r) => r.workout).length >= 10,
    },
    {
        label: "50 entradas",
        icon: "mdi-counter",
        color: "purple",
        earned: allRecords.value.length >= 50,
    },
]);

// ===== Recent Workouts =====
const recentWorkouts = computed(() => {
    return [...allRecords.value]
        .filter(
            (r) =>
                r.workout &&
                r.workout.exercises &&
                r.workout.exercises.length > 0,
        )
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5)
        .map((r) => {
            const w = r.workout as Record<string, unknown>;
            return {
                date: r.date,
                duration: w.totalDurationMinutes as number,
                exercises: (w.exercises as unknown[]).length,
                burned: w.totalCaloriesBurned as number,
            };
        });
});

// ===== Chart Options =====
const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: "top" as const,
            labels: { usePointStyle: true, pointStyle: "circle" },
        },
    },
    scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: false },
    },
};

const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: "top" as const,
            labels: { usePointStyle: true, pointStyle: "circle" },
        },
    },
    scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true },
    },
};

const waterChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { position: "top" as const },
    },
    scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true },
    },
};

const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
    },
    cutout: "60%",
};

// ===== CSV Export =====
function exportCSV() {
    const headers = [
        "Data",
        "Peso",
        "Consumido",
        "Queimado",
        "Balanço",
        "Refeições",
        "Água %",
    ];
    const rows = tableItems.value.map((item) => [
        item.date,
        item.weight ?? "",
        item.calories,
        item.burned,
        item.balance,
        item.meals,
        item.water ?? "",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mura_saude_export_${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

// ===== Lifecycle =====
onMounted(() => {
    loadWidgetConfig();
    loadAllData();
});
</script>

<style scoped>
.stat-card {
    transition: transform 0.2s ease;
}
.stat-card:hover {
    transform: translateY(-2px);
}
.entries-table :deep(tr) {
    cursor: pointer;
}
</style>
