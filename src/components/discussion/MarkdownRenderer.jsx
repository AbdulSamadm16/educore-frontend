import React from 'react';

const renderInline = (text) => {
  const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={`${part}-${index}`} className="font-black text-gray-950 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={`${part}-${index}`}
          className="rounded-md bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 font-mono text-[0.9em] text-violet-600 dark:text-violet-300"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
  });
};

const MarkdownRenderer = ({ content = '' }) => {
  const lines = String(content).replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.trim().startsWith('```')) {
      const codeLines = [];
      index += 1;

      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }

      if (index < lines.length) index += 1;

      blocks.push({
        type: 'code',
        value: codeLines.join('\n')
      });
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];

      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*]\s+/, ''));
        index += 1;
      }

      blocks.push({
        type: 'list',
        items
      });
      continue;
    }

    const paragraph = [];
    while (
      index < lines.length
      && lines[index].trim()
      && !lines[index].trim().startsWith('```')
      && !/^\s*[-*]\s+/.test(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }

    blocks.push({
      type: 'paragraph',
      value: paragraph.join(' ')
    });
  }

  return (
    <div className="space-y-3 text-sm leading-7 text-gray-700 dark:text-white/70">
      {blocks.map((block, blockIndex) => {
        if (block.type === 'code') {
          return (
            <pre
              key={`code-${blockIndex}`}
              className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-950 p-4 text-xs text-gray-100 dark:border-white/10"
            >
              <code>{block.value}</code>
            </pre>
          );
        }

        if (block.type === 'list') {
          return (
            <ul key={`list-${blockIndex}`} className="list-disc space-y-1 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`paragraph-${blockIndex}`} className="whitespace-pre-wrap">
            {renderInline(block.value)}
          </p>
        );
      })}
    </div>
  );
};

export default MarkdownRenderer;
