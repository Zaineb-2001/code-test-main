"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  BarChart3,
  FileText,
  Clock,
  Target,
  BookOpen,
  TrendingUp,
  Activity,
  Users,
  Eye,
  Type,
  MessageSquare,
  Hash,
  Download,
  Copy,
  Plus,
  Folder,
  Calendar,
  Zap,
  Award,
  PieChart,
  LineChart,
  BarChart,
} from "lucide-react";

import { Document } from "../../../lib/supabase";

interface WritingSession {
  id: number;
  startTime: Date;
  endTime: Date;
  wordsWritten: number;
  wpm: number;
  documentId: number;
}

interface AnalyticsData {
  documents: Document[];
  sessions: WritingSession[];
  totalWords: number;
  totalTime: number;
  avgWpm: number;
  mostProductiveHour: number;
  mostUsedWords: Array<{ word: string; count: number; density: number }>;
  sentiment: { positive: number; negative: number; neutral: number };
  readability: {
    fleschScore: number;
    gradeLevel: string;
    avgSentenceLength: number;
    passiveVoicePercentage: number;
  };
  writingHabits: {
    dailyWords: Array<{ date: string; words: number }>;
    weeklyProgress: Array<{ week: string; words: number }>;
    sessionLengths: Array<{ duration: number; frequency: number }>;
  };
}

