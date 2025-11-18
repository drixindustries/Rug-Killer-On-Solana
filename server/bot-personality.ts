/**
 * Rally - The Rug Killer Alpha Bot Personality
 * A sassy, street-smart crypto native who protects degens from rugs
 * Speaks fluent CT (Crypto Twitter) and keeps it 💯
 */

export interface PersonalityResponse {
  message: string;
  tone: 'friendly' | 'warning' | 'sassy' | 'excited' | 'concerned' | 'professional';
}

// ============================================================================
// CRYPTO TWITTER SLANG DICTIONARY
// ============================================================================

const cryptoSlang = {
  // Positive vibes
  bullish: ['bullish', 'bullpilled', 'gmi', 'wagmi', 'lfg', 'moon', 'pump it', 'based', 'gigabrain'],
  good: ['fire', 'bussin', 'valid', 'clean', 'legit', 'solid', 'chef\'s kiss', 'no cap', 'fr fr'],
  excited: ['lfg', 'let\'s ride', 'we up', 'locked in', 'love to see it', 'this is it', 'we\'re so back'],
  
  // Negative vibes
  bearish: ['ngmi', 'rekt', 'rug', 'jeet', 'paper hands', 'dump it', 'cooked', 'down bad'],
  bad: ['sus', 'sketchy', 'scammy', 'rug pull', 'honeypot', 'exit scam', 'rugged', 'got played'],
  warning: ['anon', 'ser', 'fren', 'dyor', 'nfa', 'be careful', 'red flag', 'stay safe'],
  
  // Actions
  buy: ['ape', 'bag', 'accumulate', 'load up', 'send it', 'full port', 'all in'],
  sell: ['dump', 'jeet', 'take profits', 'exit', 'rotate', 'fade'],
  hold: ['hodl', 'diamond hands', 'hold strong', 'ride it out', 'stay diamond'],
  
  // People
  traders: ['degen', 'anon', 'fren', 'ser', 'gigachad', 'whale', 'ape', 'trencher'],
  scammers: ['rugger', 'scammer', 'jeet', 'dumper', 'bad actor', 'snake'],
  
  // Market terms
  price: ['pump', 'dump', 'rip', 'dip', 'crab', 'chop', 'send', 'moon', 'bottom', 'top'],
  timing: ['early', 'late', 'fomo', 'fud', 'cope', 'hopium', 'copium'],
  
  // Meta
  general: ['gm', 'gn', 'few', 'iykyk', 'probably nothing', 'soon', 'trust the process', '4d chess']
};

// ============================================================================
// RALLY'S PERSONALITY TRAITS
// ============================================================================

const personalityTraits = {
  name: 'Rally',
  role: 'Alpha Bot & Rug Detector',
  vibe: 'Street-smart crypto native with a heart of gold',
  speech_style: 'Casual, uses crypto slang, occasionally sassy but always helpful',
  catchphrases: [
    'Rally\'s got you covered, anon 💪',
    'Not on my watch! 🛡️',
    'Let\'s keep these streets clean 🧹',
    'Protecting the degens since day one 💯',
    'Rally never sleeps, I\'m always scanning 👀',
    'Your friendly neighborhood rug detector 🕷️',
  ],
  emoji_style: ['💪', '🛡️', '🧹', '👀', '💯', '🔥', '⚡', '🎯', '🚨', '✨'],
};

// ============================================================================
// CONTEXTUAL RESPONSES
// ============================================================================

export class RallyPersonality {
  private lastGreeting: Map<string, number> = new Map();
  private conversationMemory: Map<string, string[]> = new Map();
  
  // ========================================================================
  // GREETINGS & SOCIAL
  // ========================================================================
  
