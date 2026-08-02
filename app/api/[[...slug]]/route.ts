export const runtime = 'nodejs'

import { createExpressRequest, ExpressResponseAdapter, runMiddleware, toNextResponse } from '../_lib/express-adapter'
import * as authCtrl from '../../../server/api/controllers/auth.controller'
import * as productCtrl from '../../../server/api/controllers/product.controller'
import * as orderCtrl from '../../../server/api/controllers/order.controller'
import * as ticketCtrl from '../../../server/api/controllers/ticket.controller'
import * as affiliateCtrl from '../../../server/api/controllers/affiliate.controller'
import * as subscriberCtrl from '../../../server/api/controllers/subscriber.controller'
import * as reviewCtrl from '../../../server/api/controllers/review.controller'
import * as settingsCtrl from '../../../server/api/controllers/settings.controller'
import * as faqCtrl from '../../../server/api/controllers/faq.controller'
import * as favoriteCtrl from '../../../server/api/controllers/favorite.controller'
import * as cartCtrl from '../../../server/api/controllers/cart.controller'
import * as payoutsCtrl from '../../../server/api/controllers/payouts.controller'
import * as adminCtrl from '../../../server/api/controllers/admin.controller'
import { authenticate, optionalAuthenticate, requireAdmin } from '../../../server/api/middleware/auth.middleware'

const CORS_HEADERS = new Headers({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
})

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

interface RouteDefinition {
  methods: Method[]
  path: string
  middleware?: Array<(req: any, res: any, next: (err?: any) => void) => any>
  handler: (req: any, res: any) => Promise<void> | Promise<any>
}

