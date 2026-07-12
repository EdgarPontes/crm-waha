import { createOpenAI } from "@ai-sdk/openai";
import { embed } from "ai";

export interface ExtractedContent {
  text: string;
  chunks: string[];
}

export interface DocumentChunk {
  content: string;
  embedding: number[];
  chunkIndex: number;
  totalChunks: number;
}

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

export class RAGService {
  private openai: ReturnType<typeof createOpenAI>;

  constructor(apiKey: string) {
    this.openai = createOpenAI({ apiKey });
  }

  async extractText(fileBuffer: Buffer, fileType: string): Promise<ExtractedContent> {
    switch (fileType) {
      case "pdf":
        return this.extractPDF(fileBuffer);
      case "docx":
        return this.extractDOCX(fileBuffer);
      case "txt":
        return this.extractTXT(fileBuffer);
      case "csv":
        return this.extractCSV(fileBuffer);
      default:
        throw new Error(`Tipo de arquivo não suportado: ${fileType}`);
    }
  }

  private async extractPDF(buffer: Buffer): Promise<ExtractedContent> {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    const text = data.text;
    return {
      text,
      chunks: this.chunkText(text),
    };
  }

  private async extractDOCX(buffer: Buffer): Promise<ExtractedContent> {
    const { extractRawText } = await import("mammoth");
    const { value: text } = await extractRawText({ buffer });
    return {
      text,
      chunks: this.chunkText(text),
    };
  }

  private async extractTXT(buffer: Buffer): Promise<ExtractedContent> {
    const text = buffer.toString("utf-8");
    return {
      text,
      chunks: this.chunkText(text),
    };
  }

  private async extractCSV(buffer: Buffer): Promise<ExtractedContent> {
    const text = buffer.toString("utf-8");
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
    });
    
    // Convert CSV to readable text
    const textContent = records
      .map((row: Record<string, string>) => 
        Object.entries(row)
          .map(([key, value]) => `${key}: ${value}`)
          .join(" | ")
      )
      .join("\n");

    return {
      text: textContent,
      chunks: this.chunkText(textContent),
    };
  }

  chunkText(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = start + CHUNK_SIZE;
      
      // Try to break at sentence boundary
      if (end < text.length) {
        const lastPeriod = text.lastIndexOf(".", end);
        const lastNewline = text.lastIndexOf("\n", end);
        const breakPoint = Math.max(lastPeriod, lastNewline);
        
        if (breakPoint > start + CHUNK_SIZE * 0.5) {
          end = breakPoint + 1;
        }
      }

      chunks.push(text.slice(start, end).trim());
      start = end - CHUNK_OVERLAP;
      
      if (start >= text.length) break;
    }

    return chunks.filter(c => c.length > 50); // Filter very small chunks
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const model = this.openai.embedding("text-embedding-3-small");
    const embeddings: number[][] = [];

    // Process in batches to avoid rate limits
    const batchSize = 100;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const result = await embed({
        model,
        values: batch,
      });
      embeddings.push(...result.embeddings);
    }

    return embeddings;
  }

  async processDocument(
    fileBuffer: Buffer,
    fileType: string
  ): Promise<DocumentChunk[]> {
    const extracted = await this.extractText(fileBuffer, fileType);
    const embeddings = await this.generateEmbeddings(extracted.chunks);

    return extracted.chunks.map((chunk, index) => ({
      content: chunk,
      embedding: embeddings[index],
      chunkIndex: index,
      totalChunks: extracted.chunks.length,
    }));
  }

  async searchSimilar(
    query: string,
    documentEmbeddings: { id: number; embedding: number[]; content: string }[],
    topK: number = 5
  ): Promise<{ id: number; content: string; similarity: number }[]> {
    const queryEmbedding = (await this.generateEmbeddings([query]))[0];
    
    const similarities = documentEmbeddings.map(doc => ({
      id: doc.id,
      content: doc.content,
      similarity: this.cosineSimilarity(queryEmbedding, doc.embedding),
    }));

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export const createRAGService = (apiKey: string) => new RAGService(apiKey);