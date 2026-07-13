'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { Button } from '../ui/button';
import { 
  Bold, Italic, Underline, Strikethrough, 
  List, ListOrdered, Quote, Code, Link as LinkIcon,
  Image as ImageIcon, Undo, Redo, Heading1, Heading2, Heading3
} from 'lucide-react';

const lowlight = createLowlight(common);

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  editable = true
}: RichTextEditorProps) {
  const [editor, setEditor] = useState<Editor | null>(null);

  const editorRef = useRef<Editor | null>(null);

  useEffect(() => {
    if (!editor) {
      const newEditor = new Editor({
        extensions: [
          StarterKit.configure({
            heading: {
              levels: [1, 2, 3]
            }
          }),
          Placeholder.configure({
            placeholder
          }),
          Highlight,
          Link.configure({
            openOnClick: false,
            HTMLAttributes: {
              class: 'text-blue-500 underline cursor-pointer'
            }
          }),
          Image.configure({
            inline: true,
            HTMLAttributes: {
              class: 'max-w-full h-auto rounded-lg'
            }
          }),
          CodeBlockLowlight.configure({
            lowlight
          })
        ],
        content,
        editable,
        onUpdate: ({ editor }) => {
          onChange(editor.getHTML());
        }
      });
      
      setEditor(newEditor);
      editorRef.current = newEditor;
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
      }
    };
  }, [editable]);

  if (!editor) {
    return <div className="min-h-[200px] animate-pulse bg-muted rounded-lg" />;
  }

  const ToolbarButton = ({ 
    onClick, 
    active, 
    children 
  }: { 
    onClick: () => void; 
    active?: boolean; 
    children: React.ReactNode 
  }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={active ? 'bg-accent' : ''}
      type="button"
    >
      {children}
    </Button>
  );

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="border-b bg-muted/50 p-2 flex flex-wrap gap-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
        >
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
        >
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
        >
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
        >
          <List className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
        >
          <Quote className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')}
        >
          <Code className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          active={editor.isActive('highlight')}
        >
          <span className="font-bold">H</span>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => {
            const url = window.prompt('Enter URL:');
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          active={editor.isActive('link')}
        >
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => {
            const url = window.prompt('Enter image URL:');
            if (url) editor.chain().focus().setImage({ src: url }).run();
          }}
        >
          <ImageIcon className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <div className="prose prose-sm max-w-none p-4 min-h-[200px] focus:outline-none">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function EditorContent({ editor }: { editor: Editor }) {
  return <div className="tiptap">{editor ? <div dangerouslySetInnerHTML={{ __html: editor.getHTML() }} /> : null}</div>;
}
