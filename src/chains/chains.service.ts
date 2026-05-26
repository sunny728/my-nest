import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import {
  RunnablePassthrough,
  RunnableSequence,
} from '@langchain/core/runnables';
import { ChatOllama } from '@langchain/ollama';
import { Injectable } from '@nestjs/common';
import { Config } from 'src/config';

@Injectable()
export class ChainsService {
  private llm = new ChatOllama({
    baseUrl: Config.ollama.host,
    model: Config.ollama.chatModel,
    temperature: Config.ollama.temperature,
    think: false,
    numPredict: 512,
    // other params...
  });
  // 多步骤链式调用示例
  // 文章润色的例子，第一步先对文章进行分析，提取出文章的主题、风格、存在的问题等关键信息；
  // 第二步根据第一步的分析结果对文章进行润色，改进文章的表达，结构，用词等方面，使文章更流畅清晰有吸引力。
  async polish(article: string) {
    const analysisPrompt = ChatPromptTemplate.fromMessages([
      ['system', '你是一个文章分析助手，只输出问题列表，不要其他内容'],
      ['human', '只分析这篇文章出现的问题：{article}'],
    ]);
    const polishPrompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        '你是一个文章润色助手，根据分析的问题列表对文章进行润色，改进文章的表达，结构，用词等方面，使文章更流畅清晰有吸引力。',
      ],
      [
        'human',
        '请根据以下分析结果润色这篇文章：{analysis}，文章内容：{article}',
      ],
    ]);
    // 第一条chain article字符串 -> 分析 -> analysis字符串
    const analysisChain = analysisPrompt
      .pipe(this.llm)
      .pipe(new StringOutputParser());

    // 第二条chain
    // 第一步骤chain 保留article原文 + 调用analysisChain得到的analysis字符串
    // 第二步骤chain article字符串 + analysis字符串 -> 润色后的文章字符串 polishChain
    // 最后将整个流程串联成一个RunnableSequence，输入article字符串，输出润色后的文章字符串
    // RunnableSequence会自动将输入传递给第一个chain，得到的输出传递给第二个chain，最终返回第二个chain的输出
    // RunnablePassthrough是一个特殊的runnable，表示直接传递输入，不做任何处理，适用于需要在多个chain之间共享某个输入的场景
    const fullChain = RunnableSequence.from([
      {
        article: new RunnablePassthrough(), // 保留原文字符串，直接传递给第二步骤chain
        analysis: analysisChain, // 调用第一步骤chain得到分析结果字符串，传递给第二步骤chain
      },
      polishPrompt.pipe(this.llm).pipe(new StringOutputParser()), // 调用润色chain得到润色后的文章字符串
    ]);
    const polishedArticle = await fullChain.invoke({
      article,
    });
    return {
      original: article,
      polished: polishedArticle,
    };
  }

  // 顺序链 生成博客的例子
  // keyword -> 生成博客大纲 -> 根据大纲生成博客内容 -> seo标题
  async generateBlog(keywords: string, style: string) {
    const outlinePrompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        '你是一个博客大纲生成助手，根据用户提供的关键词和风格要求生成一篇博客文章的大纲。',
      ],
      [
        'human',
        '请根据以下关键词和风格要求生成博客文章的大纲，关键词是：{keywords}，风格是：{style}',
      ],
    ]);
    const articlePrompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        '你是一个博客文章生成助手，根据用户提供的博客大纲和风格要求生成博客文章，要求内容丰富有吸引力。',
      ],
      [
        'human',
        '请根据以下博客大纲和风格要求生成一篇博客文章，要求内容丰富有吸引力。博客大纲：{outline}',
      ],
    ]);
    const titlePrompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        '你是一个SEO标题生成助手，根据用户提供的博客文章和风格要求生成三个SEO标题。',
      ],
      [
        'human',
        '请根据以下博客文章和风格要求生成三个SEO标题。博客文章内容：{article}',
      ],
    ]);
    const outlineChain = outlinePrompt
      .pipe(this.llm)
      .pipe(new StringOutputParser());
    const articleChain = articlePrompt
      .pipe(this.llm)
      .pipe(new StringOutputParser());
    const titleChain = titlePrompt
      .pipe(this.llm)
      .pipe(new StringOutputParser());
    const outline = await outlineChain.invoke({
      keywords,
      style,
    });
    const article = await articleChain.invoke({
      outline,
    });
    const titles = await titleChain.invoke({
      article,
    });
    return {
      keywords,
      style,
      outline,
      article,
      titles,
    };
  }
  // 条件链 智能路由的例子
  // 用户输入一个问题，模型会根据问题的内容和类型来判断应该调用哪个功能模块来处理这个问题，比如翻译，总结，分类，代码审查等功能模块。模型会根据预设的规则或者学习到的经验来做出这个判断，并将问题路由到对应的功能模块进行处理，最后将处理结果返回给用户。
  async smarterRouter(question: string) {
    // 第一步 分类
    const routerPrompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `分析用户的问题，只输出分类标签：
         技术问题-TECH
         退款问题-REFUND
         订单问题-ORDER
         投诉和建议-COMPLAINT
         其他-OTHER
        `,
      ],
      ['human', '{question}'],
    ]);
    const routerChain = routerPrompt
      .pipe(this.llm)
      .pipe(new StringOutputParser());
    const category = await routerChain.invoke({
      question,
    });
    // 第二步 根据分类调用不同的功能模块
    const systemMap: Record<string, string> = {
      TECH: '你是一个技术支持助手，帮助用户解决技术问题。',
      REFUND: '你是一个客服助手，帮助用户处理退款问题。',
      ORDER: '你是一个客服助手，帮助用户处理订单问题。',
      COMPLAINT: '你是一个客服助手，帮助用户处理投诉和建议。',
      OTHER: '你是一个客服助手，帮助用户处理其他问题。',
    };
    // 第三步 把系统角色信息和用户问题一起传给模型，让模型根据系统角色的指引来回答用户的问题
    const responsePrompt = ChatPromptTemplate.fromMessages([
      ['system', systemMap[category] || systemMap['OTHER']],
      ['human', '{question}'],
    ]);
    const responseChain = responsePrompt
      .pipe(this.llm)
      .pipe(new StringOutputParser());
    const response = await responseChain.invoke({
      question,
    });
    return {
      question,
      category,
      response,
    };
  }
}
