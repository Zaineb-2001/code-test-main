"use client";

import React, { useState, useEffect } from "react";
import {
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Settings,
  Zap,
} from "lucide-react";
import { initializeOpenAI, getOpenAIService } from "../lib/openai-service";

interface OpenAIConfigProps {
  onApiKeySet: (isValid: boolean) => void;
}

const OpenAIConfig: React.FC<OpenAIConfigProps> = ({ onApiKeySet }) => {
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState("");
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    // Load API key from localStorage
    const savedApiKey = localStorage.getItem("openai_api_key");
    if (savedApiKey) {
      setApiKey(savedApiKey);
      validateApiKey(savedApiKey);
    }
  }, []);

  const validateApiKey = async (key: string) => {
    if (!key.trim()) {
      setIsValid(false);
      setError("");
      onApiKeySet(false);
      return;
    }

    setIsValidating(true);
    setError("");

    try {
      // Initialize the service
      initializeOpenAI(key);
      const service = getOpenAIService();

      if (localStorage.getItem("openai_api_valid") === "true") {
        setIsValid(true);
        onApiKeySet(true);
        return;
      }

      // Test the API with a simple request
      const testResult = await service.checkSpellingAndGrammar("Hello world");

      setIsValid(true);
      setError("");
      onApiKeySet(true);

      // Save to localStorage
      localStorage.setItem("openai_api_key", key);
      localStorage.setItem("openai_api_valid", "true");
    } catch (err) {
      setIsValid(false);
      setError(err instanceof Error ? err.message : "Invalid API key");
      onApiKeySet(false);
    } finally {
      setIsValidating(false);
    }
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    setApiKey(newKey);

    // Clear validation state when user starts typing
    if (isValid) {
      setIsValid(false);
      onApiKeySet(false);
    }

    // Validate after user stops typing
    const timeoutId = setTimeout(() => {
      validateApiKey(newKey);
    }, 1000);

    return () => clearTimeout(timeoutId);
  };

  const handleSaveApiKey = () => {
    validateApiKey(apiKey);
  };

  const clearApiKey = () => {
    setApiKey("");
    setIsValid(false);
    setError("");
    onApiKeySet(false);
    localStorage.removeItem("openai_api_key");
    localStorage.removeItem("openai_api_valid");
  };

  return (
    <div className="relative">
      {/* Config Toggle Button */}
      <button
        onClick={() => setShowConfig(!showConfig)}
        className="fixed top-16 right-4 z-50 p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 group"
        title="OpenAI Configuration"
      >
        <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
      </button>

      {/* Configuration Panel */}
      {showConfig && (
        <div className="fixed top-16 right-4 z-50 w-96 bg-white border border-gray-200 rounded-xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              OpenAI Configuration
            </h3>
            <button
              onClick={() => setShowConfig(false)}
              className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            {/* API Key Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OpenAI API Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={handleApiKeyChange}
                  placeholder="sk-..."
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  {showApiKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Validation Status */}
            <div className="flex items-center gap-3">
              {isValidating && (
                <div className="flex items-center gap-2 text-blue-600">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">Validating...</span>
                </div>
              )}

              {isValid && !isValidating && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">API Key Valid</span>
                </div>
              )}

              {error && !isValidating && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleSaveApiKey}
                disabled={isValidating || !apiKey.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isValidating ? "Validating..." : "Save & Test"}
              </button>

              {isValid && (
                <button
                  onClick={clearApiKey}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Batch Stats */}
            {isValid && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Batch Processing Status
                </h4>
                <div className="text-xs text-gray-600">
                  <p>• Requests are batched to optimize token usage</p>
                  <p>• Maximum 10 requests per batch</p>
                  <p>• 2-second delay between batches</p>
                </div>
              </div>
            )}

            {/* Help Text */}
            <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
              <p className="font-medium mb-1">How to get your API key:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>
                  Visit{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    OpenAI Platform
                  </a>
                </li>
                <li>Sign in or create an account</li>
                <li>Click "Create new secret key"</li>
                <li>Copy the key (starts with "sk-")</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpenAIConfig;
