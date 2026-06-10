export default defineEventHandler(() => ({
    status: "ok",
    service: "mura-saude",
    timestamp: new Date().toISOString(),
}));
