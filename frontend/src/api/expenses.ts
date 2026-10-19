/// <reference types="vite/client" />
import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || '/api'

export interface Expense {
  id: number
  user_id: number
  amount: number
  category: Category
  spent_at: string
  comment: string
  created_at: string
  updated_at: string
}

export type Category =
  | 'food'
  | 'cafes'
  | 'transport'
  | 'housing'
  | 'shopping'
  | 'entertainment'
  | 'health'
  | 'education'
  | 'beauty'
  | 'sports'
  | 'travel'
  | 'subscriptions'
  | 'pets'
  | 'gifts'
  | 'other'

export const CATEGORIES: Record<Category, string> = {
  food: 'Еда и супермаркеты',
  cafes: 'Кафе и рестораны',
  transport: 'Транспорт и авто',
  housing: 'Жильё и ЖКХ',
  shopping: 'Покупки и одежда',
  entertainment: 'Развлечения и отдых',
  health: 'Здоровье и аптеки',
  education: 'Образование и книги',
  beauty: 'Красота и уход',
  sports: 'Спорт и фитнес',
  travel: 'Путешествия',
  subscriptions: 'Подписки и связь',
  pets: 'Питомцы',
  gifts: 'Подарки',
  other: 'Другое',
}

export const CAT_ICONS: Record<Category, string> = {
  food: '🍕',
  cafes: '☕',
  transport: '🚗',
  housing: '🏠',
  shopping: '🛍️',
  entertainment: '🎮',
  health: '💊',
  education: '📚',
  beauty: '💅',
  sports: '🏃',
  travel: '✈️',
  subscriptions: '📱',
  pets: '🐾',
  gifts: '🎁',
  other: '📦',
}

export const CAT_COLORS: Record<Category, string> = {
  food:          '#f59e0b',
  cafes:         '#f97316',
  transport:     '#3b82f6',
  housing:       '#10b981',
  shopping:      '#ec4899',
  entertainment: '#a855f7',
  health:        '#ef4444',
  education:     '#6366f1',
  beauty:        '#d946ef',
  sports:        '#14b8a6',
  travel:        '#06b6d4',
  subscriptions: '#8b5cf6',
  pets:          '#84cc16',
  gifts:         '#f43f5e',
  other:         '#64748b',
}

export const CATEGORY_LIST: Category[] = [
  'food',
  'transport',
  'housing',
  'entertainment',
  'health',
  'shopping',
  'other',
]

export interface ExpenseFilter {
  user_id?: number
  category?: Category
  search?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}

export interface CreateExpenseInput {
  user_id: number
  amount: number
  category: Category
  spent_at: string
  comment?: string
}

export interface UpdateExpenseInput {
  amount?: number
  category?: Category
  spent_at?: string
  comment?: string
}

const api = axios.create({ baseURL: BASE })

export const expenseApi = {
  list: (filter: ExpenseFilter = {}) =>
    api.get<Expense[]>('/expenses', { params: filter }).then(r => r.data),

  get: (id: number) =>
    api.get<Expense>(`/expenses/${id}`).then(r => r.data),

  create: (data: CreateExpenseInput) =>
    api.post<Expense>('/expenses', data).then(r => r.data),

  update: (id: number, data: UpdateExpenseInput) =>
    api.put<Expense>(`/expenses/${id}`, data).then(r => r.data),

  delete: (id: number) =>
    api.delete(`/expenses/${id}`),

  listUsers: () =>
    api.get<number[]>('/users').then(r => r.data),
}
