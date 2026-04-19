import { useState } from 'react'
import { COLORS, FONTS, RADII, SHADOWS } from '../styles/theme'
import SkillTag from './SkillTag'
import StatusBadge from './StatusBadge'
import type { Project } from '../types/index'

interface ProjectCardProps {
  project:     Project
  hasApplied:  boolean
  onApply:     () => void
  applying?:   boolean
  showStatus?: boolean
}

export default function ProjectCard({
  project,
  hasApplied,
  onApply,
  applying = false,
  showStatus = false,
}: ProjectCardProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:    COLORS.BG_CARD,
        border:        `1px solid ${hovered ? COLORS.PRIMARY : COLORS.BORDER}`,
        borderRadius:  RADII.XL,
        padding:       '22px',
        display:       'flex',
        flexDirection: 'column',
        gap:           '12px',
        transition:    'all 0.2s ease',
        transform:     hovered ? 'translateY(-2px)' : 'none',
        boxShadow:     hovered ? SHADOWS.CARD : 'none',
        animation:     'fadeUp 0.4s ease',
      }}
    >
      {/* Tags row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {project.sdg_focus && (
          <span style={{
            background:   COLORS.GREEN_DIM,
            border:       `1px solid ${COLORS.GREEN}40`,
            color:        COLORS.GREEN,
            padding:      '4px 10px',
            borderRadius: RADII.FULL,
            fontSize:     FONTS.XS,
            fontWeight:   600,
          }}>
            🎯 {project.sdg_focus}
          </span>
        )}
        <span style={{
          background:   project.participation_type === 'team' ? COLORS.YELLOW_DIM : COLORS.BLUE_DIM,
          border:       `1px solid ${project.participation_type === 'team' ? COLORS.YELLOW : COLORS.BLUE}40`,
          color:        project.participation_type === 'team' ? COLORS.YELLOW : COLORS.BLUE,
          padding:      '4px 10px',
          borderRadius: RADII.FULL,
          fontSize:     FONTS.XS,
          fontWeight:   600,
        }}>
          {project.participation_type === 'team'
            ? `👥 Team ${project.team_size_min}–${project.team_size_max}`
            : '👤 Individual'}
        </span>
        {showStatus && <StatusBadge status={project.project_status} size="sm" />}
      </div>

      {/* Title */}
      <h3 style={{
        fontSize:   FONTS.LG,
        fontWeight: 700,
        color:      COLORS.TEXT_PRIMARY,
        lineHeight: 1.4,
      }}>
        {project.project_name}
      </h3>

      {/* Description */}
      <p style={{
        color:      COLORS.TEXT_SECONDARY,
        fontSize:   FONTS.SM,
        lineHeight: 1.6,
        display:    '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow:   'hidden',
      }}>
        {project.description}
      </p>

      {/* Skills */}
      {project.skills_required?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          {project.skills_required.slice(0, 4).map(s => (
            <SkillTag key={s} skill={s} color="blue" />
          ))}
          {project.skills_required.length > 4 && (
            <span style={{ color: COLORS.TEXT_MUTED, fontSize: FONTS.XS, alignSelf: 'center' }}>
              +{project.skills_required.length - 4} more
            </span>
          )}
        </div>
      )}

      {/* Meta */}
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
        {project.location && (
          <span style={{ color: COLORS.TEXT_MUTED, fontSize: FONTS.XS }}>
            📍 {project.location}
          </span>
        )}
        {project.duration_weeks && (
          <span style={{ color: COLORS.TEXT_MUTED, fontSize: FONTS.XS }}>
            ⏱ {project.duration_weeks} weeks
          </span>
        )}
        {project.is_remote && (
          <span style={{ color: COLORS.GREEN, fontSize: FONTS.XS, fontWeight: 600 }}>
            🌐 Remote
          </span>
        )}
      </div>

      {/* Apply button */}
      <button
        onClick={() => !hasApplied && !applying && onApply()}
        disabled={hasApplied || applying}
        style={{
          width:        '100%',
          padding:      '11px',
          borderRadius: RADII.MD,
          border:       hasApplied ? `1px solid ${COLORS.GREEN}40` : 'none',
          background:   hasApplied
            ? COLORS.GREEN_DIM
            : applying
            ? COLORS.BG_ELEVATED
            : `linear-gradient(135deg, ${COLORS.PRIMARY}, ${COLORS.BLUE})`,
          color:        hasApplied ? COLORS.GREEN : '#fff',
          fontWeight:   700,
          fontSize:     FONTS.MD,
          fontFamily:   'Inter, sans-serif',
          cursor:       hasApplied || applying ? 'not-allowed' : 'pointer',
          opacity:      applying ? 0.7 : 1,
          transition:   'all 0.2s ease',
        }}
      >
        {applying ? '⏳ Applying...' : hasApplied ? '✓ Applied' : 'Apply Now →'}
      </button>
    </div>
  )
}