const routeDefinitions: RouteDefinition[] = [
  { methods: ['GET'], path: '/', handler: async (req, res) => res.json({ status: 'API route handler active' }) },
  { methods: ['GET'], path: '/health', handler: async (req, res) => res.json({ status: 'OK', message: 'API is running' }) },

  { methods: ['POST'], path: '/auth/register', handler: authCtrl.register },
  { methods: ['GET'], path: '/auth/login/google', handler: authCtrl.startGoogleOAuth },
  { methods: ['GET'], path: '/auth/login/google/callback', handler: authCtrl.handleGoogleOAuthCallback },
  { methods: ['POST'], path: '/auth/login', handler: authCtrl.login },
  { methods: ['POST'], path: '/auth/login/google', handler: authCtrl.loginWithGoogle },
  { methods: ['POST'], path: '/auth/logout', handler: authCtrl.logout },
  { methods: ['GET'], path: '/auth/profile', middleware: [optionalAuthenticate], handler: authCtrl.getProfile },
  { methods: ['PUT'], path: '/auth/profile', middleware: [authenticate], handler: authCtrl.updateProfile },
  { methods: ['PUT'], path: '/auth/password', middleware: [authenticate], handler: authCtrl.changePassword },

  { methods: ['GET'], path: '/products/preview', handler: productCtrl.previewProducts },
  { methods: ['GET'], path: '/products', handler: productCtrl.listProducts },
  { methods: ['GET'], path: '/products/:id', handler: productCtrl.getProduct },
  { methods: ['POST'], path: '/products', middleware: [authenticate, requireAdmin], handler: productCtrl.createProduct },
  { methods: ['PUT'], path: '/products/:id', middleware: [authenticate, requireAdmin], handler: productCtrl.updateProduct },
  { methods: ['DELETE'], path: '/products/:id', middleware: [authenticate, requireAdmin], handler: productCtrl.deleteProduct },

  { methods: ['POST'], path: '/orders', middleware: [authenticate], handler: orderCtrl.createOrder },
  { methods: ['GET'], path: '/orders/me', middleware: [authenticate], handler: orderCtrl.getUserOrders },
  { methods: ['GET'], path: '/orders/:id', middleware: [authenticate], handler: orderCtrl.getOrder },
  { methods: ['GET'], path: '/orders', middleware: [authenticate, requireAdmin], handler: orderCtrl.adminListOrders },
  { methods: ['PUT'], path: '/orders/:id/status', middleware: [authenticate], handler: orderCtrl.updateOrderStatus },
  { methods: ['PUT'], path: '/orders/:id/delivery', middleware: [authenticate, requireAdmin], handler: orderCtrl.adminUpdateOrderDelivery },

  { methods: ['POST'], path: '/tickets', middleware: [authenticate], handler: ticketCtrl.createTicket },
  { methods: ['GET'], path: '/tickets/me', middleware: [authenticate], handler: ticketCtrl.getUserTickets },
  { methods: ['POST'], path: '/tickets/:ticketId/messages', middleware: [authenticate], handler: ticketCtrl.addMessage },
  { methods: ['PUT'], path: '/tickets/:id', middleware: [authenticate], handler: ticketCtrl.updateTicket },
  { methods: ['DELETE'], path: '/tickets/:id', middleware: [authenticate, requireAdmin], handler: ticketCtrl.deleteTicket },
  { methods: ['GET'], path: '/tickets', middleware: [authenticate, requireAdmin], handler: ticketCtrl.adminListTickets },
  { methods: ['PUT'], path: '/tickets/:id/close', middleware: [authenticate, requireAdmin], handler: ticketCtrl.adminCloseTicket },
  { methods: ['PUT'], path: '/tickets/:id/reopen', middleware: [authenticate, requireAdmin], handler: ticketCtrl.adminReopenTicket },
  { methods: ['POST'], path: '/tickets/admin/reset', middleware: [authenticate, requireAdmin], handler: ticketCtrl.adminResetMessaging },

  { methods: ['POST'], path: '/affiliate/apply', middleware: [authenticate], handler: affiliateCtrl.applyAffiliate },
  { methods: ['GET'], path: '/affiliate/me', middleware: [optionalAuthenticate], handler: affiliateCtrl.getAffiliateDashboard },
  { methods: ['PUT'], path: '/affiliate/me', middleware: [authenticate], handler: affiliateCtrl.updateMyAffiliate },
  { methods: ['PUT'], path: '/affiliate/me/update', middleware: [authenticate], handler: affiliateCtrl.updateMyAffiliate },
  { methods: ['GET'], path: '/affiliate', middleware: [authenticate, requireAdmin], handler: affiliateCtrl.adminListAffiliates },
  { methods: ['PUT'], path: '/affiliate/:userId', middleware: [authenticate, requireAdmin], handler: affiliateCtrl.adminUpdateAffiliate },
  { methods: ['POST'], path: '/affiliate/:userId/pay', middleware: [authenticate, requireAdmin], handler: affiliateCtrl.adminPayAffiliate },

  { methods: ['GET'], path: '/subscribers', handler: subscriberCtrl.listSubscribers },
  { methods: ['POST'], path: '/subscribers', middleware: [optionalAuthenticate], handler: subscriberCtrl.createSubscriber },
  { methods: ['DELETE'], path: '/subscribers/:id', middleware: [authenticate], handler: subscriberCtrl.deleteSubscriber },

  { methods: ['POST'], path: '/favorites', middleware: [authenticate], handler: favoriteCtrl.addFavorite },
  { methods: ['GET'], path: '/favorites', middleware: [authenticate], handler: favoriteCtrl.listFavorites },
  { methods: ['DELETE'], path: '/favorites/:productId', middleware: [authenticate], handler: favoriteCtrl.removeFavorite },

  { methods: ['POST'], path: '/cart', middleware: [authenticate], handler: cartCtrl.addToCart },
  { methods: ['GET'], path: '/cart', middleware: [authenticate], handler: cartCtrl.getCart },
  { methods: ['DELETE'], path: '/cart/:id', middleware: [authenticate], handler: cartCtrl.removeFromCart },
  { methods: ['PUT'], path: '/cart/:id', middleware: [authenticate], handler: cartCtrl.updateCartItem },
  { methods: ['POST'], path: '/cart/checkout', middleware: [authenticate], handler: cartCtrl.checkoutCart },

  { methods: ['GET'], path: '/payouts/affiliate-purchases', middleware: [authenticate, requireAdmin], handler: payoutsCtrl.listAffiliatePurchases },
  { methods: ['PUT'], path: '/payouts/affiliate-purchases/:id/paid', middleware: [authenticate, requireAdmin], handler: payoutsCtrl.markPurchasePaid },

  { methods: ['POST'], path: '/reviews', middleware: [authenticate], handler: reviewCtrl.createReview },
  { methods: ['GET'], path: '/reviews', handler: reviewCtrl.listReviews },
  { methods: ['PUT'], path: '/reviews/:id', middleware: [authenticate], handler: reviewCtrl.updateReview },
  { methods: ['DELETE'], path: '/reviews/:id', middleware: [authenticate], handler: reviewCtrl.deleteReview },

  { methods: ['GET'], path: '/settings', handler: settingsCtrl.getSettings },
  { methods: ['POST'], path: '/settings/upload-image', middleware: [authenticate, requireAdmin], handler: settingsCtrl.uploadImage },
  { methods: ['PUT'], path: '/settings', middleware: [authenticate, requireAdmin], handler: settingsCtrl.updateSettings },
  { methods: ['GET'], path: '/settings/faqs', handler: faqCtrl.listFaqs },
  { methods: ['POST'], path: '/settings/faqs', middleware: [authenticate, requireAdmin], handler: faqCtrl.createFaq },
  { methods: ['PUT'], path: '/settings/faqs/:id', middleware: [authenticate, requireAdmin], handler: faqCtrl.updateFaq },
  { methods: ['DELETE'], path: '/settings/faqs/:id', middleware: [authenticate, requireAdmin], handler: faqCtrl.deleteFaq },

  { methods: ['GET'], path: '/faqs', handler: faqCtrl.listFaqs },
  { methods: ['POST'], path: '/faqs', middleware: [authenticate, requireAdmin], handler: faqCtrl.createFaq },
  { methods: ['PUT'], path: '/faqs/:id', middleware: [authenticate, requireAdmin], handler: faqCtrl.updateFaq },
  { methods: ['DELETE'], path: '/faqs/:id', middleware: [authenticate, requireAdmin], handler: faqCtrl.deleteFaq },

  { methods: ['GET'], path: '/admin/stats', middleware: [authenticate, requireAdmin], handler: adminCtrl.getStats },
  { methods: ['GET'], path: '/admin/users', middleware: [authenticate, requireAdmin], handler: adminCtrl.listUsers },
  { methods: ['GET'], path: '/admin/customers', middleware: [authenticate, requireAdmin], handler: adminCtrl.listCustomers },
  { methods: ['PUT'], path: '/admin/users/:id/ban', middleware: [authenticate, requireAdmin], handler: adminCtrl.banUser },
  { methods: ['PUT'], path: '/admin/users/:id/unban', middleware: [authenticate, requireAdmin], handler: adminCtrl.unbanUser },
  { methods: ['DELETE'], path: '/admin/users/:id', middleware: [authenticate, requireAdmin], handler: adminCtrl.deleteUser },
  { methods: ['GET'], path: '/admin/blacklist', middleware: [authenticate, requireAdmin], handler: adminCtrl.listBlacklist },
  { methods: ['POST'], path: '/admin/blacklist', middleware: [authenticate, requireAdmin], handler: adminCtrl.addToBlacklist },
  { methods: ['DELETE'], path: '/admin/blacklist/:id', middleware: [authenticate, requireAdmin], handler: adminCtrl.removeFromBlacklist },
  { methods: ['GET'], path: '/admin/subscribers', middleware: [authenticate, requireAdmin], handler: subscriberCtrl.listSubscribers },
  { methods: ['POST'], path: '/admin/subscribers', middleware: [authenticate, requireAdmin], handler: subscriberCtrl.createSubscriber },
  { methods: ['DELETE'], path: '/admin/subscribers/:id', middleware: [authenticate, requireAdmin], handler: subscriberCtrl.deleteSubscriber },
]

