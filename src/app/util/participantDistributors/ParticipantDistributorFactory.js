// Participant Distributor Factory - Creates the appropriate participant distributor based on tournament schema

import { DoubleEliminationParticipantDistributor } from './DoubleEliminationParticipantDistributor.js';
import { OlympicParticipantDistributor } from './OlympicParticipantDistributor.js';

export class ParticipantDistributorFactory {
  static distributorRegistry = new Map();

  // Initialize default distributors
  static {
    this.register('Double Elimination', DoubleEliminationParticipantDistributor);
    this.register('Олимпийская', OlympicParticipantDistributor);
    this.register('Olympic', OlympicParticipantDistributor);
    this.register('Круговой с плей-офф', OlympicParticipantDistributor);
  }

  // Register a new participant distributor for a schema
  static register(schemaName, distributorClass) {
    console.log(`[ParticipantDistributorFactory] Registering distributor for schema: ${schemaName}`);
    this.distributorRegistry.set(schemaName, distributorClass);
  }

  // Create appropriate participant distributor based on tournament schema
  static createParticipantDistributor(tournament) {
    const schemaName = tournament.schema?.schemeName;
    
    console.log(`[ParticipantDistributorFactory] Creating participant distributor for schema: ${schemaName}`);
    
    const DistributorClass = this.distributorRegistry.get(schemaName);
    
    if (DistributorClass) {
      return new DistributorClass(tournament);
    } else {
      console.warn(`[ParticipantDistributorFactory] Unknown schema '${schemaName}', falling back to Double Elimination`);
      return new DoubleEliminationParticipantDistributor(tournament);
    }
  }

  // Get all registered schemas
  static getSupportedSchemas() {
    return Array.from(this.distributorRegistry.keys());
  }

  // Check if schema is supported
  static isSchemaSupported(schemaName) {
    return this.distributorRegistry.has(schemaName);
  }

  // Unregister a schema (for testing or dynamic updates)
  static unregister(schemaName) {
    console.log(`[ParticipantDistributorFactory] Unregistering distributor for schema: ${schemaName}`);
    return this.distributorRegistry.delete(schemaName);
  }

  // Get registry for inspection (for debugging)
  static getRegistry() {
    return new Map(this.distributorRegistry);
  }
}

// Factory function for backward compatibility
export const createParticipantDistributor = (tournament) => {
  return ParticipantDistributorFactory.createParticipantDistributor(tournament);
};