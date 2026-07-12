#!/usr/bin/env node
/**
 * Local-only dev launcher for machines where AV/proxy TLS interception breaks
 * the Atlas handshake ("unable to verify the first certificate" — see README).
 * Sets NODE_TLS_REJECT_UNAUTHORIZED=0 for THIS dev process only. Never use in
 * production; the proper fix is NODE_EXTRA_CA_CERTS with your org's CA bundle.
 */
import { spawn } from "node:child_process";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const child = spawn("pnpm", ["dev"], {
    stdio: "inherit",
    env: process.env,
    shell: true,
});
child.on("exit", (code) => process.exit(code ?? 0));
