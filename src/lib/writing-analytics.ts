interface WritingSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in milliseconds
  wordCount: number;
  characterCount: number;
  wpm: number;
  accuracy: number;
  pauses: number;
  revisions: number;
  keystrokes: number;
}

interface WritingHabits {
  averageWPM: number;
  totalWritingTime: number;
  totalWords: number;
  mostProductiveHour: number;
  averageSessionLength: number;
  revisionFrequency: number;
  pauseFrequency: number;
  typingAccuracy: number;
  dailyProgress: Array<{ date: string; words: number; time: number }>;
  hourlyProductivity: Array<{ hour: number; words: number; sessions: number }>;
}

interface KeystrokeData {
  timestamp: number;
  key: string;
  wordCount: number;
  characterCount: number;
  isBackspace: boolean;
  isEnter: boolean;
}

class WritingAnalytics {
  private currentSession: WritingSession | null = null;
  private keystrokes: KeystrokeData[] = [];
  private sessions: WritingSession[] = [];
  private isWriting: boolean = false;
  private lastKeystrokeTime: number = 0;
  private pauseThreshold: number = 2000; // 2 seconds
  private revisionThreshold: number = 1000; // 1 second
  private wpmWindow: number = 60000; // 1 minute window for WPM calculation

  constructor() {
    this.loadSessions();
  }

  // Start a new writing session
  startSession(): void {
    this.currentSession = {
      id: `session_${Date.now()}`,
      startTime: new Date(),
      duration: 0,
      wordCount: 0,
      characterCount: 0,
      wpm: 0,
      accuracy: 100,
      pauses: 0,
      revisions: 0,
      keystrokes: 0
    };
    this.isWriting = true;
    this.lastKeystrokeTime = Date.now();
  }

  // End current session
  endSession(): WritingSession | null {
    if (!this.currentSession) return null;

    this.currentSession.endTime = new Date();
    this.currentSession.duration = this.currentSession.endTime.getTime() - this.currentSession.startTime.getTime();
    
    // Calculate final metrics
    this.calculateSessionMetrics(this.currentSession);
    
    // Save session
    this.sessions.push(this.currentSession);
    this.saveSessions();
    
    const session = this.currentSession;
    this.currentSession = null;
    this.isWriting = false;
    this.keystrokes = [];
    
    return session;
  }

  // Record a keystroke
  recordKeystroke(key: string, currentWordCount: number, currentCharacterCount: number): void {
    if (!this.currentSession) return;

    const now = Date.now();
    const timeSinceLastKeystroke = now - this.lastKeystrokeTime;

    // Check for pauses
    if (timeSinceLastKeystroke > this.pauseThreshold) {
      this.currentSession.pauses++;
    }

    // Check for revisions (backspace/delete)
    const isBackspace = key === 'Backspace' || key === 'Delete';
    if (isBackspace) {
      this.currentSession.revisions++;
    }

    // Record keystroke
    const keystrokeData: KeystrokeData = {
      timestamp: now,
      key,
      wordCount: currentWordCount,
      characterCount: currentCharacterCount,
      isBackspace,
      isEnter: key === 'Enter'
    };

    this.keystrokes.push(keystrokeData);
    this.currentSession.keystrokes++;
    this.currentSession.wordCount = currentWordCount;
    this.currentSession.characterCount = currentCharacterCount;
    this.lastKeystrokeTime = now;

    // Update real-time metrics
    this.updateRealTimeMetrics();
  }

  // Calculate real-time WPM
  private updateRealTimeMetrics(): void {
    if (!this.currentSession) return;

    const now = Date.now();
    const windowStart = now - this.wpmWindow;
    
    // Get keystrokes in the last minute
    const recentKeystrokes = this.keystrokes.filter(k => k.timestamp >= windowStart);
    
    if (recentKeystrokes.length > 0) {
      const firstKeystroke = recentKeystrokes[0];
      const lastKeystroke = recentKeystrokes[recentKeystrokes.length - 1];
      const timeSpan = lastKeystroke.timestamp - firstKeystroke.timestamp;
      
      if (timeSpan > 0) {
        const wordDifference = lastKeystroke.wordCount - firstKeystroke.wordCount;
        const minutes = timeSpan / 60000;
        this.currentSession.wpm = Math.round(wordDifference / minutes);
      }
    }

    // Calculate accuracy
    const totalKeystrokes = this.currentSession.keystrokes;
    const revisions = this.currentSession.revisions;
    this.currentSession.accuracy = totalKeystrokes > 0 ? Math.round(((totalKeystrokes - revisions) / totalKeystrokes) * 100) : 100;
  }

