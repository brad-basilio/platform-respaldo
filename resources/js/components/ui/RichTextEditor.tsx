import React, { useRef, useState } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { 
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, 
  Image as ImageIcon, Link as LinkIcon, Code, Quote, Heading1, Heading2, 
  AlignLeft, AlignCenter, AlignRight, Undo, Redo, Minus, Upload, Globe, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import axios from 'axios';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

// Componentes externos para evitar re-creación durante render
const ToolbarButton: React.FC<{
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  title: string;
}> = ({ onClick, isActive, disabled, icon, title }) => (
  <Button
    type="button"
    variant="ghost"
    size="icon"
    className={cn(
      "h-8 w-8",
      isActive && "bg-gray-200 text-gray-900"
    )}
    onClick={onClick}
    disabled={disabled}
    title={title}
  >
    {icon}
  </Button>
);

const ToolbarDivider = () => (
  <div className="w-px h-6 bg-gray-300 mx-1" />
);

// Componente de Image Picker con dropdown
const ImagePickerButton: React.FC<{
  onInsertImage: (url: string) => void;
}> = ({ onInsertImage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamaño (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es muy grande. Máximo 5MB.');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file); // El controlador espera 'file', no 'image'

    try {
      // Obtener el CSRF token del meta tag
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      
      const response = await axios.post('/admin/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-CSRF-TOKEN': csrfToken || '',
        },
      });

      // El controlador retorna { location: url }
      if (response.data.location) {
        onInsertImage(response.data.location);
        setIsOpen(false);
      }
    } catch (error: unknown) {
      console.error('Error uploading image:', error);
      const axiosError = error as { response?: { data?: { message?: string; error?: string; errors?: { file?: string[] } } } };
      const errorMessage = axiosError.response?.data?.message || 
                          axiosError.response?.data?.error ||
                          axiosError.response?.data?.errors?.file?.[0] ||
                          'Error al subir la imagen. Intenta de nuevo.';
      alert(errorMessage);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onInsertImage(urlInput.trim());
      setUrlInput('');
      setShowUrlInput(false);
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Insertar imagen"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Insertar imagen</p>
          
          {/* Upload from device */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              id="image-upload"
            />
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {isUploading ? 'Subiendo...' : 'Subir desde dispositivo'}
            </Button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">o</span>
            </div>
          </div>

          {/* URL input */}
          {showUrlInput ? (
            <div className="space-y-2">
              <Input
                type="url"
                placeholder="https://ejemplo.com/imagen.jpg"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="flex-1"
                  onClick={handleUrlSubmit}
                  disabled={!urlInput.trim()}
                >
                  Insertar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowUrlInput(false);
                    setUrlInput('');
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => setShowUrlInput(true)}
            >
              <Globe className="h-4 w-4" />
              Desde URL
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Componente de Toolbar separado
const EditorToolbar: React.FC<{ 
  editor: Editor; 
  onSetLink: () => void; 
}> = ({ editor, onSetLink }) => {
  const handleInsertImage = (url: string) => {
    editor.chain().focus().setImage({ src: url }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-2 border-b bg-gray-50">
      {/* Undo/Redo */}
      <ToolbarButton 
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        icon={<Undo className="h-4 w-4" />} 
        title="Deshacer (Ctrl+Z)" 
      />
      <ToolbarButton 
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        icon={<Redo className="h-4 w-4" />} 
        title="Rehacer (Ctrl+Y)" 
      />
      
      <ToolbarDivider />

      {/* Text formatting */}
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        icon={<Bold className="h-4 w-4" />} 
        title="Negrita (Ctrl+B)" 
      />
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        icon={<Italic className="h-4 w-4" />} 
        title="Cursiva (Ctrl+I)" 
      />
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        icon={<UnderlineIcon className="h-4 w-4" />} 
        title="Subrayado (Ctrl+U)" 
      />

      <ToolbarDivider />

      {/* Headings */}
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        icon={<Heading1 className="h-4 w-4" />} 
        title="Título 1" 
      />
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        icon={<Heading2 className="h-4 w-4" />} 
        title="Título 2" 
      />

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        icon={<List className="h-4 w-4" />} 
        title="Lista con viñetas" 
      />
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        icon={<ListOrdered className="h-4 w-4" />} 
        title="Lista numerada" 
      />
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        icon={<Quote className="h-4 w-4" />} 
        title="Cita" 
      />

      <ToolbarDivider />

      {/* Alignment */}
      <ToolbarButton 
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        isActive={editor.isActive({ textAlign: 'left' })}
        icon={<AlignLeft className="h-4 w-4" />} 
        title="Alinear izquierda" 
      />
      <ToolbarButton 
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        isActive={editor.isActive({ textAlign: 'center' })}
        icon={<AlignCenter className="h-4 w-4" />} 
        title="Centrar" 
      />
      <ToolbarButton 
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        isActive={editor.isActive({ textAlign: 'right' })}
        icon={<AlignRight className="h-4 w-4" />} 
        title="Alinear derecha" 
      />

      <ToolbarDivider />

      {/* Insert */}
      <ToolbarButton 
        onClick={onSetLink}
        isActive={editor.isActive('link')}
        icon={<LinkIcon className="h-4 w-4" />} 
        title="Insertar enlace" 
      />
      <ImagePickerButton onInsertImage={handleInsertImage} />
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive('codeBlock')}
        icon={<Code className="h-4 w-4" />} 
        title="Bloque de código" 
      />
      <ToolbarButton 
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        icon={<Minus className="h-4 w-4" />} 
        title="Línea horizontal" 
      />
    </div>
  );
};

const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  value, 
  onChange, 
  placeholder = 'Escribe aquí el contenido...',
  minHeight = '400px'
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-4',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none p-4',
        style: `min-height: ${minHeight}`,
      },
    },
  });

  if (!editor) {
    return null;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL del enlace:', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <EditorToolbar editor={editor} onSetLink={setLink} />
      <EditorContent editor={editor} />

      {/* Styles for TipTap */}
      <style>{`
        .ProseMirror {
          outline: none;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror h1 { 
          font-size: 1.75rem; 
          font-weight: 700; 
          margin: 1.5rem 0 0.75rem; 
          line-height: 1.2;
        }
        .ProseMirror h2 { 
          font-size: 1.375rem; 
          font-weight: 600; 
          margin: 1.25rem 0 0.5rem; 
          line-height: 1.3;
        }
        .ProseMirror h3 { 
          font-size: 1.125rem; 
          font-weight: 600; 
          margin: 1rem 0 0.5rem; 
        }
        .ProseMirror ul, .ProseMirror ol { 
          padding-left: 1.5rem; 
          margin: 0.75rem 0; 
        }
        .ProseMirror li { 
          margin: 0.25rem 0; 
        }
        .ProseMirror ul { list-style-type: disc; }
        .ProseMirror ol { list-style-type: decimal; }
        .ProseMirror blockquote { 
          border-left: 4px solid #e5e7eb; 
          padding-left: 1rem; 
          margin: 1rem 0;
          color: #6b7280;
          font-style: italic;
        }
        .ProseMirror pre {
          background: #1f2937;
          color: #e5e7eb;
          padding: 1rem;
          border-radius: 0.5rem;
          font-family: 'Fira Code', 'Monaco', monospace;
          overflow-x: auto;
          margin: 1rem 0;
        }
        .ProseMirror code {
          background: #f3f4f6;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-family: 'Fira Code', 'Monaco', monospace;
          font-size: 0.875em;
        }
        .ProseMirror pre code {
          background: none;
          padding: 0;
          color: inherit;
        }
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }
        .ProseMirror a {
          color: #3b82f6;
          text-decoration: underline;
          cursor: pointer;
        }
        .ProseMirror a:hover {
          color: #2563eb;
        }
        .ProseMirror hr {
          border: none;
          border-top: 2px solid #e5e7eb;
          margin: 1.5rem 0;
        }
        .ProseMirror p {
          margin: 0.5rem 0;
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