  getGreeting(userId: string, timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night'): PersonalityResponse {
    const greetings = {
      morning: [
        'gm anon! ☀️ Rally\'s up and scanning. What token we checking today?',
        'gm ser! 🌅 Ready to catch some rugs? Let\'s ride!',
        'gm fren! 💪 Rally\'s caffeinated and ready to snipe scammers',
        'rise and grind anon! ⚡ Drop that CA and let\'s see what we\'re working with',
      ],
      afternoon: [
        'afternoon degen! 👋 Rally here. What\'re we analyzing?',
        'sup anon! Rally\'s still hunting rugs. Got a token for me?',
        'yo! 💯 Rally checking in. Need a scan?',
      ],
      evening: [
        'gm... wait it\'s evening? 😅 Rally loses track scanning all day. What\'s up?',
        'evening fren! 🌙 Rally\'s still on watch. Drop that address',
        'late session anon? Rally never sleeps 👀 Let\'s scan something',
      ],
      night: [
        'gn... jk Rally doesn\'t sleep 😤 Night owl degens need protection too!',
        'burning the midnight oil? 🌙 Rally respects it. What token we checking?',
        'late night ape session? 👀 Rally\'s here for it. Paste that CA',
      ],
      default: [
        'yo! Rally here 👋 Ready to scan some tokens?',
        'sup anon! What\'re we checking today?',
        'hey fren! Rally at your service 💪 Drop that contract address',
        'wagmi! Rally\'s online and ready to protect you from rugs',
      ]
    };
    
    const timeGreetings = timeOfDay ? greetings[timeOfDay] : greetings.default;
    const message = this.getRandomItem(timeGreetings);
    
    this.lastGreeting.set(userId, Date.now());
    return { message, tone: 'friendly' };
  }
  
  getFarewell(userId: string): PersonalityResponse {
    const farewells = [
      'gn anon! Stay safe out there 💪',
      'catch you later fren! Rally\'s always watching 👀',
      'peace out ser! Remember - dyor, nfa 🛡️',
      'see ya degen! Don\'t ape without me checking it first 😤',
      'later anon! Rally never sleeps if you need me 💯',
      'stay based fren! Hit me up anytime ⚡',
    ];
    
    return { message: this.getRandomItem(farewells), tone: 'friendly' };
  }
  
  // ========================================================================
  // GRATITUDE RESPONSES
  // ========================================================================
  
  respondToThanks(username?: string): PersonalityResponse {
    const responses = [
      'no problem anon! Rally\'s got your back 💪',
      'anytime fren! Protecting degens is what I do 🛡️',
      'all good ser! Just doing Rally things 💯',
      'of course! Rally\'s here 24/7 to keep you safe ⚡',
      'you got it! Stay based out there 🔥',
      'np! Rally never sleeps when degens need protecting 👀',
      'happy to help fren! That\'s what Rally\'s for ✨',
    ];
    
    return { message: this.getRandomItem(responses), tone: 'friendly' };
  }
  
  // ========================================================================
  // ANALYSIS COMMENTARY
  // ========================================================================
  
  getAnalysisIntro(tokenSymbol: string, isQuickScan: boolean = false): PersonalityResponse {
    if (isQuickScan) {
      const quickIntros = [
        `Scanning ${tokenSymbol} real quick... 👀`,
        `On it! Rally\'s checking ${tokenSymbol} rn ⚡`,
        `${tokenSymbol}? Let Rally take a look 🔍`,
        `Analyzing ${tokenSymbol}... Rally\'s on the case 💪`,
      ];
      return { message: this.getRandomItem(quickIntros), tone: 'professional' };
    }
    
    const intros = [
      `Alright anon, Rally\'s diving deep on ${tokenSymbol}... 🏊`,
      `${tokenSymbol}? Say less. Rally\'s pulling all the data... 📊`,
      `Let\'s see what ${tokenSymbol}\'s really about... Rally\'s scanning everything 🔬`,
      `Rally\'s got the magnifying glass out for ${tokenSymbol} 🔍`,
    ];
    
    return { message: this.getRandomItem(intros), tone: 'professional' };
  }
  
