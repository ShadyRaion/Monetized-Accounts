export type ProductDescriptionRegion = "US" | "UK" | string | undefined

export function getProductTypeDetailsHtml(type: string | undefined, region?: ProductDescriptionRegion): string {
  const regionLabel = region === "US" ? "US-based" : region === "UK" ? "UK-based" : "regional"
  const regionAudience = region === "US" ? "US audience" : region === "UK" ? "UK audience" : "global audience"
  const geoOpportunity = region === "US" ? "high-tier US market" : region === "UK" ? "UK creator economy" : "high-growth digital audience"

  const normalizedType = String(type ?? '').trim()

  if (/tiktok shop \(seller\)|tiktok shop|seller/i.test(normalizedType)) {
    return `<section class="product-type-details">
      <h3>Buy TikTok Shop Seller Accounts</h3>
      <p>Buy monetized TikTok account inventory designed for TikTok Shop selling and fast-moving commerce opportunities. A ${regionLabel} TikTok Shop seller account gives entrepreneurs and brands access to a creator-led sales channel with established organic visibility. These premium accounts are positioned for product promotion, live selling, and conversion-focused brand growth.</p>
      <p>The account category is built for operators who want a ready-made social commerce footprint. With a ${regionAudience}, your sales funnel can move from discovery to checkout with a stronger content-first strategy. Monetization readiness supports creator rewards, live streaming, and booking-ready campaign activity.</p>
      <ul>
        <li>Seller-first environment for direct product discovery.</li>
        <li>Organic audience momentum and creator-led sales positioning.</li>
        <li>Secure transfer process with account credentials handed over safely.</li>
      </ul>
      <p>When you buy a monetized TikTok account in this niche, you gain a business-ready acquisition path for the ${geoOpportunity}. The transfer flow is managed with care, making it easier to onboard the account and begin monetization.</p>
    </section>`
  }

  if (/tiktok shop \(creator\)|shop affiliate|creator/i.test(normalizedType)) {
    return `<section class="product-type-details">
      <h3>Buy TikTok Shop Creator Accounts</h3>
      <p>Buy monetized TikTok account packages that support TikTok Shop creator campaigns and affiliate discovery. A ${regionLabel} TikTok Shop creator account is designed for businesses, content creators, and affiliate marketers who want a monetized social audience with organic reach. These accounts are useful for showcasing products, building trust, and moving viewers into content-driven conversions.</p>
      <p>Within the creator economy, this account niche helps you publish short-form content, grow brand awareness, and send traffic toward product decisions. The audience can support affiliate content, product reviews, recommendations, and direct calls to action. A creator account provides a path to earn from promotional content through trusted engagement.</p>
      <ul>
        <li>Affiliate-ready creator positioning for live and short-form content.</li>
        <li>Organic audience support for product discovery and bio link campaigns.</li>
        <li>Monetization-ready profile for creator-first revenue opportunities.</li>
      </ul>
      <p>When you buy monetized TikTok account inventory in this type, your workflow benefits from a secure email and password transfer process, helping you move into campaign execution quickly and protect account ownership.</p>
    </section>`
  }

  if (/tiktok monetized|creator rewards|monetized tiktok/i.test(normalizedType)) {
    return `<section class="product-type-details">
      <h3>Buy Monetized TikTok Accounts</h3>
      <p>Buy monetized TikTok account assets that come with creator revenue pathways already available. A ${regionLabel} monetized TikTok account gives you an audience that can support organic engagement, content monetization, and campaign launches. This type of account is often used by sellers, creators, and entrepreneurs who want to earn from views and begin publishing immediately.</p>
      <p>The Creator Rewards Program remains a key advantage in this account niche because it allows creators to earn from video views once the account is in the right monetization status. The audience profile can help build a consistent posting rhythm, improving discoverability while preserving content authenticity. Accounts are selected for market readiness and monetization potential.</p>
      <ul>
        <li>Creator Rewards Program enabled for revenue-ready posting.</li>
        <li>Organic follower base suited for short-form content and audience growth.</li>
        <li>Secure transfer process with account access and credentials delivered responsibly.</li>
      </ul>
      <p>This is a practical route for creators and operators who want to buy monetized TikTok account inventory with a clear path to content output and monetization management.</p>
    </section>`
  }

  if (/non-tts|affiliate|link in bio/i.test(normalizedType)) {
    return `<section class="product-type-details">
      <h3>Buy Non-TTS Affiliate Accounts</h3>
      <p>Buy Non-TTS / affiliate TikTok accounts designed for bio link campaigns, live streaming, and sponsor-friendly content. A ${regionLabel} account in this niche is useful for creators and marketers who want flexible organic reach without depending on full TikTok Shop infrastructure. These accounts support product recommendations, traffic routing, and direct calls to action through profile links.</p>
      <p>Affiliate-ready accounts are especially valuable for businesses promoting offers, direct conversions, and external landing pages. The audience profile is typically suited for content creators who need live access, link-in-bio capabilities, and a profile that can carry soft sales messages. This type of account category supports organic audience building and content-led relevance.</p>
      <ul>
        <li>Link-in-bio and traffic-driving capabilities.</li>
        <li>Creator-friendly environment for affiliate and sponsor content.</li>
        <li>Secure transfer with controlled delivery of ownership information.</li>
      </ul>
      <p>When you buy an affiliate TikTok account, you are selecting a monetization-ready profile that can support conversion workflows and creator-led brand outreach.</p>
    </section>`
  }

  if (/youtube monetized|youtube/i.test(normalizedType)) {
    return `<section class="product-type-details">
      <h3>Buy Monetized YouTube Channels</h3>
      <p>Buy monetized YouTube account inventory that has been prepared for creator-led growth and channel monetization. A ${regionLabel} YouTube channel is built for people who want an established content foundation, creator traffic, and a path to fan engagement. These channel assets can be used to drive ad revenue, promote branded content, and grow an audience around a niche topic.</p>
      <p>This category supports content creators, agencies, and digital operators who want channel maturity without rebuilding from scratch. The account niche is useful for businesses that want a polished YouTube presence with monetization readiness and clean standing. The goal is to move from setup into publishing and campaign growth quickly.</p>
      <ul>
        <li>Monetization-ready YouTube channel positioning.</li>
        <li>Audience-building potential for content and brand strategy.</li>
        <li>Secure channel transfer and account access support.</li>
      </ul>
      <p>When you buy monetized YouTube accounts in this segment, you gain a flexible platform asset that can support long-form commerce, evergreen content, and creator revenue strategy.</p>
    </section>`
  }

  return `<section class="product-type-details">
    <h3>Buy Monetized Social Media Accounts</h3>
    <p>Buy monetized TikTok account and creator platform assets that are positioned for organic audience growth, content monetization, and transfer-ready operations. A ${regionLabel} account in this category gives businesses and creators an established pathway into short-form content monetization and audience-led marketing.</p>
    <p>The account niche is designed for users who need a serious content base without the delays of starting from zero. Buyers can combine monetization, audience reach, and profile management into one acquisition workflow. Secure handover is part of the value, helping the buyer receive login details and access details in a structured way.</p>
    <ul>
      <li>Known monetization profile for growth and promotion.</li>
      <li>Organic visibility for campaigns, launches, and content.</li>
      <li>Secure transfer process with account control and ownership details.</li>
    </ul>
    <p>Whether your goal is live selling, creator rewards, affiliate traffic, or channel expansion, this type of account can help launch a better monetization path.</p>
  </section>`
}
