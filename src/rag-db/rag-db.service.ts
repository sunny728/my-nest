import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
import { Body, Injectable } from '@nestjs/common';
import { Config } from 'src/config';
import { Document } from '@langchain/core/documents';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Pool } from 'pg';
import {
  PGVectorStore,
  DistanceStrategy,
} from '@langchain/community/vectorstores/pgvector';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

@Injectable()
export class RagDbService {
  private llm = new ChatOllama({
    model: Config.ollama.chatModel,
    baseUrl: Config.ollama.host,
    temperature: Config.ollama.temperature,
    think: false,
    numPredict: 512,
  });
  private embedding = new OllamaEmbeddings({
    model: Config.ollama.embeddingModel,
    baseUrl: Config.ollama.host,
  });
  private pgPool = new Pool({
    connectionString: process.env['DATABASE_URL'],
    // 连接池配置（可选，生产环境建议显式配置）
    max: 10, // 最大连接数，根据并发量调整
    idleTimeoutMillis: 30000, // 空闲连接 30 秒后释放
    connectionTimeoutMillis: 5000, // 获取连接超时 5 秒
  });
  private pgVectorStoreConfig = {
    pool: this.pgPool,
    collectionName: 'rag-knowledge-base',
    collectionTableName: 'langchain_pg_collection',
    tableName: 'langchain_pg_embedding',
    columns: {
      idColumnName: 'id',
      vectoreColumnName: 'embedding',
      contentColumnName: 'content',
      metadataColumnName: 'metadata',
    },
    distanceStrategy: 'cosine' as DistanceStrategy,
  };
  private docCount = 0;

  async loadDocuments(
    documents: { id: string; content: string; source?: string }[],
  ) {
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

    await PGVectorStore.fromDocuments(
      allDocs,
      this.embedding,
      this.pgVectorStoreConfig,
    );
    this.docCount = documents.length;
    return {
      success: true,
      originalDocuments: this.docCount,
      totalChunks: allDocs.length,
      message: `加载${this.docCount}篇文档，总共有${allDocs.length}块`,
    };
  }

  async getStatus() {
    try {
      const results = await this.pgPool.query(
        `SELECT COUNT(*) FROM ${this.pgVectorStoreConfig.tableName} WHERE connection_id = (SELECT uuid FROM langchain_pg_collection WHERE name=$1)`,
        [this.pgVectorStoreConfig.collectionName],
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      const vectorCount = parseInt(results.rows[0].count, 10);

      return {
        mode: 'pgVector',
        loaded: vectorCount > 0,
        vectorCount,
        collection: this.pgVectorStoreConfig.collectionName,
        message:
          vectorCount > 0
            ? `PostgreSQL 向量库中有 ${vectorCount} 个文档块`
            : '向量库为空，请先加载文档',
      };
    } catch (e) {
      console.error('获取状态失败', e);
      return {
        mode: 'PGVectorStore',
        loaded: false,
        vectorCount: 0,
        message: '向量表未初始化',
      };
    }
  }

  async search(query: string, topK: number = 3) {
    const vectorStore = await PGVectorStore.initialize(
      this.embedding,
      this.pgVectorStoreConfig,
    );

    const results = await vectorStore.similaritySearchWithScore(query, topK);
    return {
      query,
      results: results.map(([doc, score]) => ({
        content: doc.pageContent,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        source: doc.metadata.source,
        score: parseFloat(score.toFixed(4)),
        similarity: (1 - parseFloat(score.toFixed(4))).toFixed(4),
        rawDistance: parseFloat(score.toFixed(4)),
      })),
    };
  }
  async query(question: string, topK: number = 3) {
    const vectorStore = await PGVectorStore.initialize(
      this.embedding,
      this.pgVectorStoreConfig,
    );

    const retrieved = await vectorStore.similaritySearchWithScore(
      question,
      topK,
    );
    const filtered = retrieved.filter(([, score]) => score <= 0.5);
    if (!filtered.length) {
      return { question, answer: '知识库中没有找到相关内容', sources: [] };
    }
    const context = filtered
      .map(([doc], i) => `[${i + 1}] ${doc.pageContent}`)
      .join('\n\n');
    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `你是知识库问答助手，严格基于参考资料回答。
          规则：
          1. 只根据参考资料内容回答，不能使用资料外的知识
          2. 资料中没有相关信息，回答"知识库中暂无相关内容"
          3. 回答简洁准确，使用中文

          参考资料：
          {context}`,
      ],
      ['human', '{question}'],
    ]);
    const chains = prompt.pipe(this.llm).pipe(new StringOutputParser());
    const answer = await chains.invoke({ context, question });
    return {
      question,
      answer,
      sources: filtered.map(([doc, score]) => ({
        content: doc.pageContent,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        source: doc.metadata.source,
        similarity: parseFloat((1 - score).toFixed(4)),
      })),
    };
  }
  async clearKnowledge() {
    await this.pgPool.query(
      `DELETE FROM langchain_pg_embedding
       WHERE collection_id = (
         SELECT uuid FROM langchain_pg_collection WHERE name = $1
       )`,
      [this.pgVectorStoreConfig.collectionName],
    );
    await this.pgPool.query(
      `DELETE FROM langchain_pg_collection WHERE name = $1`,
      [this.pgVectorStoreConfig.collectionName],
    );
    this.docCount = 0;
    return {
      success: true,
      message: `已清空 collection：${this.pgVectorStoreConfig.collectionName}`,
    };
  }
}
