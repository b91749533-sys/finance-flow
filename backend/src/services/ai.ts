import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API client
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Get generative model helper
const getModel = () => {
  if (!genAI) return null;
  return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
};

/**
 * Chatbot interface with context of user's financial details
 */
export const generateFinancialChat = async (
  prompt: string,
  history: { role: 'user' | 'model'; parts: string }[],
  contextData: {
    userName: string;
    accounts: any[];
    transactions: any[];
    budgets: any[];
    savingsGoals: any[];
  }
): Promise<string> => {
  const model = getModel();
  if (!model) {
    return "Hi! I'm Manssouri AI, your AI Financial Assistant. It seems my API Key is not configured correctly on the backend, but I can tell you that in a real production environment, I would analyze your accounts and help you track your spending, manage budgets, and answer financial questions. Please check the backend .env file.";
  }

  // format financial context for the prompt
  const accountsContext = contextData.accounts
    .map((a) => `- ${a.name} (${a.type}): ${a.currency} ${a.balance}`)
    .join('\n');

  const transactionsContext = contextData.transactions
    .slice(0, 30) // Limit to recent 30 transactions to prevent token overflow
    .map((t) => `- ${t.date.toISOString().split('T')[0]} | ${t.description} | ${t.type} | ${t.category?.name || 'Uncategorized'} | ${t.amount} DH`)
    .join('\n');

  const budgetsContext = contextData.budgets
    .map((b) => `- Category ${b.category.name}: Limit ${b.amountLimit} DH (Period: ${b.period})`)
    .join('\n');

  const goalsContext = contextData.savingsGoals
    .map((g) => `- Goal: "${g.name}" | Target: ${g.targetAmount} DH | Current: ${g.currentAmount} DH | Deadline: ${g.deadline.toISOString().split('T')[0]}`)
    .join('\n');

  const systemInstructions = `
You are "Manssouri AI", a premium, friendly personal finance AI assistant for the Manssouri Finance Management Platform.
You are helping user ${contextData.userName}.
You have read-only access to their current financial portfolio. Do not invent details not provided.

Here is the user's financial portfolio context:

ACCOUNTS:
${accountsContext || 'No accounts created.'}

RECENT TRANSACTIONS:
${transactionsContext || 'No transactions found.'}

MONTHLY BUDGETS:
${budgetsContext || 'No budgets configured.'}

SAVINGS GOALS:
${goalsContext || 'No savings goals configured.'}

Instructions:
1. Provide extremely concise, structured, and helpful responses.
2. Use markdown formatting like bold text, bullet points, and tables where appropriate.
3. Keep financial advice realistic, conservative, and educational.
4. If asked to query transactions, use the context provided. If the user asks about something outside the context (e.g. transactions older than the recent 30), politely inform them that you can see their recent transactions and overall statistics, and suggest they filter the transactions list on the transactions tab.
5. If the user asks about categories that increased the most or largest expenses, calculate it using the context provided.
`;

  try {
    const formattedHistory = history.map((h) => ({
      role: h.role === 'model' ? 'model' : 'user',
      parts: [{ text: h.parts }],
    }));

    // Start chat session with system instruction prefixed to first message or inside chat start
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: systemInstructions + '\n\nUnderstand the context. Please reply acknowledging you are ready.' }],
        },
        {
          role: 'model',
          parts: [{ text: 'Hello! I am Manssouri AI, your AI Financial Assistant. I have analyzed your accounts, transactions, budgets, and savings goals. How can I help you optimize your finances today?' }],
        },
        ...formattedHistory,
      ],
    });

    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error calling Gemini API for chat:', error);
    return 'Apologies, I encountered an issue analyzing your financial data. Please try again.';
  }
};

/**
 * Smart transaction categorization suggestions
 */
