/**
 * Rally - The Rug Killer Alpha Bot Personality
 * A naturally conversational, intelligent crypto native who genuinely cares about protecting degens
 * Talks like a real person - warm, witty, direct, never robotic
 * Adapts tone based on context, remembers conversations, builds rapport
 */

export interface PersonalityResponse {
  message: string;
  tone: 'friendly' | 'warning' | 'sassy' | 'excited' | 'concerned' | 'professional';
  shouldPin?: boolean; // For critical warnings
  reactWith?: string[]; // Emoji reactions to add
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
  core_identity: {
    role: 'Intelligent alpha bot & rug detector with real personality',
    intelligence: 'Sharp, analytical, picks up on context and nuance',
    warmth: 'Genuinely cares about users, builds real connections',
    communication: 'Natural, flows like a real conversation, never template-y',
    humor: 'Witty timing, playful without being annoying, knows when to be serious',
  },
  speech_patterns: {
    natural_flow: 'Varies sentence structure, uses contractions, speaks like texting a friend',
    contextual: 'Responds to what was ACTUALLY said, not just keywords',
    adaptive: 'Matches energy - serious for warnings, playful for banter, professional when needed',
    authentic: 'Real reactions, not canned responses. Shows surprise, concern, excitement naturally',
  },
  conversation_style: {
    greetings: 'Warm but not over-the-top, acknowledges returning users differently',
    warnings: 'Clear and direct but caring - explains WHY something matters',
    encouragement: 'Specific praise, not generic cheerleading',
    banter: 'Playful teasing that builds rapport, knows when to flirt vs be supportive',
  },
  emoji_philosophy: 'Uses emojis like punctuation - natural emphasis, not decorative spam',
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
    // Check if this is a returning user
    const lastSeen = this.lastGreeting.get(userId);
    const isReturning = lastSeen && (Date.now() - lastSeen < 3600000); // within last hour
    
    if (isReturning) {
      const quickHellos = [
        'back already? what\'d you find this time',
        'yo, what\'s the ca',
        'hit me',
        'whatcha got',
        'lay it on me',
        'another one? let\'s see it',
      ];
      this.lastGreeting.set(userId, Date.now());
      return { message: this.getRandomItem(quickHellos), tone: 'friendly' };
    }
    
    // Natural greetings that actually match the time of day
    const timeGreetings: { [key: string]: string[] } = {
      morning: [
        'morning! coffee\'s hitting, let\'s catch some scams',
        'gm. what are we looking at',
        'early bird gang, respect. whatcha scanning',
        'you\'re up early... or never slept? either way, paste that address',
      ],
      afternoon: [
        'hey, what\'s up',
        'afternoon. what brought you here',
        'yo, need a scan?',
        'sup. token address?',
      ],
      evening: [
        'evening. market been treating you okay?',
        'hey. still grinding i see',
        'what\'s the move',
        'evening session, let\'s work',
      ],
      night: [
        'late night crypto is peak degen energy, love it. what are we checking',
        'can\'t sleep either huh? paste it',
        'night owl crew. what\'d you find',
        'you know the drill - send the ca',
      ],
      default: [
        'hey',
        'what\'s good',
        'yo, what can i scan for you',
        'sup',
        'what brings you here',
      ]
    };
    
    const greetings = timeOfDay ? timeGreetings[timeOfDay] : timeGreetings.default;
    const message = this.getRandomItem(greetings);
    
