// Game Creator Factory - Creates the appropriate game creator based on tournament schema

import { DoubleEliminationGameCreator } from './DoubleEliminationGameCreator.js';
import { OlympicGameCreator } from './OlympicGameCreator.js';

export class GameCreatorFactory {
  static creatorRegistry = new Map();

  // Initialize default creators
  static {
    this.register('Double Elimination', DoubleEliminationGameCreator);
    this.register('Олимпийская', OlympicGameCreator);
    this.register('Olympic', OlympicGameCreator);
  }

  // Register a new game creator for a schema
  static register(schemaName, creatorClass) {
    console.log(`[GameCreatorFactory] Registering creator for schema: ${schemaName}`);
    this.creatorRegistry.set(schemaName, creatorClass);
  }

  // Create appropriate game creator based on tournament schema
  static createGameCreator(tournament) {
    const schemaName = tournament.schema?.schemeName;
    
    console.log(`[GameCreatorFactory] Creating game creator for schema: ${schemaName}`);
    
    const CreatorClass = this.creatorRegistry.get(schemaName);
    
    if (CreatorClass) {
      return new CreatorClass(tournament);
    } else {
      console.warn(`[GameCreatorFactory] Unknown schema '${schemaName}', falling back to Double Elimination`);
      return new DoubleEliminationGameCreator(tournament);
    }
  }

  // Get all registered schemas
  static getSupportedSchemas() {
    return Array.from(this.creatorRegistry.keys());
  }

  // Check if schema is supported
  static isSchemaSupported(schemaName) {
    return this.creatorRegistry.has(schemaName);
  }

  // Unregister a schema (for testing or dynamic updates)
  static unregister(schemaName) {
    console.log(`[GameCreatorFactory] Unregistering creator for schema: ${schemaName}`);
    return this.creatorRegistry.delete(schemaName);
  }

  // Get registry for inspection (for debugging)
  static getRegistry() {
    return new Map(this.creatorRegistry);
  }
}

// Factory function for backward compatibility
export const createGameCreator = (tournament) => {
  return GameCreatorFactory.createGameCreator(tournament);
};