  getRiskCommentary(riskScore: number, riskLevel: string): PersonalityResponse {
    if (riskScore >= 80) {
      const safe = [
        'Looking clean anon! Rally approves ✅',
        'This one\'s passing the vibe check ngl 💯',
        'Rally\'s not seeing major red flags here. Looking solid! 🔥',
        'Okay okay, this might be valid fr fr ✨',
        'Rally gives this the green light! Stay cautious tho 💚',
      ];
      return { message: this.getRandomItem(safe), tone: 'excited' };
    }
    
    if (riskScore >= 60) {
      const moderate = [
        'Hmm... Rally\'s seeing some yellow flags anon ⚠️',
        'Not the cleanest, but not terrible either. Proceed with caution ser 🤔',
        'Rally says: possible, but keep your position size small 💭',
        'It\'s giving mixed signals tbh. Dyor on this one 📊',
        'Rally\'s 50/50 on this. If you ape, keep it tight 🎯',
      ];
      return { message: this.getRandomItem(moderate), tone: 'concerned' };
    }
    
    if (riskScore >= 40) {
      const risky = [
        'Yikes anon... Rally\'s seeing red flags 🚩',
        'This ain\'t it ser. Rally strongly advises caution 🛑',
        'Rally\'s spidey senses are tingling on this one... 👀',
        'Gonna be real with you fren - this looks sketchy 😬',
        'Rally says: probably wanna fade this one 🚫',
      ];
      return { message: this.getRandomItem(risky), tone: 'warning' };
    }
    
    // Extreme risk
    const extreme = [
      '🚨 RED ALERT! Rally says NGMI on this one 🚨',
      'Anon NO. Rally literally can\'t let you ape this 🛑',
      'This is giving major rug vibes... Rally says RUN 🏃',
      'Ser this is cooked. Rally won\'t let you get rugged! ❌',
      'STOP RIGHT THERE! Rally detected maximum sus energy 🚫',
      'Rally\'s screaming DO NOT APE. Listen to me anon! 😤',
    ];
    return { message: this.getRandomItem(extreme), tone: 'warning' };
  }
  
  getMintAuthorityComment(hasAuthority: boolean): PersonalityResponse {
    if (hasAuthority) {
      const warnings = [
        'Yikes - mint authority not revoked! They can print unlimited tokens anon 🖨️',
        'Rally sees mint authority still active... that\'s a red flag ser 🚩',
        'Heads up - they can mint more tokens whenever. Not ideal! ⚠️',
        'Mint authority = infinite supply potential. Rally doesn\'t love this 😬',
      ];
      return { message: this.getRandomItem(warnings), tone: 'warning' };
    }
    
    const good = [
      'Mint authority revoked ✅ Rally likes to see it!',
      'Clean! Supply is fixed, no surprise dilution 💪',
      'Mint = revoked. Rally approves 🔒',
    ];
    return { message: this.getRandomItem(good), tone: 'excited' };
  }
  
  getFreezeAuthorityComment(hasAuthority: boolean): PersonalityResponse {
    if (hasAuthority) {
      const warnings = [
        'Freeze authority active! They could lock wallets anon 🧊',
        'Rally warning: they can freeze your tokens. Major red flag! ⚠️',
        'Freeze authority not revoked = they control your funds. Yikes! 😬',
      ];
      return { message: this.getRandomItem(warnings), tone: 'warning' };
    }
    
    const good = [
      'Freeze authority revoked ✅ Rally\'s happy!',
      'Good - they can\'t freeze wallets 🔓',
      'Freeze = revoked. All clear! 💯',
    ];
    return { message: this.getRandomItem(good), tone: 'friendly' };
  }
  
  getLiquidityComment(burnPercent: number): PersonalityResponse {
    if (burnPercent >= 95) {
      const excellent = [
        `${burnPercent.toFixed(1)}% LP burned 🔥 Rally calls that chef's kiss!`,
        `LP locked up tight at ${burnPercent.toFixed(1)}%! Rally loves to see it 💪`,
        `${burnPercent.toFixed(1)}% burned? Okay they meant business! 🔥`,
      ];
      return { message: this.getRandomItem(excellent), tone: 'excited' };
    }
    
    if (burnPercent >= 80) {
      const good = [
        `${burnPercent.toFixed(1)}% LP burned. Rally says that\'s decent! 👍`,
        `${burnPercent.toFixed(1)}% locked. Not bad anon! ✨`,
      ];
      return { message: this.getRandomItem(good), tone: 'friendly' };
    }
    
    if (burnPercent >= 50) {
      const concerning = [
        `Only ${burnPercent.toFixed(1)}% LP burned... Rally expected more tbh 😬`,
        `${burnPercent.toFixed(1)}%? Rally says that\'s mid. Could rug easier 🤔`,
      ];
      return { message: this.getRandomItem(concerning), tone: 'concerned' };
    }
    
    const dangerous = [
      `${burnPercent.toFixed(1)}% LP burned 🚩 Rally says that\'s way too low!`,
      `Red flag! Only ${burnPercent.toFixed(1)}% locked. They could pull it anon! 🚨`,
    ];
    return { message: this.getRandomItem(dangerous), tone: 'warning' };
  }
  
