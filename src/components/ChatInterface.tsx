import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Loader, Sparkles } from 'lucide-react';
import { useData } from '../context/DataContext';
import { translateNLQtoSQL, executeQuery, generateInsightSummary } from '../../backend/src/services/nlqService';
import { startVoiceRecognition, isSpeechRecognitionSupported } from '../../src/services/voiceService'

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  data?: any[];
  timestamp: Date;
}

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I can help you analyze your business data. Ask me questions in plain English like "What are the total sales?" or "Show me revenue trends over time".',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stopRecognitionRef = useRef<(() => void) | null>(null);

  const { currentDataset } = useData();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleVoiceInput = () => {
    if (isListening) {
      stopRecognitionRef.current?.();
      setIsListening(false);
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      alert('Voice recognition is not supported in your browser');
      return;
    }

    setIsListening(true);

    const stopFn = startVoiceRecognition(
      (transcript) => {
        setInput(transcript);
        setIsListening(false);
      },
      (error) => {
        console.error('Voice recognition error:', error);
        setIsListening(false);
      }
    );

    stopRecognitionRef.current = stopFn;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    if (!currentDataset) {
      const errorMsg: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content: 'Please upload a dataset first before asking questions.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const datasetRows = JSON.parse(localStorage.getItem(`dataset_${currentDataset.id}`) || '[]');

      const nlqResult = await translateNLQtoSQL(input, currentDataset.columns, 'data');

      const results = executeQuery(nlqResult.sql || '', datasetRows);

      const insight = await generateInsightSummary(results, input);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `${nlqResult.explanation}\n\n${insight}`,
        data: results,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error processing your query. Please try rephrasing your question.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[600px]">
      <div className="p-4 border-b border-gray-200 flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">AI Query Assistant</h2>
          <p className="text-xs text-gray-500">
            {currentDataset ? `Analyzing: ${currentDataset.name}` : 'No dataset selected'}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm whitespace-pre-line">{message.content}</p>
              {message.data && message.data.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-300">
                  <div className="bg-white text-gray-900 rounded-lg p-3 max-h-48 overflow-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200">
                          {Object.keys(message.data[0]).map((key) => (
                            <th key={key} className="text-left py-2 px-2 font-semibold">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {message.data.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="border-b border-gray-100">
                            {Object.values(row).map((value: any, colIdx) => (
                              <td key={colIdx} className="py-2 px-2">
                                {typeof value === 'number' ? value.toFixed(2) : String(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {message.data.length > 5 && (
                      <p className="text-center text-gray-500 mt-2">
                        ... and {message.data.length - 5} more rows
                      </p>
                    )}
                  </div>
                </div>
              )}
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-4 py-3 flex items-center gap-2">
              <Loader className="w-4 h-4 animate-spin text-blue-600" />
              <p className="text-sm text-gray-600">Analyzing your query...</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your data..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          {isSpeechRecognitionSupported() && (
            <button
              type="button"
              onClick={handleVoiceInput}
              className={`p-3 rounded-lg transition-colors ${
                isListening
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          )}
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Try: "Show total revenue", "What are sales trends?", "Find top customers"
        </p>
      </form>
    </div>
  );
};
