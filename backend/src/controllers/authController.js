import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { userModel } from '../models/userModel.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

const buildAuthUser = (user) => ({
  id: user.id,
  email: user.email,
  username: user.username,
  firstName: user.first_name,
  lastName: user.last_name,
  name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
  role: user.role,
  driverId: user.driver_id || null
});

const buildToken = (user) => jwt.sign(
  {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    driverId: user.driver_id || null
  },
  JWT_SECRET,
  { expiresIn: JWT_EXPIRY }
);

export const authController = {
  async register(req, res) {
    try {
      const { email, username, password, firstName, lastName } = req.body;

      if (!email || !username || !password || !firstName || !lastName) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      if (await userModel.findByEmail(email)) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      if (await userModel.findByUsername(username)) {
        return res.status(409).json({ error: 'Username already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await userModel.create({
        email,
        username,
        firstName,
        lastName,
        hashedPassword,
        role: 'operador'
      });

      const token = buildToken(newUser);

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: buildAuthUser(newUser)
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async login(req, res) {
    try {
      const { identifier, email, username, password } = req.body;
      const loginIdentifier = identifier || username || email;

      if (!loginIdentifier || !password) {
        return res.status(400).json({ error: 'Username/email and password are required' });
      }

      const user = await userModel.findByIdentifier(loginIdentifier);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      await userModel.updateLastLogin(user.id);

      const token = buildToken(user);

      res.json({
        message: 'Login successful',
        token,
        user: buildAuthUser(user)
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async logout(req, res) {
    try {
      console.log(`User ${req.user?.id} logged out`);
      res.json({ message: 'Logout successful' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getProfile(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await userModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user: buildAuthUser(user) });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async verifyToken(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await userModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ valid: true, user: buildAuthUser(user) });
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  }
};
