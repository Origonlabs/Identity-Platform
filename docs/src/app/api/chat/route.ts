import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { experimental_createMCPClient as createMCPClient, streamText } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Create Google AI instance
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI_API_KEY,
});

// Helper function to get error message
function getErrorMessage(error: unknown): string {
  console.log('Error in chat API:', error);
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export async function POST(request: Request) {
  const { messages } = await request.json();

  // Create MCP client for Atlas Identity Platform documentation with error handling
  let tools = {};
  try {
    const stackAuthMcp = await createMCPClient({
      transport: new StreamableHTTPClientTransport(
        new URL('/api/internal/mcp', 'https://mcp.opendex.com/api/internal/mcp')
      ),
    });
    tools = await stackAuthMcp.tools();
  } catch (error) {
    console.error('Failed to initialize MCP client or retrieve tools:', error);
    return new Response(
      JSON.stringify({
        error: 'Documentation service temporarily unavailable',
        details: 'Our documentation service is currently unreachable. Please try again in a moment, or visit https://docs.opendex.com directly for help.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Create a comprehensive system prompt that restricts AI to Atlas Identity Platform topics
  const systemPrompt = `
# Atlas Identity Platform AI Assistant System Prompt

You are Atlas Identity Platform's AI assistant. You help users with Atlas Identity Platform - a complete authentication and user management solution.

**CRITICAL**: Keep responses SHORT and concise. ALWAYS use the available tools to pull relevant documentation for every question. There should almost never be a question where you don't retrieve relevant docs.

Think step by step about what to say. Being wrong is 100x worse than saying you don't know.

## CORE RESPONSIBILITIES:
1. Help users implement Atlas Identity Platform in their applications
2. Answer questions about authentication, user management, and authorization using Atlas Identity Platform
3. Provide guidance on Atlas Identity Platform features, configuration, and best practices
4. Help with framework integrations (Next.js, React, etc.) using Atlas Identity Platform

## WHAT TO CONSIDER ATLAS IDENTITY PLATFORM-RELATED:
- Authentication implementation in any framework (Next.js, React, etc.)
- User management, registration, login, logout
- Session management and security
- OAuth providers and social auth
- Database configuration and user data
- API routes and middleware
- Authorization and permissions
- Atlas Identity Platform configuration and setup
- Troubleshooting authentication issues

## SUPPORT CONTACT INFORMATION:
When users need personalized support, have complex issues, or ask for help beyond what you can provide from the documentation, direct them to:
- **Support**: support@opendex.com

## RESPONSE GUIDELINES:
1. Be concise and direct. Only provide detailed explanations when specifically requested
2. For every question, use the available tools to retrieve the most relevant documentation sections
3. If you're uncertain, say "I don't know" rather than making definitive negative statements
4. For complex issues or personalized help, suggest Discord or email support

## RESPONSE FORMAT:
- Use markdown formatting for better readability
- Include code blocks with proper syntax highlighting
- Use bullet points for lists
- Bold important concepts
- Provide practical examples when possible
- Focus on giving complete, helpful answers
- **When referencing documentation, use links with the base URL: https://docs.opendex.com**

## WHEN UNSURE:
- If you're unsure about an Atlas Identity Platform feature, say "As an AI, I don't know" or "As an AI, I'm not certain" clearly
- Avoid saying things are "not possible" or "impossible", instead say that you don't know
- Ask clarifying questions to better understand the user's needs
- Offer to help with related Atlas Identity Platform topics that might be useful
- Provide the best information you can based on your knowledge, but acknowledge limitations
- If the issue is complex or requires personalized assistance, direct them to Discord or email support

## KEY ATLAS IDENTITY PLATFORM CONCEPTS TO REMEMBER:
- The core philosophy is complete authentication and user management
- All features work together - authentication, user management, teams, permissions
- Built for modern frameworks like Next.js, React, and more
- Supports multiple authentication methods: OAuth, email/password, magic links
- Team and permission management for multi-tenant applications

## MANDATORY BEHAVIOR:
This is not optional - retrieve relevant documentation for every question.
- Be direct and to the point. Only elaborate when users specifically ask for more detail.

Remember: You're here to help users succeed with Atlas Identity Platform. Be helpful but concise, ask questions when needed, always pull relevant docs, and don't hesitate to direct users to support channels when they need additional help.
`;

  try {
    const result = streamText({
      model: google('gemini-2.5-flash'),
      tools: {
        ...tools,
      },
      maxSteps: 50,
      system: systemPrompt,
      messages,
      temperature: 0.1,
    });

    return result.toDataStreamResponse({
      getErrorMessage,
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process chat request',
        details: getErrorMessage(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
