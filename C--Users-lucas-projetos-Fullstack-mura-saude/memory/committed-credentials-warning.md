---
name: committed-credentials-warning
description: Live admin password + Mongo creds were committed to the mura_saude repo
metadata:
  type: project
---

[README.md] (and an earlier committed `.env`) contained real secrets: admin email `devmitori@gmail.com`, `ADMIN_PASSWORD=Panda1801`, and a MongoDB Atlas connection string with a live password. The JWT secret was reportedly rotated; the **MongoDB password and admin password should be rotated** and scrubbed from README + git history.

When touching docs/env, never echo real secrets — keep `.env.example` placeholder-only. See [[rebuild-plan]].
