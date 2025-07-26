"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  FileText,
  Save,
  Download,
  Copy,
  Maximize2,
  Minimize2,
  RotateCcw,
  PanelRight,
  Play,
  Pause,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Wand2,
  Type,
  Target,
  BookOpen,
  Clock,
  Eye,
  Users,
  Plus,
  Folder,
  Settings,
  Search,
  Filter,
  Sparkles,
  MessageSquare,
  Hash,
  Quote,
  Star,
  Award,
  Zap,
  TrendingUp,
  Activity,
  PieChart,
  LineChart,
  BarChart,
  Calendar,
  Loader2,
  ArrowRight,
  Trash2,
} from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";
import AIEnhancements from "./writing-tool/components/AIEnhancements";
import AnalyticsDashboard from "./writing-tool/components/AnalyticsDashboard";
import OpenAIConfig from "../components/OpenAIConfig";
import PerformanceMonitor from "../components/PerformanceMonitor";
import { Document } from "../lib/supabase";
import { documentService } from "../lib/document-service";

// Utility functions for text analysis
const calculateReadingTime = (text: string): number => {
  const wordsPerMinute = 200;
  const words = text
    .trim()
    .split(/\s+/)
    .filter((word: string) => word.length > 0).length;
  return Math.ceil(words / wordsPerMinute);
};

const calculateFleschScore = (text: string): number => {
  const sentences = text
    .split(/[.!?]+/)
    .filter((s: string) => s.trim().length > 0).length;
  const words = text
    .trim()
    .split(/\s+/)
    .filter((word: string) => word.length > 0).length;
  const syllables = text.toLowerCase().match(/[aeiouy]+/g)?.length || 0;

  if (sentences === 0 || words === 0) return 0;

  const score =
    206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
  return Math.max(0, Math.min(100, Math.round(score)));
};

const getGradeLevel = (fleschScore: number): string => {
  if (fleschScore >= 90) return "5th Grade";
  if (fleschScore >= 80) return "6th Grade";
  if (fleschScore >= 70) return "7th Grade";
  if (fleschScore >= 60) return "8th-9th Grade";
  if (fleschScore >= 50) return "10th-12th Grade";
  if (fleschScore >= 30) return "College Level";
  return "Graduate Level";
};

const analyzeSentiment = (
  text: string
): { positive: number; negative: number; neutral: number } => {
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

  const words = text.toLowerCase().split(/\s+/);
  let positive = 0,
    negative = 0;

  words.forEach((word: string) => {
    if (positiveWords.includes(word)) positive++;
    if (negativeWords.includes(word)) negative++;
  });

  const total = positive + negative;
  if (total === 0) return { positive: 33, negative: 33, neutral: 34 };

  const posPercent = Math.round((positive / total) * 100);
  const negPercent = Math.round((negative / total) * 100);
  const neuPercent = 100 - posPercent - negPercent;

  return { positive: posPercent, negative: negPercent, neutral: neuPercent };
};

const detectPassiveVoice = (text: string): number => {
  const passiveIndicators = /\b(was|were|been|being|is|are|am)\s+\w+ed\b/gi;
  const matches = text.match(passiveIndicators) || [];
  const sentences = text
    .split(/[.!?]+/)
    .filter((s: string) => s.trim().length > 0).length;
  return sentences > 0 ? Math.round((matches.length / sentences) * 100) : 0;
};

