import { useState } from 'react'
import { COLORS, FONTS, RADII } from '../styles/theme'
import SkillTag from './SkillTag'

interface SkillsInputProps {
  skills:    string[]
  onChange:  (skills: string[]) => void
  color?:    'blue' | 'green'
  placeholder?: string
}

export default function SkillsInput({
  skills,
  onChange,
  color = 'blue',
  placeholder = 'Type a skill and press Enter...'
}: SkillsInputProps) {
  const [input, setInput] = useState('')

  const addSkill = () => {
    const trimmed = input.trim()
    if (trimmed && !skills.includes(trimmed)) {
      onChange([...skills, trimmed])
    }
    setInput('')
  }

  const removeSkill = (skill: string) => {
    onChange(skills.filter(s => s !== skill))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addSkill()
    }
    if (e.key === 'Backspace' && !input && skills.length > 0) {
      onChange(skills.slice(0, -1))
    }
  }

  return (
    <div>
      <div style={{
        display:      'flex',
        flexWrap:     'wrap',
        gap:          '6px',
        background:   COLORS.BG_INPUT,
        border:       `1px solid ${COLORS.BORDER}`,
        borderRadius: RADII.MD,
        padding:      '10px 12px',
        minHeight:    '46px',
        cursor:       'text',
      }}
        onClick={() => document.getElementById('skills-input')?.focus()}
      >
        {skills.map(skill => (
          <SkillTag
            key={skill}
            skill={skill}
            color={color}
            onRemove={() => removeSkill(skill)}
          />
        ))}
        <input
          id="skills-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addSkill}
          placeholder={skills.length === 0 ? placeholder : ''}
          style={{
            background:  'none',
            border:      'none',
            outline:     'none',
            color:       COLORS.TEXT_PRIMARY,
            fontSize:    FONTS.MD,
            fontFamily:  'Inter, sans-serif',
            minWidth:    '120px',
            flex:        1,
          }}
        />
      </div>
      <p style={{ fontSize: FONTS.XS, color: COLORS.TEXT_MUTED, marginTop: '5px' }}>
        Press Enter or comma to add each skill
      </p>
    </div>
  )
}
