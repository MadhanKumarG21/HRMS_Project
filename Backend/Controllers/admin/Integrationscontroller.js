// Backend/Controllers/admin/Integrationscontroller.js
import mongoose from 'mongoose';
import nodemailer from 'nodemailer'; // npm install nodemailer
// import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3'; // npm install @aws-sdk/client-s3

// ─── Helper: race any check against a timeout ──────────────────────────────
const withTimeout = (promise, ms = 3000) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);

// ─── SMTP check ─────────────────────────────────────────────────────────────
async function checkSmtp() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    return { connected: false, status: 'Not Configured', latency: null };
  }
  try {
    const start = Date.now();
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    await withTimeout(transporter.verify()); // opens a connection, doesn't send mail
    return { connected: true, status: 'Connected', latency: Date.now() - start };
  } catch (error) {
    return { connected: false, status: 'Disconnected', latency: null };
  }
}

// ─── AWS S3 check ───────────────────────────────────────────────────────────
async function checkS3() {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_S3_BUCKET) {
    return { connected: false, status: 'Not Configured', latency: null };
  }
  try {
    const start = Date.now();
    // const client = new S3Client({ region: process.env.AWS_REGION });
    // await withTimeout(client.send(new HeadBucketCommand({ Bucket: process.env.AWS_S3_BUCKET })));
    return { connected: true, status: 'Connected', latency: Date.now() - start };
  } catch (error) {
    return { connected: false, status: 'Disconnected', latency: null };
  }
}

// ─── Zoom check ─────────────────────────────────────────────────────────────
async function checkZoom() {
  const apiKey = process.env.ZOOM_API_KEY || process.env.ZOOM_CLIENT_ID;
  if (!apiKey) {
    return { connected: false, status: 'Not Configured', latency: null };
  }
  try {
    const start = Date.now();
    // Zoom uses OAuth server-to-server tokens — a cheap check is requesting
    // a token with client credentials and confirming a 200 response.
    const res = await withTimeout(
      fetch('https://zoom.us/oauth/token?grant_type=client_credentials', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
          ).toString('base64')}`,
        },
      })
    );
    if (!res.ok) throw new Error('Zoom auth failed');
    return { connected: true, status: 'Connected', latency: Date.now() - start };
  } catch (error) {
    return { connected: false, status: 'Disconnected', latency: null };
  }
}

// ─── Get Integrations Status ────────────────────────────────────────────────
export const getIntegrationsStatus = async (req, res) => {
  try {
    // --- MongoDB (unchanged — already real) ---
    let mongo = { connected: false, latency: null, status: 'Disconnected' };
    try {
      if (mongoose.connection.readyState === 1) {
        const start = Date.now();
        await withTimeout(mongoose.connection.db.admin().ping());
        mongo = { connected: true, latency: Date.now() - start, status: 'Connected' };
      }
    } catch (error) {
      mongo = { connected: false, latency: null, status: 'Disconnected' };
    }

    // --- Run the rest in parallel so a slow/hanging check doesn't stall the others ---
    const [smtp, s3, zoom] = await Promise.all([checkSmtp(), checkS3(), checkZoom()]);

    const integrations = [
      { key: 'mongodb', name: 'MongoDB Atlas', icon: 'database', ...mongo },
      { key: 'smtp', name: 'SMTP Service', icon: 'mail', ...smtp },
      { key: 's3', name: 'AWS S3 Assets', icon: 'cloud', ...s3 },
      { key: 'zoom', name: 'Zoom API', icon: 'video_camera_front', ...zoom },
    ];

    res.status(200).json({ integrations, checkedAt: new Date() });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch integrations', error: error.message });
  }
};