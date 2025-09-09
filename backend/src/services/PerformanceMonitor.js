const fs = require('fs').promises;
const path = require('path');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      examSessions: 0,
      activeUsers: new Set(),
      databaseQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      slowQueries: []
    };
    
    this.logFile = path.join(__dirname, '../../logs/performance.log');
  }

  // Track exam sessions
  trackExamStart(userId, examId) {
    this.metrics.examSessions++;
    this.metrics.activeUsers.add(userId);
    this.log('EXAM_START', { userId, examId, timestamp: new Date() });
  }

  trackExamEnd(userId, examId, duration) {
    this.metrics.activeUsers.delete(userId);
    this.log('EXAM_END', { userId, examId, duration, timestamp: new Date() });
  }

  // Track database performance
  trackQuery(query, duration) {
    this.metrics.databaseQueries++;
    
    if (duration > 1000) { // Slow query > 1s
      this.metrics.slowQueries.push({
        query: query.substring(0, 100) + '...',
        duration,
        timestamp: new Date()
      });
      
      // Keep only last 100 slow queries
      if (this.metrics.slowQueries.length > 100) {
        this.metrics.slowQueries = this.metrics.slowQueries.slice(-100);
      }
    }
  }

  // Track cache performance
  trackCacheHit() {
    this.metrics.cacheHits++;
  }

  trackCacheMiss() {
    this.metrics.cacheMisses++;
  }

  // Get current metrics
  getMetrics() {
    return {
      ...this.metrics,
      activeUsers: this.metrics.activeUsers.size,
      cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) || 0
    };
  }

  // Log to file
  async log(event, data) {
    try {
      const logEntry = {
        event,
        data,
        timestamp: new Date().toISOString()
      };
      
      await fs.appendFile(this.logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('Performance log error:', error);
    }
  }

  // Reset metrics (call hourly/daily)
  resetMetrics() {
    this.metrics = {
      examSessions: 0,
      activeUsers: new Set(),
      databaseQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      slowQueries: []
    };
  }

  // Generate performance report
  async generateReport() {
    const metrics = this.getMetrics();
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalExamSessions: metrics.examSessions,
        currentActiveUsers: metrics.activeUsers,
        totalDatabaseQueries: metrics.databaseQueries,
        cacheHitRate: `${(metrics.cacheHitRate * 100).toFixed(2)}%`,
        slowQueriesCount: metrics.slowQueries.length
      },
      slowQueries: metrics.slowQueries,
      recommendations: this.generateRecommendations(metrics)
    };

    return report;
  }

  generateRecommendations(metrics) {
    const recommendations = [];

    if (metrics.cacheHitRate < 0.8) {
      recommendations.push('Cache hit rate is low. Consider caching more frequently accessed data.');
    }

    if (metrics.slowQueries.length > 10) {
      recommendations.push('High number of slow queries detected. Review database indexes and query optimization.');
    }

    if (metrics.activeUsers > 100) {
      recommendations.push('High concurrent users. Consider implementing queue system for exam starts.');
    }

    return recommendations;
  }
}

module.exports = new PerformanceMonitor();
