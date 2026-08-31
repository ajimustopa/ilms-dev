# AI-REF: Core Service (`core`)

> Dokumen referensi teknis modul Core Service untuk AI Agent. Data diambil langsung dari file migrasi, router/controller backend, dan router frontend aktual.

---

## 1. Metadata Modul
- **Path Backend:** `apps/api-backend/src/modules/core/`
- **Path Frontend Portal:** `apps/core-portal/src/apps/core/`
- **Path Migrasi DB:** `apps/api-backend/db/migrations/core/`
- **Database Engine:** MariaDB 10.5 (`aldepos_core` / `u622997391_dbcore`)
- **Status Implementasi:** `jalan-produksi` (100% dari 13 fitur PRD dasar telah berjalan)
- **Commit Terakhir Modul:** `193b926` (2026-08-24)

---

## 2. ERD & Skema Database Aktual (17 Tabel)

### 2.1 `foundation_profiles` (Singleton Profil Yayasan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `name` | `VARCHAR(200)` | NO | - | - |
| `address` | `TEXT` | YES | `NULL` | - |
| `phone_number` | `VARCHAR(30)` | YES | `NULL` | - |
| `email` | `VARCHAR(150)` | YES | `NULL` | - |
| `chairman_name` | `VARCHAR(150)` | YES | `NULL` | - |
| `logo` | `VARCHAR(255)` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

### 2.2 `school_units` (Satuan Pendidikan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `foundation_id` | `BIGINT UNSIGNED` | NO | - | `FK -> foundation_profiles(id) RESTRICT/CASCADE` |
| `name` | `VARCHAR(200)` | NO | - | - |
| `level` | `VARCHAR(50)` | NO | - | TK, SD, SMP, SMA, SMK, Ponpes |
| `npsn` | `VARCHAR(20)` | YES | `NULL` | `UNIQUE` |
| `address` | `TEXT` | YES | `NULL` | - |
| `principal_name`| `VARCHAR(150)` | YES | `NULL` | - |
| `phone_number` | `VARCHAR(30)` | YES | `NULL` | - |
| `website` | `VARCHAR(150)` | YES | `NULL` | - |
| `email` | `VARCHAR(150)` | YES | `NULL` | - |
| `logo` | `VARCHAR(255)` | YES | `NULL` | - |
| `operating_license` | `VARCHAR(150)` | YES | `NULL` | - |
| `is_active` | `TINYINT(1)` | NO | `1 (true)` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_school_units_foundation (foundation_id)`, `idx_school_units_is_active (is_active)`

### 2.3 `users` (Akun Pengguna & SSO)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `username` | `VARCHAR(100)` | NO | - | `UNIQUE` |
| `password_hash`| `VARCHAR(255)` | NO | - | `bcrypt` |
| `full_name` | `VARCHAR(150)` | NO | - | - |
| `account_type` | `ENUM` | NO | - | `'admin','teacher','staff','student','parent'` |
| `ref_type` | `VARCHAR(50)` | YES | `NULL` | `'employee','student','parent'` |
| `ref_id` | `BIGINT UNSIGNED` | YES | `NULL` | ID entitas di modul pemilik |
| `status` | `ENUM` | NO | `'active'` | `'active','inactive'` |
| `last_login_at`| `TIMESTAMP` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_users_ref (ref_type, ref_id)`

### 2.4 `roles` (Master Peran RBAC)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `name` | `VARCHAR(100)` | NO | - | `UNIQUE` |
| `description` | `TEXT` | YES | `NULL` | - |
| `is_system_role` | `TINYINT(1)` | NO | `0 (false)` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

### 2.5 `permissions` (Master Izin Aplikasi)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `code` | `VARCHAR(100)` | NO | - | `UNIQUE` (format: `<modul>.<submodul>.<aksi>`) |
| `module` | `VARCHAR(100)` | NO | - | Nama modul pemilik izin |
| `description` | `VARCHAR(255)` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