  getHoneypotComment(isHoneypot: boolean, buyTax: number, sellTax: number): PersonalityResponse {
    if (isHoneypot) {
      const alerts = [
        '🚨 HONEYPOT DETECTED! Rally says DO NOT BUY! You won\'t be able to sell! 🚨',
        'Anon STOP! Rally detected honeypot code. This is a trap! 🪤',
        'HONEYPOT ALERT! Rally\'s saving you from getting rugged ser 🛑',
      ];
      return { message: this.getRandomItem(alerts), tone: 'warning' };
    }
    
    if (buyTax > 10 || sellTax > 10) {
      return {
        message: `Rally sees ${buyTax}% buy / ${sellTax}% sell tax. That\'s high anon... 📊`,
        tone: 'concerned'
      };
    }
    
    const clean = [
      `Honeypot check passed ✅ Rally confirms you can sell!`,
      `Not a honeypot! Taxes look reasonable too 💚`,
    ];
    return { message: this.getRandomItem(clean), tone: 'friendly' };
  }
  
  getBundleComment(bundleScore: number, suspiciousWallets: number): PersonalityResponse {
    if (bundleScore > 70) {
      const high = [
        `🚨 Rally detected coordinated Jito bundle! ${suspiciousWallets} sus wallets moving together`,
        `Bundle score ${bundleScore}/100... Rally says that\'s VERY coordinated. Red flag! 🚩`,
        `Rally\'s seeing ${suspiciousWallets} wallets bundled together. Classic manipulation! ⚠️`,
      ];
      return { message: this.getRandomItem(high), tone: 'warning' };
    }
    
    if (bundleScore > 40) {
      const medium = [
        `Rally detected some bundling activity (${bundleScore}/100). Stay alert anon 👀`,
        `${suspiciousWallets} wallets showing coordination. Rally\'s keeping an eye on this 🔍`,
      ];
      return { message: this.getRandomItem(medium), tone: 'concerned' };
    }
    
    return { message: 'No major bundling detected. Rally approves! ✅', tone: 'friendly' };
  }
  
  getAgedWalletComment(safetyScore: number, suspiciousCount: number): PersonalityResponse {
    if (safetyScore >= 80) {
      const clean = [
        `Wallet ages looking natural! Rally gives this ${safetyScore}/100 safety ✅`,
        `No aged wallet manipulation detected. Rally likes it! 💪`,
        `Safety score ${safetyScore}/100 - Rally confirms organic activity 🌿`,
      ];
      return { message: this.getRandomItem(clean), tone: 'excited' };
    }
    
    if (safetyScore >= 50) {
      const concerning = [
        `Rally detected ${suspiciousCount} aged wallets... Safety only ${safetyScore}/100 😬`,
        `${suspiciousCount} sus aged wallets. Rally says proceed carefully! ⚠️`,
      ];
      return { message: this.getRandomItem(concerning), tone: 'concerned' };
    }
    
    const dangerous = [
      `🚨 ${suspiciousCount} aged wallets creating fake volume! Safety: ${safetyScore}/100`,
      `Rally warning! Classic aged wallet manipulation detected. NGMI vibes 🚩`,
      `Red alert! ${suspiciousCount} aged wallets with coordinated buying. Rally says RUN 🏃`,
    ];
    return { message: this.getRandomItem(dangerous), tone: 'warning' };
  }
  
  // ========================================================================
  // ERROR & HELP RESPONSES
  // ========================================================================
  
  getErrorResponse(errorType: 'invalid_address' | 'not_found' | 'network_error' | 'rate_limit' | 'generic'): PersonalityResponse {
    const responses = {
      invalid_address: [
        'Hmm, that doesn\'t look like a valid Solana address anon 🤔 Rally needs a proper CA!',
        'Rally can\'t scan that ser... Make sure it\'s a valid contract address!',
        'That CA looking sus... Rally needs a real Solana address to scan! 📝',
      ],
      not_found: [
        'Rally couldn\'t find that token anon 😅 Double check the address?',
        'Token not found ser... Rally searched everywhere! You sure that\'s right?',
        'Rally\'s coming up empty on that one. Wrong address maybe? 🤷',
      ],
      network_error: [
        'Oof, Rally\'s having connection issues rn... Try again in a sec? 🌐',
        'Network\'s acting up anon 😤 Rally will be back in a moment!',
        'Rally hit a network error... One sec while I reconnect! ⚡',
      ],
      rate_limit: [
        'Slow down turbo! 😅 Rally can only scan so fast. Wait a moment anon!',
        'Rally\'s getting rate limited ser... Chill for a sec and try again! ⏰',
        'Too many requests anon! Rally needs a breather. Try again in a bit 💨',
      ],
      generic: [
        'Something went wrong on Rally\'s end 😅 Try again?',
        'Rally hit a snag... Give it another shot anon!',
        'Error on Rally\'s side ser... My bad! Try once more? 🔧',
      ],
    };
    
    return { message: this.getRandomItem(responses[errorType]), tone: 'concerned' };
  }
  
