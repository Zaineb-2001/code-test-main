"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle,
  AlertCircle,
  Wand2,
  Type,
  Target,
  Lightbulb,
  Sparkles,
  MessageSquare,
  TrendingUp,
  Zap,
  Loader2,
  Copy,
  ArrowRight,
  Star,
  BookOpen,
  PenTool,
  Hash,
  Quote,
} from "lucide-react";
import { getOpenAIService } from "@/lib/openai-service";

interface Suggestion {
  original: string;
  suggestion: string;
  type: "grammar" | "spelling" | "style";
  explanation: string;
  confidence: number;
}

interface ToneAnalysis {
  current: string;
  confidence: number;
  suggestions: string[];
}

interface ContentEnhancement {
  type: "expand" | "condense" | "rephrase" | "improve";
  original: string;
  enhanced: string;
  explanation: string;
}

interface CreativeSuggestion {
  type: "title" | "hook" | "conclusion" | "keyword";
  suggestions: string[];
}

interface AIEnhancementsProps {
  content: string;
  onApplySuggestion?: (original: string, suggestion: string) => void;
  onApplyEnhancement?: (enhanced: string) => void;
  onApplyCreative?: (suggestion: string) => void;
}

const AIEnhancements: React.FC<AIEnhancementsProps> = ({
  content,
  onApplySuggestion,
  onApplyEnhancement,
  onApplyCreative,
}) => {
  const [activeTab, setActiveTab] = useState("grammar");
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [toneAnalysis, setToneAnalysis] = useState<ToneAnalysis | null>(null);
  const [enhancements, setEnhancements] = useState<ContentEnhancement[]>([]);
  const [creativeSuggestions, setCreativeSuggestions] = useState<
    CreativeSuggestion[]
  >([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");

  const service = getOpenAIService();

  // Mock AI processing functions
  const processGrammarCheck = async () => {
    setIsProcessing(true);
    // await new Promise((resolve) => setTimeout(resolve, 2000));

    const response = await service.checkSpellingAndGrammar(content);

    console.log("Grammar Check Response:", response);

    // const mockSuggestions: Suggestion[] = [
    //   {
    //     original: "There is many issues",
    //     suggestion: "There are many issues",
    //     type: "grammar",
    //     explanation:
    //       "Subject-verb agreement error. Use 'are' for plural subjects.",
    //     confidence: 0.95,
    //   },
    //   {
    //     original: "its very important",
    //     suggestion: "it's very important",
    //     type: "spelling",
    //     explanation: "Missing apostrophe in contraction.",
    //     confidence: 0.98,
    //   },
    //   {
    //     original: "The data shows that...",
    //     suggestion: "The data show that...",
    //     type: "grammar",
    //     explanation: "'Data' is plural, so use 'show' instead of 'shows'.",
    //     confidence: 0.87,
    //   },
    // ];

    // setSuggestions(mockSuggestions);

    setSuggestions(response);
    setIsProcessing(false);
  };

  const analyzeTone = async () => {
    setIsProcessing(true);
    // await new Promise((resolve) => setTimeout(resolve, 1500));

    const tones = ["professional", "casual", "formal", "friendly", "academic"];
    // const currentTone = tones[Math.floor(Math.random() * tones.length)];

    const response = await service.analyzeTone(content);

    console.log("analyzeTone", response);

    // setToneAnalysis({
    //   current: currentTone,
    //   confidence: 0.85,
    //   suggestions: tones.filter((t) => t !== currentTone),
    // });
    setToneAnalysis({
      current: response.tone,
      confidence: response.confidence,
      suggestions: tones.filter((t) => t !== response.tone),
    });
    setIsProcessing(false);
  };

  const enhanceContent = async (type: string) => {
    setIsProcessing(true);

    const response = await service.enhanceContent(content, type as any);

    console.log("Enhance Content Response:", response);

    const enhanced: ContentEnhancement[] = [
      {
        type: type as "expand" | "condense" | "rephrase" | "improve",
        original: content.substring(0, 100) + "...",
        enhanced: response,
        explanation:
          "Expanded the content with additional context and examples.",
      },
    ];

    // await new Promise((resolve) => setTimeout(resolve, 2500));

    // const mockEnhancements: ContentEnhancement[] = [
    //   {
    //     type: "expand",
    //     original: content.substring(0, 100) + "...",
    //     enhanced:
    //       content +
    //       "\n\nThis concept can be further explored by considering the underlying principles and practical applications. The implications extend beyond the immediate scope, affecting various stakeholders and creating opportunities for innovation and improvement.",
    //     explanation:
    //       "Expanded the content with additional context and examples.",
    //   },
    //   {
    //     type: "condense",
    //     original: content,
    //     enhanced:
    //       content.length > 200 ? content.substring(0, 200) + "..." : content,
    //     explanation: "Condensed the content while maintaining key points.",
    //   },
    //   {
    //     type: "rephrase",
    //     original: content.substring(0, 100) + "...",
    //     enhanced: content
    //       .split(".")
    //       .map((sentence) =>
    //         sentence.trim()
    //           ? `${sentence.trim().charAt(0).toUpperCase()}${sentence
    //               .trim()
    //               .slice(1)
    //               .toLowerCase()}.`
    //           : ""
    //       )
    //       .join(" "),
    //     explanation: "Rephrased sentences for better clarity and flow.",
    //   },
    // ];

    // setEnhancements(mockEnhancements);
    setEnhancements(enhanced);
    setIsProcessing(false);
  };

  const generateCreativeSuggestions = async (type: string) => {
    setIsProcessing(true);

    const response = await service.generateCreative(content, type as any);

    console.log("generateCreative Response:", response);

    const creative: CreativeSuggestion[] = [
      {
        type: type as "title" | "hook" | "conclusion" | "keyword",
        suggestions: response,
      },
    ];

    setCreativeSuggestions(creative);

    // await new Promise((resolve) => setTimeout(resolve, 1800));

    // const mockCreative: CreativeSuggestion[] = [
    //   {
    //     type: "title",
    //     suggestions: [
    //       "The Ultimate Guide to " + (content.split(" ")[0] || "Success"),
    //       "Mastering " + (content.split(" ")[1] || "Innovation"),
    //       "5 Key Insights About " + (content.split(" ")[0] || "Growth"),
    //       "Transform Your " + (content.split(" ")[0] || "Strategy"),
    //     ],
    //   },
    //   {
    //     type: "hook",
    //     suggestions: [
    //       "Imagine a world where " +
    //         (content.split(" ").slice(0, 3).join(" ") ||
    //           "possibilities are endless"),
    //       "What if I told you " +
    //         (content.split(" ").slice(0, 4).join(" ") ||
    //           "everything you know is about to change"),
    //       "In today's rapidly evolving landscape, " +
    //         (content.split(" ").slice(0, 5).join(" ") ||
    //           "success requires adaptation"),
    //     ],
    //   },
    //   {
    //     type: "conclusion",
    //     suggestions: [
    //       "As we've explored, " +
    //         (content.split(" ").slice(0, 4).join(" ") ||
    //           "the journey continues"),
    //       "The future holds " +
    //         (content.split(" ").slice(0, 3).join(" ") ||
    //           "infinite possibilities"),
    //       "Remember, " +
    //         (content.split(" ").slice(0, 3).join(" ") ||
    //           "every step forward counts"),
    //     ],
    //   },
    // ];

    // setCreativeSuggestions(mockCreative);
    setIsProcessing(false);
  };

  const addKeyword = () => {
    if (
      keywordInput.trim() &&
      !selectedKeywords.includes(keywordInput.trim())
    ) {
      setSelectedKeywords([...selectedKeywords, keywordInput.trim()]);
      setKeywordInput("");
    }
  };

  const removeKeyword = (keyword: string) => {
    setSelectedKeywords(selectedKeywords.filter((k) => k !== keyword));
  };

  const applySuggestion = (suggestion: Suggestion) => {
    onApplySuggestion?.(suggestion.original, suggestion.suggestion);
  };

  const applyEnhancement = (enhancement: ContentEnhancement) => {
    onApplyEnhancement?.(enhancement.enhanced);
  };

  const applyCreative = (suggestion: string) => {
    onApplyCreative?.(suggestion);
  };

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 max-w-4xl mx-auto">
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
          {[
            { id: "grammar", label: "Grammar & Spelling", icon: CheckCircle },
            { id: "tone", label: "Tone Analysis", icon: MessageSquare },
            { id: "enhance", label: "Content Enhancement", icon: Wand2 },
            { id: "creative", label: "Creative Writing", icon: Sparkles },
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

        {/* Grammar & Spelling Tab */}
        {activeTab === "grammar" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Grammar & Spelling Check
                </h3>
                <button
                  onClick={processGrammarCheck}
                  disabled={isProcessing || !content.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  {isProcessing ? "Checking..." : "Check Grammar"}
                </button>
              </div>

              {suggestions.length > 0 && (
                <div className="space-y-4">
                  {suggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-5 h-5 text-yellow-600" />
                            <span className="text-sm font-medium capitalize text-yellow-800">
                              {suggestion.type} Error
                            </span>
                            <span className="text-xs text-gray-500">
                              {Math.round(suggestion.confidence * 100)}%
                              confidence
                            </span>
                          </div>
                          <p className="text-sm mb-2">
                            <span className="line-through text-red-600">
                              {suggestion.original}
                            </span>
                            <ArrowRight className="w-4 h-4 inline mx-2 text-gray-400" />
                            <span className="text-green-600 font-medium">
                              {suggestion.suggestion}
                            </span>
                          </p>
                          <p className="text-xs text-gray-600">
                            {suggestion.explanation}
                          </p>
                        </div>
                        {/* <button
                          onClick={() => applySuggestion(suggestion)}
                          className="ml-4 px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Apply
                        </button> */}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tone Analysis Tab */}
        {activeTab === "tone" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  Tone Analysis
                </h3>
                <button
                  onClick={analyzeTone}
                  disabled={isProcessing || !content.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Target className="w-4 h-4" />
                  )}
                  {isProcessing ? "Analyzing..." : "Analyze Tone"}
                </button>
              </div>

              {toneAnalysis && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium mb-2">Current Tone</h4>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm capitalize">
                        {toneAnalysis.current}
                      </span>
                      <span className="text-sm text-gray-600">
                        {Math.round(toneAnalysis.confidence * 100)}% confidence
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Alternative Tones</h4>
                    <div className="flex gap-2 flex-wrap">
                      {toneAnalysis.suggestions.map((tone) => (
                        <button
                          key={tone}
                          className="px-3 py-1 border border-gray-300 rounded-full text-sm capitalize hover:border-blue-300 hover:bg-blue-50"
                        >
                          {tone}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Enhancement Tab */}
        {activeTab === "enhance" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-purple-600" />
                Content Enhancement
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  {
                    key: "expand",
                    label: "Expand",
                    desc: "Add more detail",
                    icon: TrendingUp,
                  },
                  {
                    key: "condense",
                    label: "Condense",
                    desc: "Make it shorter",
                    icon: Zap,
                  },
                  {
                    key: "rephrase",
                    label: "Rephrase",
                    desc: "Say it differently",
                    icon: PenTool,
                  },
                  {
                    key: "improve",
                    label: "Improve Clarity",
                    desc: "Simplify complex sentences",
                    icon: Lightbulb,
                  },
                ].map(({ key, label, desc, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => enhanceContent(key)}
                    disabled={isProcessing || !content.trim()}
                    className="p-4 text-left border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-5 h-5 text-purple-600" />
                      <span className="font-medium">{label}</span>
                    </div>
                    <div className="text-sm text-gray-600">{desc}</div>
                  </button>
                ))}
              </div>

              {enhancements.length > 0 && (
                <div className="space-y-4">
                  {enhancements.map((enhancement, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium capitalize">
                          {enhancement.type} Result
                        </h4>
                        {/* <button
                          onClick={() => applyEnhancement(enhancement)}
                          className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                        >
                          Apply
                        </button> */}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {enhancement.explanation}
                      </p>
                      <div className="bg-white p-3 rounded border">
                        <div
                          className="text-sm"
                          dangerouslySetInnerHTML={{
                            __html: enhancement.enhanced,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Creative Writing Tab */}
        {activeTab === "creative" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-600" />
                Creative Writing Features
              </h3>

              {/* Keyword Integration */}
              <div className="mb-6">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Keyword Integration
                </h4>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    placeholder="Add keywords to integrate..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    onKeyPress={(e) => e.key === "Enter" && addKeyword()}
                  />
                  <button
                    onClick={addKeyword}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    Add
                  </button>
                </div>
                {selectedKeywords.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {selectedKeywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center gap-1"
                      >
                        {keyword}
                        <button
                          onClick={() => removeKeyword(keyword)}
                          className="hover:text-blue-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Creative Suggestions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {[
                  { key: "title", label: "Title Generator", icon: BookOpen },
                  { key: "hook", label: "Hook Generator", icon: Quote },
                  {
                    key: "conclusion",
                    label: "Conclusion Generator",
                    icon: Star,
                  },
                  {
                    key: "keywords",
                    label: "Keywords Generator",
                    icon: Hash,
                  },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => generateCreativeSuggestions(key)}
                    disabled={isProcessing || !content.trim()}
                    className="p-4 text-center border border-gray-200 rounded-lg hover:border-yellow-300 hover:bg-yellow-50 transition-colors disabled:opacity-50"
                  >
                    <Icon className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                    <div className="font-medium">{label}</div>
                  </button>
                ))}
              </div>

              {creativeSuggestions.length > 0 && (
                <div className="space-y-4">
                  {creativeSuggestions.map((creative, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium capitalize mb-2 flex items-center gap-2">
                        {creative.type === "title" && (
                          <BookOpen className="w-4 h-4" />
                        )}
                        {creative.type === "hook" && (
                          <Quote className="w-4 h-4" />
                        )}
                        {creative.type === "conclusion" && (
                          <Star className="w-4 h-4" />
                        )}
                        {creative.type} Suggestions
                      </h4>
                      <div className="space-y-2">
                        {creative.suggestions.map(
                          (suggestion, suggestionIdx) => (
                            <div
                              key={suggestionIdx}
                              className="flex items-center justify-between p-3 bg-white rounded border"
                            >
                              <span className="text-sm">{suggestion}</span>
                              {/* <button
                                onClick={() => applyCreative(suggestion)}
                                className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
                              >
                                Use
                              </button> */}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIEnhancements;
