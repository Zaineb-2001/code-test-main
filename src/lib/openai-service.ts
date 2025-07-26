interface BatchRequest {
  id: string;
  type: "spelling" | "grammar" | "tone" | "enhancement" | "creative";
  text: string;
  context?: string;
}

interface BatchResponse {
  id: string;
  suggestions: Suggestion[];
  tone?: string;
  confidence?: number;
  enhancedText?: string;
  creativeOptions?: string[];
}

interface Suggestion {
  type: "spelling" | "grammar" | "style";
  original: string;
  suggestion: string;
  explanation: string;
  confidence: number;
  range: { index: number; length: number };
}

class OpenAIService {
  private apiKey: string;
  private baseURL: string = "https://api.openai.com/v1/chat/completions";
  private batchQueue: BatchRequest[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private batchDelay: number = 2000; // 2 seconds
  private maxBatchSize: number = 10;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Add request to batch queue
  private addToBatch(request: BatchRequest): Promise<BatchResponse> {
    return new Promise((resolve, reject) => {
      const requestWithCallback = {
        ...request,
        resolve,
        reject,
      };

      this.batchQueue.push(requestWithCallback as any);

      // Process batch if it's full
      if (this.batchQueue.length >= this.maxBatchSize) {
        this.processBatch();
      } else if (!this.batchTimeout) {
        // Set timeout to process batch after delay
        this.batchTimeout = setTimeout(() => {
          this.processBatch();
        }, this.batchDelay);
      }
    });
  }

  // Process the entire batch
  private async processBatch() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    if (this.batchQueue.length === 0) return;

    const batch = this.batchQueue.splice(0, this.maxBatchSize);
    const requests = batch.map((item) => ({
      id: item.id,
      type: item.type,
      text: item.text,
      context: item.context,
    }));

    try {
      const results = await this.callOpenAI(requests);

      // Resolve each promise with its result
      batch.forEach((item: any) => {
        const result = results.find((r) => r.id === item.id);
        if (result) {
          item.resolve(result);
        } else {
          item.reject(new Error("No result found for request"));
        }
      });
    } catch (error) {
      // Reject all promises in batch
      batch.forEach((item: any) => {
        item.reject(error);
      });
    }
  }

  // Make the actual API call
  private async callOpenAI(requests: BatchRequest[]): Promise<BatchResponse[]> {
    const systemPrompt = `You are an advanced writing assistant that analyzes text for multiple purposes. 
    
    For each request, provide:
    1. Spelling and grammar corrections with explanations
    2. Style improvements and suggestions
    3. Tone analysis (professional, casual, formal, friendly)
    4. Content enhancement options
    5. Creative writing suggestions when requested
    
    Format your response as a JSON array with each item containing:
    {
      "id": "request_id",
      "suggestions": [
        {
          "type": "spelling|grammar|style",
          "original": "original text",
          "suggestion": "corrected text", 
          "explanation": "explanation",
          "confidence": 0.95,
          "range": {"index": 0, "length": 5}
        }
      ],
      "tone": "detected tone",
      "confidence": 0.9,
      "enhancedText": "improved version",
      "creativeOptions": ["option1", "option2"]
    }`;

    const userPrompt = requests
      .map((req) => {
        let prompt = `Request ID: ${req.id}\nType: ${req.type}\nText: "${req.text}"`;
        if (req.context) {
          prompt += `\nContext: ${req.context}`;
        }
        return prompt;
      })
      .join("\n\n");

    const response = await fetch(this.baseURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `OpenAI API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No content received from OpenAI");
    }

    try {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      throw new Error(`Failed to parse OpenAI response: ${error}`);
    }
  }

  // Public methods for different types of analysis
  async checkSpellingAndGrammar(
    text: string,
    context?: string
  ): Promise<Suggestion[]> {
    const request: BatchRequest = {
      id: `spell_${Date.now()}_${Math.random()}`,
      type: "grammar",
      text,
      context,
    };

    const response = await this.addToBatch(request);
    return response.suggestions;
  }

  async analyzeTone(
    text: string
  ): Promise<{ tone: string; confidence: number }> {
    const request: BatchRequest = {
      id: `tone_${Date.now()}_${Math.random()}`,
      type: "tone",
      text,
    };

    const response = await this.addToBatch(request);
    return {
      tone: response.tone || "neutral",
      confidence: response.confidence || 0.5,
    };
  }

  async enhanceContent(
    text: string,
    enhancementType: "expand" | "condense" | "rephrase" | "improve"
  ): Promise<string> {
    const request: BatchRequest = {
      id: `enhance_${Date.now()}_${Math.random()}`,
      type: "enhancement",
      text,
      context: enhancementType,
    };

    const response = await this.addToBatch(request);
    return response.enhancedText || text;
  }

  async generateCreative(
    text: string,
    type: "title" | "hook" | "conclusion" | "keywords"
  ): Promise<string[]> {
    const request: BatchRequest = {
      id: `creative_${Date.now()}_${Math.random()}`,
      type: "creative",
      text,
      context: type,
    };

    const response = await this.addToBatch(request);
    return response.creativeOptions || [];
  }

  // Force process any remaining items in batch
  async flushBatch(): Promise<void> {
    if (this.batchQueue.length > 0) {
      await this.processBatch();
    }
  }

  // Update API key
  updateApiKey(newApiKey: string): void {
    this.apiKey = newApiKey;
  }

  // Get batch statistics
  getBatchStats(): { queueLength: number; isProcessing: boolean } {
    return {
      queueLength: this.batchQueue.length,
      isProcessing: this.batchTimeout !== null,
    };
  }
}

// Create singleton instance
let openAIService: OpenAIService | null = null;

export const initializeOpenAI = (apiKey: string): OpenAIService => {
  openAIService = new OpenAIService(apiKey);
  return openAIService;
};

export const getOpenAIService = (): OpenAIService => {
  if (!openAIService) {
    throw new Error(
      "OpenAI service not initialized. Call initializeOpenAI first."
    );
  }
  return openAIService;
};

export type { BatchRequest, BatchResponse, Suggestion };
export default OpenAIService;
