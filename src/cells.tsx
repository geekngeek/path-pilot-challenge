import { useState } from 'react'

interface JobCellProps {
  title: string
  company: string
  location: string
  companyLogo?: string
  fitScore?: string
  url?: string
  skills?: string[]
}

interface CourseCellProps {
  title: string
  provider: string
  level: string
  image?: string
  rating?: string
  price?: string
  url?: string
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="cell-field">
      <span className="cell-label">{label}</span>
      <span className="cell-value">{value || 'n/a'}</span>
    </div>
  )
}

function Placeholder({ alt }: { alt: string }) {
  return (
    <div className="cell-logo-placeholder">
      {(alt.slice(0, 1) || '?').toUpperCase()}
    </div>
  )
}

function Logo({ src, alt }: { src?: string; alt: string }) {
  const [broken, setBroken] = useState(false)

  if (!src || broken) {
    return <Placeholder alt={alt} />
  }

  return (
    <img
      className="cell-logo"
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setBroken(true)}
    />
  )
}

export function JobCell({
  title,
  company,
  location,
  companyLogo,
  fitScore,
  url,
  skills,
}: JobCellProps) {
  return (
    <div className="desktop-cell">
      <div className="cell-media">
        <Logo src={companyLogo} alt={company} />
      </div>
      <Field label="Title" value={title} />
      <Field label="Company" value={company} />
      <Field label="Location" value={location} />
      <Field label="Fit Score" value={fitScore || 'n/a'} />
      {skills && skills.length > 0 ? (
        <div className="cell-skills">
          {skills.map((skill) => (
            <span key={skill} className="skill-tag">{skill}</span>
          ))}
        </div>
      ) : null}
      {url ? (
        <a className="cell-link" href={url} target="_blank" rel="noreferrer">
          Open job
        </a>
      ) : null}
    </div>
  )
}

export function CourseCell({
  title,
  provider,
  level,
  image,
  rating,
  price,
  url,
}: CourseCellProps) {
  return (
    <div className="desktop-cell">
      <div className="cell-media">
        <Logo src={image} alt={title} />
      </div>
      <Field label="Title" value={title} />
      <Field label="Provider" value={provider} />
      <Field label="Level" value={level} />
      <Field label="Rating / Price" value={`${rating || 'n/a'} / ${price || 'n/a'}`} />
      {url ? (
        <a className="cell-link" href={url} target="_blank" rel="noreferrer">
          Open course
        </a>
      ) : null}
    </div>
  )
}
