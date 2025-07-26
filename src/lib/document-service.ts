// lib/document-service.ts
import { supabase, Document } from "./supabase";

export class DocumentService {
  // Helper function to convert HTML to plain text
  private htmlToText(html: string): string {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  }

  // Calculate text metrics
  private calculateMetrics(html: string) {
    const text = this.htmlToText(html);
    const words = text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const syllables = text.toLowerCase().match(/[aeiouy]+/g)?.length || 0;

    const wordCount = words.length;
    const readingTime = Math.ceil(wordCount / 200);
    const fleschScore =
      sentences.length > 0 && wordCount > 0
        ? Math.max(
            0,
            Math.min(
              100,
              Math.round(
                206.835 -
                  1.015 * (wordCount / sentences.length) -
                  84.6 * (syllables / wordCount)
              )
            )
          )
        : 0;

    return { wordCount, readingTime, fleschScore, plainText: text };
  }

  // Create a new document
  async createDocument(
    name: string,
    content: string = "",
    htmlContent: string = ""
  ): Promise<Document | null> {
    try {
      const { wordCount, readingTime, fleschScore, plainText } =
        this.calculateMetrics(htmlContent || content);

      const documentData = {
        name,
        content,
        html_content: htmlContent || content,
        plain_text_content: plainText,
        word_count: wordCount,
        reading_time: readingTime,
        flesch_score: fleschScore,
        is_template: false,
      };

      const { data, error } = await supabase
        .from("documents")
        .insert(documentData)
        .select()
        .single();

      if (error) {
        console.error("Error creating document:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error creating document:", error);
      return null;
    }
  }

  // Get all documents (excluding templates)
  async getDocuments(): Promise<Document[]> {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("is_template", false)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching documents:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error fetching documents:", error);
      return [];
    }
  }

