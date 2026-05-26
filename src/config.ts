export const Config = {
  ollama: {
    host: process.env.OLLAMA_HOST || 'http://localhost:11434',
    chatModel: process.env.OLLAMA_CHAT_MODEL || 'qwen2.5:7b',
    embeddingModel:
      process.env.OLLAMA_EMBEDDING_MODEL || 'mxbai-embed-large:latest',
    temperature: parseFloat(process.env.OLLAMA_TEMPERATURE || '0.3'),
  },
};
