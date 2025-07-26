"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Save,
  RotateCcw,
  PanelRight,
  Maximize2,
  Minimize2,
  Download,
  Copy,
  FileText,
  Clock,
  Eye,
  Type,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Wand2,
  TrendingUp,
  Zap,
  Lightbulb,
  MessageSquare,
  Sparkles,
  X,
  ChevronDown,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link,
  Image,
} from "lucide-react";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onFullscreenToggle?: () => void;
  onExport?: (format: string) => void;
  isFullscreen?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  autoSave?: boolean;
  autoSaveInterval?: number;
}

interface TextMetrics {
  characters: number;
  words: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  readingTime: number;
  fleschScore: number;
  gradeLevel: string;
}

interface Suggestion {
  type: "spelling" | "grammar" | "style";
  original: string;
  suggestion: string;
  explanation: string;
  confidence: number;
  range: { index: number; length: number };
}

interface ContextualAction {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  action: () => void;
  description: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  onSave,
  onUndo,
  onRedo,
  onFullscreenToggle,
  onExport,
  isFullscreen = false,
  canUndo = false,
  canRedo = false,
  autoSave = true,
  autoSaveInterval = 30000,
}) => {
  const [metrics, setMetrics] = useState<TextMetrics>({
    characters: 0,
    words: 0,
    sentences: 0,
    paragraphs: 0,
    lines: 0,
    readingTime: 0,
    fleschScore: 0,
    gradeLevel: "5th Grade",
  });
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showMetrics, setShowMetrics] = useState(true);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedText, setSelectedText] = useState("");
  const [selectionRange, setSelectionRange] = useState<{
    index: number;
    length: number;
  } | null>(null);
  const [showContextualMenu, setShowContextualMenu] = useState(false);
  const [contextualMenuPosition, setContextualMenuPosition] = useState({
    x: 0,
    y: 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [hoveredSuggestion, setHoveredSuggestion] = useState<Suggestion | null>(
    null
  );
  const [highlightedErrors, setHighlightedErrors] = useState<{
    [key: number]: Suggestion;
  }>({});

  const editorRef = useRef<HTMLDivElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingRef = useRef(false);

  const saveCursorPosition = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current) {
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(editorRef.current);
      preCaretRange.setEnd(range.startContainer, range.startOffset);
      return preCaretRange.toString().length;
    }
    return 0;
  };

  const restoreCursorPosition = (position: number) => {
    if (!editorRef.current) return;

    const walker = document.createTreeWalker(
      editorRef.current,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let currentPosition = 0;
    let node;

    while ((node = walker.nextNode())) {
      const textLength = node.textContent?.length || 0;
      if (currentPosition + textLength >= position) {
        const range = document.createRange();
        const selection = window.getSelection();
        const offset = position - currentPosition;

        range.setStart(node, Math.min(offset, textLength));
        range.setEnd(node, Math.min(offset, textLength));

        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
        break;
      }
      currentPosition += textLength;
    }
  };

  // Convert HTML to plain text for metrics calculation
  const htmlToText = (html: string): string => {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  };

  // Calculate text metrics
  const calculateMetrics = useCallback((html: string): TextMetrics => {
    const text = htmlToText(html);
    const characters = text.length;
    const words = text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
    const sentences = text
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0).length;
    const paragraphs = html
      .split(/<\/?(p|div|br)\s*\/?>/i)
      .filter((p) => p.trim().length > 0).length;
    const lines = text.split("\n").length;
    const readingTime = Math.ceil(words / 200); // Average reading speed

    // Calculate Flesch Reading Ease Score
    const syllables = text.toLowerCase().match(/[aeiouy]+/g)?.length || 0;
    const fleschScore =
      sentences > 0 && words > 0
        ? Math.max(
            0,
            Math.min(
              100,
              Math.round(
                206.835 -
                  1.015 * (words / sentences) -
                  84.6 * (syllables / words)
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

    return {
      characters,
      words,
      sentences,
      paragraphs,
      lines,
      readingTime,
      fleschScore,
      gradeLevel: getGradeLevel(fleschScore),
    };
  }, []);

  // Update metrics when content changes
  useEffect(() => {
    setMetrics(calculateMetrics(content));
  }, [content, calculateMetrics]);

  useEffect(() => {
    if (!autoSave || !content.trim()) return;

    const saveContent = async () => {
      setIsSaving(true);
      try {
        // Save HTML content to localStorage
        const documentData = {
          content: content, // Store as HTML
          plainText: htmlToText(content),
          wordCount: metrics.words,
          readingTime: metrics.readingTime,
          fleschScore: metrics.fleschScore,
          timestamp: new Date().toISOString(),
        };

        localStorage.setItem(
          "current_document_html",
          JSON.stringify(documentData)
        );
        setLastSaved(new Date());
      } catch (error) {
        console.error("Auto-save failed:", error);
      } finally {
        setIsSaving(false);
      }
    };

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      saveContent();
      onSave?.();
    }, autoSaveInterval);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [content, autoSave, autoSaveInterval, onSave, metrics]);

  useEffect(() => {
    try {
      const savedData = localStorage.getItem("current_document_html");
      if (savedData && !content) {
        const parsedData = JSON.parse(savedData);
        if (parsedData.content && editorRef.current) {
          isUpdatingRef.current = true;
          editorRef.current.innerHTML = parsedData.content;
          onChange(parsedData.content);
          setTimeout(() => {
            isUpdatingRef.current = false;
          }, 100);
        }
      }
    } catch (error) {
      console.error("Failed to load saved content:", error);
    }
  }, []);

  // Real-time spell and grammar checking
  const checkSpellingAndGrammar = useCallback(async (html: string) => {
    const text = htmlToText(html);
    if (!text.trim()) {
      setSuggestions([]);
      setHighlightedErrors({});
      return;
    }

    setIsProcessing(true);

    try {
      // Mock suggestions based on common errors
      const mockSuggestions: Suggestion[] = [];
      const errorHighlights: { [key: number]: Suggestion } = {};

      // Check for common spelling errors
      const spellingErrors = [
        {
          original: "recieve",
          suggestion: "receive",
          explanation: "Common spelling error",
        },
        {
          original: "seperate",
          suggestion: "separate",
          explanation: "Common spelling error",
        },
        {
          original: "definately",
          suggestion: "definitely",
          explanation: "Common spelling error",
        },
      ];

      spellingErrors.forEach((error) => {
        const regex = new RegExp(error.original, "gi");
        let match;
        while ((match = regex.exec(text)) !== null) {
          const suggestion: Suggestion = {
            type: "spelling",
            original: error.original,
            suggestion: error.suggestion,
            explanation: error.explanation,
            confidence: 0.95,
            range: { index: match.index, length: error.original.length },
          };
          mockSuggestions.push(suggestion);
          errorHighlights[match.index] = suggestion;
        }
      });

      setSuggestions(mockSuggestions);
      setHighlightedErrors(errorHighlights);
    } catch (error) {
      console.error("Spell check failed:", error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Check spelling and grammar when content changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      checkSpellingAndGrammar(content);
    }, 1000);

    return () => clearTimeout(debounceTimer);
  }, [content, checkSpellingAndGrammar]);

  // Handle text selection using useEffect and window events
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (
        selection &&
        selection.rangeCount > 0 &&
        selection.toString().trim()
      ) {
        const selectedText = selection.toString();
        setSelectedText(selectedText);

        // Get position for contextual menu
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        const editorRect = editorRef.current?.getBoundingClientRect();

        if (editorRect) {
          const relativeX = rect.left - editorRect.left + rect.width / 2;
          const relativeY = rect.top - editorRect.top;

          setContextualMenuPosition({
            x: relativeX,
            y: relativeY - 10,
          });
          setShowContextualMenu(true);
        }
      } else {
        setSelectedText("");
        setShowContextualMenu(false);
      }
    };

    document.addEventListener("selectionchange", handleSelection);
    return () =>
      document.removeEventListener("selectionchange", handleSelection);
  }, []);

  // Enhanced contextual formatting for selected text
  const formatSelectedText = (command: string, value?: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    // Apply formatting to selection
    document.execCommand(command, false, value);

    // Update content
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      isUpdatingRef.current = true;
      onChange(newContent);

      setTimeout(() => {
        editorRef.current?.focus();
        isUpdatingRef.current = false;
      }, 0);
    }

    setShowContextualMenu(false);
  };

  // Contextual actions for selected text
  const getContextualActions = useCallback((): ContextualAction[] => {
    if (!selectedText.trim()) return [];

    return [
      {
        id: "bold",
        label: "Bold",
        icon: Bold,
        description: "Make text bold",
        action: () => formatSelectedText("bold"),
      },
      {
        id: "italic",
        label: "Italic",
        icon: Italic,
        description: "Make text italic",
        action: () => formatSelectedText("italic"),
      },
      {
        id: "underline",
        label: "Underline",
        icon: Underline,
        description: "Underline text",
        action: () => formatSelectedText("underline"),
      },
      {
        id: "expand",
        label: "Expand",
        icon: TrendingUp,
        description: "Add more detail to this text",
        action: () => {
          const expanded = `${selectedText}\n\nThis concept can be further explored by considering the underlying principles and practical applications.`;
          document.execCommand("insertHTML", false, expanded);

          if (editorRef.current) {
            const newContent = editorRef.current.innerHTML;
            isUpdatingRef.current = true;
            onChange(newContent);
            setTimeout(() => {
              isUpdatingRef.current = false;
            }, 0);
          }
          setShowContextualMenu(false);
        },
      },
      {
        id: "rephrase",
        label: "Rephrase",
        icon: MessageSquare,
        description: "Say this differently",
        action: () => {
          const rephrased = selectedText
            .split(".")
            .map((sentence) =>
              sentence.trim()
                ? `${sentence.trim().charAt(0).toUpperCase()}${sentence
                    .trim()
                    .slice(1)
                    .toLowerCase()}.`
                : ""
            )
            .join(" ");
          document.execCommand("insertHTML", false, rephrased);

          if (editorRef.current) {
            const newContent = editorRef.current.innerHTML;
            isUpdatingRef.current = true;
            onChange(newContent);
            setTimeout(() => {
              isUpdatingRef.current = false;
            }, 0);
          }
          setShowContextualMenu(false);
        },
      },
    ];
  }, [selectedText]);

  // Apply suggestion
  const applySuggestion = useCallback(
    (suggestion: Suggestion) => {
      if (editorRef.current) {
        const html = editorRef.current.innerHTML;
        const text = htmlToText(html);
        const newText = text.replace(
          suggestion.original,
          suggestion.suggestion
        );

        // Simple approach: replace in HTML as well
        const newHtml = html.replace(
          suggestion.original,
          suggestion.suggestion
        );

        isUpdatingRef.current = true;
        editorRef.current.innerHTML = newHtml;
        onChange(newHtml);
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 100);
      }
    },
    [onChange]
  );

  // Handle content change with writing analytics
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (isUpdatingRef.current) return;

    const cursorPosition = saveCursorPosition();
    const newContent = e.currentTarget.innerHTML;

    onChange(newContent);

    // Restore cursor position after React updates
    setTimeout(() => {
      restoreCursorPosition(cursorPosition);
    }, 0);
  };

  useEffect(() => {
    if (editorRef.current && !isUpdatingRef.current) {
      const currentContent = editorRef.current.innerHTML;
      if (currentContent !== content) {
        const cursorPosition = saveCursorPosition();
        isUpdatingRef.current = true;
        editorRef.current.innerHTML = content;
        setTimeout(() => {
          restoreCursorPosition(cursorPosition);
          isUpdatingRef.current = false;
        }, 0);
      }
    }
  }, [content]);

  // Formatting functions
  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();

    // Trigger content update
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      onChange(newContent);
    }
  };

  // Handle keyboard shortcuts with analytics
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      onSave?.();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      onUndo?.();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
      e.preventDefault();
      onRedo?.();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "b") {
      e.preventDefault();
      formatText("bold");
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "i") {
      e.preventDefault();
      formatText("italic");
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "u") {
      e.preventDefault();
      formatText("underline");
    }
  };

  return (
    <div
      className={`flex flex-col h-full bg-white ${
        isFullscreen
          ? "fixed inset-0 z-50"
          : "rounded-lg shadow-xl border border-gray-200"
      }`}
    >
      {/* Editor Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="p-3 hover:bg-white/80 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                title="Undo (Ctrl+Z)"
              >
                <RotateCcw className="w-5 h-5 text-gray-700" />
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className="p-3 hover:bg-white/80 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                title="Redo (Ctrl+Shift+Z)"
              >
                <PanelRight className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              {isSaving && (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium">Saving...</span>
                </div>
              )}
              <span className="text-gray-500">
                {lastSaved
                  ? `Last saved: ${lastSaved.toLocaleTimeString()}`
                  : "Not saved yet"}
              </span>
              {isProcessing && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                  <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-medium">Checking...</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMetrics(!showMetrics)}
              className="p-3 hover:bg-white/80 rounded-lg transition-all duration-200 shadow-sm"
              title="Toggle metrics"
            >
              <BarChart3 className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={onSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm font-medium"
              title="Save (Ctrl+S)"
            >
              <Save className="w-4 h-4 inline mr-2" />
              Save
            </button>
            <button
              onClick={onFullscreenToggle}
              className="p-3 hover:bg-white/80 rounded-lg transition-all duration-200 shadow-sm"
              title="Toggle fullscreen"
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5 text-gray-700" />
              ) : (
                <Maximize2 className="w-5 h-5 text-gray-700" />
              )}
            </button>
          </div>
        </div>

        {/* Formatting Toolbar */}
        <div className="mt-6 flex items-center gap-2 bg-white/60 backdrop-blur-sm rounded-xl p-3 shadow-sm border border-white/20">
          <button
            onClick={() => formatText("bold")}
            className="p-2 hover:bg-blue-100 rounded-lg transition-all duration-200 group"
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4 text-gray-700 group-hover:text-blue-700" />
          </button>
          <button
            onClick={() => formatText("italic")}
            className="p-2 hover:bg-blue-100 rounded-lg transition-all duration-200 group"
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4 text-gray-700 group-hover:text-blue-700" />
          </button>
          <button
            onClick={() => formatText("underline")}
            className="p-2 hover:bg-blue-100 rounded-lg transition-all duration-200 group"
            title="Underline (Ctrl+U)"
          >
            <Underline className="w-4 h-4 text-gray-700 group-hover:text-blue-700" />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-2"></div>
          <button
            onClick={() => formatText("insertUnorderedList")}
            className="p-2 hover:bg-blue-100 rounded-lg transition-all duration-200 group"
            title="Bullet List"
          >
            <List className="w-4 h-4 text-gray-700 group-hover:text-blue-700" />
          </button>
          <button
            onClick={() => formatText("insertOrderedList")}
            className="p-2 hover:bg-blue-100 rounded-lg transition-all duration-200 group"
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4 text-gray-700 group-hover:text-blue-700" />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-2"></div>
          <button
            onClick={() => formatText("justifyLeft")}
            className="p-2 hover:bg-blue-100 rounded-lg transition-all duration-200 group"
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4 text-gray-700 group-hover:text-blue-700" />
          </button>
          <button
            onClick={() => formatText("justifyCenter")}
            className="p-2 hover:bg-blue-100 rounded-lg transition-all duration-200 group"
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4 text-gray-700 group-hover:text-blue-700" />
          </button>
          <button
            onClick={() => formatText("justifyRight")}
            className="p-2 hover:bg-blue-100 rounded-lg transition-all duration-200 group"
            title="Align Right"
          >
            <AlignRight className="w-4 h-4 text-gray-700 group-hover:text-blue-700" />
          </button>
        </div>

        {/* Metrics Bar */}
        {showMetrics && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 bg-white/60 px-3 py-1 rounded-lg">
                <Type className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-gray-700">
                  {metrics.words} words
                </span>
              </div>
              <div className="flex items-center gap-2 bg-white/60 px-3 py-1 rounded-lg">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-gray-700">
                  {metrics.characters} characters
                </span>
              </div>
              <div className="flex items-center gap-2 bg-white/60 px-3 py-1 rounded-lg">
                <Eye className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-gray-700">
                  {metrics.sentences} sentences
                </span>
              </div>
              <div className="flex items-center gap-2 bg-white/60 px-3 py-1 rounded-lg">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-gray-700">
                  {metrics.readingTime} min read
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="bg-white/60 px-3 py-1 rounded-lg font-medium text-gray-700">
                Grade: {metrics.gradeLevel}
              </span>
              <span className="bg-white/60 px-3 py-1 rounded-lg font-medium text-gray-700">
                Readability: {metrics.fleschScore}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Editor Container */}
      <div className="flex-1 overflow-hidden relative bg-white">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          className="w-full h-full p-8 outline-none font-serif text-base leading-relaxed overflow-y-auto bg-white"
          style={{
            fontFamily: "Georgia, serif",
            fontSize: "18px",
            lineHeight: "1.8",
            color: "#374151",
          }}
          suppressContentEditableWarning={true}
          dangerouslySetInnerHTML={{
            __html: content || "<p>Start writing your document...</p>",
          }}
        >
          {/* {renderContentWithHighlights()} */}
        </div>

        {/* Hover Tooltip for Errors */}
        {hoveredSuggestion && (
          <div
            className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-xs"
            style={{
              left: `${contextualMenuPosition.x}px`,
              top: `${contextualMenuPosition.y + 30}px`,
              transform: "translateX(-50%)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              {hoveredSuggestion.type === "spelling" ? (
                <AlertCircle className="w-4 h-4 text-red-600" />
              ) : (
                <CheckCircle className="w-4 h-4 text-blue-600" />
              )}
              <span className="text-sm font-semibold capitalize text-gray-800">
                {hoveredSuggestion.type} Error
              </span>
            </div>
            <p className="text-sm mb-2">
              <span className="line-through text-red-600 font-medium">
                {hoveredSuggestion.original}
              </span>
              <span className="mx-2 text-gray-400">→</span>
              <span className="text-green-700 font-semibold">
                {hoveredSuggestion.suggestion}
              </span>
            </p>
            <p className="text-xs text-gray-600">
              {hoveredSuggestion.explanation}
            </p>
            <button
              onClick={() => applySuggestion(hoveredSuggestion)}
              className="mt-2 w-full px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium"
            >
              Apply Fix
            </button>
          </div>
        )}

        {/* Suggestions Panel */}
        {suggestions.length > 0 && (
          <div className="absolute right-6 top-6 w-96 max-h-96 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-2xl p-6 suggestions-panel">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                Suggestions
              </h3>
              <button
                onClick={() => setSuggestions([])}
                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {suggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        {suggestion.type === "spelling" ? (
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        )}
                        <span className="text-sm font-semibold capitalize text-gray-800">
                          {suggestion.type} Error
                        </span>
                        <span className="text-xs bg-white px-2 py-1 rounded-full text-gray-600 font-medium">
                          {Math.round(suggestion.confidence * 100)}% confidence
                        </span>
                      </div>
                      <p className="text-sm mb-3">
                        <span className="line-through text-red-600 font-medium">
                          {suggestion.original}
                        </span>
                        <span className="mx-3 text-gray-400">→</span>
                        <span className="text-green-700 font-semibold">
                          {suggestion.suggestion}
                        </span>
                      </p>
                      <p className="text-xs text-gray-600 bg-white/60 px-3 py-2 rounded-lg">
                        {suggestion.explanation}
                      </p>
                    </div>
                    <button
                      onClick={() => applySuggestion(suggestion)}
                      className="ml-4 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contextual Menu for Selected Text */}
        {showContextualMenu && selectedText.trim() && (
          <div
            className="absolute z-50 bg-white border border-gray-200 rounded-xl shadow-2xl p-3 min-w-56 contextual-menu"
            style={{
              left: `${contextualMenuPosition.x}px`,
              top: `${contextualMenuPosition.y}px`,
              transform: "translateX(-50%)",
            }}
          >
            <div className="text-xs text-gray-500 mb-3 px-3 py-2 bg-gray-50 rounded-lg font-medium">
              Selected: "{selectedText.substring(0, 30)}
              {selectedText.length > 30 ? "..." : ""}"
            </div>
            <div className="space-y-1">
              {getContextualActions().map((action) => (
                <button
                  key={action.id}
                  onClick={action.action}
                  className="w-full flex items-center gap-4 px-4 py-3 text-sm text-left hover:bg-blue-50 rounded-lg transition-colors group"
                >
                  <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <action.icon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">
                      {action.label}
                    </div>
                    <div className="text-xs text-gray-500">
                      {action.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-gray-50 border-t border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-6">
            <span className="font-medium">
              Line {metrics.lines}, Column {htmlToText(content).length}
            </span>
            <span className="font-medium">HTML</span>
            <span className="font-medium">Selected: {selectedText.length}</span>
            {content.length > 100000 && (
              <span className="font-medium text-orange-600">
                Large Document Mode
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="font-medium">{metrics.paragraphs} paragraphs</span>
            <span className="text-gray-400">•</span>
            <span className="font-medium">
              Auto-save {autoSave ? "enabled" : "disabled"}
            </span>
            <span className="text-gray-400">•</span>
            <span className="font-medium">HTML Mode</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RichTextEditor;
