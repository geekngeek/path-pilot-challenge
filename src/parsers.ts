export interface NormalizedJob {
  title: string
  company: string
  location: string
  companyLogo?: string
  fitScore?: string
  url?: string
  skills: string[]
}

export interface NormalizedCourse {
  title: string
  provider: string
  level: string
  image?: string
  rating?: string
  price?: string
  url?: string
}

export interface CardData {
  jobs?: NormalizedJob[]
  courses?: NormalizedCourse[]
}

type RawRecord = Record<string, unknown>

function str(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number') return String(value)
  return undefined
}

function firstStr(...candidates: unknown[]): string {
  for (const c of candidates) {
    const s = str(c)
    if (s) return s
  }
  return ''
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .filter(Boolean)
  }
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map((s) => s.trim()).filter(Boolean)
  }
  return []
}

function normalizeJob(raw: RawRecord): NormalizedJob {
  return {
    title: firstStr(raw.title, raw.job_title, raw.jobTitle, raw.name, raw.position, raw.role),
    company: firstStr(raw.company, raw.company_name, raw.companyName, raw.employer, raw.organization, raw.org),
    location: firstStr(raw.location, raw.city, raw.job_location, raw.jobLocation, raw.area, raw.region),
    companyLogo: str(raw.companyLogo) ?? str(raw.company_logo) ?? str(raw.logo) ?? str(raw.logo_url) ?? str(raw.logoUrl) ?? str(raw.image),
    fitScore: str(raw.fitScore) ?? str(raw.fit_score) ?? str(raw.score) ?? str(raw.match_score) ?? str(raw.matchScore) ?? str(raw.fit),
    url: str(raw.url) ?? str(raw.link) ?? str(raw.apply_url) ?? str(raw.applyUrl) ?? str(raw.job_url) ?? str(raw.jobUrl) ?? str(raw.href),
    skills: toStringArray(raw.skills ?? raw.required_skills ?? raw.requiredSkills ?? raw.skill_tags ?? raw.skillTags ?? raw.technologies ?? raw.tech_stack ?? raw.techStack ?? raw.tags),
  }
}

function normalizeCourse(raw: RawRecord): NormalizedCourse {
  return {
    title: firstStr(raw.title, raw.course_title, raw.courseTitle, raw.name, raw.course_name, raw.courseName),
    provider: firstStr(raw.provider, raw.platform, raw.source, raw.institution, raw.school, raw.vendor, raw.offered_by, raw.offeredBy),
    level: firstStr(raw.level, raw.difficulty, raw.skill_level, raw.skillLevel, raw.difficulty_level, raw.difficultyLevel),
    image: str(raw.image) ?? str(raw.thumbnail) ?? str(raw.image_url) ?? str(raw.imageUrl) ?? str(raw.logo) ?? str(raw.cover),
    rating: str(raw.rating) ?? str(raw.stars) ?? str(raw.score) ?? str(raw.review_score) ?? str(raw.reviewScore),
    price: str(raw.price) ?? str(raw.cost) ?? str(raw.fee),
    url: str(raw.url) ?? str(raw.link) ?? str(raw.course_url) ?? str(raw.courseUrl) ?? str(raw.href),
  }
}

const JOB_FIELD_SIGNALS = ['company', 'company_name', 'companyName', 'employer', 'organization', 'fitScore', 'fit_score', 'apply_url', 'applyUrl', 'job_title', 'jobTitle', 'companyLogo', 'company_logo'] as const
const COURSE_FIELD_SIGNALS = ['provider', 'platform', 'institution', 'level', 'difficulty', 'skill_level', 'skillLevel', 'rating', 'stars', 'price', 'cost', 'course_title', 'courseTitle'] as const

function looksLikeJob(record: RawRecord): boolean {
  let hits = 0
  for (const key of JOB_FIELD_SIGNALS) {
    if (record[key] !== undefined && record[key] !== null && record[key] !== '') hits++
  }
  return hits >= 1 && hasNameField(record)
}

function looksLikeCourse(record: RawRecord): boolean {
  let hits = 0
  for (const key of COURSE_FIELD_SIGNALS) {
    if (record[key] !== undefined && record[key] !== null && record[key] !== '') hits++
  }
  return hits >= 2 && hasNameField(record)
}

function hasNameField(record: RawRecord): boolean {
  return !!(str(record.title) || str(record.name) || str(record.job_title) || str(record.jobTitle) || str(record.course_title) || str(record.courseTitle) || str(record.position) || str(record.role))
}

function isRecord(value: unknown): value is RawRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function unwrapArray(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) return payload

  if (isRecord(payload)) {
    for (const key of ['data', 'results', 'items', 'jobs', 'courses', 'records', 'list', 'entries']) {
      if (Array.isArray(payload[key])) return payload[key] as unknown[]
    }
  }

  return null
}

function tryParseJsonString(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return value
  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

function hintSuggestsJobs(hint?: string): boolean {
  if (!hint) return false
  const lower = hint.toLowerCase()
  return lower.includes('job') || lower.includes('career') || lower.includes('position') || lower.includes('vacancy')
}

function hintSuggestsCourses(hint?: string): boolean {
  if (!hint) return false
  const lower = hint.toLowerCase()
  return lower.includes('course') || lower.includes('training') || lower.includes('learn') || lower.includes('education') || lower.includes('class')
}

export function extractFunctionName(chunk: Record<string, unknown>): string | undefined {
  const fncalls = chunk.fncalls
  if (Array.isArray(fncalls) && fncalls.length > 0) {
    const first = fncalls[0]
    if (isRecord(first) && typeof first.function_name === 'string') {
      return first.function_name
    }
  }
  const fnName = chunk.function_name ?? chunk.functionName ?? chunk.fn
  if (typeof fnName === 'string') return fnName
  return undefined
}

export function detectAndNormalizeCards(
  payload: unknown,
  functionNameHint?: string,
): CardData | null {
  const resolved = tryParseJsonString(payload)
  const items = unwrapArray(resolved)

  if (!items || items.length === 0) return null

  const records = items.filter(isRecord)
  if (records.length === 0) return null

  if (hintSuggestsJobs(functionNameHint)) {
    const jobs = records.map(normalizeJob).filter((j) => j.title || j.company)
    return jobs.length > 0 ? { jobs } : null
  }

  if (hintSuggestsCourses(functionNameHint)) {
    const courses = records.map(normalizeCourse).filter((c) => c.title || c.provider)
    return courses.length > 0 ? { courses } : null
  }

  const first = records[0]
  if (looksLikeCourse(first)) {
    const courses = records.map(normalizeCourse).filter((c) => c.title || c.provider)
    return courses.length > 0 ? { courses } : null
  }

  if (looksLikeJob(first)) {
    const jobs = records.map(normalizeJob).filter((j) => j.title || j.company)
    return jobs.length > 0 ? { jobs } : null
  }

  return null
}