const generateKeywordDensity = (
  text: string
): Array<{ word: string; count: number; density: number }> => {
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter((word: string) => word.length > 3);
  const frequency: { [key: string]: number } = {};

  words.forEach((word: string) => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  return Object.entries(frequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([word, count]) => ({
      word,
      count,
      density: Math.round((count / words.length) * 100 * 100) / 100,
    }));
};

const htmlToText = (html: string): string => {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
};

// Document templates
const documentTemplates = {
  "Blog Post": {
    structure: `# [Your Blog Title]

## Introduction
[Start with a compelling hook that grabs the reader's attention]

## Main Content
### Key Point 1
[Develop your first main point with supporting evidence]

### Key Point 2
[Develop your second main point with supporting evidence]

### Key Point 3
[Develop your third main point with supporting evidence]

## Conclusion
[Summarize your main points and provide a call to action]`,
    description: "Perfect for articles and blog content",
  },
  Email: {
    structure: `Subject: [Clear and concise subject line]

Dear [Recipient Name],

[Opening paragraph - establish context and purpose]

[Body paragraph(s) - provide details, information, or request]

[Closing paragraph - summarize and next steps]

Best regards,
[Your Name]`,
    description: "Professional email templates",
  },
  Essay: {
    structure: `# [Essay Title]

## Introduction
[Thesis statement and overview of main points]

## Body Paragraph 1
[Topic sentence, supporting evidence, analysis]

## Body Paragraph 2
[Topic sentence, supporting evidence, analysis]

## Body Paragraph 3
[Topic sentence, supporting evidence, analysis]

## Conclusion
[Restate thesis and summarize main points]`,
    description: "Academic writing structure",
  },
  Report: {
    structure: `# [Report Title]

## Executive Summary
[Brief overview of the report's key findings]

## Introduction
[Background and objectives]

## Methodology
[How the research was conducted]

## Findings
[Key results and data analysis]

## Conclusions
[Summary of findings and implications]

## Recommendations
[Suggested actions based on findings]`,
    description: "Business and technical reports",
  },
  Story: {
    structure: `# [Story Title]

## Opening
[Set the scene and introduce characters]

## Rising Action
[Develop the conflict and build tension]

## Climax
[The turning point of the story]

## Falling Action
[Resolve the conflict]

## Conclusion
[Wrap up the story and provide closure]`,
    description: "Creative writing and narratives",
  },
  Resume: {
    structure: `# [Your Name]
[Email] | [Phone] | [Location]

## Professional Summary
[Brief overview of your professional background and goals]

## Work Experience
### [Job Title] - [Company Name]
[Date Range]
- [Key achievement or responsibility]
- [Key achievement or responsibility]
- [Key achievement or responsibility]

## Education
### [Degree] - [University Name]
[Graduation Year]

## Skills
- [Skill 1]
- [Skill 2]
- [Skill 3]`,
    description: "Professional resume templates",
  },
};

const AIWritingDashboard = () => {
  // Core state
  const [content, setContent] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Editor state
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [isWriting, setIsWriting] = useState(false);
  const [wpm, setWpm] = useState(0);

  // AI features state
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedTone, setSelectedTone] = useState("professional");
  const [aiResults, setAiResults] = useState<Record<string, any>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState("editor");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isOpenAIEnabled, setIsOpenAIEnabled] = useState(false);
  const [templates, setTemplates] = useState<Document[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autosaveRef = useRef<NodeJS.Timeout | null>(null);
  const writingStartTime = useRef<number | null>(null);
  const wordCountRef = useRef(0);

  // Get active document
  const activeDoc = documents.find((doc) => doc.id === activeDocId);

  useEffect(() => {
    loadDocuments();
    loadTemplates();
  }, []);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const docs = await documentService.getDocuments();
      setDocuments(docs);

      // If no active document, create a default one or set the first document as active
      if (docs.length > 0 && !activeDocId) {
        setActiveDocId(docs[0].id);
        setContent(docs[0].html_content || docs[0].content);
      } else if (docs.length === 0) {
        // Create a default document if none exist
        await createDocument();
      }
    } catch (error) {
      console.error("Error loading documents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const templateDocs = await documentService.getTemplates();
      setTemplates(templateDocs);
    } catch (error) {
      console.error("Error loading templates:", error);
    }
  };

  // Auto-save functionality
  // useEffect(() => {
  //   if (!activeDocId || !content.trim()) return;

  //   if (autosaveRef.current) clearTimeout(autosaveRef.current);

  //   autosaveRef.current = setTimeout(async () => {
  //     setIsSaving(true);
  //     try {
  //       await documentService.autoSaveDocument(activeDocId, content, content);
  //       // Refresh the document list to show updated timestamp
  //       await loadDocuments();
  //     } catch (error) {
  //       console.error("Auto-save failed:", error);
  //     } finally {
  //       setIsSaving(false);
  //     }
  //   }, 30000); // 30 second delay

  //   return () => {
  //     if (autosaveRef.current) clearTimeout(autosaveRef.current);
  //   };
  // }, [content, activeDocId]);

  useEffect(() => {
    const doc = documents.find((doc) => doc.id === activeDocId);
    if (doc && doc.html_content !== content) {
      setContent(doc.html_content || doc.content);
      wordCountRef.current = doc.word_count || 0;
      writingStartTime.current = null;
      setIsWriting(false);
      setWpm(0);
    }
  }, [activeDocId, documents]);

  // Writing speed tracking
  useEffect(() => {
    const plainText = htmlToText(content);
    const words = plainText
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

    if (words > wordCountRef.current) {
      if (!writingStartTime.current) {
        writingStartTime.current = Date.now();
      }
      setIsWriting(true);

      const timeElapsed = (Date.now() - writingStartTime.current) / 60000; // minutes
      if (timeElapsed > 0) {
        setWpm(Math.round((words - wordCountRef.current) / timeElapsed));
      }
    }

    wordCountRef.current = words;
  }, [content]);

  // Analytics calculations
  const analytics = useMemo(() => {
    if (!content.trim()) return null;

    const plainText = htmlToText(content);
    const words = plainText
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    const sentences = plainText
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0);
    const paragraphs = content
      .split(/<\/?(p|div|br)\s*\/?>/i)
      .filter((p) => p.trim().length > 0);

    return {
      characters: plainText.length,
      words: words.length,
      sentences: sentences.length,
      paragraphs: paragraphs.length,
      readingTime: calculateReadingTime(plainText),
      fleschScore: calculateFleschScore(plainText),
      gradeLevel: getGradeLevel(calculateFleschScore(plainText)),
      sentiment: analyzeSentiment(plainText),
      passiveVoice: detectPassiveVoice(plainText),
      avgSentenceLength:
        sentences.length > 0 ? Math.round(words.length / sentences.length) : 0,
      keywordDensity: generateKeywordDensity(plainText),
    };
  }, [content]);

  // Undo/Redo functionality
  const saveToUndoStack = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-19), content]);
    setRedoStack([]);
  }, [content]);

  const undo = () => {
    if (undoStack.length > 0) {
      const previous = undoStack[undoStack.length - 1];
      setRedoStack((prev) => [content, ...prev]);
      setUndoStack((prev) => prev.slice(0, -1));
      setContent(previous);
    }
  };

  const redo = () => {
    if (redoStack.length > 0) {
      const next = redoStack[0];
      setUndoStack((prev) => [...prev, content]);
      setRedoStack((prev) => prev.slice(1));
      setContent(next);
    }
  };

  // Document management

  const createDocument = async () => {
    try {
      const newDoc = await documentService.createDocument(
        `Document ${documents.length + 1}`,
        "<p>Start writing your document...</p>",
        "<p>Start writing your document...</p>"
      );

      if (newDoc) {
        await loadDocuments();
        setActiveDocId(newDoc.id);
        setContent(newDoc.html_content);
      }
    } catch (error) {
      console.error("Error creating document:", error);
    }
  };

  const convertMarkdownToHTML = (markdown: string): string => {
    return markdown
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^\* (.*$)/gim, "<ul><li>$1</li></ul>")
      .replace(/^\d+\. (.*$)/gim, "<ol><li>$1</li></ol>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
      .replace(/\n\n/g, "</p><p>")
      .replace(/^(.*)$/gm, "<p>$1</p>")
      .replace(/<p><h([1-6])>(.*?)<\/h[1-6]><\/p>/g, "<h$1>$2</h$1>")
      .replace(/<p><(ul|ol)>/g, "<$1>")
      .replace(/<\/(ul|ol)><\/p>/g, "</$1>")
      .replace(/<p><li>/g, "<li>")
      .replace(/<\/li><\/p>/g, "</li>");
  };

  const createFromTemplate = async (templateId: string) => {
    try {
      const template = templates.find((t) => t.id === templateId);
      if (!template) return;

      const newDoc = await documentService.createFromTemplate(
        templateId,
        `${template.template_type} Document`
      );

      if (newDoc) {
        await loadDocuments();
        setActiveDocId(newDoc.id);
        setContent(newDoc.html_content);
        setShowTemplates(false);
      }
    } catch (error) {
      console.error("Error creating from template:", error);
    }
  };

  const duplicateDocument = async () => {
    if (!activeDocId) return;

    try {
      const newDoc = await documentService.duplicateDocument(activeDocId);
      if (newDoc) {
        await loadDocuments();
        setActiveDocId(newDoc.id);
        setContent(newDoc.html_content);
      }
    } catch (error) {
      console.error("Error duplicating document:", error);
    }
  };

  const deleteDocument = async (docId: string) => {
    try {
      await documentService.deleteDocument(docId);
      await loadDocuments();

      // If we deleted the active document, switch to another one
      if (docId === activeDocId) {
        const remainingDocs = documents.filter((d) => d.id !== docId);
        if (remainingDocs.length > 0) {
          setActiveDocId(remainingDocs[0].id);
          setContent(remainingDocs[0].html_content);
        } else {
          // Create a new document if none remain
          await createDocument();
        }
      }
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  const updateDocumentName = async (docId: string, newName: string) => {
    try {
      await documentService.updateDocument(docId, { name: newName });
      await loadDocuments();
    } catch (error) {
      console.error("Error updating document name:", error);
    }
  };

  const exportDocument = (format: string) => {
    const doc = documents.find((d) => d.id === activeDocId);
    if (!doc) return;

    let exportContent = doc.html_content || doc.content;
    let mimeType = "text/html";
    let extension = "html";

    switch (format) {
      case "txt":
        exportContent = htmlToText(doc.html_content || doc.content);
        mimeType = "text/plain";
        extension = "txt";
        break;
      case "md":
        exportContent = convertHTMLToMarkdown(doc.html_content || doc.content);
        mimeType = "text/markdown";
        extension = "md";
        break;
      case "html":
        exportContent = `<!DOCTYPE html>
          <html>
          <head>
            <title>${doc.name}</title>
            <meta charset="UTF-8">
            <style>
              body { font-family: Georgia, serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
              h1, h2, h3 { color: #333; }
            </style>
          </head>
          <body>
            ${doc.html_content || doc.content}
          </body>
          </html>`;
        mimeType = "text/html";
        extension = "html";
        break;
      case "pdf":
      case "docx":
        exportContent = htmlToText(doc.html_content || doc.content);
        extension = format;
        break;
      default:
        break;
    }

    const blob = new Blob([exportContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.name}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const convertHTMLToMarkdown = (html: string): string => {
    return html
      .replace(/<h1>(.*?)<\/h1>/g, "# $1\n\n")
      .replace(/<h2>(.*?)<\/h2>/g, "## $1\n\n")
      .replace(/<h3>(.*?)<\/h3>/g, "### $1\n\n")
      .replace(/<strong>(.*?)<\/strong>/g, "**$1**")
      .replace(/<em>(.*?)<\/em>/g, "*$1*")
      .replace(/<a href="(.*?)">(.*?)<\/a>/g, "[$2]($1)")
      .replace(/<li>(.*?)<\/li>/g, "* $1\n")
      .replace(/<\/?(ul|ol)>/g, "")
      .replace(/<p>(.*?)<\/p>/g, "$1\n\n")
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/<[^>]*>/g, "");
  };

  // AI Enhancement functions
  const checkGrammar = async () => {
    setIsProcessing(true);
    setTimeout(() => {
      setSuggestions(generateMockSuggestions(content, "grammar"));
      setIsProcessing(false);
    }, 1500);
  };

  const enhanceContent = async (type: string) => {
    setIsProcessing(true);
    setTimeout(() => {
      const result = generateMockSuggestions(content, type);
      setAiResults((prev) => ({ ...prev, [type]: result }));
      setIsProcessing(false);
    }, 2000);
  };

  const applyToneAdjustment = (tone: string) => {
    setSelectedTone(tone);
    let adjusted = content;
    if (tone === "formal") {
      adjusted = content
        .replace(/\bcan't\b/g, "cannot")
        .replace(/\bwon't\b/g, "will not");
    } else if (tone === "casual") {
      adjusted = content
        .replace(/\bcannot\b/g, "can't")
        .replace(/\bwill not\b/g, "won't");
    }
    setContent(adjusted);
  };

  // AI suggestion handlers
  const handleApplySuggestion = (original: string, suggestion: string) => {
    setContent(content.replace(original, suggestion));
  };

  const handleApplyEnhancement = (enhanced: string) => {
    setContent(enhanced);
  };

  const handleApplyCreative = (suggestion: string) => {
    setContent(content + "\n\n" + suggestion);
  };

  // Mock AI suggestions (in real app, these would call actual AI APIs)
  const generateMockSuggestions = (text: string, type: string) => {
    const suggestions: Record<string, any> = {
      grammar: [
        {
          original: "There is many issues",
          suggestion: "There are many issues",
          type: "grammar",
          explanation: "Subject-verb agreement error",
        },
        {
          original: "its very important",
          suggestion: "it's very important",
          type: "spelling",
          explanation: "Missing apostrophe in contraction",
        },
      ],
      expand: `${text}\n\nThis concept can be further explored by considering the underlying principles and practical applications. The implications extend beyond the immediate scope, affecting various stakeholders and creating opportunities for innovation and improvement.`,
      condense: text.length > 100 ? text.substring(0, 100) + "..." : text,
      rephrase: text
        .split(".")
        .map((sentence) =>
          sentence.trim()
            ? `${sentence.trim().charAt(0).toUpperCase()}${sentence
                .trim()
                .slice(1)
                .toLowerCase()}.`
            : ""
        )
        .join(" "),
      titles: [
        "The Ultimate Guide to " + (text.split(" ")[0] || "Success"),
        "Mastering " + (text.split(" ")[1] || "Innovation"),
        "5 Key Insights About " + (text.split(" ")[0] || "Growth"),
        "Transform Your " + (text.split(" ")[0] || "Strategy"),
      ],
    };

    return suggestions[type] || [];
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-lg font-medium text-gray-700">
            Loading documents...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex h-screen bg-gray-50 ${
        isFullscreen ? "fixed inset-0 z-50" : ""
      }`}
    >
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-16"
        } bg-white border-r border-gray-200 transition-all duration-300`}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FileText className="w-8 h-8 text-blue-600" />
            {sidebarOpen && (
              <h1 className="text-xl font-bold text-gray-800">WritingAI</h1>
            )}
          </div>
        </div>

        {sidebarOpen && (
          <div className="p-4">
            <div className="space-y-2">
              <button
                onClick={createDocument}
                className="w-full flex items-center gap-2 p-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Document
              </button>

              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="w-full flex items-center gap-2 p-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Templates
              </button>
            </div>

            {/* Templates Modal */}
            {showTemplates && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Choose Template
                </h3>
                <div className="space-y-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => createFromTemplate(template.id)}
                      className="w-full text-left p-2 text-sm bg-white rounded border hover:bg-gray-50"
                    >
                      <div className="font-medium">{template.name}</div>
                      <div className="text-xs text-gray-600">
                        {template.template_type}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Documents
              </h3>
              <div className="space-y-1">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`p-2 text-sm rounded cursor-pointer group ${
                      doc.id === activeDocId
                        ? "bg-blue-100 text-blue-800"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <div
                      onClick={() => {
                        setActiveDocId(doc.id);
                        setContent(doc.html_content || doc.content);
                      }}
                      className="flex-1"
                    >
                      <input
                        type="text"
                        value={doc.name}
                        onChange={(e) =>
                          updateDocumentName(doc.id, e.target.value)
                        }
                        className="font-medium bg-transparent border-none outline-none w-full"
                        onBlur={(e) => {
                          if (e.target.value !== doc.name) {
                            updateDocumentName(doc.id, e.target.value);
                          }
                        }}
                      />
                      <div className="text-xs text-gray-500 flex items-center justify-between">
                        <span>{doc.word_count || 0} words</span>
                        <span>•</span>
                        <span>
                          {new Date(doc.updated_at).toLocaleDateString()}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteDocument(doc.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <Folder className="w-4 h-4" />
                </button>
                <span className="text-lg font-medium">
                  {activeDoc?.name || "Untitled Document"}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                {analytics && (
                  <>
                    <span>{analytics.words} words</span>
                    <span>•</span>
                    <span>{analytics.characters} characters</span>
                    <span>•</span>
                    <span>{analytics.readingTime} min read</span>
                  </>
                )}
                {isSaving && (
                  <>
                    <span>•</span>
                    <span className="text-green-600">Saving...</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={undo}
                disabled={undoStack.length === 0}
                className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
                title="Undo (Ctrl+Z)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={redo}
                disabled={redoStack.length === 0}
                className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
                title="Redo (Ctrl+Shift+Z)"
              >
                <PanelRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 hover:bg-gray-100 rounded"
                title="Toggle fullscreen"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => exportDocument("txt")}
                className="p-2 hover:bg-gray-100 rounded"
                title="Export"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200">
          <div className="flex">
            {["editor", "enhance", "analytics"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium capitalize ${
                  activeTab === tab
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "editor" && (
            <RichTextEditor
              content={content}
              onChange={(newContent) => {
                setContent(newContent);
                saveToUndoStack();
              }}
              onSave={async () => {
                if (activeDocId) {
                  await documentService.updateDocument(activeDocId, {
                    content,
                    html_content: content,
                  });
                  await loadDocuments();
                }
              }}
              onUndo={undo}
              onRedo={redo}
              onFullscreenToggle={() => setIsFullscreen(!isFullscreen)}
              onExport={exportDocument}
              isFullscreen={isFullscreen}
              canUndo={undoStack.length > 0}
              canRedo={redoStack.length > 0}
              autoSave={true}
              autoSaveInterval={30000}
            />
          )}

          {activeTab === "enhance" && (
            <AIEnhancements
              content={content}
              onApplySuggestion={handleApplySuggestion}
              onApplyEnhancement={handleApplyEnhancement}
              onApplyCreative={handleApplyCreative}
            />
          )}

          {activeTab === "analytics" && (
            <AnalyticsDashboard
              content={content}
              documents={documents}
              onExport={exportDocument}
              onDuplicate={duplicateDocument}
              onCreateTemplate={(templateName) => {
                // Handle template creation if needed
                console.log("Create template:", templateName);
              }}
            />
          )}
        </div>

        {/* Status Bar */}
        <div className="bg-gray-100 border-t border-gray-200 px-6 py-2">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-4">
              <span>Auto-saved</span>
              {isWriting && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Writing...</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              {analytics && (
                <>
                  <span>Line 1, Column {content.length}</span>
                  <span>UTF-8</span>
                  <span>Connected to Supabase</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button for Quick Actions */}
      <div className="fixed bottom-6 right-6 z-40">
        <div className="relative group">
          <button className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center">
            <Wand2 className="w-6 h-6" />
          </button>

          <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-xl border border-gray-200 p-2 space-y-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
            <button
              onClick={checkGrammar}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4 text-green-600" />
              Quick Grammar Check
            </button>
            <button
              onClick={() => enhanceContent("expand")}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
            >
              <Lightbulb className="w-4 h-4 text-yellow-600" />
              Expand Content
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4 text-purple-600" />
              View Analytics
            </button>
          </div>
        </div>
      </div>

      {/* OpenAI Configuration */}
      <OpenAIConfig onApiKeySet={setIsOpenAIEnabled} />

      {/* Performance Monitor */}
      <PerformanceMonitor content={content} />
    </div>
  );
};

export default AIWritingDashboard;
