const redis = require('redis');

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      // Redis v4+ syntax
      this.client = redis.createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379
        },
        password: process.env.REDIS_PASSWORD || undefined,
        database: process.env.REDIS_DB || 0
      });

      this.client.on('error', (error) => {
        console.error('Redis Client Error:', error);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis Client Connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        console.log('Redis Client Ready');
        this.isConnected = true;
      });

      await this.client.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      this.isConnected = false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }

  /**
   * Cache exam session với TTL 2 hours
   */
  async cacheExamSession(sessionId, data) {
    if (!this.isConnected) return false;
    
    try {
      const key = `exam:session:${sessionId}`;
      await this.client.setEx(key, 7200, JSON.stringify(data)); // 2 hours
      return true;
    } catch (error) {
      console.error('Cache exam session error:', error);
      return false;
    }
  }

  async getExamSession(sessionId) {
    if (!this.isConnected) return null;
    
    try {
      const key = `exam:session:${sessionId}`;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Get exam session error:', error);
      return null;
    }
  }

  /**
   * Cache user answers tạm thời
   */
  async cacheUserAnswers(examId, answers) {
    if (!this.isConnected) return false;
    
    try {
      const key = `exam:answers:${examId}`;
      await this.client.setEx(key, 3600, JSON.stringify(answers)); // 1 hour
      return true;
    } catch (error) {
      console.error('Cache user answers error:', error);
      return false;
    }
  }

  async getUserAnswers(examId) {
    if (!this.isConnected) return null;
    
    try {
      const key = `exam:answers:${examId}`;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Get user answers error:', error);
      return null;
    }
  }

  /**
   * Cache user progress để giảm queries nặng
   */
  async cacheUserProgress(userId, progressData) {
    if (!this.isConnected) return false;
    
    try {
      const key = `user:progress:${userId}`;
      const ttl = parseInt(process.env.REDIS_TTL_USER_PROGRESS) || 3600; // 1 hour
      await this.client.setEx(key, ttl, JSON.stringify(progressData));
      return true;
    } catch (error) {
      console.error('Cache user progress error:', error);
      return false;
    }
  }

  async getUserProgress(userId) {
    if (!this.isConnected) return null;
    
    try {
      const key = `user:progress:${userId}`;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Get user progress error:', error);
      return null;
    }
  }

  /**
   * Cache topic metadata
   */
  async cacheTopicMetadata(topicId, metadata) {
    if (!this.isConnected) return false;
    
    try {
      const key = `topic:metadata:${topicId}`;
      const ttl = parseInt(process.env.REDIS_TTL_QUESTION_POOL) || 21600; // 6 hours
      await this.client.setEx(key, ttl, JSON.stringify(metadata));
      return true;
    } catch (error) {
      console.error('Cache topic metadata error:', error);
      return false;
    }
  }

  async getTopicMetadata(topicId) {
    if (!this.isConnected) return null;
    
    try {
      const key = `topic:metadata:${topicId}`;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Get topic metadata error:', error);
      return null;
    }
  }
  async cacheQuestionPool(key, questions) {
    if (!this.isConnected) return false;
    
    try {
      await this.client.setEx(key, 86400, JSON.stringify(questions)); // 24 hours
      return true;
    } catch (error) {
      console.error('Cache question pool error:', error);
      return false;
    }
  }

  async getQuestionPool(key) {
    if (!this.isConnected) return null;
    
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Get question pool error:', error);
      return null;
    }
  }

  /**
   * Invalidate cache khi có update
   */
  async invalidateTopicCache(topicId) {
    if (!this.isConnected) return false;
    
    try {
      const pattern = `topic:*:${topicId}`;
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      console.error('Invalidate topic cache error:', error);
      return false;
    }
  }

  // Invalidate all random question pool variants for a topic (new cache key format topic_questions_<id>_*)
  async invalidateQuestionPools(topicId) {
    if (!this.isConnected) return false;
    try {
      const pattern = `topic_questions_${topicId}_*`;
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      console.error('Invalidate question pools error:', error);
      return false;
    }
  }

  /**
   * OTP storage for password reset (email-based), default TTL 10 minutes
   */
  async setResetOTP(email, code, ttlSeconds = 600) {
    if (!this.isConnected) return false;
    try {
      const key = `pwd:otp:${email}`;
      await this.client.setEx(key, ttlSeconds, code);
      return true;
    } catch (error) {
      console.error('Set Reset OTP error:', error);
      return false;
    }
  }

  async getResetOTP(email) {
    if (!this.isConnected) return null;
    try {
      const key = `pwd:otp:${email}`;
      return await this.client.get(key);
    } catch (error) {
      console.error('Get Reset OTP error:', error);
      return null;
    }
  }

  async deleteResetOTP(email) {
    if (!this.isConnected) return false;
    try {
      const key = `pwd:otp:${email}`;
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Delete Reset OTP error:', error);
      return false;
    }
  }

  /**
   * Rate limit password reset requests per email/IP
   */
  async incrResetRequestCounter(identifier, ttlSeconds = 900) {
    if (!this.isConnected) return 1;
    try {
      const key = `pwd:req:${identifier}`;
      const current = await this.client.incr(key);
      if (current === 1) {
        await this.client.expire(key, ttlSeconds);
      }
      return current;
    } catch (error) {
      console.error('incrResetRequestCounter error:', error);
      return 1;
    }
  }

  async incrOTPVerifyAttempts(email, ttlSeconds = 900) {
    if (!this.isConnected) return 1;
    try {
      const key = `pwd:attempt:${email}`;
      const current = await this.client.incr(key);
      if (current === 1) {
        await this.client.expire(key, ttlSeconds);
      }
      return current;
    } catch (error) {
      console.error('incrOTPVerifyAttempts error:', error);
      return 1;
    }
  }
}

module.exports = new CacheService();
