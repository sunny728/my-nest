import { StringOutputParser } from '@langchain/core/output_parsers';
import {
  ChatPromptTemplate,
  FewShotPromptTemplate,
  PromptTemplate,
} from '@langchain/core/prompts';
import { ChatOllama } from '@langchain/ollama';
import { Injectable } from '@nestjs/common';
import { Config } from 'src/config';

@Injectable()
export class PromptService {
  private llm = new ChatOllama({
    baseUrl: Config.ollama.host,
    model: Config.ollama.chatModel,
    temperature: Config.ollama.temperature,
    think: false,
    numPredict: 512,
    // other params...
  });

  async translate(text: string, lang: string) {
    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `你是一个翻译助手，只输出翻译结果，帮助用户将文本翻译成指定的语言。`,
      ],
      ['user', `请翻译以下文本为${lang}:${text}`],
    ]);
    const chain = prompt.pipe(this.llm).pipe(new StringOutputParser());
    const response = await chain.invoke({
      text,
      lang,
    });
    return {
      original: text,
      translated: response,
    };
  }

  async summarize(text: string, maxWords?: number) {
    const prompt = ChatPromptTemplate.fromTemplate(
      `请总结以下文本，要求总结内容不超过${maxWords || 100}字：${text}`,
    );
    const chain = prompt.pipe(this.llm).pipe(new StringOutputParser());
    const response = await chain.invoke({
      text,
      maxWords,
    });
    return {
      original: text,
      maxWords,
      summarized: response,
    };
  }

  async classify(text: string) {
    const examples = [
      { text: '今天天气真好', category: '正面' },
      { text: '我讨厌这个产品', category: '负面' },
      { text: '这个电影还行', category: '中性' },
      { text: '这个餐厅的服务太差了', category: '负面' },
      { text: '我喜欢这个手机', category: '正面' },
    ];

    const examplePrompt = PromptTemplate.fromTemplate(
      '输入：{text}，输出：{category}',
    );
    const fewShotPrompt = new FewShotPromptTemplate({
      examples,
      examplePrompt,
      prefix: '请将以下文本分类到正面、负面或中性类别中：',
      suffix: '输入：{text}，输出：',
      inputVariables: ['text'],
    });
    // const prompt = await fewShotPrompt.format({ text });
    const chain = fewShotPrompt.pipe(this.llm).pipe(new StringOutputParser());
    const response = await chain.invoke({
      text,
    });
    return {
      original: text,
      classification: response,
    };
  }

  async codeReview(code: string, language: string) {
    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `你是一个资深的{language}开发者，负责审查用户提交的代码，并提供改进建议。请只输出审查结果，不要包含任何多余的解释。`,
      ],
      ['user', `请审查以下{language}代码，并提出改进建议：\n{code}`],
    ]);
    const chain = prompt.pipe(this.llm).pipe(new StringOutputParser());
    const response = await chain.invoke({
      code,
      language,
    });
    return {
      original: code,
      language,
      review: response,
    };
  }
}
