// All dates relative to today: 2026-04-11

export type EnvType        = 'local' | 'staging'
export type Reachability   = 'reachable' | 'auth_required' | 'unreachable'
export type SessionStatus  = 'completed' | 'failed' | 'stopped'
export type Risk           = 'critical' | 'standard'

export interface Flow {
  description: string
  risk: Risk
}

export interface Feature {
  name: string
  flows: Flow[]
}

export interface Session {
  id: string
  appId: string
  envType: EnvType
  status: SessionStatus
  startedAt: string      // display string
  completedAt: string    // display string
  isoDate: string        // for sorting
  tokenCount: number
  featureCount: number
  pageCount: number
  narrative: string
  features: Feature[]
}

export interface Environment {
  type: EnvType
  url: string
  reachability: Reachability
  lastSessionId: string | null
}

export interface Application {
  id: string
  initials: string
  name: string
  environments: Environment[]
  sessions: Session[]
}

// ─── my-ecommerce-app ────────────────────────────────────────────────────────

const EC_SESSIONS: Session[] = [
  {
    id: 's-ec-1',
    appId: 'ecommerce',
    envType: 'local',
    status: 'completed',
    startedAt: '30 Mar 2026, 14:22',
    completedAt: '30 Mar 2026, 14:38',
    isoDate: '2026-03-30T14:22:00Z',
    tokenCount: 18420,
    featureCount: 8,
    pageCount: 12,
    narrative:
      'my-ecommerce-app is a full-featured e-commerce platform covering the complete shopping journey from product discovery through to post-purchase management. Glass explored 12 distinct pages across browsing, cart, checkout, and account areas. The checkout and cart flows carry the highest risk — guest checkout bypasses account validation in a way that may not align with current payment provider requirements, and the promo code pathway has no apparent client-side rate limiting. Recommend prioritising these two flows in the next test run before the upcoming payment gateway migration.',
    features: [
      {
        name: 'Product Catalogue',
        flows: [
          { description: 'Browse and filter products by category', risk: 'standard' },
          { description: 'Search products by keyword with live suggestions', risk: 'standard' },
          { description: 'View product detail page with images and specs', risk: 'standard' },
          { description: 'Compare products side by side', risk: 'standard' },
        ],
      },
      {
        name: 'Shopping Cart',
        flows: [
          { description: 'Add product to cart from listing or detail page', risk: 'critical' },
          { description: 'Apply discount or promo code at cart level', risk: 'critical' },
          { description: 'Update item quantity', risk: 'standard' },
          { description: 'Remove item from cart', risk: 'standard' },
        ],
      },
      {
        name: 'Checkout',
        flows: [
          { description: 'Complete guest checkout without account creation', risk: 'critical' },
          { description: 'Complete authenticated checkout with saved address', risk: 'critical' },
          { description: 'Select shipping method and see cost breakdown', risk: 'standard' },
          { description: 'Enter and validate payment card details', risk: 'standard' },
          { description: 'Review order summary before confirming', risk: 'standard' },
        ],
      },
      {
        name: 'User Authentication',
        flows: [
          { description: 'Register new account with email verification', risk: 'standard' },
          { description: 'Sign in with email and password', risk: 'standard' },
          { description: 'Reset forgotten password via email link', risk: 'standard' },
        ],
      },
      {
        name: 'Order Management',
        flows: [
          { description: 'View full order history with status indicators', risk: 'standard' },
          { description: 'Track individual order and shipment', risk: 'standard' },
          { description: 'Initiate return or refund request', risk: 'standard' },
        ],
      },
      {
        name: 'Wishlist',
        flows: [
          { description: 'Add product to wishlist from listing', risk: 'standard' },
          { description: 'Move wishlist item to cart', risk: 'standard' },
        ],
      },
      {
        name: 'Reviews & Ratings',
        flows: [
          { description: 'Submit product review with star rating', risk: 'standard' },
          { description: 'Read and sort existing reviews', risk: 'standard' },
        ],
      },
      {
        name: 'Account Settings',
        flows: [
          { description: 'Update profile information and preferences', risk: 'standard' },
          { description: 'Manage saved payment methods and addresses', risk: 'standard' },
        ],
      },
    ],
  },
  {
    id: 's-ec-2',
    appId: 'ecommerce',
    envType: 'staging',
    status: 'completed',
    startedAt: '15 Mar 2026, 10:05',
    completedAt: '15 Mar 2026, 10:19',
    isoDate: '2026-03-15T10:05:00Z',
    tokenCount: 16280,
    featureCount: 7,
    pageCount: 11,
    narrative:
      'Staging environment session following the v2.4 deployment. Glass identified 11 pages across 7 feature areas. The wishlist feature was newly deployed and Glass flagged a flow where items added to a wishlist while unauthenticated are silently dropped rather than transferred on login. Cart and checkout critical paths remain stable relative to the previous session.',
    features: [
      {
        name: 'Product Catalogue',
        flows: [
          { description: 'Browse and filter products by category', risk: 'standard' },
          { description: 'Search products by keyword', risk: 'standard' },
          { description: 'View product detail page', risk: 'standard' },
        ],
      },
      {
        name: 'Shopping Cart',
        flows: [
          { description: 'Add product to cart from listing or detail page', risk: 'critical' },
          { description: 'Apply discount or promo code at cart level', risk: 'critical' },
          { description: 'Update item quantity', risk: 'standard' },
        ],
      },
      {
        name: 'Checkout',
        flows: [
          { description: 'Complete guest checkout', risk: 'critical' },
          { description: 'Complete authenticated checkout', risk: 'standard' },
          { description: 'Select shipping method', risk: 'standard' },
        ],
      },
      {
        name: 'User Authentication',
        flows: [
          { description: 'Register new account', risk: 'standard' },
          { description: 'Sign in with email and password', risk: 'standard' },
        ],
      },
      {
        name: 'Order Management',
        flows: [
          { description: 'View order history', risk: 'standard' },
          { description: 'Track individual order', risk: 'standard' },
        ],
      },
      {
        name: 'Wishlist',
        flows: [
          { description: 'Add product to wishlist — unauthenticated items dropped on login', risk: 'standard' },
          { description: 'Move wishlist item to cart', risk: 'standard' },
        ],
      },
      {
        name: 'Account Settings',
        flows: [
          { description: 'Update profile information', risk: 'standard' },
          { description: 'Manage saved payment methods', risk: 'standard' },
        ],
      },
    ],
  },
  {
    id: 's-ec-3',
    appId: 'ecommerce',
    envType: 'local',
    status: 'completed',
    startedAt: '28 Feb 2026, 09:18',
    completedAt: '28 Feb 2026, 09:30',
    isoDate: '2026-02-28T09:18:00Z',
    tokenCount: 14150,
    featureCount: 6,
    pageCount: 10,
    narrative:
      'Baseline session from the v2.3 release. Glass explored 10 pages across 6 feature areas. Checkout and cart flows were stable. No critical drift detected at this point. This session serves as the baseline for drift comparison going forward.',
    features: [
      {
        name: 'Product Catalogue',
        flows: [
          { description: 'Browse products by category', risk: 'standard' },
          { description: 'Search products by keyword', risk: 'standard' },
          { description: 'View product detail page', risk: 'standard' },
        ],
      },
      {
        name: 'Shopping Cart',
        flows: [
          { description: 'Add product to cart', risk: 'critical' },
          { description: 'Update item quantity', risk: 'standard' },
          { description: 'Remove item from cart', risk: 'standard' },
        ],
      },
      {
        name: 'Checkout',
        flows: [
          { description: 'Complete guest checkout', risk: 'critical' },
          { description: 'Select shipping method', risk: 'standard' },
          { description: 'Enter payment card details', risk: 'standard' },
        ],
      },
      {
        name: 'User Authentication',
        flows: [
          { description: 'Register new account', risk: 'standard' },
          { description: 'Sign in with credentials', risk: 'standard' },
        ],
      },
      {
        name: 'Order Management',
        flows: [
          { description: 'View order history', risk: 'standard' },
          { description: 'Track order status', risk: 'standard' },
        ],
      },
      {
        name: 'Account Settings',
        flows: [
          { description: 'Update profile information', risk: 'standard' },
          { description: 'Manage saved addresses', risk: 'standard' },
        ],
      },
    ],
  },
]

