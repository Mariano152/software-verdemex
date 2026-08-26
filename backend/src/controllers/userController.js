import bcrypt from 'bcrypt';
import { userModel } from '../models/userModel.js';
import { driverModel } from '../models/driverModel.js';
import { isSuperuser, sanitizePermissions } from '../config/permissions.js';

const normalizeText = (value) => String(value || '').trim();
const normalizeLower = (value) => normalizeText(value).toLowerCase();

const buildUserPayload = (body = {}) => ({
  firstName: normalizeText(body.firstName),
  lastName: normalizeText(body.lastName),
  email: normalizeLower(body.email),
  username: normalizeLower(body.username),
  role: normalizeLower(body.role || 'operador'),
  password: normalizeText(body.password),
  driverId: normalizeText(body.driverId) || null,
  permissions: sanitizePermissions(body.permissions)
});

const formatUser = (user) => ({
  id: user.id,
  firstName: user.first_name,
  lastName: user.last_name,
  name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
  email: user.email,
  username: user.username,
  role: user.role,
  driverId: user.driver_id || null,
  driverName: user.driver_name || null,
  createdAt: user.created_at,
  updatedAt: user.updated_at,
  permissions: isSuperuser(user) ? 'all' : (user.permissions || []),
  isSuperuser: isSuperuser(user)
});

const validateUserPayload = async (payload, userId = null) => {
  if (!payload.firstName) return 'El nombre es requerido';
  if (!payload.lastName) return 'El apellido es requerido';
  if (!payload.email) return 'El correo es requerido';
  if (!payload.username) return 'El username es requerido';
  if (!['admin', 'conductor'].includes(payload.role)) return 'Solo se permiten usuarios admin o conductor';

  if (await userModel.emailExists(payload.email, userId)) {
    return 'Ya existe un usuario con ese correo';
  }

  if (await userModel.usernameExists(payload.username, userId)) {
    return 'Ya existe un usuario con ese username';
  }

  if (payload.role === 'conductor') {
    if (!payload.driverId) return 'Debes asignar un conductor a este usuario';
    const driver = await driverModel.getDriverById(payload.driverId);
    if (!driver) return 'El conductor asignado no existe';
    if (await userModel.driverUserExists(payload.driverId, userId)) {
      return 'Ese conductor ya tiene una cuenta de usuario';
    }
  }

  return null;
};

export const userController = {
  async listUsers(req, res) {
    try {
      const users = await userModel.listUsers();
      res.json({ users: users.map(formatUser) });
    } catch (error) {
      console.error('Error listando usuarios:', error);
      res.status(500).json({ message: 'Error al obtener usuarios', error: error.message });
    }
  },

  async getUserById(req, res) {
    try {
      const user = await userModel.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      res.json({ user: formatUser(user) });
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      res.status(500).json({ message: 'Error al obtener usuario', error: error.message });
    }
  },

  async createUser(req, res) {
    try {
      const payload = buildUserPayload(req.body);
      if (!payload.password || payload.password.length < 6) {
        return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
      }

      const validationError = await validateUserPayload(payload);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      const hashedPassword = await bcrypt.hash(payload.password, 10);
      const user = await userModel.create({
        email: payload.email,
        username: payload.username,
        firstName: payload.firstName,
        lastName: payload.lastName,
        hashedPassword,
        role: payload.role,
        driverId: payload.role === 'conductor' ? payload.driverId : null,
        permissions: payload.role === 'admin' ? payload.permissions : []
      });

      res.status(201).json({
        message: 'Usuario creado correctamente',
        user: formatUser(user)
      });
    } catch (error) {
      console.error('Error creando usuario:', error);
      res.status(500).json({ message: 'Error al crear usuario', error: error.message });
    }
  },

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const existingUser = await userModel.findById(id);

      if (!existingUser) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      if (isSuperuser(existingUser)) {
        return res.status(403).json({ message: 'El superusuario principal no puede ser modificado' });
      }

      const payload = buildUserPayload(req.body);
      const validationError = await validateUserPayload(payload, id);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      let hashedPassword = null;
      if (payload.password) {
        if (payload.password.length < 6) {
          return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
        }
        hashedPassword = await bcrypt.hash(payload.password, 10);
      }

      const updatedUser = await userModel.update(id, {
        email: payload.email,
        username: payload.username,
        firstName: payload.firstName,
        lastName: payload.lastName,
        role: payload.role,
        driverId: payload.role === 'conductor' ? payload.driverId : null,
        hashedPassword,
        permissions: payload.role === 'admin' ? payload.permissions : []
      });

      res.json({
        message: 'Usuario actualizado correctamente',
        user: formatUser(updatedUser)
      });
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      res.status(500).json({ message: 'Error al actualizar usuario', error: error.message });
    }
  },

  async deleteUser(req, res) {
    try {
      const user = await userModel.findById(req.params.id);
      if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
      if (isSuperuser(user)) return res.status(403).json({ message: 'El superusuario principal no puede ser eliminado' });
      if (String(user.id) === String(req.user.id)) return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta' });
      await userModel.softDelete(user.id);
      res.json({ message: 'Usuario eliminado correctamente', deletedUser: { id: user.id, username: user.username, name: `${user.first_name || ''} ${user.last_name || ''}`.trim() } });
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      res.status(500).json({ message: 'Error al eliminar usuario', error: error.message });
    }
  }
};
