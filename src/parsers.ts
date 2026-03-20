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

function pick(raw: RawRecord, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = str(raw[k])
    if (v) return v
  }
  return undefined
}

function pickRequired(raw: RawRecord, keys: string[]): string {
  return pick(raw, keys) ?? ''
}

function toStringArray(value: unknown): string[] {
  let items: string[]
  if (Array.isArray(value)) {
    items = value
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .filter(Boolean)
  } else if (typeof value === 'string' && value.trim()) {
    items = value.split(',').map((s) => s.trim()).filter(Boolean)
  } else {
    return []
  }
  return [...new Set(items)]
}

function pickArray(raw: RawRecord, keys: string[]): string[] {
  for (const k of keys) {
    if (raw[k] !== undefined && raw[k] !== null) {
      const result = toStringArray(raw[k])
      if (result.length > 0) return result
    }
  }
  return []
}

const JOB_TITLE_KEYS = ['title', 'job_title', 'jobTitle', 'name', 'position', 'role']
const JOB_COMPANY_KEYS = ['company', 'company_name', 'companyName', 'employer', 'organization', 'org']
const JOB_LOCATION_KEYS = ['location', 'city', 'job_location', 'jobLocation', 'area', 'region']
const JOB_LOGO_KEYS = ['companyLogo', 'company_logo', 'logo', 'logo_url', 'logoUrl', 'image']
const JOB_SCORE_KEYS = ['fitScore', 'fit_score', 'score', 'match_score', 'matchScore', 'fit']
const JOB_URL_KEYS = ['url', 'link', 'apply_url', 'applyUrl', 'job_url', 'jobUrl', 'href']
const JOB_SKILLS_KEYS = ['skills', 'required_skills', 'requiredSkills', 'skill_tags', 'skillTags', 'technologies', 'tech_stack', 'techStack', 'tags']

const COURSE_TITLE_KEYS = ['title', 'course_title', 'courseTitle', 'name', 'course_name', 'courseName']
const COURSE_PROVIDER_KEYS = ['provider', 'platform', 'source', 'institution', 'school', 'vendor', 'offered_by', 'offeredBy']
const COURSE_LEVEL_KEYS = ['level', 'difficulty', 'skill_level', 'skillLevel', 'difficulty_level', 'difficultyLevel']
const COURSE_IMAGE_KEYS = ['image', 'thumbnail', 'image_url', 'imageUrl', 'logo', 'cover']
const COURSE_RATING_KEYS = ['rating', 'stars', 'score', 'review_score', 'reviewScore']
const COURSE_PRICE_KEYS = ['price', 'cost', 'fee']
const COURSE_URL_KEYS = ['url', 'link', 'course_url', 'courseUrl', 'href']

function normalizeJob(raw: RawRecord): NormalizedJob {
  return {
    title: pickRequired(raw, JOB_TITLE_KEYS),
    company: pickRequired(raw, JOB_COMPANY_KEYS),
    location: pickRequired(raw, JOB_LOCATION_KEYS),
    companyLogo: pick(raw, JOB_LOGO_KEYS),
    fitScore: pick(raw, JOB_SCORE_KEYS),
    url: pick(raw, JOB_URL_KEYS),
    skills: pickArray(raw, JOB_SKILLS_KEYS),
  }
}

function normalizeCourse(raw: RawRecord): NormalizedCourse {
  return {
    title: pickRequired(raw, COURSE_TITLE_KEYS),
    provider: pickRequired(raw, COURSE_PROVIDER_KEYS),
    level: pickRequired(raw, COURSE_LEVEL_KEYS),
    image: pick(raw, COURSE_IMAGE_KEYS),
    rating: pick(raw, COURSE_RATING_KEYS),
    price: pick(raw, COURSE_PRICE_KEYS),
    url: pick(raw, COURSE_URL_KEYS),
  }
}

const JOB_SIGNAL_KEYS = ['company', 'company_name', 'companyName', 'employer', 'organization', 'fitScore', 'fit_score', 'apply_url', 'applyUrl', 'job_title', 'jobTitle', 'companyLogo', 'company_logo'] as const
const COURSE_SIGNAL_KEYS = ['provider', 'platform', 'institution', 'level', 'difficulty', 'skill_level', 'skillLevel', 'rating', 'stars', 'price', 'cost', 'course_title', 'courseTitle'] as const
const NAME_KEYS = ['title', 'name', 'job_title', 'jobTitle', 'course_title', 'courseTitle', 'position', 'role'] as const

function signalCount(record: RawRecord, keys: readonly string[]): number {
  let hits = 0
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && record[key] !== '') hits++
  }
  return hits
}

function hasNameField(record: RawRecord): boolean {
  return NAME_KEYS.some((k) => !!str(record[k]))
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
  if (!hasNameField(first)) return null

  const jobScore = signalCount(first, JOB_SIGNAL_KEYS)
  const courseScore = signalCount(first, COURSE_SIGNAL_KEYS)

  if (jobScore < 2 && courseScore < 2) return null

  if (courseScore > jobScore) {
    const courses = records.map(normalizeCourse).filter((c) => c.title || c.provider)
    return courses.length > 0 ? { courses } : null
  }

  const jobs = records.map(normalizeJob).filter((j) => j.title || j.company)
  return jobs.length > 0 ? { jobs } : null
}