### 2.6 `role_permissions` (Pivot Role - Permission)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `role_id` | `BIGINT UNSIGNED` | NO | - | `FK -> roles(id) RESTRICT/CASCADE` |
| `permission_id`| `BIGINT UNSIGNED`| NO | - | `FK -> permissions(id) RESTRICT/CASCADE` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_role_permissions (role_id, permission_id)`

### 2.7 `user_school_roles` (Multi-Tenancy RBAC User per Unit/Yayasan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `user_id` | `BIGINT UNSIGNED` | NO | - | `FK -> users(id) RESTRICT/CASCADE` |
| `school_unit_id`| `BIGINT UNSIGNED`| YES | `NULL` *(per migrasi alter)* | `FK -> school_units(id)` (NULL = Tingkat Yayasan) |
| `role_id` | `BIGINT UNSIGNED` | NO | - | `FK -> roles(id) RESTRICT/CASCADE` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_user_school_roles (user_id, school_unit_id, role_id)`

### 2.8 `refresh_tokens` (Sesi Refresh Token JWT)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `user_id` | `BIGINT UNSIGNED` | NO | - | `FK -> users(id) RESTRICT/CASCADE` |
| `token_hash` | `VARCHAR(255)` | NO | - | `UNIQUE` (SHA-256 hash) |
| `user_agent` | `VARCHAR(255)` | YES | `NULL` | - |
| `ip_address` | `VARCHAR(45)` | YES | `NULL` | IPv4 / IPv6 |
| `expires_at` | `TIMESTAMP` | NO | - | - |
| `revoked_at` | `TIMESTAMP` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_refresh_tokens_user (user_id)`

### 2.9 `password_reset_requests` (Pengajuan Reset Password)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `user_id` | `BIGINT UNSIGNED` | NO | - | `FK -> users(id) RESTRICT/CASCADE` |
| `school_unit_id`| `BIGINT UNSIGNED`| YES | `NULL` | `FK -> school_units(id) RESTRICT/CASCADE` |
| `contact` | `VARCHAR(150)` | NO | - | Email / No. WhatsApp pemohon |
| `request_status`| `ENUM` | NO | `'pending'` | `'pending','approved','rejected'` |
| `requested_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `processed_by` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> users(id) RESTRICT/CASCADE` |
| `processed_at` | `TIMESTAMP` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_prr_user (user_id)`, `idx_prr_school_unit (school_unit_id)`, `idx_prr_status (request_status)`

### 2.10 `activity_logs` (Audit Log Global & Lintas Aplikasi)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `log_type` | `ENUM` | NO | - | `'login','general_activity','admin_action'` |
| `user_id` | `BIGINT UNSIGNED` | YES | `NULL` | `FK -> users(id) RESTRICT/CASCADE` |
| `school_unit_id`| `BIGINT UNSIGNED`| YES | `NULL` | `FK -> school_units(id) RESTRICT/CASCADE` |
| `application` | `VARCHAR(100)` | YES | `NULL` | Kode modul pemanggil |
| `action` | `VARCHAR(100)` | NO | - | Nama aksi / operasi |
| `module` | `VARCHAR(100)` | YES | `NULL` | Submodul |
| `ip_address` | `VARCHAR(45)` | YES | `NULL` | - |
| `data_before` | `JSON` | YES | `NULL` | Payload state sebelum mutasi |
| `data_after` | `JSON` | YES | `NULL` | Payload state sesudah mutasi |
| `occurred_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
- **Index:** `idx_activity_logs_type_time (log_type, occurred_at)`

### 2.11 `school_unit_status_history` (Riwayat Status Satuan Pendidikan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id`| `BIGINT UNSIGNED`| NO | - | `FK -> school_units(id) RESTRICT/CASCADE` |
| `new_status` | `TINYINT(1)` | NO | - | `1 (aktif)` / `0 (nonaktif)` |
| `reason` | `TEXT` | YES | `NULL` | - |
| `changed_by` | `BIGINT UNSIGNED` | NO | - | `FK -> users(id) RESTRICT/CASCADE` |
| `changed_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
- **Index:** `idx_susth_school_unit (school_unit_id)`

### 2.12 `system_settings` (Pengaturan Sistem Global / Per-Unit Override)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `school_unit_id`| `BIGINT UNSIGNED`| YES | `NULL` | `FK -> school_units(id)` (NULL = Global) |
| `setting_key` | `VARCHAR(150)` | NO | - | Kunci konfigurasi |
| `setting_value`| `TEXT` | YES | `NULL` | Nilai konfigurasi |
| `description` | `VARCHAR(255)` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `uq_system_settings (school_unit_id, setting_key)`

### 2.13 `webhook_subscribers` (Pendaftaran Pelanggan Webhook)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `application_name`| `VARCHAR(100)`| NO | - | Nama aplikasi satelit |
| `endpoint_url` | `VARCHAR(255)` | NO | - | URL webhook listener target |
| `subscribed_events`| `JSON` | NO | - | Array string event types |
| `secret_key` | `VARCHAR(255)` | NO | - | HMAC signing secret |
| `status` | `ENUM` | NO | `'active'` | `'active','inactive'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_webhook_subscribers_status (status)`

### 2.14 `webhook_events` (Log Event Webhook yang Diterbitkan)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `event_type` | `VARCHAR(100)` | NO | - | Misal: `user.created`, `school_unit.updated` |
| `school_unit_id`| `BIGINT UNSIGNED`| YES | `NULL` | `FK -> school_units(id) RESTRICT/CASCADE` |
| `payload` | `JSON` | NO | - | Isi event JSON lengkap |
| `published_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
- **Index:** `idx_webhook_events_type (event_type)`, `idx_webhook_events_published_at (published_at)`