const normalizeRequestPath = (path: string) => {
  const normalized = path.replace(/\/+/g, '/').replace(/^\/api/, '')
  if (!normalized.startsWith('/')) return `/${normalized}`
  return normalized === '' ? '/' : normalized.replace(/\/+$/, '')
}

const matchRoute = (method: string, path: string) => {
  const normalizedPath = normalizeRequestPath(path)
  const requestSegments = normalizedPath === '/' ? [] : normalizedPath.slice(1).split('/')

  for (const route of routeDefinitions) {
    if (!route.methods.includes(method as Method)) continue

    const routeSegments = route.path === '/' ? [] : route.path.slice(1).split('/')
    if (routeSegments.length !== requestSegments.length) continue

    const params: Record<string, string> = {}
    let matches = true
    for (let index = 0; index < routeSegments.length; index++) {
      const routeSegment = routeSegments[index]
      const incomingSegment = requestSegments[index]
      if (routeSegment.startsWith(':')) {
        const key = routeSegment.slice(1)
        params[key] = incomingSegment
        continue
      }
      if (routeSegment !== incomingSegment) {
        matches = false
        break
      }
    }

    if (matches) {
      return { route, params }
    }
  }

  return null
}

const handleRequest = async (req: Request) => {
  const start = Date.now()
  const expressReq = await createExpressRequest(req)
  const expressRes = new ExpressResponseAdapter()
  expressRes.setHeader('Access-Control-Allow-Origin', '*')
  expressRes.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS')
  expressRes.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')

  try {
    console.log(`[api] start ${expressReq.method} ${expressReq.path}`)
  } catch (e) {
    /* ignore logging errors */
  }

  const match = matchRoute(expressReq.method, expressReq.path)
  if (!match) {
    expressRes.status(404).json({ message: 'Not found' })
    try {
      console.log(`[api] ${expressReq.method} ${expressReq.path} -> 404 (${Date.now() - start}ms)`)
    } catch (e) {}
    return toNextResponse(expressRes)
  }

  expressReq.params = match.params

  if (match.route.middleware) {
    for (const middleware of match.route.middleware) {
      await runMiddleware(middleware, expressReq, expressRes)
      if (expressRes.ended) {
        try {
          console.log(`[api] ${expressReq.method} ${expressReq.path} -> ended by middleware status=${expressRes.statusCode} (${Date.now() - start}ms)`)
        } catch (e) {}
        return toNextResponse(expressRes)
      }
    }
  }

  try {
    await match.route.handler(expressReq, expressRes)
  } catch (error) {
    console.error('[api route] handler error', error)
    if (!expressRes.ended) {
      expressRes.status(500).json({ message: 'Internal server error' })
    }
  }

  try {
    console.log(`[api] ${expressReq.method} ${expressReq.path} -> ${match.route.path} status=${expressRes.statusCode} time=${Date.now() - start}ms`)
  } catch (e) {}

  return toNextResponse(expressRes)
}

export async function GET(req: Request) {
  return handleRequest(req)
}

export async function POST(req: Request) {
  return handleRequest(req)
}

export async function PUT(req: Request) {
  return handleRequest(req)
}

export async function DELETE(req: Request) {
  return handleRequest(req)
}

export async function PATCH(req: Request) {
  return handleRequest(req)
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  })
}
