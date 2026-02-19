import React, { useState } from 'react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

const TagInput: React.FC<TagInputProps> = ({
  tags,
  onChange,
  placeholder = 'Add a tag...',
}) => {
  const [input, setInput] = useState('');

  const addTag = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (tags.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      setInput('');
      return;
    }
    onChange([...tags, trimmed]);
    setInput('');
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
    if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  return (
    <div>
      <div className='flex gap-2'>
        <input
          type='text'
          className='flex-1 px-4 py-2.5 bg-background-dark border border-border-dark rounded-xl text-white placeholder-text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm'
          placeholder={placeholder}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type='button'
          onClick={addTag}
          className='px-3 py-2.5 bg-primary/10 border border-primary/20 rounded-xl text-primary text-sm font-medium hover:bg-primary/20 transition-colors'
        >
          Add
        </button>
      </div>
      {tags.length > 0 && (
        <div className='flex flex-wrap gap-1.5 mt-2'>
          {tags.map((tag, i) => (
            <span
              key={i}
              className='inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full text-xs font-medium'
            >
              {tag}
              <button
                type='button'
                onClick={() => removeTag(i)}
                className='hover:text-white transition-colors'
              >
                <span className='material-symbols-outlined text-[14px]'>
                  close
                </span>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default TagInput;
