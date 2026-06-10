// App-wide toast/snackbar. State lives in a single useState entry so any page or
// component can call notify(); the <v-snackbar> is mounted once in the default
// layout. Replaces the per-page snackbar refs scattered across the app.

export type SnackbarColor = "success" | "error" | "info" | "warning";

export interface SnackbarState {
    show: boolean;
    message: string;
    color: SnackbarColor;
    timeout: number;
}

export function useSnackbar() {
    const state = useState<SnackbarState>("app-snackbar", () => ({
        show: false,
        message: "",
        color: "success",
        timeout: 3500,
    }));

    function notify(message: string, color: SnackbarColor = "success", timeout = 3500) {
        state.value = { show: true, message, color, timeout };
    }

    return {
        state,
        notify,
        success: (m: string, t?: number) => notify(m, "success", t),
        error: (m: string, t?: number) => notify(m, "error", t ?? 5000),
        info: (m: string, t?: number) => notify(m, "info", t),
        warning: (m: string, t?: number) => notify(m, "warning", t),
    };
}