### 2.15 `webhook_deliveries` (Status & Retry Pengiriman Webhook)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `webhook_event_id`| `BIGINT UNSIGNED`| NO | - | `FK -> webhook_events(id) RESTRICT/CASCADE` |
| `webhook_subscriber_id`| `BIGINT UNSIGNED`| NO | - | `FK -> webhook_subscribers(id) RESTRICT/CASCADE` |
| `delivery_status` | `ENUM` | NO | `'pending'` | `'pending','success','failed'` |
| `attempt_count`| `SMALLINT UNSIGNED`| NO | `0` | - |
| `response_code`| `SMALLINT` | YES | `NULL` | HTTP response code dari subscriber |
| `delivered_at` | `TIMESTAMP` | YES | `NULL` | - |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_webhook_deliveries_status (delivery_status)`

### 2.16 `api_clients` (Klien API Internal)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `client_name` | `VARCHAR(100)` | NO | - | - |
| `api_key_hash` | `VARCHAR(255)` | NO | - | `UNIQUE` |
| `status` | `ENUM` | NO | `'active'` | `'active','inactive'` |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |

### 2.17 `rate_limit_rules` (Aturan Batas Kecepatan API Gateway)
| Kolom | Tipe Data | Nullable | Default | FK / Constraint |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NO | `AUTO_INCREMENT` | `PRIMARY KEY` |
| `api_client_id`| `BIGINT UNSIGNED`| YES | `NULL` | `FK -> api_clients(id) RESTRICT/CASCADE` |
| `endpoint` | `VARCHAR(150)` | NO | - | Endpoint pattern |
| `limit_per_minute`| `INT UNSIGNED` | NO | - | Maksimum request/menit |
| `created_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP` | - |
| `updated_at` | `TIMESTAMP` | NO | `CURRENT_TIMESTAMP ON UPDATE` | - |
- **Index:** `idx_rate_limit_rules_endpoint (endpoint)`

---

## 3. Kontrak API Ringkas (`/api/v1/core`)

| Method | Endpoint Path | Autentikasi / Izin | Request Body (Key + Tipe) | Response Data (Key + Tipe) |
|---|---|---|---|---|
| `POST` | `/auth/login` | Publik | `{ username: string, password: string, school_unit_id?: number }` | `{ token: string, refresh_token: string, user: object, school_units: array }` |
| `POST` | `/auth/refresh` | Publik | `{ refresh_token: string }` | `{ token: string, refresh_token: string }` |
| `POST` | `/auth/forgot-password/request` | Publik | `{ username: string, contact: string, school_unit_id?: number }` | `{ request_id: number, status: string }` |
| `POST` | `/auth/verify-token` | Publik | `{ token: string }` | `{ valid: boolean, user: object }` |
| `POST` | `/auth/logout` | `verifyJwt` | `{ refresh_token?: string }` | `null` |
| `GET` | `/auth/me` | `verifyJwt` | - | `{ user: object, roles: array, permissions: array, school_units: array }` |
| `GET` | `/password-resets` | `core.auth.password_resets.view` | Query: `?status=&page=&limit=` | `{ requests: array, pagination: object }` |
| `PATCH` | `/password-resets/:id/process` | `core.auth.password_resets.process` | `{ action: 'approved'\|'rejected', temporary_password?: string }` | `{ id: number, request_status: string, processed_at: string }` |
| `POST` | `/internal/users` | `X-API-Key` | `{ username: string, password: string, full_name: string, account_type: string, ref_type: string, ref_id: number, school_unit_id?: number, role_id?: number }` | `{ id: number, username: string, full_name: string }` |
| `PATCH` | `/internal/users/sync` | `X-API-Key` | `{ ref_type: string, ref_id: number, full_name?: string, status?: string }` | `{ updated: boolean }` |
| `PUT` | `/users/change-password` | `authenticate` | `{ current_password: string, new_password: string }` | `null` |
| `GET` | `/users` | `core.users.view` | Query: `?account_type=&status=&school_unit_id=&search=&page=&limit=` | `{ users: array, pagination: object }` |
| `POST` | `/users` | `core.users.create` | `{ username: string, password: string, full_name: string, account_type: string, school_unit_id?: number, role_id?: number }` | `{ id: number, username: string }` |
| `GET` | `/users/:id` | `core.users.view` | - | `{ user: object, school_roles: array }` |
| `PUT` | `/users/:id/access` | `core.users.edit` | `{ full_name: string, school_roles: array<{ school_unit_id: number\|null, role_id: number }> }` | `{ id: number, updated: boolean }` |
| `PATCH` | `/users/:id/status` | `core.users.status.update` | `{ status: 'active'\|'inactive' }` | `{ id: number, status: string }` |
| `POST` | `/users/:id/reset-password` | `core.users.password.reset` | `{ new_password?: string }` | `{ temporary_password: string }` |
| `GET` | `/permissions` | `authenticate` | - | `{ permissions: array<{ id, code, module, description }> }` |
| `GET` | `/roles` | `core.roles.view` | - | `{ roles: array<{ id, name, description, is_system_role, permissions_count }> }` |
| `POST` | `/roles` | `core.roles.create` | `{ name: string, description?: string, permission_ids: number[] }` | `{ id: number, name: string }` |
| `GET` | `/roles/:id` | `core.roles.view` | - | `{ role: object, permissions: number[] }` |
| `PUT` | `/roles/:id` | `core.roles.edit` | `{ name: string, description?: string, permission_ids: number[] }` | `{ id: number, updated: boolean }` |
| `DELETE` | `/roles/:id` | `core.roles.delete` | - | `null` |
| `GET` | `/foundation` | Publik / Auth | - | `{ foundation: object }` |
| `PUT` | `/foundation` | `core.master.foundation.edit` | `{ name: string, address?: string, phone_number?: string, email?: string, chairman_name?: string, logo?: string }` | `{ foundation: object }` |
| `GET` | `/school-units` | Publik / Auth | Query: `?is_active=` | `{ school_units: array }` |
| `POST` | `/school-units` | `core.master.school_units.create` | `{ foundation_id: number, name: string, level: string, npsn?: string, address?: string, principal_name?: string, phone_number?: string, website?: string, email?: string, logo?: string, operating_license?: string }` | `{ id: number, name: string }` |
| `GET` | `/school-units/:id` | Publik / Auth | - | `{ school_unit: object }` |
| `PUT` | `/school-units/:id` | `core.master.school_units.edit` | `{ name: string, level: string, npsn?: string, address?: string, principal_name?: string, phone_number?: string, website?: string, email?: string, logo?: string, operating_license?: string }` | `{ id: number, updated: boolean }` |
| `PATCH` | `/school-units/:id/status` | `core.master.school_units.status` | `{ is_active: boolean, reason?: string }` | `{ id: number, is_active: boolean }` |
| `GET` | `/school-units/:id/status-history` | `core.master.school_units.view` | - | `{ history: array }` |
| `GET` | `/system-settings` | `core.settings.view` | Query: `?school_unit_id=` | `{ settings: array }` |
| `GET` | `/system-settings/:key` | `core.settings.view` | Query: `?school_unit_id=` | `{ setting_key: string, setting_value: string }` |
| `POST` | `/system-settings` | `core.settings.edit` | `{ setting_key: string, setting_value: string, description?: string, school_unit_id?: number }` | `{ id: number }` |
| `PUT` | `/system-settings/:id` | `core.settings.edit` | `{ setting_value: string, description?: string }` | `{ id: number, updated: boolean }` |
| `DELETE` | `/system-settings/:id` | `core.settings.edit` | - | `null` |
| `GET` | `/webhooks/events` | `core.webhooks.view` | Query: `?event_type=&page=&limit=` | `{ events: array, pagination: object }` |
| `GET` | `/webhooks/events/:id` | `core.webhooks.view` | - | `{ event: object, deliveries: array }` |
| `POST` | `/webhooks/deliveries/:id/retry` | `core.webhooks.manage` | - | `{ delivery_id: number, status: string }` |
| `GET` | `/webhooks/subscribers` | `core.webhooks.view` | - | `{ subscribers: array }` |
| `POST` | `/webhooks/subscribers` | `core.webhooks.manage` | `{ application_name: string, endpoint_url: string, subscribed_events: string[], secret_key: string }` | `{ id: number }` |
| `PUT` | `/webhooks/subscribers/:id` | `core.webhooks.manage` | `{ application_name: string, endpoint_url: string, subscribed_events: string[], status: string }` | `{ id: number, updated: boolean }` |
| `POST` | `/webhooks/subscribers/:id/rotate-secret` | `core.webhooks.manage` | - | `{ secret_key: string }` |
| `DELETE` | `/webhooks/subscribers/:id` | `core.webhooks.manage` | - | `null` |
| `GET` | `/api-clients` | `core.api_clients.view` | - | `{ api_clients: array }` |
| `POST` | `/api-clients` | `core.api_clients.manage` | `{ client_name: string }` | `{ id: number, client_name: string, api_key: string }` |
| `PATCH` | `/api-clients/:id/status` | `core.api_clients.manage` | `{ status: 'active'\|'inactive' }` | `{ id: number, status: string }` |
| `GET` | `/rate-limit-rules` | `core.rate_limiting.view` | - | `{ rules: array }` |
| `POST` | `/rate-limit-rules` | `core.rate_limiting.manage` | `{ api_client_id?: number, endpoint: string, limit_per_minute: number }` | `{ id: number }` |
| `PUT` | `/rate-limit-rules/:id` | `core.rate_limiting.manage` | `{ endpoint: string, limit_per_minute: number }` | `{ id: number, updated: boolean }` |
| `DELETE` | `/rate-limit-rules/:id` | `core.rate_limiting.manage` | - | `null` |
| `GET` | `/activity-logs/login` | `core.activity_logs.view` | Query: `?page=&limit=` | `{ logs: array, pagination: object }` |
| `POST` | `/internal/activity-logs` | `X-API-Key` | `{ log_type: string, user_id?: number, school_unit_id?: number, application: string, action: string, module?: string, ip_address?: string, data_before?: object, data_after?: object }` | `{ id: number }` |
| `GET` | `/activity-logs/admin` | `core.activity_logs.view` | Query: `?application=&module=&page=&limit=` | `{ logs: array, pagination: object }` |
| `GET` | `/activity-logs/admin/:id`| `core.activity_logs.view` | - | `{ log: object }` |
| `GET` | `/docs/openapi.json` | Publik | - | OpenAPI Specification Object |

---

## 4. Workflows & State Machines

- **Password Reset Request:** `pending -> approved` *(password acak digenerate, hash disimpan, response dikirim ke admin)* OR `pending -> rejected`.
- **User Account Lifecycle:** `active <-> inactive`.
- **School Unit Lifecycle:** `active (1) <-> inactive (0)` *(mencatat entri riwayat di `school_unit_status_history`)*.
- **Webhook Delivery:** `pending -> success (HTTP 2xx)` OR `pending -> failed (HTTP non-2xx/timeout)` -> `manual retry -> pending`.
- **API Client:** `active <-> inactive`.

---

## 5. UI Routes & Komponen Halaman (`apps/core-portal/`)

| Route Path | Komponen Halaman | Deskripsi / Fungsi |
|---|---|---|
| `/core/login` | `src/apps/core/pages/Login.jsx` | Form login SSO, pilihan satuan pendidikan, request lupa password |
| `/core/dashboard` | `src/apps/core/pages/Dashboard.jsx` | Statistik agregat yayasan, status unit, quick shortcuts |
| `/core/users` | `src/apps/core/pages/ManajemenUser.jsx` | Tabel pengguna, filter tipe akun, modal role assignment & reset password |
| `/core/roles` | `src/apps/core/pages/RoleManagement.jsx` | Master peran RBAC, toggle matriks permission per modul |
| `/core/foundation` *(alias: `/core/yayasan`)* | `src/apps/core/pages/ProfilYayasan.jsx` | Edit data induk yayasan, pimpinan, alamat & logo |
| `/core/school-units` *(alias: `/core/satuan-pendidikan`)* | `src/apps/core/pages/SatuanPendidikan.jsx` | CRUD satuan pendidikan, aktivasi/nonaktivasi unit & riwayat |
| `/core/settings` | `src/apps/core/pages/PengaturanSistem.jsx` | Pengaturan key-value global & override per satuan pendidikan |
| `/core/webhooks` | `src/apps/core/pages/WebhookSubscribers.jsx` | Kelola subscriber webhook, rotasi secret key, log pengiriman & retry |
| `/core/api-clients` | `src/apps/core/pages/ApiClients.jsx` | Manajemen internal API Key & konfigurasi rate limit rules |
| `/core/audit-logs` | `src/apps/core/pages/AuditLog.jsx` | Viewer log aktivitas login & aksi admin lintas 14 aplikasi |

---

## 6. Dependensi Modul

- **Modul yang Dipanggil (Dependencies):**
  - `akademik` *(sinkronisasi akun siswa/orangtua via endpoint internal `POST /internal/users` & `PATCH /internal/users/sync`)*
  - `kepegawaian` *(sinkronisasi akun pegawai saat aktivasi rekrutmen via `POST /internal/users`)*
- **Modul yang Memanggil Core Service (Consumers):**
  - Seluruh 13 modul satelit (`website-utama`, `akademik`, `kepegawaian`, `keuangan`, `kantin`, `dapur`, `sarpras`, `perpustakaan`, `alquran`, `manajemen`, `portal-orangtua`, `cbe`, `komunikasi`) untuk validasi JWT SSO lokal (`verifyJwt`), penarikan data profil yayasan/sekolah, dan pengiriman audit log internal (`POST /api/v1/core/internal/activity-logs`).

---

## 7. Gap / TODO Teridentifikasi dari PRD

1. **OpenAPI JSON Spec:** Endpoint `/api/v1/core/docs/openapi.json` saat ini mengembalikan stub statis kosong `{ paths: {} }`, belum berisi skema OpenAPI 3.0 dinamis lengkap untuk seluruh modul.
2. **Automated Background Webhook Dispatcher:** Webhook delivery saat ini dieksekusi secara sinkron atau via tombol retry manual di UI; belum terpasang cron/queue worker mandiri (mis. BullMQ/RabbitMQ) untuk automated exponential backoff retry.
3. **Database-backed API Key Validation:** `requireApiKey` middleware pada `apps/api-backend/src/middlewares/auth.js` saat ini baru mengecek keberadaan header `X-API-Key`, belum melakukan hashing check ke tabel `api_clients`.

---

<!-- updated: 2026-08-28 from commit 193b9266b9c05014194ec52cfaa2a3fd4b9ade42 — cross-ref update saat menyusun ai-ref-kepegawaian -->
