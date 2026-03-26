import { COLORS, FONTS, RADII } from '../styles/theme'
import StatusBadge from './StatusBadge'
import type { Application, Project } from '../types/index'

interface ApplicationItemProps {
  application: Application
  project?:    Project
}

export default function ApplicationItem({ application, project }: ApplicationItemProps) {
  return (
    <div style={{
      background:    COLORS.BG_CARD,
      border:        `1px solid ${COLORS.BORDER}`,
      borderRadius:  RADII.XL,
      padding:       '18px 22px',
      display:       'flex',
      justifyContent:'space-between',
      alignItems:    'center',
      flexWrap:      'wrap',
      gap:           '12px',
      transition:    'border-color 0.2s ease',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{
          fontSize:     FONTS.MD,
          fontWeight:   600,
          color:        COLORS.TEXT_PRIMARY,
          marginBottom: '6px',
          overflow:     'hidden',
          textOverflow: 'ellipsis',
          whiteSpace:   'nowrap',
        }}>
          {project?.project_name || 'Project'}
        </h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {project?.sdg_focus && (
            <span style={{ color: COLORS.TEXT_MUTED, fontSize: FONTS.XS }}>
              🎯 {project.sdg_focus}
            </span>
          )}
          {project?.location && (
            <span style={{ color: COLORS.TEXT_MUTED, fontSize: FONTS.XS }}>
              📍 {project.location}
            </span>
          )}
          {project?.participation_type && (
            <span style={{
              color:     project.participation_type === 'team' ? COLORS.YELLOW : COLORS.BLUE,
              fontSize:  FONTS.XS,
              fontWeight: 600,
            }}>
              {project.participation_type === 'team'
                ? `👥 Team ${project.team_size_min}–${project.team_size_max}`
                : '👤 Individual'}
            </span>
          )}
          <span style={{ color: COLORS.TEXT_MUTED, fontSize: FONTS.XS }}>
            Applied {new Date(application.applied_at).toLocaleDateString()}
          </span>
        </div>
      </div>
      <StatusBadge status={application.status} />
    </div>
  )
}
