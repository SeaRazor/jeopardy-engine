// Stage Completion Detection System
// Monitors stage completion and triggers automatic progression

import { createReferenceResolver } from './referenceResolver.js';

export class StageMonitor {
  constructor(tournamentId) {
    this.tournamentId = tournamentId;
    this.resolver = createReferenceResolver(tournamentId);
    this.completionCallbacks = new Map();
  }

  // Register callback for stage completion events
  onStageComplete(stageId, callback) {
    if (!this.completionCallbacks.has(stageId)) {
      this.completionCallbacks.set(stageId, []);
    }
    this.completionCallbacks.get(stageId).push(callback);
  }

  // Remove callback for stage completion events
  offStageComplete(stageId, callback) {
    const callbacks = this.completionCallbacks.get(stageId);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Trigger callbacks for stage completion
  async triggerStageCompletion(stageId) {
    const callbacks = this.completionCallbacks.get(stageId) || [];
    
    for (const callback of callbacks) {
      try {
        await callback(stageId, this.tournamentId);
      } catch (error) {
        console.error(`Error in stage completion callback for stage ${stageId}:`, error);
      }
    }
  }

  // Check if a stage is complete and trigger callbacks if needed
  async checkAndTriggerStageCompletion(stageId) {
    try {
      const isComplete = await this.resolver.isStageReadyForProgression(stageId);
      
      if (isComplete) {
        await this.triggerStageCompletion(stageId);
        
        // Auto-resolve dependent stages if enabled
        const autoResolveResult = await this.resolver.autoResolveOnStageCompletion(stageId);
        
        return {
          completed: true,
          autoResolveResult
        };
      }
      
      return {
        completed: false
      };
    } catch (error) {
      console.error(`Error checking stage ${stageId} completion:`, error);
      return {
        completed: false,
        error: error.message
      };
    }
  }

  // Monitor all stages for completion (polling approach)
  startMonitoring(intervalMs = 10000) { // Default: check every 10 seconds
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkAllStagesForCompletion();
      } catch (error) {
        console.error('Error in stage monitoring:', error);
      }
    }, intervalMs);
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  // Check all stages for completion
  async checkAllStagesForCompletion() {
    try {
      const tournament = await this.resolver.fetchTournament();
      const stages = tournament.schema.stages.sort((a, b) => a.order - b.order);
      
      for (const stage of stages) {
        const result = await this.checkAndTriggerStageCompletion(stage.id);
        
        if (result.completed) {
          console.log(`Stage ${stage.name} (${stage.id}) completed automatically`);
          
          if (result.autoResolveResult?.resolvedCount > 0) {
            console.log(`Auto-resolved ${result.autoResolveResult.resolvedCount} references for dependent stages`);
          }
        }
      }
    } catch (error) {
      console.error('Error checking all stages for completion:', error);
    }
  }

  // Get detailed progression status for UI
  async getDetailedProgressionStatus() {
    try {
      const tournament = await this.resolver.fetchTournament();
      const stages = tournament.schema.stages.sort((a, b) => a.order - b.order);
      
      const stageDetails = [];
      
      for (const stage of stages) {
        const games = await this.resolver.fetchStageGames(stage.id);
        const completedGames = games.filter(game => this.resolver.isGameCompleted(game));
        const pendingReferences = await this.resolver.countPendingReferences(stage);
        const isReady = await this.resolver.isStageReadyForProgression(stage.id);
        
        // Calculate completion percentage
        const completionPercentage = games.length > 0 ? (completedGames.length / games.length) * 100 : 0;
        
        // Analyze game types for Double Elimination
        const gameAnalysis = this.analyzeGames(games, tournament.schema.schemeName);
        
        stageDetails.push({
          stage: {
            id: stage.id,
            name: stage.name,
            order: stage.order,
            isFinal: stage.isFinal || false
          },
          games: {
            total: games.length,
            completed: completedGames.length,
            pending: games.length - completedGames.length,
            ...gameAnalysis
          },
          references: {
            pending: pendingReferences,
            resolved: this.calculateResolvedReferences(games)
          },
          status: {
            isComplete: isReady,
            completionPercentage: Math.round(completionPercentage),
            canProgress: isReady && pendingReferences === 0,
            nextAction: this.getNextActionForStage(stage, isReady, pendingReferences, completedGames.length, games.length)
          }
        });
      }
      
      return {
        success: true,
        tournament: {
          id: tournament.id,
          name: tournament.name,
          scheme: tournament.schema.schemeName
        },
        stages: stageDetails,
        overallComplete: stageDetails.every(s => s.status.canProgress),
        progressionMetadata: tournament.progressionMetadata
      };
    } catch (error) {
      console.error('Error getting detailed progression status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Analyze games by bracket type for Double Elimination
  analyzeGames(games, tournamentScheme) {
    if (tournamentScheme !== 'Double Elimination') {
      return {};
    }
    
    const upperBracket = games.filter(g => g.bracketType === 'upper');
    const lowerBracket = games.filter(g => g.bracketType === 'lower');
    const final = games.filter(g => !g.bracketType); // Final games have no bracket type
    
    return {
      brackets: {
        upper: {
          total: upperBracket.length,
          completed: upperBracket.filter(g => this.resolver.isGameCompleted(g)).length
        },
        lower: {
          total: lowerBracket.length,
          completed: lowerBracket.filter(g => this.resolver.isGameCompleted(g)).length
        },
        final: {
          total: final.length,
          completed: final.filter(g => this.resolver.isGameCompleted(g)).length
        }
      }
    };
  }

  // Calculate resolved references count
  calculateResolvedReferences(games) {
    let resolvedCount = 0;
    
    games.forEach(game => {
      if (game.participants) {
        resolvedCount += game.participants.filter(p => p.resolved || !p.sourceReference).length;
      }
    });
    
    return resolvedCount;
  }

  // Determine next action for a stage
  getNextActionForStage(stage, isComplete, pendingReferences, completedGames, totalGames) {
    if (stage.order === 1) {
      if (completedGames === 0) return 'Добавьте участников и начните игры';
      if (completedGames < totalGames) return 'Завершите оставшиеся игры';
      if (isComplete) return 'Стадия завершена, можно переходить к следующей';
    } else {
      if (pendingReferences > 0) return 'Ожидание завершения предыдущих стадий';
      if (completedGames === 0) return 'Готово к началу - участники будут назначены автоматически';
      if (completedGames < totalGames) return 'Завершите оставшиеся игры';
      if (isComplete) return 'Стадия завершена';
    }
    
    return 'Статус неизвестен';
  }

  // Force resolve all pending references (manual trigger)
  async forceResolveAllReferences() {
    try {
      const result = await this.resolver.resolveAllPendingReferences();
      
      // Trigger completion check after resolving
      setTimeout(() => {
        this.checkAllStagesForCompletion();
      }, 1000);
      
      return result;
    } catch (error) {
      console.error('Error forcing reference resolution:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Factory function
export const createStageMonitor = (tournamentId) => {
  return new StageMonitor(tournamentId);
};

// Global monitor instance for tournaments (singleton per tournament)
const globalMonitors = new Map();

export const getGlobalStageMonitor = (tournamentId) => {
  if (!globalMonitors.has(tournamentId)) {
    globalMonitors.set(tournamentId, createStageMonitor(tournamentId));
  }
  return globalMonitors.get(tournamentId);
};

export const cleanupGlobalMonitor = (tournamentId) => {
  const monitor = globalMonitors.get(tournamentId);
  if (monitor) {
    monitor.stopMonitoring();
    globalMonitors.delete(tournamentId);
  }
};