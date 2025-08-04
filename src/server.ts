import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import fastifyOAuth2 from '@fastify/oauth2';
import fastifyCors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';
import { Storage } from '@google-cloud/storage';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';  // <-- Import Prisma Client

dotenv.config();

const app = Fastify();
const gcs = new Storage();
const bucket = gcs.bucket('image_app_san');
const prisma = new PrismaClient();  // <-- Initialize Prisma Client

// Middleware
app.register(fastifyCors, {
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
});

app.register(fastifyCookie);
app.register(fastifyMultipart);
app.register(fastifyJwt, {
  secret: process.env.SESSION_SECRET!,
  cookie: { cookieName: 'token', signed: false },
});

// Swagger
app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'Image Upload API',
      description: 'Docs for image uploader',
      version: '1.0.0',
    },
  },
});

app.register(fastifySwaggerUI, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
  },
});

// Google OAuth
app.register(fastifyOAuth2, {
  name: 'googleOAuth2',
  credentials: {
    client: {
      id: process.env.GOOGLE_CLIENT_ID!,
      secret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    auth: {
      authorizeHost: 'https://accounts.google.com',
      authorizePath: '/o/oauth2/v2/auth',
      tokenHost: 'https://oauth2.googleapis.com',
      tokenPath: '/token',
    },
  },
  startRedirectPath: '/login/google',
  callbackUri: 'http://localhost:3001/login/google/callback',
  scope: ['openid', 'email', 'profile'],
});

// WebSocket Setup (shared state)
let io: SocketIOServer;
const wsServer = createServer();

// 🌐 OAuth callback
app.get('/login/google/callback', async (req, reply) => {
  const token = await app.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);
  const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${token.token.access_token}` },
  }).then(res => res.json());

  const jwt = app.jwt.sign({ user: userInfo });
  reply.setCookie('token', jwt, { path: '/', httpOnly: true }).redirect('http://localhost:5173');
});

// 🛡️ Auth Status
app.get('/auth/status', async (req, reply) => {
  try {
    const token = req.cookies.token;
    if (!token) return reply.send({ user: null });

    const decoded = await app.jwt.verify(token);
    return reply.send({ user: decoded.user });
  } catch {
    return reply.send({ user: null });
  }
});

app.post('/upload', async (req, reply) => {
  const file = await req.file();

  if (!file) {
    return reply.status(400).send({ error: 'No file uploaded' });
  }

  // Allow only PNG, JPG, and JPEG files
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
  if (!allowedTypes.includes(file.mimetype)) {
    return reply.status(400).send({ error: 'Only PNG, JPG, and JPEG files are allowed' });
  }

  const timestamp = Date.now();
  const safeName = file.filename.replace(/\s+/g, '_');
  const blob = bucket.file(`${timestamp}_${safeName}`);

  const stream = blob.createWriteStream({
    resumable: false,
    metadata: { contentType: file.mimetype },
  });

  await new Promise((resolve, reject) => {
    file.file.pipe(stream).on('error', reject).on('finish', resolve);
  });

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;

  try {
    await prisma.image.create({
      data: {
        filename: blob.name,
        url: publicUrl,
      },
    });
  } catch (error) {
    console.error('Error saving image to DB:', error);
    return reply.status(500).send({ error: 'Failed to save image info' });
  }

  io?.emit('uploadComplete', { url: publicUrl });

  return reply.send({ message: 'Upload successful', url: publicUrl });
});


// List Images
app.get('/images', async (_, reply) => {
  try {
    const images = await prisma.image.findMany({
      orderBy: { uploadedAt: 'desc' },
    });
    const urls = images.map(img => img.url);
    reply.send({ images: urls });
  } catch (err) {
    console.error('Failed to fetch images from DB:', err);
    reply.status(500).send({ error: 'Failed to fetch images' });
  }
});


// Delete endpoint remains unchanged
app.delete('/delete', async (req, reply) => {
  try {
    const { url } = req.body as { url: string };

    if (!url) return reply.status(400).send({ error: 'Image URL is required' });

    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const encodedFilename = pathname.split('/').pop();
    if (!encodedFilename) return reply.status(400).send({ error: 'Invalid image URL' });

    const filename = decodeURIComponent(encodedFilename);
    const file = bucket.file(filename);

    const [exists] = await file.exists();
    if (!exists) return reply.status(404).send({ error: 'File not found' });

    await file.delete();

    // Remove from Prisma DB
    await prisma.image.deleteMany({ where: { url } });

    return reply.send({ message: 'Image deleted successfully' });
  } catch (err) {
    console.error('Error deleting image:', err);
    return reply.status(500).send({ error: 'Failed to delete image' });
  }
});


// Start both HTTP and WebSocket
const start = async () => {
  try {
    await app.ready();

    app.listen({ port: 3001 }, () => {
      console.log('Fastify HTTP server running at http://localhost:3001');
    });

    io = new SocketIOServer(wsServer, {
      cors: {
        origin: 'http://localhost:5173',
        credentials: true,
      },
    });

    io.on('connection', (socket) => {
      console.log('WebSocket client connected:', socket.id);
    });

    wsServer.listen(3002, () => {
      console.log('WebSocket server running at http://localhost:3002');
    });

  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
};

start();
//npx tsx src/server.ts
