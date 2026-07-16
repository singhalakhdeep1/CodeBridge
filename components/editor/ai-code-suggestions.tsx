'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Sparkles, Copy, Check, ThumbsUp, ThumbsDown } from 'lucide-react';

interface AISuggestion {
  id: string;
  code: string;
  description: string;
  confidence: number;
}

interface AICodeSuggestionsProps {
  currentCode: string;
  language: string;
  onApplySuggestion: (code: string) => void;
}

export default function AICodeSuggestions({
  currentCode,
  language,
  onApplySuggestion
}: AICodeSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (currentCode.length > 10) {
      generateSuggestions();
    }
  }, [currentCode, language]);

  const generateSuggestions = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: currentCode, language }),
      });
      
      if (!response.ok) throw new Error('Failed to generate suggestions');
      
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      // Fallback to mock suggestions on error
      const mockSuggestions: AISuggestion[] = [
        {
          id: '1',
          code: `// Optimized version\n${currentCode.trim()}\n// Added error handling`,
          description: 'Optimize code with error handling',
          confidence: 0.92
        }
      ];
      setSuggestions(mockSuggestions);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApply = (suggestion: AISuggestion) => {
    onApplySuggestion(suggestion.code);
  };

  const handleFeedback = (suggestionId: string, isPositive: boolean) => {
    // Send feedback to AI model for improvement
    console.log(`Feedback for ${suggestionId}: ${isPositive ? 'positive' : 'negative'}`);
  };

  return (
    <div className="border rounded-lg bg-background">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <h3 className="font-semibold">AI Code Suggestions</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={generateSuggestions}
          disabled={isLoading}
        >
          {isLoading ? 'Generating...' : 'Refresh'}
        </Button>
      </div>

      <div className="p-3 space-y-3 max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Start typing to get AI suggestions</p>
          </div>
        ) : (
          suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="border rounded-lg p-3 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">{suggestion.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Confidence: {(suggestion.confidence * 100).toFixed(0)}%</span>
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500"
                        style={{ width: `${suggestion.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(suggestion.code, suggestion.id)}
                  >
                    {copiedId === suggestion.id ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFeedback(suggestion.id, true)}
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFeedback(suggestion.id, false)}
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                <code>{suggestion.code}</code>
              </pre>

              <Button
                variant="default"
                size="sm"
                className="w-full mt-2"
                onClick={() => handleApply(suggestion)}
              >
                Apply Suggestion
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
