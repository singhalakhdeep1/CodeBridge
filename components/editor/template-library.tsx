'use client';

import React, { useState } from 'react';
import { Button } from '../ui/button';
import { FileText, Code, Database, Api, Web, Search, Copy, Download } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  code: string;
  language: string;
}

const templates: Template[] = [
  {
    id: 'react-component',
    name: 'React Component',
    description: 'Basic React component with hooks',
    category: 'Frontend',
    icon: <FileText className="w-4 h-4" />,
    code: `import React, { useState, useEffect } from 'react';

interface Props {
  title: string;
}

export default function Component({ title }: Props) {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>{title}</h1>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
    </div>
  );
}`,
    language: 'typescript'
  },
  {
    id: 'express-api',
    name: 'Express API',
    description: 'REST API with Express.js',
    category: 'Backend',
    icon: <Api className="w-4 h-4" />,
    code: `const express = require('express');
const app = express();

app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

app.listen(3000);`,
    language: 'javascript'
  },
  {
    id: 'nextjs-page',
    name: 'Next.js Page',
    description: 'Next.js page with SSR',
    category: 'Frontend',
    icon: <Web className="w-4 h-4" />,
    code: `export default function Page({ data }) {
  return (
    <div>
      <h1>SSR Page</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

export async function getServerSideProps() {
  const data = await fetch('https://api.example.com');
  return { props: { data } };
}`,
    language: 'typescript'
  },
  {
    id: 'prisma-model',
    name: 'Prisma Model',
    description: 'Database model with Prisma',
    category: 'Database',
    icon: <Database className="w-4 h-4" />,
    code: `model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  posts     Post[]
  createdAt DateTime @default(now())
}`,
    language: 'prisma'
  },
  {
    id: 'python-script',
    name: 'Python Script',
    description: 'Python utility script',
    category: 'Backend',
    icon: <Code className="w-4 h-4" />,
    code: `#!/usr/bin/env python3

def main():
    print("Hello, World!")

if __name__ == "__main__":
    main()`,
    language: 'python'
  }
];

interface TemplateLibraryProps {
  onSelectTemplate: (code: string) => void;
}

export default function TemplateLibrary({ onSelectTemplate }: TemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = ['All', 'Frontend', 'Backend', 'Database'];

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (template: Template) => {
    const blob = new Blob([template.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.toLowerCase().replace(/\s+/g, '-')}.${template.language}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border rounded-lg bg-background">
      <div className="p-3 border-b space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <h3 className="font-semibold">Template Library</h3>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border rounded-md text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2">
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
        {filteredTemplates.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No templates found</p>
          </div>
        ) : (
          filteredTemplates.map(template => (
            <div
              key={template.id}
              className="border rounded-lg p-3 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {template.icon}
                  <div>
                    <h4 className="font-medium text-sm">{template.name}</h4>
                    <p className="text-xs text-muted-foreground">{template.description}</p>
                  </div>
                </div>
                <span className="text-xs bg-muted px-2 py-1 rounded">
                  {template.category}
                </span>
              </div>

              <pre className="bg-muted p-2 rounded text-xs overflow-x-auto mb-2 max-h-32">
                <code>{template.code.slice(0, 200)}...</code>
              </pre>

              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={() => onSelectTemplate(template.code)}
                >
                  Use Template
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(template.code, template.id)}
                >
                  {copiedId === template.id ? (
                    <Copy className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(template)}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
