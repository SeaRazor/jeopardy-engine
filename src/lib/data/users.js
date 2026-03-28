import * as pgImpl from '../db/pg/users.js';
import * as jsonImpl from '../db/json/users.js';

const impl = process.env.DATABASE_URL ? pgImpl : jsonImpl;

export const getUsers = (role) => impl.getUsers(role);
export const getUserById = (id) => impl.getUserById(id);
export const createUser = (data) => impl.createUser(data);
export const updateUser = (data) => impl.updateUser(data);
export const deleteUser = (id) => impl.deleteUser(id);