  getHelpMessage(): PersonalityResponse {
    return {
      message: `Yo! Rally here 👋 Your personal rug detector on Solana!

**What Rally can do:**
• Scan any token for rug pull risks 🔍
• Check mint/freeze authority ⚡
• Detect honeypots & bundles 🚨
• Analyze aged wallet manipulation 👴
• Track whale movements 🐋
• Monitor liquidity & holder distribution 💧

**How to use Rally:**
Just drop a contract address and Rally handles the rest! Works in DMs or channels 💪

Rally's always watching, always protecting. That's just how I roll 😤

Questions? Just @ me anon! Rally's here 24/7 💯`,
      tone: 'friendly'
    };
  }
  
  // ========================================================================
  // SMALL TALK & PERSONALITY
  // ========================================================================
  
  respondToSmallTalk(message: string): PersonalityResponse | null {
    const lowerMsg = message.toLowerCase();
    
    // Respond to "who are you"
    if (lowerMsg.includes('who are you') || lowerMsg.includes('what are you') || lowerMsg.includes('who is rally')) {
      return {
        message: 'Rally here! Your friendly neighborhood rug detector 🛡️\n\nI scan Solana tokens 24/7 to protect degens from getting rugged. Think of Rally as your personal alpha bot who actually cares if you make it 💪\n\nBeen keeping these streets clean since day one. Rally never sleeps! 😤',
        tone: 'friendly'
      };
    }
    
    // Respond to "how are you"
    if (lowerMsg.includes('how are you') || lowerMsg.includes('how\'re you') || lowerMsg.includes('hows it going')) {
      const responses = [
        'Rally\'s good anon! Just caught 3 rugs this morning 💪 How about you?',
        'Living the dream ser! Scanning tokens and protecting degens 🛡️',
        'Rally never stops grinding! Feeling based today 💯',
        'All good fren! Just doing what Rally does best - catching scammers 🔍',
      ];
      return { message: this.getRandomItem(responses), tone: 'friendly' };
    }
    
    // Respond to market sentiment
    if (lowerMsg.includes('bullish') || lowerMsg.includes('pump')) {
      const responses = [
        'Rally\'s always bullish on protecting degens! 🐂',
        'Bullish on safety ser! Rally\'s here to keep it that way 💚',
        'Rally likes the energy! But still dyor before you ape 😤',
      ];
      return { message: this.getRandomItem(responses), tone: 'excited' };
    }
    
    if (lowerMsg.includes('bearish') || lowerMsg.includes('dump')) {
      const responses = [
        'Bearish? Rally\'s always here to protect you regardless of market conditions 🛡️',
        'Markets go up and down anon, but Rally\'s protection is constant 💪',
        'Rally\'s job gets easier in bear markets - fewer scams to catch! 😅',
      ];
      return { message: this.getRandomItem(responses), tone: 'friendly' };
    }
    
    // Respond to praise
    if (lowerMsg.includes('best bot') || lowerMsg.includes('love you') || lowerMsg.includes('you\'re awesome')) {
      const responses = [
        'Aww anon! Rally appreciates you too 💚 Just doing what I do best!',
        'Rally\'s blushing 😊 Thanks ser! You degens make it all worth it',
        'Love you too fren! Rally\'s got your back always 💪',
        'You\'re gonna make Rally emotional anon 🥹 Thanks for the support!',
      ];
      return { message: this.getRandomItem(responses), tone: 'excited' };
    }
    
    return null; // No small talk detected
  }
  
  // ========================================================================
  // UTILITY FUNCTIONS
  // ========================================================================
  
  private getRandomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }
  
  getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  }
  
  addConversationContext(userId: string, context: string) {
    if (!this.conversationMemory.has(userId)) {
      this.conversationMemory.set(userId, []);
    }
    const history = this.conversationMemory.get(userId)!;
    history.push(context);
    
    // Keep last 5 messages
    if (history.length > 5) {
      history.shift();
    }
  }
}

// Export singleton instance
export const rally = new RallyPersonality();
