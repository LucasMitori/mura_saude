import type { RouterConfig } from "@nuxt/schema";

/**
 * Always scroll to top on route navigation.
 *
 * Without this, Vue Router restores the previous scroll position when
 * navigating between pages (especially with cached client-rendered pages),
 * which made it look like pages opened "in the middle" — there's no actual
 * blank space, the user was just scrolled down.
 */
export default <RouterConfig>{
    scrollBehavior(to, _from, savedPosition) {
        if (to.hash) {
            return { el: to.hash, top: 80, behavior: "smooth" };
        }
        if (savedPosition) {
            return savedPosition;
        }
        return { top: 0, left: 0, behavior: "instant" };
    },
};