  // Get a specific document
  async getDocument(id: string): Promise<Document | null> {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching document:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error fetching document:", error);
      return null;
    }
  }

  // Update a document
  async updateDocument(
    id: string,
    updates: Partial<Document>
  ): Promise<Document | null> {
    try {
      // Calculate metrics if content is being updated
      if (updates.html_content || updates.content) {
        const htmlContent = updates.html_content || updates.content || "";
        const { wordCount, readingTime, fleschScore, plainText } =
          this.calculateMetrics(htmlContent);

        updates.word_count = wordCount;
        updates.reading_time = readingTime;
        updates.flesch_score = fleschScore;
        updates.plain_text_content = plainText;
      }

      const { data, error } = await supabase
        .from("documents")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating document:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error updating document:", error);
      return null;
    }
  }

  // Delete a document
  async deleteDocument(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("documents").delete().eq("id", id);

      if (error) {
        console.error("Error deleting document:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error deleting document:", error);
      return false;
    }
  }

  // Duplicate a document
  async duplicateDocument(id: string): Promise<Document | null> {
    try {
      const originalDoc = await this.getDocument(id);
      if (!originalDoc) return null;

      return await this.createDocument(
        `${originalDoc.name} (Copy)`,
        originalDoc.content,
        originalDoc.html_content
      );
    } catch (error) {
      console.error("Error duplicating document:", error);
      return null;
    }
  }

  // Get templates
  async getTemplates(): Promise<Document[]> {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("is_template", true)
        .order("name");

      if (error) {
        console.error("Error fetching templates:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error fetching templates:", error);
      return [];
    }
  }

  // Create document from template
  async createFromTemplate(
    templateId: string,
    name?: string
  ): Promise<Document | null> {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", templateId)
        .eq("is_template", true)
        .single();

      if (error || !data) {
        console.error("Error fetching template:", error);
        return null;
      }

      return await this.createDocument(
        name || `New ${data.template_type || "Document"}`,
        data.content,
        data.html_content
      );
    } catch (error) {
      console.error("Error creating from template:", error);
      return null;
    }
  }

  // Auto-save document with debouncing
  private autoSaveTimers: Map<string, NodeJS.Timeout> = new Map();

  async autoSaveDocument(
    id: string,
    content: string,
    htmlContent: string,
    delay: number = 2000
  ): Promise<void> {
    // Clear existing timer
    const existingTimer = this.autoSaveTimers.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(async () => {
      await this.updateDocument(id, {
        content,
        html_content: htmlContent,
      });
      this.autoSaveTimers.delete(id);
    }, delay);

    this.autoSaveTimers.set(id, timer);
  }

  // Search documents
  async searchDocuments(query: string): Promise<Document[]> {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("is_template", false)
        .or(`name.ilike.%${query}%,plain_text_content.ilike.%${query}%`)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error searching documents:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error searching documents:", error);
      return [];
    }
  }

  // Get recent documents
  async getRecentDocuments(limit: number = 10): Promise<Document[]> {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("is_template", false)
        .order("updated_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching recent documents:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error fetching recent documents:", error);
      return [];
    }
  }

  // Batch operations
  async batchDeleteDocuments(ids: string[]): Promise<boolean> {
    try {
      const { error } = await supabase.from("documents").delete().in("id", ids);

      if (error) {
        console.error("Error batch deleting documents:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error batch deleting documents:", error);
      return false;
    }
  }

  // Get documents by tag
  async getDocumentsByTag(tag: string): Promise<Document[]> {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .contains("tags", [tag])
        .eq("is_template", false)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching documents by tag:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error fetching documents by tag:", error);
      return [];
    }
  }

  // Add tags to document
  async addTagsToDocument(id: string, tags: string[]): Promise<boolean> {
    try {
      const document = await this.getDocument(id);
      if (!document) return false;

      const existingTags = document.tags || [];
      const newTags = [...new Set([...existingTags, ...tags])];

      const { error } = await supabase
        .from("documents")
        .update({ tags: newTags })
        .eq("id", id);

      if (error) {
        console.error("Error adding tags:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error adding tags:", error);
      return false;
    }
  }

  // Get document statistics
  async getDocumentStats(): Promise<{
    totalDocuments: number;
    totalWords: number;
    averageReadingTime: number;
    averageFleschScore: number;
    mostUsedTags: Array<{ tag: string; count: number }>;
  }> {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("word_count, reading_time, flesch_score, tags")
        .eq("is_template", false);

      if (error) {
        console.error("Error fetching document stats:", error);
        return {
          totalDocuments: 0,
          totalWords: 0,
          averageReadingTime: 0,
          averageFleschScore: 0,
          mostUsedTags: [],
        };
      }

      const documents = data || [];
      const totalDocuments = documents.length;
      const totalWords = documents.reduce(
        (sum, doc) => sum + (doc.word_count || 0),
        0
      );
      const averageReadingTime =
        totalDocuments > 0
          ? Math.round(
              documents.reduce((sum, doc) => sum + (doc.reading_time || 0), 0) /
                totalDocuments
            )
          : 0;
      const averageFleschScore =
        totalDocuments > 0
          ? Math.round(
              documents.reduce((sum, doc) => sum + (doc.flesch_score || 0), 0) /
                totalDocuments
            )
          : 0;

      // Calculate most used tags
      const tagCounts: { [tag: string]: number } = {};
      documents.forEach((doc) => {
        if (doc.tags) {
          doc.tags.forEach((tag) => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        }
      });

      const mostUsedTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count }));

      return {
        totalDocuments,
        totalWords,
        averageReadingTime,
        averageFleschScore,
        mostUsedTags,
      };
    } catch (error) {
      console.error("Error fetching document stats:", error);
      return {
        totalDocuments: 0,
        totalWords: 0,
        averageReadingTime: 0,
        averageFleschScore: 0,
        mostUsedTags: [],
      };
    }
  }
}

// Singleton instance
export const documentService = new DocumentService();