  // Calculate comprehensive session metrics
  private calculateSessionMetrics(session: WritingSession): void {
    if (this.keystrokes.length === 0) return;

    // Calculate WPM over entire session
    const sessionDuration = session.duration / 60000; // in minutes
    if (sessionDuration > 0) {
      session.wpm = Math.round(session.wordCount / sessionDuration);
    }

    // Calculate accuracy
    session.accuracy = session.keystrokes > 0 ? Math.round(((session.keystrokes - session.revisions) / session.keystrokes) * 100) : 100;
  }

  // Get current session metrics
  getCurrentSessionMetrics(): Partial<WritingSession> | null {
    if (!this.currentSession) return null;

    this.updateRealTimeMetrics();
    return {
      wordCount: this.currentSession.wordCount,
      characterCount: this.currentSession.characterCount,
      wpm: this.currentSession.wpm,
      accuracy: this.currentSession.accuracy,
      pauses: this.currentSession.pauses,
      revisions: this.currentSession.revisions,
      keystrokes: this.currentSession.keystrokes,
      duration: Date.now() - this.currentSession.startTime.getTime()
    };
  }

  // Get comprehensive writing habits analysis
  getWritingHabits(): WritingHabits {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Filter recent sessions
    const recentSessions = this.sessions.filter(s => 
      s.startTime >= thirtyDaysAgo
    );

    if (recentSessions.length === 0) {
      return this.getDefaultHabits();
    }

    // Calculate average WPM
    const totalWPM = recentSessions.reduce((sum, session) => sum + session.wpm, 0);
    const averageWPM = Math.round(totalWPM / recentSessions.length);

    // Calculate total writing time
    const totalWritingTime = recentSessions.reduce((sum, session) => sum + session.duration, 0);

    // Calculate total words
    const totalWords = recentSessions.reduce((sum, session) => sum + session.wordCount, 0);

    // Calculate average session length
    const averageSessionLength = Math.round(totalWritingTime / recentSessions.length);

    // Calculate revision frequency
    const totalRevisions = recentSessions.reduce((sum, session) => sum + session.revisions, 0);
    const totalKeystrokes = recentSessions.reduce((sum, session) => sum + session.keystrokes, 0);
    const revisionFrequency = totalKeystrokes > 0 ? Math.round((totalRevisions / totalKeystrokes) * 100) : 0;

    // Calculate pause frequency
    const totalPauses = recentSessions.reduce((sum, session) => sum + session.pauses, 0);
    const pauseFrequency = recentSessions.length > 0 ? Math.round(totalPauses / recentSessions.length) : 0;

    // Calculate typing accuracy
    const totalAccuracy = recentSessions.reduce((sum, session) => sum + session.accuracy, 0);
    const typingAccuracy = Math.round(totalAccuracy / recentSessions.length);

    // Calculate most productive hour
    const hourlyStats = this.calculateHourlyProductivity(recentSessions);
    const mostProductiveHour = hourlyStats.reduce((max, stat) => 
      stat.words > max.words ? stat : max
    ).hour;

    // Calculate daily progress
    const dailyProgress = this.calculateDailyProgress(recentSessions);

    return {
      averageWPM,
      totalWritingTime,
      totalWords,
      mostProductiveHour,
      averageSessionLength,
      revisionFrequency,
      pauseFrequency,
      typingAccuracy,
      dailyProgress,
      hourlyProductivity: hourlyStats
    };
  }

  // Calculate hourly productivity
  private calculateHourlyProductivity(sessions: WritingSession[]): Array<{ hour: number; words: number; sessions: number }> {
    const hourlyStats = new Array(24).fill(0).map((_, hour) => ({
      hour,
      words: 0,
      sessions: 0
    }));

    sessions.forEach(session => {
      const hour = session.startTime.getHours();
      hourlyStats[hour].words += session.wordCount;
      hourlyStats[hour].sessions += 1;
    });

    return hourlyStats;
  }

