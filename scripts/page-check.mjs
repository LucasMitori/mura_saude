#!/usr/bin/env node
/**
 * Static page check: fetch each page, look for resolved component / CSS issues
 * in the SSR'd HTML and confirm all referenced /_nuxt/ assets resolve.
 */
const BASE = process.argv[2] || "http://localhost:3000";

const pages = ["/login", "/", "/reports", "/meals/quick", "/daily/new", "/daily/2026-06-07"];

let passed = 0;
let failed = 0;

async function checkPage(path) {
    const res = await fetch(`${BASE}${path}`, { headers: { accept: "text/html" } });
    if (res.status !== 200) {
        console.log(`❌ ${path} status=${res.status}`);
        failed++;
        return;
    }

    const html = await res.text();

    const cssLinks = [...html.matchAll(/href="(\/_nuxt\/[^"]+\.css[^"]*)"/g)].map((m) => m[1]);
    const jsLinks = [...html.matchAll(/src="(\/_nuxt\/[^"]+\.[mj]s[^"]*)"/g)].map((m) => m[1]);

    let bad404 = 0;
    const promises = [];
    for (const url of [...new Set([...cssLinks, ...jsLinks])]) {
        promises.push(
            fetch(`${BASE}${url}`)
                .then((r) => {
                    if (r.status !== 200) {
                        console.log(`  404 asset on ${path}: ${url}`);
                        bad404++;
                    }
                })
                .catch(() => {
                    bad404++;
                }),
        );
    }
    await Promise.all(promises);

    // Check for known problem patterns
    const issues = [];
    if (/href="\/_nuxt\/vuetify\/styles"/.test(html)) issues.push("bare vuetify/styles link");
    if (/href="\/_nuxt\/@mdi\/font\/[^"]*"/.test(html)) issues.push("bare @mdi/font link");

    if (bad404 === 0 && issues.length === 0) {
        console.log(`✅ ${path} — ${cssLinks.length} css, ${jsLinks.length} js, all 200`);
        passed++;
    } else {
        console.log(`❌ ${path} — ${bad404} 404 asset(s); issues: ${issues.join(", ")}`);
        failed++;
    }
}

(async () => {
    console.log(`\n=== Page render check against ${BASE} ===\n`);
    for (const p of pages) await checkPage(p);
    console.log(`\n${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
