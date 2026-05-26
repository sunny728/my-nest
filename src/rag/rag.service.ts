import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
import { Injectable } from '@nestjs/common';
import { Config } from 'src/config';
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

@Injectable()
export class RagService {
  private llm = new ChatOllama({
    baseUrl: Config.ollama.host,
    model: Config.ollama.chatModel,
    temperature: Config.ollama.temperature,
    think: false,
    numPredict: 512,
  });
  // 向量化模型： 把文本转成数字向量（用于比较相似度）
  private embeddings = new OllamaEmbeddings({
    model: Config.ollama.embeddingModel,
    baseUrl: Config.ollama.host,
  });
  // 内存向量库（未初始化时为null）
  private vectorStore: MemoryVectorStore | null = null;
  private docCount = 0;

  // 加载文档到向量库
  async loadDocuments(
    documents: { id: string; content: string; source?: string }[],
  ) {
    // 文本拆分器
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 50,
      separators: ['\n\n', '\n', '。', '!', '?', ' ', ''],
    });
    const allDocs: Document[] = [];
    for (const doc of documents) {
      const chunks = await splitter.createDocuments(
        [doc.content],
        [{ docId: doc.id, source: doc.source || doc.id }],
      );
      allDocs.push(...chunks);
    }
    // fromDocuments 批量向量化所有文档块，存入内存向量库
    // 内部调用MemoryVectorStore转成向量
    this.vectorStore = await MemoryVectorStore.fromDocuments(
      allDocs,
      this.embeddings,
    );
    this.docCount = documents.length;

    return {
      success: true,
      originalDocs: this.docCount,
      totalChunk: allDocs.length,
      message: `加载${this.docCount}篇文档，总共有${allDocs.length}块`,
    };
  }

  getStatus() {
    return {
      loaded: !!this.vectorStore,
      docCount: this.docCount,
      message: this.vectorStore
        ? `已加载 ${this.docCount}篇文档`
        : '知识库是空的，请先加载文档',
    };
  }

  async search(query: string, topK: number = 3) {
    if (!this.vectorStore) {
      return {
        error: '请先调用/rag/load加载文档，文档向量化存储',
      };
    }
    // similaritySearchWithScore
    // 1. 把query向量化（调用embedding.embedQuery）
    // 2.和向量库里面的所有文档 向量计算 余弦相似度
    // 3. 按照相似度排序，返回前topK个数据
    const results = await this.vectorStore.similaritySearchWithScore(
      query,
      topK,
    );

    return {
      query,
      results: results.map(([doc, score]) => ({
        content: doc.pageContent,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        source: doc.metadata.source,
        score: parseFloat(score.toFixed(4)),
      })),
    };
  }

  async query(question: string, topK: number = 3) {
    if (!this.vectorStore) {
      return {
        error: '请先调用/rag/load加载文档，文档向量化存储',
      };
    }
    // 1. 检索相关的文档块
    const retrieved = await this.vectorStore.similaritySearchWithScore(
      question,
      topK,
    );
    if (!retrieved.length) {
      return {
        question,
        answer: '知识库中没有检索到相关内容',
        source: [],
      };
    }
    // step2 把检索结果拼成context字符串
    // [1]第一块内容 \n\n [2]第二块内容
    // 编号 方便模型在回答时引用： “根据[1]... 根据[2]”
    const content = retrieved
      .map(([doc], i) => `[${i + 1}] ${doc.pageContent}`)
      .join('\n\n');

    // step3 rag prompt 严格限制模型只能用参考资料回答
    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `你是知识库回答助手，严格基于参考资料回答。
        规则：
        1. 只根据参考资料内容回答，不能使用资料外的知识
        2. 资料中没有相关信息，回答"知识库中暂无相关内容"
        3. 回答简洁准确，使用中文
        参考资料：{content}`,
      ],
      ['human', '{question}'],
    ]);
    // step4 调用模型生成回答
    const chain = prompt.pipe(this.llm).pipe(new StringOutputParser());
    const answer = await chain.invoke({ content, question });

    return {
      question,
      answer,
      sources: retrieved.map(([doc, score]) => ({
        content: doc.pageContent,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        source: doc.metadata.source,
        score: parseFloat(score.toFixed(4)),
      })),
    };
  }

  clearKnowledge() {
    this.vectorStore = null;
    this.docCount = 0;
    return { success: true, message: '知识库已清空' };
  }
}
