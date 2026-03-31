const request = require('supertest')
const mongoose = require('mongoose')
const { app } = require('../server')

// Use a test DB
beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/videoplatform_test')
})

afterAll(async () => {
  await mongoose.connection.dropDatabase()
  await mongoose.connection.close()
})

describe('Auth API', () => {
  const testUser = {
    name: 'Test User',
    email: `test_${Date.now()}@example.com`,
    password: 'password123',
    organisation: 'TestOrg',
  }
  let token

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app).post('/api/auth/register').send(testUser)
      expect(res.statusCode).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.token).toBeDefined()
      expect(res.body.user.email).toBe(testUser.email)
      token = res.body.token
    })

    it('should reject duplicate email', async () => {
      const res = await request(app).post('/api/auth/register').send(testUser)
      expect(res.statusCode).toBe(400)
    })

    it('should reject missing fields', async () => {
      const res = await request(app).post('/api/auth/register').send({ email: 'x@x.com' })
      expect(res.statusCode).toBe(400)
    })
  })

  describe('POST /api/auth/login', () => {
    it('should login with correct credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      })
      expect(res.statusCode).toBe(200)
      expect(res.body.token).toBeDefined()
    })

    it('should reject wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testUser.email,
        password: 'wrongpassword',
      })
      expect(res.statusCode).toBe(401)
    })
  })

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
      expect(res.statusCode).toBe(200)
      expect(res.body.user.email).toBe(testUser.email)
    })

    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/auth/me')
      expect(res.statusCode).toBe(401)
    })
  })
})

describe('Videos API', () => {
  let token
  let videoId

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Video Tester',
      email: `video_${Date.now()}@example.com`,
      password: 'password123',
      role: 'editor',
    })
    token = res.body.token
  })

  describe('GET /api/videos', () => {
    it('should return empty video list for new user', async () => {
      const res = await request(app)
        .get('/api/videos')
        .set('Authorization', `Bearer ${token}`)
      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data)).toBe(true)
    })
  })

  describe('GET /api/videos/stats', () => {
    it('should return video statistics', async () => {
      const res = await request(app)
        .get('/api/videos/stats')
        .set('Authorization', `Bearer ${token}`)
      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
    })
  })

  describe('GET /api/health', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/api/health')
      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
    })
  })
})