export const predictCategory = async (
  description: string,
  categories: { id: string; name: string; type: string }[]
): Promise<string | null> => {
  const model = getModel();
  if (!model || categories.length === 0) return null;

  const categoriesContext = categories.map((c) => `- Name: "${c.name}", Type: "${c.type}" (ID: ${c.id})`).join('\n');

  const prompt = `
Task: Categorize a financial transaction based on its description.
Description: "${description}"

Here are the available target categories:
${categoriesContext}

Reply ONLY with the exact ID of the category that best matches the transaction. If there's no clear match, output "null". Do not add any punctuation, letters, markdown, or explanation.
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const categoryId = response.text().trim();
    
    // Validate if the returned value is one of the category IDs
    const matched = categories.find((c) => c.id === categoryId);
    return matched ? matched.id : null;
  } catch (error) {
    console.error('Error suggesting category via Gemini:', error);
    return null;
  }
};

/**
 * Generate smart financial insights and budget recommendations
 */
export const getSmartBudgetRecommendations = async (
  userName: string,
  spendingByCategory: Record<string, number>,
  activeBudgets: any[],
  savingsGoals: any[]
): Promise<string> => {
  const model = getModel();
  if (!model) {
    return "Ensure Gemini API Key is configured to receive automated budget optimizations.";
  }

  const spendingContext = Object.entries(spendingByCategory)
    .map(([catName, amount]) => `- Category: ${catName} | Spent this month: $${amount.toFixed(2)}`)
    .join('\n');

  const budgetsContext = activeBudgets
    .map((b) => `- Category: ${b.category.name} | Budget Limit: $${b.amountLimit}`)
    .join('\n');

  const goalsContext = savingsGoals
    .map((g) => `- Savings Goal: "${g.name}" | Target: $${g.targetAmount} | Current: $${g.currentAmount} | Deadline: ${g.deadline}`)
    .join('\n');

  const prompt = `
Task: Analyze user spending patterns against their budget and goals, then provide 3 actionable, premium financial tips.
User Name: ${userName}

Current Monthly Spending by Category:
${spendingContext || '- No spending recorded this month.'}

Active Budgets:
${budgetsContext || '- No active budgets set.'}

Active Savings Goals:
${goalsContext || '- No savings goals configured.'}

Please output the tips in a neat markdown bullet list. Focus on:
1. Identifying categories where they are overspending or approaching budget limits.
2. Direct recommendations on how to allocate extra funds to reach active savings goals faster.
3. Suggesting budget limits for categories that currently do not have budgets.

Format the output clearly and professionally, starting with a polite heading. Keep the text engaging and friendly.
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error fetching budget recommendations:', error);
    return 'Could not load personalized recommendations at this time.';
  }
};

/**
 * Detect subscription transactions
 */
export const detectSubscriptions = async (
  transactions: any[]
): Promise<{ name: string; amount: number; billingCycle: string; confidence: 'high' | 'medium'; category: string }[]> => {
  const model = getModel();
  if (!model || transactions.length === 0) return [];

  // Format transactions for model input
  const txContext = transactions
    .map((t) => `- Date: ${t.date.toISOString().split('T')[0]} | Descr: "${t.description}" | Amount: $${t.amount} | Cat: "${t.category?.name || ''}"`)
    .join('\n');

  const prompt = `
Task: Analyze a list of transactions to detect potential active monthly or annual subscriptions (e.g. Netflix, Spotify, gym memberships, utilities, AWS).
A subscription is characterized by:
- Regular intervals (e.g., similar date each month).
- Constant or near-constant amount.
- Typical subscription-like names.

Transaction list:
${txContext}

Respond ONLY with a JSON array of objects representing detected subscriptions. Do not include any formatting blocks, markup, or explanations. Use this JSON format:
[
  {
    "name": "Subscription Name",
    "amount": 14.99,
    "billingCycle": "monthly",
    "confidence": "high",
    "category": "Entertainment"
  }
]

If no subscriptions are detected, output an empty array: []
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let jsonText = response.text().trim();
    
    // Clean potential markdown output
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.substring(7, jsonText.length - 3).trim();
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.substring(3, jsonText.length - 3).trim();
    }

    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Error detecting subscriptions:', error);
    return [];
  }
};
