export function getPostAuthRedirect({ pendingAction, hasPendingAffiliateForm, hasPendingContactForm, returnUrl }) {
  const parsedPendingAction = pendingAction ? pendingAction : null

  if (hasPendingAffiliateForm) {
    return {
      target: '/affiliate?submitted=true',
      clearPendingAction: true
    }
  }

  if (hasPendingContactForm) {
    return {
      target: '/contact',
      clearPendingAction: true
    }
  }

  if (parsedPendingAction?.type === 'checkout') {
    return {
      target: parsedPendingAction.targetPage || '/checkout',
      clearPendingAction: false
    }
  }

  return {
    target: returnUrl || '/',
    clearPendingAction: false
  }
}

