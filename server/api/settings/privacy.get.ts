import { getAuthUser } from "#server/utils/auth";
import { getPrivacySettings } from "#server/utils/app-settings";

// Current privacy settings. Any authenticated user may read the flag (it is
// not secret — the redaction itself is what's enforced server-side). The
// admin settings page uses this to show the switch's current state.
export default defineEventHandler(async (event) => {
    getAuthUser(event);
    return await getPrivacySettings();
});
