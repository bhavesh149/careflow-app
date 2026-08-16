import type { Therapist, User } from '../api/types'

export type TherapistShowcase = {
  title: string
  rating: number
  sessions: number
  tags: string[]
  availableToday: boolean
  nextAvailable: string
  photoUrl: string
  mode: string
}

export type PatientShowcase = {
  memberId: string
  phone: string
  dob: string
  allergies: string[]
  focus: string[]
  insurancePlan: string
  insuranceMemberId: string
  insuranceUntil: string
  photoUrl: string
}

const THERAPISTS: Record<string, TherapistShowcase> = {
  'Dr. Anjali Mehta': {
    title: 'Clinical Psychologist',
    rating: 4.9,
    sessions: 120,
    tags: ['Anxiety', 'Depression', 'Stress'],
    availableToday: true,
    nextAvailable: 'Today, 2:00 PM',
    mode: 'Telehealth & In-person',
    photoUrl:
      'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=320&h=320&q=80',
  },
  'Dr. Vikram Rao': {
    title: 'Family and Couples Therapist',
    rating: 5.0,
    sessions: 200,
    tags: ['Family Therapy', 'Couples'],
    availableToday: false,
    nextAvailable: 'Tomorrow, 10:00 AM',
    mode: 'Telehealth',
    photoUrl:
      'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=320&h=320&q=80',
  },
  'Dr. Priya Iyer': {
    title: 'Trauma and EMDR Specialist',
    rating: 4.8,
    sessions: 85,
    tags: ['Trauma', 'PTSD'],
    availableToday: false,
    nextAvailable: 'Thu, 1:30 PM',
    mode: 'Telehealth & In-person',
    photoUrl:
      'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=320&h=320&q=80',
  },
}

const PATIENTS: Record<string, PatientShowcase> = {
  'Rohan Sharma': {
    memberId: 'CF-1001-R',
    phone: '+91 98765 41001',
    dob: '12 March 1994',
    allergies: ['Penicillin'],
    focus: ['Anxiety Management', 'Sleep Routine'],
    insurancePlan: 'Star Health PPO',
    insuranceMemberId: 'SH-88421',
    insuranceUntil: 'Dec 2026',
    photoUrl:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=320&h=320&q=80',
  },
  'Meera Nair': {
    memberId: 'CF-1002-M',
    phone: '+91 98765 41002',
    dob: '4 July 1991',
    allergies: ['Peanuts'],
    focus: ['Family Therapy', 'Stress'],
    insurancePlan: 'HDFC Ergo Care',
    insuranceMemberId: 'HE-22910',
    insuranceUntil: 'Mar 2027',
    photoUrl:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=320&h=320&q=80',
  },
  'Arjun Desai': {
    memberId: 'CF-1003-A',
    phone: '+91 98765 41003',
    dob: '21 November 1988',
    allergies: [],
    focus: ['Trauma Recovery'],
    insurancePlan: 'Niva Bupa Plus',
    insuranceMemberId: 'NB-55102',
    insuranceUntil: 'Aug 2026',
    photoUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=320&h=320&q=80',
  },
}

const FALLBACK_THERAPIST: TherapistShowcase = {
  title: 'Therapist',
  rating: 4.7,
  sessions: 40,
  tags: ['General'],
  availableToday: false,
  nextAvailable: 'This week',
  mode: 'Telehealth',
  photoUrl:
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=320&h=320&q=80',
}

const FALLBACK_PATIENT: PatientShowcase = {
  memberId: 'CF-0000',
  phone: '+91 90000 00000',
  dob: '—',
  allergies: [],
  focus: ['Wellbeing'],
  insurancePlan: 'Self-pay',
  insuranceMemberId: '—',
  insuranceUntil: '—',
  photoUrl:
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=320&h=320&q=80',
}

export function showcaseFor(
  therapist: Pick<Therapist, 'id' | 'displayName' | 'specialization'>,
): TherapistShowcase {
  return THERAPISTS[therapist.displayName] ?? {
    ...FALLBACK_THERAPIST,
    title: therapist.specialization ?? FALLBACK_THERAPIST.title,
  }
}

export function patientShowcase(name: string): PatientShowcase {
  return PATIENTS[name] ?? FALLBACK_PATIENT
}

export function profilePhoto(user: Pick<User, 'fullName' | 'role'>): string {
  if (user.role === 'THERAPIST') {
    return (THERAPISTS[user.fullName] ?? FALLBACK_THERAPIST).photoUrl
  }
  return patientShowcase(user.fullName).photoUrl
}

export function sessionsLabel(count: number): string {
  return `${count}+ sessions`
}

export const DEMO_LOGINS = [
  { email: 'patient@careflow.test', label: 'Rohan Sharma · Patient' },
  { email: 'patient2@careflow.test', label: 'Meera Nair · Patient' },
  { email: 'patient3@careflow.test', label: 'Arjun Desai · Patient' },
  { email: 'dr.mehta@careflow.test', label: 'Dr. Anjali Mehta · Therapist' },
  { email: 'dr.rao@careflow.test', label: 'Dr. Vikram Rao · Therapist' },
  { email: 'dr.iyer@careflow.test', label: 'Dr. Priya Iyer · Therapist' },
] as const
