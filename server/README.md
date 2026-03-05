# Backblaze Upload Signer (Render)

Node.js API for signing Backblaze Native API uploads for profile photos.

## Endpoints

- `GET /health`
- `POST /profile-photo/sign-upload`

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
VITE_BACKBLAZE_SIGNED_UPLOAD_URL=https://<your-render-service>.onrender.com/profile-photo/sign-upload
VITE_BACKBLAZE_SIGNED_UPLOAD_TOKEN=<same as BACKBLAZE_SIGN_TOKEN>
```

Restart frontend after `.env` changes.