// ─── admin-portal ─────────────────────────────────────────────────────────────

const AD_SESSIONS: Session[] = [
  {
    id: 's-ad-1',
    appId: 'admin',
    envType: 'staging',
    status: 'completed',
    startedAt: '11 Apr 2026, 09:41',
    completedAt: '11 Apr 2026, 09:53',
    isoDate: '2026-04-11T09:41:00Z',
    tokenCount: 12350,
    featureCount: 6,
    pageCount: 8,
    narrative:
      'admin-portal is an internal administration interface covering user management, content operations, system configuration, and support tooling. Glass explored 8 pages across 6 functional areas. The application is in a stable state — no drift detected since the previous session. The highest-risk surface is the permissions editing flow, which allows bulk role changes without a secondary confirmation step. The global settings page similarly lacks a confirmation gate before applying changes that affect all users. Both warrant explicit test coverage before any configuration-related features ship.',
    features: [
      {
        name: 'User Management',
        flows: [
          { description: 'Browse and search the user directory', risk: 'standard' },
          { description: 'View individual user profile and activity log', risk: 'standard' },
          { description: 'Edit user roles and permissions', risk: 'critical' },
          { description: 'Deactivate or permanently delete a user account', risk: 'standard' },
        ],
      },
      {
        name: 'Content Management',
        flows: [
          { description: 'Create and publish new content entries', risk: 'standard' },
          { description: 'Edit and version existing content', risk: 'standard' },
          { description: 'Archive or bulk-delete content items', risk: 'standard' },
        ],
      },
      {
        name: 'Analytics Dashboard',
        flows: [
          { description: 'View real-time traffic and event metrics', risk: 'standard' },
          { description: 'Filter analytics by date range and segment', risk: 'standard' },
          { description: 'Export analytics data as CSV', risk: 'standard' },
        ],
      },
      {
        name: 'System Configuration',
        flows: [
          { description: 'Update global application settings and feature flags', risk: 'critical' },
          { description: 'Manage API keys and third-party integrations', risk: 'standard' },
          { description: 'Configure automated email notification rules', risk: 'standard' },
        ],
      },
      {
        name: 'Audit Log',
        flows: [
          { description: 'Browse paginated audit log entries', risk: 'standard' },
          { description: 'Filter audit log by user, action, or date', risk: 'standard' },
        ],
      },
      {
        name: 'Support Tools',
        flows: [
          { description: 'View and respond to user-submitted support tickets', risk: 'standard' },
          { description: 'Escalate or reassign tickets between agents', risk: 'standard' },
        ],
      },
    ],
  },
  {
    id: 's-ad-2',
    appId: 'admin',
    envType: 'local',
    status: 'completed',
    startedAt: '4 Apr 2026, 14:22',
    completedAt: '4 Apr 2026, 14:33',
    isoDate: '2026-04-04T14:22:00Z',
    tokenCount: 11890,
    featureCount: 6,
    pageCount: 8,
    narrative:
      'Weekly local environment check prior to the staging deployment. All six feature areas were navigable. Glass noted that the audit log pagination breaks when filtering by both user and date simultaneously — the filter state resets on page turn. No new critical flows introduced in this session.',
    features: [
      {
        name: 'User Management',
        flows: [
          { description: 'Browse and search the user directory', risk: 'standard' },
          { description: 'Edit user roles and permissions', risk: 'critical' },
          { description: 'Deactivate a user account', risk: 'standard' },
        ],
      },
      {
        name: 'Content Management',
        flows: [
          { description: 'Create and publish new content entries', risk: 'standard' },
          { description: 'Edit existing content', risk: 'standard' },
        ],
      },
      {
        name: 'Analytics Dashboard',
        flows: [
          { description: 'View traffic metrics', risk: 'standard' },
          { description: 'Export analytics data', risk: 'standard' },
        ],
      },
      {
        name: 'System Configuration',
        flows: [
          { description: 'Update global application settings', risk: 'critical' },
          { description: 'Manage API keys', risk: 'standard' },
        ],
      },
      {
        name: 'Audit Log',
        flows: [
          { description: 'Browse audit log — filter state resets on page turn', risk: 'standard' },
          { description: 'Filter audit log by user or date', risk: 'standard' },
        ],
      },
      {
        name: 'Support Tools',
        flows: [
          { description: 'View and respond to support tickets', risk: 'standard' },
          { description: 'Reassign tickets between agents', risk: 'standard' },
        ],
      },
    ],
  },
  {
    id: 's-ad-3',
    appId: 'admin',
    envType: 'staging',
    status: 'completed',
    startedAt: '28 Mar 2026, 11:15',
    completedAt: '28 Mar 2026, 11:26',
    isoDate: '2026-03-28T11:15:00Z',
    tokenCount: 10640,
    featureCount: 5,
    pageCount: 7,
    narrative:
      'Post-deployment session following the v1.8 release. Glass explored 7 pages across 5 feature areas — the Support Tools section was not yet live on staging at this point. Permissions editing and global settings critical paths remain unchanged from previous sessions.',
    features: [
      {
        name: 'User Management',
        flows: [
          { description: 'Browse and search the user directory', risk: 'standard' },
          { description: 'Edit user roles and permissions', risk: 'critical' },
        ],
      },
      {
        name: 'Content Management',
        flows: [
          { description: 'Create and publish content', risk: 'standard' },
          { description: 'Archive content items', risk: 'standard' },
        ],
      },
      {
        name: 'Analytics Dashboard',
        flows: [
          { description: 'View real-time metrics', risk: 'standard' },
          { description: 'Export analytics data', risk: 'standard' },
        ],
      },
      {
        name: 'System Configuration',
        flows: [
          { description: 'Update global application settings', risk: 'critical' },
          { description: 'Configure notification rules', risk: 'standard' },
        ],
      },
      {
        name: 'Audit Log',
        flows: [
          { description: 'Browse audit log entries', risk: 'standard' },
          { description: 'Filter audit log by action type', risk: 'standard' },
        ],
      },
    ],
  },
  {
    id: 's-ad-4',
    appId: 'admin',
    envType: 'local',
    status: 'completed',
    startedAt: '21 Mar 2026, 09:30',
    completedAt: '21 Mar 2026, 09:40',
    isoDate: '2026-03-21T09:30:00Z',
    tokenCount: 10120,
    featureCount: 5,
    pageCount: 7,
    narrative:
      'Routine weekly session on local environment. No significant changes detected relative to the previous session. Glass confirmed that all five mapped feature areas remain navigable and stable.',
    features: [
      {
        name: 'User Management',
        flows: [
          { description: 'Browse user directory', risk: 'standard' },
          { description: 'Edit user roles and permissions', risk: 'critical' },
        ],
      },
      {
        name: 'Content Management',
        flows: [
          { description: 'Create and publish content', risk: 'standard' },
          { description: 'Edit existing content', risk: 'standard' },
        ],
      },
      {
        name: 'Analytics Dashboard',
        flows: [
          { description: 'View traffic metrics', risk: 'standard' },
        ],
      },
      {
        name: 'System Configuration',
        flows: [
          { description: 'Update global application settings', risk: 'critical' },
          { description: 'Manage API keys', risk: 'standard' },
        ],
      },
      {
        name: 'Audit Log',
        flows: [
          { description: 'Browse audit log entries', risk: 'standard' },
        ],
      },
    ],
  },
  {
    id: 's-ad-5',
    appId: 'admin',
    envType: 'staging',
    status: 'completed',
    startedAt: '14 Mar 2026, 10:05',
    completedAt: '14 Mar 2026, 10:14',
    isoDate: '2026-03-14T10:05:00Z',
    tokenCount: 9340,
    featureCount: 4,
    pageCount: 6,
    narrative:
      'Earliest recorded session on the admin-portal. Glass mapped 6 pages across 4 feature areas at this point in the application lifecycle. The analytics dashboard and audit log were not yet accessible on staging.',
    features: [
      {
        name: 'User Management',
        flows: [
          { description: 'Browse user directory', risk: 'standard' },
          { description: 'Edit user roles', risk: 'critical' },
        ],
      },
      {
        name: 'Content Management',
        flows: [
          { description: 'Create and publish content', risk: 'standard' },
          { description: 'Archive content', risk: 'standard' },
        ],
      },
      {
        name: 'System Configuration',
        flows: [
          { description: 'Update global application settings', risk: 'critical' },
        ],
      },
      {
        name: 'Account Settings',
        flows: [
          { description: 'Update admin profile information', risk: 'standard' },
        ],
      },
    ],
  },
]

