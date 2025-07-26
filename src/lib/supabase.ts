// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database Types
export interface Document {
  id: string;
  name: string;
  content: string;
  html_content: string;
  plain_text_content: string;
  word_count: number;
  reading_time: number;
  flesch_score: number;
  created_at: string;
  updated_at: string;
  is_template: boolean;
  template_type?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

// Simple Database Schema SQL (No Users, No Authentication)
export const DATABASE_SCHEMA = `
-- Documents table (simplified - no users)
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  html_content TEXT NOT NULL DEFAULT '',
  plain_text_content TEXT NOT NULL DEFAULT '',
  word_count INTEGER DEFAULT 0,
  reading_time INTEGER DEFAULT 0,
  flesch_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_template BOOLEAN DEFAULT FALSE,
  template_type TEXT,
  tags TEXT[],
  metadata JSONB,
  
  -- Constraints
  CONSTRAINT documents_name_length CHECK (char_length(name) <= 255),
  CONSTRAINT documents_word_count_positive CHECK (word_count >= 0),
  CONSTRAINT documents_reading_time_positive CHECK (reading_time >= 0),
  CONSTRAINT documents_flesch_score_range CHECK (flesch_score >= 0 AND flesch_score <= 100)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_template ON documents(is_template, template_type);
CREATE INDEX IF NOT EXISTS idx_documents_name ON documents(name);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default templates
INSERT INTO documents (name, content, html_content, plain_text_content, is_template, template_type) VALUES
('Blog Post Template', 
'# [Your Blog Title]

## Introduction
[Start with a compelling hook that grabs the reader''s attention]

## Main Content
### Key Point 1
[Develop your first main point with supporting evidence]

### Key Point 2
[Develop your second main point with supporting evidence]

### Key Point 3
[Develop your third main point with supporting evidence]

## Conclusion
[Summarize your main points and provide a call to action]', 
'<h1>[Your Blog Title]</h1><h2>Introduction</h2><p>[Start with a compelling hook that grabs the reader''s attention]</p><h2>Main Content</h2><h3>Key Point 1</h3><p>[Develop your first main point with supporting evidence]</p><h3>Key Point 2</h3><p>[Develop your second main point with supporting evidence]</p><h3>Key Point 3</h3><p>[Develop your third main point with supporting evidence]</p><h2>Conclusion</h2><p>[Summarize your main points and provide a call to action]</p>',
'[Your Blog Title] Introduction [Start with a compelling hook that grabs the reader''s attention] Main Content Key Point 1 [Develop your first main point with supporting evidence] Key Point 2 [Develop your second main point with supporting evidence] Key Point 3 [Develop your third main point with supporting evidence] Conclusion [Summarize your main points and provide a call to action]',
TRUE, 'Blog Post'),

('Email Template',
'Subject: [Clear and concise subject line]

Dear [Recipient Name],

[Opening paragraph - establish context and purpose]

[Body paragraph(s) - provide details, information, or request]

[Closing paragraph - summarize and next steps]

Best regards,
[Your Name]',
'<p><strong>Subject:</strong> [Clear and concise subject line]</p><p>Dear [Recipient Name],</p><p>[Opening paragraph - establish context and purpose]</p><p>[Body paragraph(s) - provide details, information, or request]</p><p>[Closing paragraph - summarize and next steps]</p><p>Best regards,<br>[Your Name]</p>',
'Subject: [Clear and concise subject line] Dear [Recipient Name], [Opening paragraph - establish context and purpose] [Body paragraph(s) - provide details, information, or request] [Closing paragraph - summarize and next steps] Best regards, [Your Name]',
TRUE, 'Email'),

('Essay Template',
'# [Essay Title]

## Introduction
[Thesis statement and overview of main points]

## Body Paragraph 1
[Topic sentence, supporting evidence, analysis]

## Body Paragraph 2
[Topic sentence, supporting evidence, analysis]

## Body Paragraph 3
[Topic sentence, supporting evidence, analysis]

## Conclusion
[Restate thesis and summarize main points]',
'<h1>[Essay Title]</h1><h2>Introduction</h2><p>[Thesis statement and overview of main points]</p><h2>Body Paragraph 1</h2><p>[Topic sentence, supporting evidence, analysis]</p><h2>Body Paragraph 2</h2><p>[Topic sentence, supporting evidence, analysis]</p><h2>Body Paragraph 3</h2><p>[Topic sentence, supporting evidence, analysis]</p><h2>Conclusion</h2><p>[Restate thesis and summarize main points]</p>',
'[Essay Title] Introduction [Thesis statement and overview of main points] Body Paragraph 1 [Topic sentence, supporting evidence, analysis] Body Paragraph 2 [Topic sentence, supporting evidence, analysis] Body Paragraph 3 [Topic sentence, supporting evidence, analysis] Conclusion [Restate thesis and summarize main points]',
TRUE, 'Essay')
ON CONFLICT DO NOTHING;

-- Disable Row Level Security (since we're not using authentication)
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
`;
