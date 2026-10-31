# Ligtas Kababayan: admin dashboard

One page (`index.html`), one sign-in, two separate dashboards. After sign-in, `js/main.js` reads the
account's role from the `admins` table and loads only that role's folder.

```
admin/
  index.html
  css/   style.css  admin.css  barangay.css (sky blue)  super.css (royal blue)
  js/
    api.js  config.js       Supabase connection
    main.js                 sign-in, session, role router
    shell.js                sidebar + top bar + page router (#/page), shared by both roles
    shared.js               helpers, cards, charts, address lookup, realtime
    history.js              Rescued history page, used by both roles
    barangay/               BARANGAY ADMIN (one barangay)
      index.js  overview.js  reports.js  centers.js
    super/                  SUPER ADMIN (city DRRMO, all barangays)
      index.js  overview.js  map.js  reports.js  centers.js  barangays.js  filter.js  stats.js
```

| | Barangay admin | Super admin |
|---|---|---|
| Menu | Overview, Reports, Rescued history, Evacuation centers | City overview, Live map, Reports, Rescued history, Evacuation centers, Barangays |
| Sees | own barangay | every barangay (drop-down filter) |
| Centers | update own, view others | update all, add new |

The folders only control what each role sees. What each role may do is enforced by the database
(Row Level Security in `supabase/schema.sql`).
