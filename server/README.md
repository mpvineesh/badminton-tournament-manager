# Backblaze Upload Signer (Render)

Node.js API for signing Backblaze Native API uploads for profile photos.

## Endpoints

- `GET /health`
- `GET /profile-photo/view?path=profile_photos/...`
- `POST /profile-photo/sign-upload`
- `POST /profile-photo/upload` (recommended for browsers to avoid Backblaze CORS)

Request body:

```json
{
  "path": "profile_photos/<playerId>/<timestamp>_<fileName>",
  "contentType": "image/jpeg"
}
```

Response:

```json
{
  "uploadUrl": "https://...",
  "method": "POST",
  "headers": {
    "Authorization": "...",
    "X-Bz-File-Name": "...",
    "Content-Type": "image/jpeg",
    "X-Bz-Content-Sha1": "do_not_verify"
  },
  "publicUrl": "https://fXXX.backblazeb2.com/file/<bucket>/<path>"
}
```

Browser-safe proxy upload request:

- `POST /profile-photo/upload`
- Headers:
  - `Content-Type: image/jpeg` (or any image/*)
  - `x-upload-path: profile_photos/<playerId>/<timestamp>_<fileName>`
  - optional `Authorization: Bearer <BACKBLAZE_SIGN_TOKEN>`
- Body: raw file bytes

Proxy response:

```json
{
  "url": "https://fXXX.backblazeb2.com/file/<bucket>/<path>",
  "path": "profile_photos/..."
}
```

Browser-safe profile photo view request (for private buckets):

- `GET /profile-photo/view?path=profile_photos/<playerId>/<timestamp>_<fileName>`
- Response: image bytes with `Content-Type` copied from Backblaze

## Local run

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

## Render setup

1. Create a new **Web Service** on Render from this repo.
2. Configure:
- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `npm start`
3. Add environment variables from `.env.example`.
4. Deploy.

## Frontend env

In your frontend `.env`:

```env
VITE_PROFILE_PHOTO_STORAGE=backblaze
VITE_BACKBLAZE_PROXY_UPLOAD_URL=https://<your-render-service>.onrender.com/profile-photo/upload
VITE_BACKBLAZE_PROXY_VIEW_URL=https://<your-render-service>.onrender.com/profile-photo/view
VITE_BACKBLAZE_SIGNED_UPLOAD_TOKEN=<same as BACKBLAZE_SIGN_TOKEN>
```

Restart frontend after `.env` changes.
