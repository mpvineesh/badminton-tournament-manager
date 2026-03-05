import express from 'express';
import cors from 'cors';

const app = express();
const port = Number(process.env.PORT || 8080);

const allowedOrigins = String(process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
  })
);
app.use(express.json({ limit: '2mb' }));

function readRequiredEnv(name) {
  const v = String(process.env[name] || '').trim();
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function normalizePath(path) {
  const raw = String(path || '').trim().replace(/^\/+/, '');
  if (!raw) throw new Error('path is required');
  if (!raw.startsWith('profile_photos/')) {
    throw new Error('path must start with profile_photos/');
  }
  if (raw.includes('..')) throw new Error('invalid path');
  return raw;
}

function isImageContentType(contentType) {
  return String(contentType || '').toLowerCase().startsWith('image/');
}

function toB2HeaderFileName(path) {
  return encodeURIComponent(path);
}

function toPublicFilePath(path) {
  return String(path || '')
    .split('/')
    .filter(Boolean)
    .map((p) => encodeURIComponent(p))
    .join('/');
}

async function b2Authorize({ keyId, appKey }) {
  const auth = Buffer.from(`${keyId}:${appKey}`).toString('base64');
  const res = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    method: 'GET',
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`b2_authorize_account failed (${res.status}) ${body}`);
  }
  return res.json();
}

async function b2GetUploadUrl({ apiUrl, authToken, bucketId }) {
  const res = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: 'POST',
    headers: {
      Authorization: authToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ bucketId }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`b2_get_upload_url failed (${res.status}) ${body}`);
  }
  return res.json();
}

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.post('/profile-photo/sign-upload', async (req, res) => {
  try {
    const signerToken = String(process.env.BACKBLAZE_SIGN_TOKEN || '').trim();
    if (signerToken) {
      const authz = String(req.headers.authorization || '');
      const expected = `Bearer ${signerToken}`;
      if (authz !== expected) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    const path = normalizePath(req.body?.path);
    const contentType = String(req.body?.contentType || 'application/octet-stream').trim();
    if (!isImageContentType(contentType)) {
      return res.status(400).json({ error: 'contentType must be an image/* type' });
    }

    const keyId = readRequiredEnv('BACKBLAZE_KEY_ID');
    const appKey = readRequiredEnv('BACKBLAZE_APPLICATION_KEY');
    const bucketId = readRequiredEnv('BACKBLAZE_BUCKET_ID');
    const bucketName = readRequiredEnv('BACKBLAZE_BUCKET_NAME');

    const auth = await b2Authorize({ keyId, appKey });
    const upload = await b2GetUploadUrl({
      apiUrl: auth.apiUrl,
      authToken: auth.authorizationToken,
      bucketId,
    });

    const publicPath = toPublicFilePath(path);
    const publicUrl = `${auth.downloadUrl}/file/${bucketName}/${publicPath}`;

    return res.status(200).json({
      uploadUrl: upload.uploadUrl,
      method: 'POST',
      headers: {
        Authorization: upload.authorizationToken,
        'X-Bz-File-Name': toB2HeaderFileName(path),
        'Content-Type': contentType,
        'X-Bz-Content-Sha1': 'do_not_verify',
      },
      publicUrl,
    });
  } catch (err) {
    console.error('sign-upload failed', err);
    return res.status(500).json({
      error: 'Unable to prepare Backblaze upload',
      detail: err?.message || 'Unknown error',
    });
  }
});

app.listen(port, () => {
  console.log(`Backblaze signer listening on :${port}`);
});