  // Calculate daily progress
  private calculateDailyProgress(sessions: WritingSession[]): Array<{ date: string; words: number; time: number }> {
    const dailyStats = new Map<string, { words: number; time: number }>();
    
    sessions.forEach(session => {
      const date = session.startTime.toISOString().split('T')[0];
      const existing = dailyStats.get(date) || { words: 0, time: 0 };
      dailyStats.set(date, {
        words: existing.words + session.wordCount,
        time: existing.time + session.duration
      });
    });

    // Convert to array and sort by date
    return Array.from(dailyStats.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // Get default habits when no data exists
  private getDefaultHabits(): WritingHabits {
    return {
      averageWPM: 0,
      totalWritingTime: 0,
      totalWords: 0,
      mostProductiveHour: 9,
      averageSessionLength: 0,
      revisionFrequency: 0,
      pauseFrequency: 0,
      typingAccuracy: 100,
      dailyProgress: [],
      hourlyProductivity: Array(24).fill(0).map((_, hour) => ({ hour, words: 0, sessions: 0 }))
    };
  }

  // Get productivity insights
  getProductivityInsights(): Array<{ type: string; message: string; value: number; unit: string }> {
    const habits = this.getWritingHabits();
    const insights = [];

    // WPM insights
    if (habits.averageWPM > 0) {
      if (habits.averageWPM < 20) {
        insights.push({
          type: 'wpm',
          message: 'Your typing speed is below average. Consider practicing to improve.',
          value: habits.averageWPM,
          unit: 'WPM'
        });
      } else if (habits.averageWPM > 60) {
        insights.push({
          type: 'wpm',
          message: 'Excellent typing speed! You\'re in the top percentile.',
          value: habits.averageWPM,
          unit: 'WPM'
        });
      }
    }

    // Session length insights
    if (habits.averageSessionLength > 0) {
      const sessionMinutes = Math.round(habits.averageSessionLength / 60000);
      if (sessionMinutes < 15) {
        insights.push({
          type: 'session',
          message: 'Short writing sessions. Try longer focused sessions for better productivity.',
          value: sessionMinutes,
          unit: 'minutes'
        });
      } else if (sessionMinutes > 60) {
        insights.push({
          type: 'session',
          message: 'Long writing sessions detected. Remember to take breaks!',
          value: sessionMinutes,
          unit: 'minutes'
        });
      }
    }

    // Revision insights
    if (habits.revisionFrequency > 15) {
      insights.push({
        type: 'revision',
        message: 'High revision rate. Consider planning before writing.',
        value: habits.revisionFrequency,
        unit: '%'
      });
    }

    // Productivity hour insights
    if (habits.mostProductiveHour >= 0) {
      const hourName = this.getHourName(habits.mostProductiveHour);
      insights.push({
        type: 'productivity',
        message: `You're most productive at ${hourName}. Schedule important writing tasks then.`,
        value: habits.mostProductiveHour,
        unit: 'hour'
      });
    }

    return insights;
  }

  // Get hour name
  private getHourName(hour: number): string {
    if (hour === 0) return 'midnight';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return 'noon';
    return `${hour - 12} PM`;
  }

  // Save sessions to localStorage
  private saveSessions(): void {
    try {
      localStorage.setItem('writing_sessions', JSON.stringify(this.sessions));
    } catch (error) {
      console.warn('Failed to save writing sessions:', error);
    }
  }

  // Load sessions from localStorage
  private loadSessions(): void {
    try {
      const saved = localStorage.getItem('writing_sessions');
      if (saved) {
        this.sessions = JSON.parse(saved).map((session: any) => ({
          ...session,
          startTime: new Date(session.startTime),
          endTime: session.endTime ? new Date(session.endTime) : undefined
        }));
      }
    } catch (error) {
      console.warn('Failed to load writing sessions:', error);
      this.sessions = [];
    }
  }

  // Clear all data
  clearData(): void {
    this.sessions = [];
    this.keystrokes = [];
    this.currentSession = null;
    this.isWriting = false;
    localStorage.removeItem('writing_sessions');
  }

  // Get session statistics
  getSessionStats(): {
    totalSessions: number;
    totalWords: number;
    totalTime: number;
    averageWPM: number;
    bestWPM: number;
    longestSession: number;
  } {
    if (this.sessions.length === 0) {
      return {
        totalSessions: 0,
        totalWords: 0,
        totalTime: 0,
        averageWPM: 0,
        bestWPM: 0,
        longestSession: 0
      };
    }

    const totalWords = this.sessions.reduce((sum, session) => sum + session.wordCount, 0);
    const totalTime = this.sessions.reduce((sum, session) => sum + session.duration, 0);
    const averageWPM = Math.round(this.sessions.reduce((sum, session) => sum + session.wpm, 0) / this.sessions.length);
    const bestWPM = Math.max(...this.sessions.map(session => session.wpm));
    const longestSession = Math.max(...this.sessions.map(session => session.duration));

    return {
      totalSessions: this.sessions.length,
      totalWords,
      totalTime,
      averageWPM,
      bestWPM,
      longestSession
    };
  }
}

// Create singleton instance
let writingAnalytics: WritingAnalytics | null = null;

export const initializeWritingAnalytics = (): WritingAnalytics => {
  if (!writingAnalytics) {
    writingAnalytics = new WritingAnalytics();
  }
  return writingAnalytics;
};

export const getWritingAnalytics = (): WritingAnalytics => {
  if (!writingAnalytics) {
    throw new Error('Writing analytics not initialized. Call initializeWritingAnalytics first.');
  }
  return writingAnalytics;
};

export type { WritingSession, WritingHabits, KeystrokeData };
export default WritingAnalytics; 