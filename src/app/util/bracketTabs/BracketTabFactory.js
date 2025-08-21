// Bracket Tab Factory - Creates the appropriate bracket component based on tournament schema

import { DoubleEliminationBracketTab } from './DoubleEliminationBracketTab';
import { OlympicBracketTab } from './OlympicBracketTab';

export class BracketTabFactory {
  static componentRegistry = new Map();

  // Initialize default bracket tab components
  static {
    this.register('Double Elimination', DoubleEliminationBracketTab);
    this.register('Олимпийская', OlympicBracketTab);
    this.register('Olympic', OlympicBracketTab);
  }

  // Register a new bracket tab component for a schema
  static register(schemaName, componentClass) {
    console.log(`[BracketTabFactory] Registering bracket component for schema: ${schemaName}`);
    this.componentRegistry.set(schemaName, componentClass);
  }

  // Get appropriate bracket tab component based on tournament schema
  static getBracketTabComponent(tournament) {
    const schemaName = tournament?.schema?.schemeName;
    
    console.log(`[BracketTabFactory] Getting bracket component for schema: ${schemaName}`);
    
    const ComponentClass = this.componentRegistry.get(schemaName);
    
    if (ComponentClass) {
      return ComponentClass;
    } else {
      console.warn(`[BracketTabFactory] Unknown schema '${schemaName}', falling back to Olympic`);
      return OlympicBracketTab;
    }
  }

  // Get all registered schemas
  static getSupportedSchemas() {
    return Array.from(this.componentRegistry.keys());
  }

  // Check if schema is supported
  static isSchemaSupported(schemaName) {
    return this.componentRegistry.has(schemaName);
  }

  // Unregister a schema (for testing or dynamic updates)
  static unregister(schemaName) {
    console.log(`[BracketTabFactory] Unregistering bracket component for schema: ${schemaName}`);
    return this.componentRegistry.delete(schemaName);
  }

  // Get registry for inspection (for debugging)
  static getRegistry() {
    return new Map(this.componentRegistry);
  }
}

// Factory function for easy use in React components
export const createBracketTabComponent = (tournament) => {
  return BracketTabFactory.getBracketTabComponent(tournament);
};