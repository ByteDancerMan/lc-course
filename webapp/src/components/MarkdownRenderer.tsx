import { ExternalLink } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

const components: Components = {
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse border border-[#e5e5e5] text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-[#f0f0f5]">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border border-[#e5e5e5] px-3 py-2 text-left font-medium text-[#1f1f1f]">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-[#e5e5e5] px-3 py-2 text-[#1f1f1f]">
      {children}
    </td>
  ),
  ol: ({ children }) => (
    <ol className="my-3 list-decimal pl-6 space-y-3">{children}</ol>
  ),
  ul: ({ children }) => (
    <ul className="my-3 list-disc pl-6 space-y-2">{children}</ul>
  ),
  li: ({ children, ...props }) => {
    const isOrdered = props.className?.includes('contains-task-list')
    return (
      <li className="leading-relaxed">
        {children}
      </li>
    )
  },
  p: ({ children }) => (
    <p className="my-3 leading-8">{children}</p>
  ),
  h1: ({ children }) => (
    <h1 className="mt-8 mb-4 text-xl font-semibold text-[#1f1f1f]">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-6 mb-3 text-lg font-semibold text-[#1f1f1f]">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-5 mb-2 text-base font-semibold text-[#1f1f1f]">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-4 mb-2 text-sm font-semibold text-[#1f1f1f]">{children}</h4>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-[#1f1f1f]">{children}</strong>
  ),
  code: ({ children, ...props }) => {
    const isInline = !props.className
    if (isInline) {
      return (
        <code className="rounded bg-[#f0f0f5] px-1.5 py-0.5 text-sm text-[#e83e3e] font-mono">
          {children}
        </code>
      )
    }
    return (
      <pre className="my-4 overflow-x-auto rounded-lg border border-[#e5e5e5] bg-[#f7f7f8] p-4 text-sm">
        <code className="text-[#1f1f1f] font-mono">{children}</code>
      </pre>
    )
  },
  hr: () => <hr className="my-6 border-[#e5e5e5]" />,
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-4 border-[#10a37f] bg-[#f7f7f8] px-4 py-2 text-[#1f1f1f]">
      {children}
    </blockquote>
  ),
  a: ({ children, href }) => (
    <span className="inline-flex items-center gap-1">
      <span className="text-[#1f1f1f]">{children}</span>
      {href && (
        <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-[#10a37f] hover:text-[#0d8c6b]">
          <ExternalLink size={14} />
        </a>
      )}
    </span>
  ),
}

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  )
}