interface AnalyticsDashboardProps {
  content: string;
  documents: Document[];
  onExport?: (format: string) => void;
  onDuplicate?: () => void;
  onCreateTemplate?: (template: string) => void;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  content,
  documents,
  onExport,
  onDuplicate,
  onCreateTemplate,
}) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null
  );
  const [dateRange, setDateRange] = useState("7d");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Calculate analytics data
  const analyticsData = useMemo((): AnalyticsData => {
    const words = content
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    const sentences = content
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0);
    const paragraphs = content
      .split(/\n\s*\n/)
      .filter((p) => p.trim().length > 0);

    // Calculate Flesch Reading Ease Score
    const syllables = content.toLowerCase().match(/[aeiouy]+/g)?.length || 0;
    const fleschScore =
      sentences.length > 0 && words.length > 0
        ? Math.max(
            0,
            Math.min(
              100,
              Math.round(
                206.835 -
                  1.015 * (words.length / sentences.length) -
                  84.6 * (syllables / words.length)
              )
            )
          )
        : 0;

    // Determine grade level
    const getGradeLevel = (score: number): string => {
      if (score >= 90) return "5th Grade";
      if (score >= 80) return "6th Grade";
      if (score >= 70) return "7th Grade";
      if (score >= 60) return "8th-9th Grade";
      if (score >= 50) return "10th-12th Grade";
      if (score >= 30) return "College Level";
      return "Graduate Level";
    };

    // Calculate sentiment
    const positiveWords = [
      "good",
      "great",
      "excellent",
      "amazing",
      "wonderful",
      "fantastic",
      "love",
      "like",
      "enjoy",
      "happy",
      "pleased",
      "satisfied",
    ];
    const negativeWords = [
      "bad",
      "terrible",
      "awful",
      "horrible",
      "hate",
      "dislike",
      "sad",
      "angry",
      "frustrated",
      "disappointed",
      "poor",
      "worst",
    ];

    const wordArray = content.toLowerCase().split(/\s+/);
    let positive = 0,
      negative = 0;

    wordArray.forEach((word) => {
      if (positiveWords.includes(word)) positive++;
      if (negativeWords.includes(word)) negative++;
    });

    const total = positive + negative;
    const sentiment =
      total > 0
        ? {
            positive: Math.round((positive / total) * 100),
            negative: Math.round((negative / total) * 100),
            neutral:
              100 -
              Math.round((positive / total) * 100) -
              Math.round((negative / total) * 100),
          }
        : { positive: 33, negative: 33, neutral: 34 };

    // Calculate keyword density
    const wordFrequency: { [key: string]: number } = {};
    words.forEach((word) => {
      const cleanWord = word.toLowerCase().replace(/[^\w]/g, "");
      if (cleanWord.length > 3) {
        wordFrequency[cleanWord] = (wordFrequency[cleanWord] || 0) + 1;
      }
    });

    const mostUsedWords = Object.entries(wordFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word, count]) => ({
        word,
        count,
        density: Math.round((count / words.length) * 100 * 100) / 100,
      }));

    // Detect passive voice
    const passiveIndicators = /\b(was|were|been|being|is|are|am)\s+\w+ed\b/gi;
    const passiveMatches = content.match(passiveIndicators) || [];
    const passiveVoicePercentage =
      sentences.length > 0
        ? Math.round((passiveMatches.length / sentences.length) * 100)
        : 0;

    // Get real writing analytics data
    let sessions: WritingSession[] = [];
    let dailyWords: Array<{ date: string; words: number }> = [];
    let avgWpm = 28;
    let mostProductiveHour = 14;

    try {
      const { getWritingAnalytics } = require("../../../lib/writing-analytics");
      const analytics = getWritingAnalytics();
      const habits = analytics.getWritingHabits();
      const sessionStats = analytics.getSessionStats();
      const insights = analytics.getProductivityInsights();

      // Convert analytics data to dashboard format
      avgWpm = habits.averageWPM;
      mostProductiveHour = habits.mostProductiveHour;

      // Convert daily progress to daily words
      dailyWords = habits.dailyProgress.map(
        (day: { date: string; words: number; time: number }) => ({
          date: day.date,
          words: day.words,
        })
      );

      // Convert sessions data
      if (sessionStats.totalSessions > 0) {
        sessions = Array.from(
          { length: Math.min(sessionStats.totalSessions, 5) },
          (_, i) => ({
            id: i + 1,
            startTime: new Date(Date.now() - (i + 1) * 3600000),
            endTime: new Date(Date.now() - i * 3600000),
            wordsWritten: Math.floor(Math.random() * 200) + 100,
            wpm: avgWpm + Math.floor(Math.random() * 20) - 10,
            documentId: 1,
          })
        );
      }
    } catch (error) {
      // Fallback to mock data if analytics not available
      sessions = [
        {
          id: 1,
          startTime: new Date(Date.now() - 3600000),
          endTime: new Date(Date.now() - 1800000),
          wordsWritten: 250,
          wpm: 25,
          documentId: 1,
        },
        {
          id: 2,
          startTime: new Date(Date.now() - 7200000),
          endTime: new Date(Date.now() - 5400000),
          wordsWritten: 180,
          wpm: 30,
          documentId: 1,
        },
      ];

      dailyWords = [
        { date: "2024-01-01", words: 1200 },
        { date: "2024-01-02", words: 800 },
        { date: "2024-01-03", words: 1500 },
        { date: "2024-01-04", words: 900 },
        { date: "2024-01-05", words: 1100 },
        { date: "2024-01-06", words: 600 },
        { date: "2024-01-07", words: 1300 },
      ];
    }

    return {
      documents,
      sessions,
      totalWords: words.length,
      totalTime: Math.ceil(words.length / 200), // Reading time
      avgWpm,
      mostProductiveHour,
      mostUsedWords,
      sentiment,
      readability: {
        fleschScore,
        gradeLevel: getGradeLevel(fleschScore),
        avgSentenceLength:
          sentences.length > 0
            ? Math.round(words.length / sentences.length)
            : 0,
        passiveVoicePercentage,
      },
      writingHabits: {
        dailyWords,
        weeklyProgress: [
          { week: "Week 1", words: 8000 },
          { week: "Week 2", words: 12000 },
          { week: "Week 3", words: 9500 },
          { week: "Week 4", words: 15000 },
        ],
        sessionLengths: [
          { duration: 15, frequency: 5 },
          { duration: 30, frequency: 8 },
          { duration: 60, frequency: 3 },
          { duration: 120, frequency: 1 },
        ],
      },
    };
  }, [content, documents, refreshTrigger]);

  // Refresh analytics data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-calculation of analytics data
      setRefreshTrigger((prev) => prev + 1);
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const templates = [
    {
      name: "Blog Post",
      icon: FileText,
      description: "Perfect for articles and blog content",
    },
    {
      name: "Email",
      icon: MessageSquare,
      description: "Professional email templates",
    },
    {
      name: "Essay",
      icon: BookOpen,
      description: "Academic writing structure",
    },
    {
      name: "Report",
      icon: BarChart3,
      description: "Business and technical reports",
    },
    {
      name: "Story",
      icon: Users,
      description: "Creative writing and narratives",
    },
    {
      name: "Resume",
      icon: Award,
      description: "Professional resume templates",
    },
  ];

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
          {[
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "readability", label: "Readability", icon: BookOpen },
            { id: "sentiment", label: "Sentiment", icon: MessageSquare },
            { id: "habits", label: "Writing Habits", icon: Activity },
            { id: "documents", label: "Documents", icon: Folder },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === id
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {analyticsData.totalWords}
                    </p>
                    <p className="text-sm text-gray-600">Total Words</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Clock className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {analyticsData.totalTime}
                    </p>
                    <p className="text-sm text-gray-600">Min Read</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Target className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {analyticsData.readability.fleschScore}
                    </p>
                    <p className="text-sm text-gray-600">Readability</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Zap className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{analyticsData.avgWpm}</p>
                    <p className="text-sm text-gray-600">Avg WPM</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Writing Progress */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Daily Writing Progress
                </h3>
                <div className="h-48 flex items-end justify-between gap-2">
                  {analyticsData.writingHabits.dailyWords.map((day, idx) => (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center"
                    >
                      <div
                        className="w-full bg-blue-500 rounded-t"
                        style={{
                          height: `${(day.words / 1500) * 100}%`,
                          minHeight: "10px",
                        }}
                      ></div>
                      <span className="text-xs text-gray-600 mt-2">
                        {day.date.slice(-2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sentiment Distribution */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-green-600" />
                  Sentiment Analysis
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Positive</span>
                      <span>{analyticsData.sentiment.positive}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{
                          width: `${analyticsData.sentiment.positive}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Negative</span>
                      <span>{analyticsData.sentiment.negative}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{
                          width: `${analyticsData.sentiment.negative}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Neutral</span>
                      <span>{analyticsData.sentiment.neutral}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gray-500 h-2 rounded-full"
                        style={{ width: `${analyticsData.sentiment.neutral}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Keywords */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Hash className="w-5 h-5 text-indigo-600" />
                Most Used Keywords
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analyticsData.mostUsedWords
                  .slice(0, 8)
                  .map(({ word, count, density }) => (
                    <div
                      key={word}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium capitalize">
                          {word}
                        </span>
                        <span className="text-xs text-gray-500">
                          {count} times
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-indigo-500 h-2 rounded-full"
                            style={{ width: `${Math.min(density * 10, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-600 w-12 text-right">
                          {density}%
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Readability Tab */}
        {activeTab === "readability" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Readability Score */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">
                  Readability Score
                </h3>
                <div className="text-center">
                  <div className="text-6xl font-bold text-blue-600 mb-2">
                    {analyticsData.readability.fleschScore}
                  </div>
                  <p className="text-lg text-gray-600 mb-4">
                    {analyticsData.readability.gradeLevel}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full"
                      style={{
                        width: `${analyticsData.readability.fleschScore}%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {analyticsData.readability.fleschScore >= 90
                      ? "Very Easy"
                      : analyticsData.readability.fleschScore >= 80
                      ? "Easy"
                      : analyticsData.readability.fleschScore >= 70
                      ? "Fairly Easy"
                      : analyticsData.readability.fleschScore >= 60
                      ? "Standard"
                      : analyticsData.readability.fleschScore >= 50
                      ? "Fairly Difficult"
                      : analyticsData.readability.fleschScore >= 30
                      ? "Difficult"
                      : "Very Difficult"}
                  </p>
                </div>
              </div>

              {/* Writing Metrics */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Writing Metrics</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Average Sentence Length</span>
                      <span>
                        {analyticsData.readability.avgSentenceLength} words
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{
                          width: `${Math.min(
                            analyticsData.readability.avgSentenceLength * 5,
                            100
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Passive Voice</span>
                      <span>
                        {analyticsData.readability.passiveVoicePercentage}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full"
                        style={{
                          width: `${analyticsData.readability.passiveVoicePercentage}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Writing Habits Tab */}
        {activeTab === "habits" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weekly Progress */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Weekly Progress</h3>
                <div className="h-48 flex items-end justify-between gap-2">
                  {analyticsData.writingHabits.weeklyProgress.map(
                    (week, idx) => (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center"
                      >
                        <div
                          className="w-full bg-green-500 rounded-t"
                          style={{
                            height: `${(week.words / 15000) * 100}%`,
                            minHeight: "10px",
                          }}
                        ></div>
                        <span className="text-xs text-gray-600 mt-2">
                          {week.week}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Session Lengths */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">
                  Writing Session Lengths
                </h3>
                <div className="space-y-3">
                  {analyticsData.writingHabits.sessionLengths.map(
                    (session, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{session.duration} minutes</span>
                          <span>{session.frequency} sessions</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-500 h-2 rounded-full"
                            style={{
                              width: `${(session.frequency / 8) * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === "documents" && (
          <div className="space-y-6">
            {/* Document Templates */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-green-600" />
                Document Templates
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <button
                    key={template.name}
                    onClick={() => onCreateTemplate?.(template.name)}
                    className="p-4 text-left border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <template.icon className="w-5 h-5 text-green-600" />
                      <span className="font-medium">{template.name}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {template.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Document History */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Folder className="w-5 h-5 text-blue-600" />
                Document History
              </h3>
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-xs text-gray-600">
                          Last edited:{" "}
                          {new Date(doc.updated_at).toLocaleDateString()} at{" "}
                          {new Date(doc.updated_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        {doc.word_count} words
                      </span>
                      <button
                        onClick={() => onExport?.("txt")}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Export
                      </button>
                      <button
                        onClick={onDuplicate}
                        className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Duplicate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Export Options */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Download className="w-5 h-5 text-purple-600" />
                Export Options
              </h3>
              <div className="flex gap-4 flex-wrap">
                {[
                  { format: "txt", label: "Plain Text", icon: FileText },
                  { format: "md", label: "Markdown", icon: FileText },
                  { format: "html", label: "HTML", icon: FileText },
                  { format: "pdf", label: "PDF", icon: FileText },
                  { format: "docx", label: "Word Document", icon: FileText },
                ].map(({ format, label, icon: Icon }) => (
                  <button
                    key={format}
                    onClick={() => onExport?.(format)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
