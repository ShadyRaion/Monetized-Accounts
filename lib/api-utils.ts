import { NextRequest, NextResponse } from 'next/server'

/**
 * API Error Response Handler
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Standard API Response Format
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  timestamp: string
}

/**
 * Error Response with proper formatting
 */
export function errorResponse(
  error: Error | ApiError,
  statusCode: number = 500
): NextResponse {
  const isApiError = error instanceof ApiError

  return NextResponse.json(
    {
      success: false,
      error: {
        code: isApiError ? error.code : 'INTERNAL_SERVER_ERROR',
        message: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      },
      timestamp: new Date().toISOString()
    } as ApiResponse,
    { status: isApiError ? error.statusCode : statusCode }
  )
}

/**
 * Success Response with proper formatting
 */
export function successResponse<T>(
  data: T,
  statusCode: number = 200
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString()
    } as ApiResponse<T>,
    { status: statusCode }
  )
}

/**
 * Validate required fields in request body
 */
export async function validateRequestBody(
  request: NextRequest,
  requiredFields: string[]
): Promise<{ valid: boolean; body?: any; error?: ApiError }> {
  try {
    const body = await request.json()

    const missingFields = requiredFields.filter(field => !(field in body))
    if (missingFields.length > 0) {
      return {
        valid: false,
        error: new ApiError(
          400,
          `Missing required fields: ${missingFields.join(', ')}`,
          'VALIDATION_ERROR'
        )
      }
    }

    return { valid: true, body }
  } catch (error) {
    return {
      valid: false,
      error: new ApiError(400, 'Invalid JSON in request body', 'INVALID_JSON')
    }
  }
}

/**
 * Validate admin authentication
 */
export function validateAdminAuth(request: NextRequest): boolean {
  // Check for admin session or JWT token
  const authHeader = request.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }

  // TODO: Validate JWT token when authentication is implemented
  // For now, accept any bearer token (development only)
  return process.env.NODE_ENV === 'development'
}

/**
 * Rate limiting helper
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 900000 // 15 minutes
): boolean {
  const now = Date.now()
  const record = requestCounts.get(identifier)

  if (!record || record.resetTime < now) {
    requestCounts.set(identifier, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000) // Limit length
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate product ID (UUID)
 */
export function validateUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

/**
 * Log API request
 */
export function logApiRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  error?: Error
) {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] ${method} ${path} ${statusCode} ${duration}ms`

  if (error) {
    console.error(logMessage, error.message)
  } else {
    console.log(logMessage)
  }
}

/**
 * Wrap API route with error handling
 */
export function withErrorHandling(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const startTime = Date.now()
    const method = request.method
    const path = request.nextUrl.pathname

    try {
      const response = await handler(request)
      const duration = Date.now() - startTime
      logApiRequest(method, path, response.status, duration)
      return response
    } catch (error) {
      const duration = Date.now() - startTime
      const err = error instanceof Error ? error : new Error(String(error))
      logApiRequest(method, path, 500, duration, err)
      return errorResponse(err)
    }
  }
}

/**
 * Parse query parameters safely
 */
export function getQueryParam(
  request: NextRequest,
  paramName: string
): string | null {
  return request.nextUrl.searchParams.get(paramName)
}

/**
 * Batch insert helper for database
 */
export async function batchInsert<T>(
  items: T[],
  batchSize: number = 1000,
  insertFn: (batch: T[]) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    await insertFn(batch)
  }
}

/**
 * Retry helper for database operations
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt))
      }
    }
  }

  throw lastError
}
