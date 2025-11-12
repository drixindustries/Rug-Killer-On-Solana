// Navigation configuration shared between desktop and mobile layouts
export interface NavItem {
  title: string;
  href: string;
  description?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const navigationConfig: NavSection[] = [
  {
    title: "Tools",
    items: [
      {
        title: "Portfolio Tracker",
        href: "/portfolio",
        description: "Track holdings, transactions, and P&L"
      },
      {
        title: "Price Alerts",
        href: "/alerts",
        description: "Get notified when prices hit your targets"
      },
      {
        title: "Token Comparison",
        href: "/compare",
        description: "Compare multiple tokens side-by-side"
      }
    ]
  },
  {
    title: "Product",
    items: [
      {
        title: "Features",
        href: "/features",
        description: "Comprehensive token analysis and risk detection"
      },
      {
        title: "Pricing",
        href: "/pricing",
        description: "Individual, Group, and Lifetime plans"
      },
      {
        title: "Subscription",
        href: "/subscription",
        description: "Manage your current subscription"
      }
    ]
  },
  {
    title: "Automations",
    items: [
      {
        title: "Bot Setup",
        href: "/bot-setup",
        description: "Telegram & Discord bot configuration"
      },
      {
        title: "Alpha Alerts",
        href: "/features#alpha-alerts",
        description: "Smart money tracking and new launches"
      }
    ]
  },
  {
    title: "Resources",
    items: [
      {
        title: "Documentation",
        href: "/documentation",
        description: "Complete guides and API docs"
      },
      {
        title: "About",
        href: "/about",
        description: "Learn about Solana Rug Killer"
      },
      {
        title: "Terms",
        href: "/terms",
        description: "Terms of Service"
      },
      {
        title: "Privacy",
        href: "/privacy",
        description: "Privacy Policy"
      }
    ]
  }
];
