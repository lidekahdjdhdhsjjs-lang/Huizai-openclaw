const fs = require('fs');
const path = require('path');

class Trigger {
  constructor(config, callback) {
    this.config = config;
    this.callback = callback;
    this.intervals = [];
    this.isRunning = false;
    this.lastTrigger = null;
    this.eventWatchers = {};
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.startScheduleTriggers();
    this.startEventTriggers();
  }

  stop() {
    this.isRunning = false;
    this.intervals.forEach(i => clearInterval(i));
    this.intervals = [];
    Object.values(this.eventWatchers).forEach(w => {
      if (w?.close) w.close();
    });
    this.eventWatchers = {};
  }

  startScheduleTriggers() {
    const schedules = this.config?.triggers?.schedule || {};

    if (schedules.daily) {
      const [hour, minute = 0] = schedules.daily.split(':').map(Number);
      this.scheduleDaily(hour, minute, 'daily');
    }

    if (schedules.weekly) {
      const match = schedules.weekly.match(/(\w+)\s+(\d+):(\d+)/);
      if (match) {
        const [, day, hour, minute] = match;
        this.scheduleWeekly(day, parseInt(hour), parseInt(minute), 'weekly');
      }
    }

    if (schedules.monthly) {
      const match = schedules.monthly.match(/(\d+)(?:st|nd|rd|th)?\s+(\d+):(\d+)/);
      if (match) {
        const [, day, hour, minute] = match;
        this.scheduleMonthly(parseInt(day), parseInt(hour), parseInt(minute), 'monthly');
      }
    }
  }

  scheduleDaily(hour, minute, type) {
    const now = new Date();
    const target = new Date(now);
    target.setHours(hour, minute, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);

    const delay = target - now;
    setTimeout(() => {
      this.triggerCallback(type);
      const interval = setInterval(() => this.triggerCallback(type), 24 * 60 * 60 * 1000);
      this.intervals.push(interval);
    }, delay);
  }

  scheduleWeekly(dayName, hour, minute, type) {
    const days = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
    const targetDay = days[dayName.toLowerCase()];
    
    const check = () => {
      const now = new Date();
      if (now.getDay() === targetDay && now.getHours() === hour && now.getMinutes() === minute) {
        this.triggerCallback(type);
      }
    };

    const interval = setInterval(check, 60000);
    this.intervals.push(interval);
  }

  scheduleMonthly(day, hour, minute, type) {
    const check = () => {
      const now = new Date();
      if (now.getDate() === day && now.getHours() === hour && now.getMinutes() === minute) {
        this.triggerCallback(type);
      }
    };

    const interval = setInterval(check, 60000);
    this.intervals.push(interval);
  }

  startEventTriggers() {
    const events = this.config?.triggers?.events || {};

    if (events.failureRate) {
      this.watchFailureRate(events.failureRate);
    }

    if (events.fitness) {
      this.watchFitness(events.fitness);
    }

    if (events.memory || events.disk) {
      this.watchResources(events);
    }
  }

  watchFailureRate(config) {
    const threshold = config.threshold || 0.20;
    const window = config.window || 300000;
    const failuresPath = path.join(process.env.HOME, '.openclaw', 'foundry', 'failures');

    const check = () => {
      if (!fs.existsSync(failuresPath)) return;

      const files = fs.readdirSync(failuresPath).filter(f => f.endsWith('.json'));
      const now = Date.now();
      let recentFailures = 0;

      files.forEach(f => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(failuresPath, f), 'utf-8'));
          if (data.timestamp && (now - data.timestamp) < window) {
            recentFailures++;
          }
        } catch {}
      });

      const rate = files.length > 0 ? recentFailures / files.length : 0;
      if (rate > threshold) {
        this.triggerCallback('event:failureRate', { rate, threshold });
      }
    };

    const interval = setInterval(check, 60000);
    this.intervals.push(interval);
  }

  watchFitness(config) {
    const threshold = config.threshold || 0.80;
    const fitnessPath = path.join(process.env.HOME, '.openclaw', 'foundry', 'fitness.json');

    const check = () => {
      if (!fs.existsSync(fitnessPath)) return;

      try {
        const data = JSON.parse(fs.readFileSync(fitnessPath, 'utf-8'));
        for (const [tool, stats] of Object.entries(data)) {
          const fitness = stats.successes / (stats.successes + stats.failures) || 0;
          if (fitness < threshold) {
            this.triggerCallback('event:fitness', { tool, fitness, threshold });
            break;
          }
        }
      } catch {}
    };

    const interval = setInterval(check, 300000);
    this.intervals.push(interval);
  }

  watchResources(config) {
    const { execSync } = require('child_process');

    const check = () => {
      try {
        if (config.memory) {
          const freeOut = execSync('free | grep Mem', { encoding: 'utf-8' });
          const match = freeOut.match(/(\d+)\s+(\d+)/);
          if (match) {
            const usage = parseInt(match[2]) / parseInt(match[1]);
            if (usage > config.memory) {
              this.triggerCallback('event:memory', { usage, threshold: config.memory });
            }
          }
        }

        if (config.disk) {
          const dfOut = execSync('df ~/.openclaw 2>/dev/null | tail -1', { encoding: 'utf-8' });
          const match = dfOut.match(/(\d+)%/);
          if (match && parseInt(match[1]) / 100 > config.disk) {
            this.triggerCallback('event:disk', { usage: parseInt(match[1]) / 100, threshold: config.disk });
          }
        }
      } catch {}
    };

    const interval = setInterval(check, 300000);
    this.intervals.push(interval);
  }

  triggerCallback(type, data = {}) {
    if (!this.isRunning) return;

    this.lastTrigger = { type, timestamp: new Date().toISOString(), data };
    this.callback(type, data);
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalsCount: this.intervals.length,
      lastTrigger: this.lastTrigger
    };
  }
}

module.exports = { Trigger };
