// Tournament Schema Registry - Central registry for tournament schema implementations
// Manages both GameCreators and ParticipantDistributors for each schema type

import { GameCreatorFactory } from '../gameCreators/GameCreatorFactory.js';
import { ParticipantDistributorFactory } from '../participantDistributors/ParticipantDistributorFactory.js';

// Import all schema implementations
import { DoubleEliminationGameCreator } from '../gameCreators/DoubleEliminationGameCreator.js';
import { OlympicGameCreator } from '../gameCreators/OlympicGameCreator.js';
import { DoubleEliminationParticipantDistributor } from '../participantDistributors/DoubleEliminationParticipantDistributor.js';
import { OlympicParticipantDistributor } from '../participantDistributors/OlympicParticipantDistributor.js';

export class TournamentSchemaRegistry {
  static schemaRegistry = new Map();
  
  // Initialize with built-in schemas
  static {
    this.registerSchema('Double Elimination', {
      gameCreator: DoubleEliminationGameCreator,
      participantDistributor: DoubleEliminationParticipantDistributor,
      description: 'Tournament with upper and lower brackets, players can lose twice before elimination'
    });

    this.registerSchema('Олимпийская', {
      gameCreator: OlympicGameCreator,
      participantDistributor: OlympicParticipantDistributor,
      description: 'Single elimination tournament, players are eliminated after first loss'
    });

    this.registerSchema('Olympic', {
      gameCreator: OlympicGameCreator,
      participantDistributor: OlympicParticipantDistributor,
      description: 'Single elimination tournament, players are eliminated after first loss'
    });
  }

  // Register a complete tournament schema with both game creator and participant distributor
  static registerSchema(schemaName, schemaImplementation) {
    const { gameCreator, participantDistributor, description } = schemaImplementation;
    
    if (!gameCreator || !participantDistributor) {
      throw new Error(`Schema '${schemaName}' must provide both gameCreator and participantDistributor`);
    }

    console.log(`[TournamentSchemaRegistry] Registering schema: ${schemaName}`);
    
    // Store schema information
    this.schemaRegistry.set(schemaName, {
      gameCreator,
      participantDistributor,
      description: description || `Tournament schema: ${schemaName}`
    });

    // Register with individual factories
    GameCreatorFactory.register(schemaName, gameCreator);
    ParticipantDistributorFactory.register(schemaName, participantDistributor);
  }

  // Unregister a schema (removes from all factories)
  static unregisterSchema(schemaName) {
    console.log(`[TournamentSchemaRegistry] Unregistering schema: ${schemaName}`);
    
    this.schemaRegistry.delete(schemaName);
    GameCreatorFactory.unregister(schemaName);
    ParticipantDistributorFactory.unregister(schemaName);
  }

  // Get all registered schemas
  static getAllSchemas() {
    return Array.from(this.schemaRegistry.keys());
  }

  // Check if schema is registered
  static isSchemaRegistered(schemaName) {
    return this.schemaRegistry.has(schemaName);
  }

  // Get schema information
  static getSchemaInfo(schemaName) {
    return this.schemaRegistry.get(schemaName);
  }

  // Get all schema information
  static getAllSchemaInfo() {
    const schemas = {};
    for (const [name, info] of this.schemaRegistry) {
      schemas[name] = {
        description: info.description,
        hasGameCreator: !!info.gameCreator,
        hasParticipantDistributor: !!info.participantDistributor
      };
    }
    return schemas;
  }

  // Create game creator for a tournament
  static createGameCreator(tournament) {
    return GameCreatorFactory.createGameCreator(tournament);
  }

  // Create participant distributor for a tournament
  static createParticipantDistributor(tournament) {
    return ParticipantDistributorFactory.createParticipantDistributor(tournament);
  }

  // Validate that a tournament schema is properly implemented
  static validateSchema(schemaName) {
    const schemaInfo = this.getSchemaInfo(schemaName);
    if (!schemaInfo) {
      return { valid: false, error: `Schema '${schemaName}' not found` };
    }

    const gameCreatorSupported = GameCreatorFactory.isSchemaSupported(schemaName);
    const participantDistributorSupported = ParticipantDistributorFactory.isSchemaSupported(schemaName);

    if (!gameCreatorSupported) {
      return { valid: false, error: `Game creator not registered for schema '${schemaName}'` };
    }

    if (!participantDistributorSupported) {
      return { valid: false, error: `Participant distributor not registered for schema '${schemaName}'` };
    }

    return { valid: true };
  }

  // Get registry for debugging
  static getRegistry() {
    return new Map(this.schemaRegistry);
  }
}

// Convenience functions
export const registerTournamentSchema = (schemaName, implementation) => {
  return TournamentSchemaRegistry.registerSchema(schemaName, implementation);
};

export const isSchemaSupported = (schemaName) => {
  return TournamentSchemaRegistry.isSchemaRegistered(schemaName);
};

export const getSupportedSchemas = () => {
  return TournamentSchemaRegistry.getAllSchemas();
};