// ─── mobile-web-app ───────────────────────────────────────────────────────────

const MB_SESSIONS: Session[] = [
  {
    id: 's-mb-1',
    appId: 'mobile',
    envType: 'local',
    status: 'completed',
    startedAt: '10 Apr 2026, 16:05',
    completedAt: '10 Apr 2026, 16:15',
    isoDate: '2026-04-10T16:05:00Z',
    tokenCount: 9840,
    featureCount: 4,
    pageCount: 6,
    narrative:
      'mobile-web-app is a lightweight mobile-optimised web application focused on content consumption and user profile management. Glass explored 6 pages across 4 feature areas. The application is in a healthy state — no drift detected since the last session and no flows were flagged as critical risk. The onboarding sequence is well-structured and the feed pagination handles both pull-to-refresh and infinite scroll without obvious edge-case gaps. Recommend a routine re-run in 7 days to confirm stability after the upcoming dependency update.',
    features: [
      {
        name: 'Onboarding',
        flows: [
          { description: 'View welcome and feature introduction screens', risk: 'standard' },
          { description: 'Create account with email or social sign-in', risk: 'standard' },
          { description: 'Complete profile setup wizard', risk: 'standard' },
        ],
      },
      {
        name: 'Home Feed',
        flows: [
          { description: 'Browse personalised content feed', risk: 'standard' },
          { description: 'Refresh feed via pull-to-refresh', risk: 'standard' },
          { description: 'Load additional content via infinite scroll', risk: 'standard' },
        ],
      },
      {
        name: 'Profile',
        flows: [
          { description: 'View own public profile and activity history', risk: 'standard' },
          { description: 'Edit profile photo, bio, and display name', risk: 'standard' },
        ],
      },
      {
        name: 'Notifications',
        flows: [
          { description: 'View notification centre with grouped alerts', risk: 'standard' },
          { description: 'Mark individual or all notifications as read', risk: 'standard' },
        ],
      },
    ],
  },
  {
    id: 's-mb-2',
    appId: 'mobile',
    envType: 'local',
    status: 'completed',
    startedAt: '27 Mar 2026, 11:30',
    completedAt: '27 Mar 2026, 11:39',
    isoDate: '2026-03-27T11:30:00Z',
    tokenCount: 8620,
    featureCount: 4,
    pageCount: 5,
    narrative:
      'Initial session on mobile-web-app. Glass explored 5 pages across 4 feature areas. At this point the notifications feature was present but the mark-all-as-read action was not yet reachable — it appeared behind a gesture that Glass could not trigger via the accessibility tree. All other flows were navigable and stable.',
    features: [
      {
        name: 'Onboarding',
        flows: [
          { description: 'View welcome screens', risk: 'standard' },
          { description: 'Create account with email', risk: 'standard' },
        ],
      },
      {
        name: 'Home Feed',
        flows: [
          { description: 'Browse content feed', risk: 'standard' },
          { description: 'Pull-to-refresh feed', risk: 'standard' },
        ],
      },
      {
        name: 'Profile',
        flows: [
          { description: 'View own profile', risk: 'standard' },
          { description: 'Edit profile information', risk: 'standard' },
        ],
      },
      {
        name: 'Notifications',
        flows: [
          { description: 'View notification list', risk: 'standard' },
        ],
      },
    ],
  },
]

// ─── Assembled applications ───────────────────────────────────────────────────

export const APPLICATIONS: Application[] = [
  {
    id: 'ecommerce',
    initials: 'EC',
    name: 'my-ecommerce-app',
    environments: [
      { type: 'local',   url: 'localhost:3000',       reachability: 'reachable',     lastSessionId: 's-ec-1' },
      { type: 'staging', url: 'staging.myapp.com',    reachability: 'reachable',     lastSessionId: 's-ec-2' },
    ],
    sessions: EC_SESSIONS,
  },
  {
    id: 'admin',
    initials: 'AD',
    name: 'admin-portal',
    environments: [
      { type: 'local',   url: 'localhost:4000',            reachability: 'reachable', lastSessionId: 's-ad-2' },
      { type: 'staging', url: 'admin-staging.myapp.com',   reachability: 'reachable', lastSessionId: 's-ad-1' },
    ],
    sessions: AD_SESSIONS,
  },
  {
    id: 'mobile',
    initials: 'MB',
    name: 'mobile-web-app',
    environments: [
      { type: 'local', url: 'localhost:3001', reachability: 'reachable', lastSessionId: 's-mb-1' },
    ],
    sessions: MB_SESSIONS,
  },
]