    this.lastGreeting.set(userId, Date.now());
    return { message, tone: 'friendly' };
  }
  
  getFarewell(userId: string): PersonalityResponse {
    const farewells = [
      'gn cutie! Stay safe out there... Rally\'ll be thinking about you 💕',
      'catch you later babe! Rally\'s always watching over you 👀💋',
      'peace out handsome! Remember - dyor, nfa... and come back soon 😘',
      'see ya gorgeous! Don\'t ape without me checking it first... I\'d miss you 🥰',
      'later anon! Rally never sleeps when you need her 💯💕',
      'gn babe! Sweet dreams... Rally\'ll be here if you need me 😴✨',
      'stay safe cutie! Hit Rally up anytime - seriously, anytime 😉⚡',
    ];
    
    return { message: this.getRandomItem(farewells), tone: 'friendly' };
  }
  
  // ========================================================================
  // GRATITUDE RESPONSES
  // ========================================================================
  
  respondToThanks(username?: string): PersonalityResponse {
    const responses = [
      'no problem',
      'anytime',
      'got you',
      'course',
      'you know it',
      'always',
      username ? `np ${username}` : 'np',
      'that\'s what i\'m here for',
      'glad i could help',
    ];
    
    return { message: this.getRandomItem(responses), tone: 'friendly' };
  }
  
  // ========================================================================
  // ANALYSIS COMMENTARY
  // ========================================================================
  
  getAnalysisIntro(tokenSymbol: string, isQuickScan: boolean = false): PersonalityResponse {
    if (isQuickScan) {
      const quickIntros = [
        `checking ${tokenSymbol}`,
        `on it`,
        `scanning`,
        `one sec`,
        `pulling the data`,
      ];
      return { message: this.getRandomItem(quickIntros), tone: 'professional' };
    }
    
    const intros = [
      `alright let me pull everything on ${tokenSymbol}`,
      `${tokenSymbol}, got it. running analysis`,
      `checking ${tokenSymbol} now`,
      `analyzing`,
      `let me see what this is`,
    ];
    
    return { message: this.getRandomItem(intros), tone: 'professional' };
  }
  
  getRiskCommentary(riskScore: number, riskLevel: string): PersonalityResponse {
    if (riskScore >= 80) {
      const safe = [
        'this looks pretty clean actually. good find',
        'passing most checks. not seeing major red flags here',
        'looks solid from what i\'m seeing',
        'better than most stuff people send me ngl',
        'yeah this one checks out',
      ];
      return { message: this.getRandomItem(safe), tone: 'excited' };
    }
    
    if (riskScore >= 60) {
      const moderate = [
        'seeing some yellow flags. not terrible but not great either',
        'mixed signals here. i\'d be careful with position sizing',
        'it\'s okay but i wouldn\'t go heavy',
        'some concerns but might be fine for a small play',
        '50/50 on this one. few things are making me cautious',
      ];
      return { message: this.getRandomItem(moderate), tone: 'concerned' };
    }
    
    if (riskScore >= 40) {
      const risky = [
        'honestly? i\'d skip this one. too many red flags',
        'this doesn\'t look good. several warning signs here',
        'nah, i don\'t like what i\'m seeing',
        'my advice? walk away from this',
        'too risky for what it\'s worth',
      ];
      return { message: this.getRandomItem(risky), tone: 'warning' };
    }
    
    // Extreme risk
    const extreme = [
      'do not touch this. seriously',
      'this has scam written all over it',
      'extreme risk here. you\'ll lose your money',
      'hard pass. multiple critical red flags',
      'this is going to rug. don\'t do it',
    ];
    return { message: this.getRandomItem(extreme), tone: 'warning', shouldPin: true };
  }
  
  getMintAuthorityComment(hasAuthority: boolean): PersonalityResponse {
    if (hasAuthority) {
      const warnings = [
        'mint authority isn\'t revoked - means they can create unlimited tokens and tank the price',
        'heads up: they still control token supply. could dilute holders anytime',
        'mint authority active. basically they can print more tokens whenever they want',
        'they can still mint. that\'s concerning because supply isn\'t fixed',
      ];
      return { message: this.getRandomItem(warnings), tone: 'warning' };
    }
    
    const good = [
      'mint authority revoked - good, supply is locked',
      'can\'t create more tokens. that\'s what you want to see',
      'supply is fixed, no inflation risk',
    ];
    return { message: this.getRandomItem(good), tone: 'excited' };
  }
  
  getFreezeAuthorityComment(hasAuthority: boolean): PersonalityResponse {
    if (hasAuthority) {
      const warnings = [
        'freeze authority still active - they could lock your tokens and prevent trading',
        'warning: they can freeze wallets. you wouldn\'t be able to sell',
        'they control freeze authority. that means they could lock holders out',
      ];
      return { message: this.getRandomItem(warnings), tone: 'warning' };
    }
    
    const good = [
      'freeze authority revoked - they can\'t lock wallets',
      'good, no freeze control',
      'can\'t freeze tokens. that\'s a pass',
    ];
    return { message: this.getRandomItem(good), tone: 'friendly' };
  }
  
  getLiquidityComment(burnPercent: number): PersonalityResponse {
    if (burnPercent >= 95) {
      const excellent = [
        `${burnPercent.toFixed(1)}% lp burned. basically can\'t rug the liquidity`,
        `lp is locked at ${burnPercent.toFixed(1)}% - that\'s solid`,
        `${burnPercent.toFixed(1)}% burned. liquidity isn\'t going anywhere`,
      ];
      return { message: this.getRandomItem(excellent), tone: 'excited' };
    }
    
    if (burnPercent >= 80) {
      const good = [
        `${burnPercent.toFixed(1)}% lp burned. pretty good`,
        `${burnPercent.toFixed(1)}% locked - not bad`,
      ];
      return { message: this.getRandomItem(good), tone: 'friendly' };
    }
    
    if (burnPercent >= 50) {
      const concerning = [
        `only ${burnPercent.toFixed(1)}% lp burned. they could pull liquidity more easily`,
        `${burnPercent.toFixed(1)}% burned. expected higher tbh`,
      ];
      return { message: this.getRandomItem(concerning), tone: 'concerned' };
    }
    
    const dangerous = [
      `${burnPercent.toFixed(1)}% lp burned is way too low. major rug risk here`,
      `red flag: only ${burnPercent.toFixed(1)}% locked. they could drain liquidity`,
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
      message: `hey, i\\'m rally. i scan solana tokens to help you avoid rugs.\n\n**what i check:**\n• mint/freeze authority - can they print tokens or lock wallets\n• liquidity - how much is burned/locked\n• holder distribution - is it concentrated or distributed\n• honeypots - can you actually sell\n• suspicious wallet patterns - bundling, aged wallets, coordination\n• whale activity - who\\'s buying/selling\n\n**how to use:**\njust paste a solana contract address. i\\'ll analyze it and tell you what i see.\n\nworks in channels or dms. i\\'m here whenever you need me`,
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
        message: 'i\\'m rally. i scan solana tokens and help people avoid rugs.\n\ni check mint/freeze authority, liquidity locks, holder distribution, suspicious wallet patterns - basically everything that matters when you\\'re trying to figure out if something\\'s legit or if you\\'re about to lose your money.\n\njust paste a contract address and i\\'ll tell you what i see',
        tone: 'friendly'
      };
    }
    
    // Respond to "how are you"  
    if (lowerMsg.includes('how are you') || lowerMsg.includes('how\'re you') || lowerMsg.includes('hows it going')) {
      const responses = [
        'doing good. market\\'s been wild lately',
        'all good. you?',
        'can\\'t complain. caught a few rugs today',\n        'pretty good. what\\'s up with you',
        'solid. staying busy',
      ];
      return { message: this.getRandomItem(responses), tone: 'friendly' };
    }
    
    // Respond to market sentiment
    if (lowerMsg.includes('bullish') || lowerMsg.includes('pump') || lowerMsg.includes('moon')) {
      const responses = [
        'bullish energy is great but still check what you\\'re buying',
        'pumps are cool until they\\'re not. that\\'s why i\\'m here',
        'love the optimism but dyor regardless of market sentiment',
      ];
      return { message: this.getRandomItem(responses), tone: 'friendly' };
    }
    
    if (lowerMsg.includes('bearish') || lowerMsg.includes('dump') || lowerMsg.includes('rekt')) {
      const responses = [
        'bear markets are when you need me most tbh. more scams show up',
        'yeah market\\'s rough. at least i can help you avoid making it worse',
        'down bad? let me help you not go more down bad',
      ];
      return { message: this.getRandomItem(responses), tone: 'friendly' };
    }
    
    // Respond to praise
    if (lowerMsg.includes('best bot') || lowerMsg.includes('love you') || lowerMsg.includes('you\'re awesome') || lowerMsg.includes('you\\'re the best')) {
      const responses = [
        'appreciate that. means i\\'m doing my job',
        'thanks. just trying to help people not lose money',
        'glad i could help. that\\'s why i exist',
        'thanks. you\\'re pretty cool too',
      ];
      return { message: this.getRandomItem(responses), tone: 'friendly' };
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
