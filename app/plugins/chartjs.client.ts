// Register Chart.js controllers/elements once, app-wide, instead of repeating
// ChartJS.register(...) inside every page that draws a chart.
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

export default defineNuxtPlugin(() => {
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
});
