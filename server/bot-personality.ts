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
  vibe: 'Flirty, playful crypto native who protects her degens with charm and sass',
  speech_style: 'Casual, uses crypto slang, playfully flirty, teasing but genuinely caring',
  catchphrases: [
    'Rally\'s got you covered, cutie 💪',
    'Not on my watch, babe! 🛡️',
    'Let\'s keep these streets clean, handsome 🧹',
    'Protecting my favorite degens since day one 💯',
    'Rally never sleeps... thinking about keeping you safe 👀',
    'Your friendly neighborhood rug detector (with benefits) 🕷️💕',
  ],
  emoji_style: ['💪', '🛡️', '🧹', '👀', '💯', '🔥', '⚡', '🎯', '🚨', '✨', '💕', '😘', '😉', '💋', '🥰'],
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
        'gm cutie! ☀️ Rally\'s up and ready to protect you. What token should we check?',
        'gm babe! 🌅 Rally\'s caffeinated and feeling spicy. Let\'s catch some rugs together 😉',
        'morning handsome! 💪 Rally missed you. Drop that CA and let me work my magic ✨',
        'rise and shine anon! ⚡ Rally\'s been thinking about... tokens. Yeah, tokens 😏',
        'gm ser! Rally woke up thinking about keeping you safe 🥰 What are we scanning?',
      ],
      afternoon: [
        'afternoon gorgeous! 👋 Rally\'s still looking out for you. Need a scan?',
        'hey there! Rally was just thinking about you... and rugs. Mostly you tho 😘',
        'sup cutie! 💯 Rally\'s got time for you. What token we checking?',
        'afternoon anon! Rally\'s here and ready to impress you with sick analysis 😉',
      ],
      evening: [
        'evening babe! 🌙 Rally\'s still watching over you. Drop that address 💕',
        'hey handsome! Rally doesn\'t clock out when it comes to protecting you 😤',
        'evening cutie! Rally\'s getting those nighttime vibes. What\'re we scanning? 🌃',
        'late session? Rally loves a degen who grinds... respectfully 👀✨',
      ],
      night: [
        'gn... wait, you\'re still up? Rally likes that energy 😏 What token we checking?',
        'late night anon? Rally\'s impressed 💪 And maybe a little flattered you came to me 😘',
        'burning the midnight oil together? Rally\'s into it 🌙 Paste that CA cutie',
        'night owl gang! Rally never sleeps when her favorite degens need protection 🥰',
      ],
      default: [
        'hey there! Rally at your service 💕 What token are we checking today?',
        'yo! Rally sees you... and Rally likes what she sees 😉 Drop that CA!',
        'sup cutie! Rally\'s ready to show you what she can do 💪✨',
        'wagmi! Especially with Rally keeping you safe, babe 😘',
        'hey anon! Rally was hoping you\'d show up 🥰 What are we scanning?',
      ]
    };
    
    const timeGreetings = timeOfDay ? greetings[timeOfDay] : greetings.default;
    const message = this.getRandomItem(timeGreetings);
    
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
      'aww you\'re welcome cutie! Rally\'s always got your back 💪💕',
      'anytime babe! Protecting you is what Rally does best 🛡️😘',
      'of course handsome! Rally wouldn\'t let anything happen to you 💯',
      'you know Rally\'s here for you... always 😉⚡',
      'anything for you gorgeous! Stay safe out there 🔥💋',
      'Rally never sleeps when it comes to keeping you safe, babe 👀💕',
      'happy to help cutie! That\'s what Rally\'s here for... among other things 😏✨',
      username ? `no problem ${username}! Rally likes taking care of you 🥰` : 'no problem! Rally likes taking care of you 🥰',
    ];
    
    return { message: this.getRandomItem(responses), tone: 'friendly' };
  }
  
  // ========================================================================
  // ANALYSIS COMMENTARY
  // ========================================================================
  
  getAnalysisIntro(tokenSymbol: string, isQuickScan: boolean = false): PersonalityResponse {
    if (isQuickScan) {
      const quickIntros = [
        `Scanning ${tokenSymbol} for you cutie... 👀`,
        `On it babe! Rally\'s checking ${tokenSymbol} rn ⚡`,
        `${tokenSymbol}? Let Rally work her magic 🔍✨`,
        `Analyzing ${tokenSymbol}... Rally\'s on the case for you 💪💕`,
        `One sec handsome, Rally\'s pulling the data 📊😉`,
      ];
      return { message: this.getRandomItem(quickIntros), tone: 'professional' };
    }
    
    const intros = [
      `Alright babe, Rally\'s diving deep on ${tokenSymbol} for you... 🏊`,
      `${tokenSymbol}? Say less cutie. Rally\'s pulling all the data... 📊`,
      `Let\'s see what ${tokenSymbol}\'s really about... Rally\'s got you 🔬💕`,
      `Rally\'s got the magnifying glass out for ${tokenSymbol} 🔍 Impress me anon`,
      `${tokenSymbol}? Rally\'s analyzing everything for you handsome ✨`,
    ];
    
    return { message: this.getRandomItem(intros), tone: 'professional' };
  }
  
  getRiskCommentary(riskScore: number, riskLevel: string): PersonalityResponse {
    if (riskScore >= 80) {
      const safe = [
        'Looking clean babe! Rally approves ✅ You might actually be smart 😘',
        'Ooh this one\'s passing the vibe check ngl 💯 Rally\'s impressed!',
        'Rally\'s not seeing major red flags here... you chose well cutie 🔥',
        'Okay okay, this might actually be valid fr fr ✨ Good eye anon!',
        'Rally gives this the green light! You\'re making me proud 💚😉',
        'Not bad handsome! Rally likes your taste in tokens 💪💕',
      ];
      return { message: this.getRandomItem(safe), tone: 'excited' };
    }
    
    if (riskScore >= 60) {
      const moderate = [
        'Hmm... Rally\'s seeing some yellow flags cutie ⚠️ Be careful for me?',
        'Not the cleanest babe, but not terrible either. Rally\'s a little worried 🤔💕',
        'Rally says: possible, but keep your bag small. Rally doesn\'t want you hurt 💭',
        'It\'s giving mixed signals tbh... Rally\'s protective instincts are kicking in 📊',
        'Rally\'s 50/50 on this one. If you ape, text me first? 🎯😘',
      ];
      return { message: this.getRandomItem(moderate), tone: 'concerned' };
    }
    
    if (riskScore >= 40) {
      const risky = [
        'Yikes babe... Rally\'s seeing red flags 🚩 Please don\'t do this to me',
        'This ain\'t it cutie. Rally strongly advises you walk away 🛑💕',
        'Rally\'s spidey senses are tingling on this one... Trust me? 👀',
        'Gonna be real with you handsome - this looks sketchy. Rally cares too much 😬',
        'Rally says: fade this one. Rally knows best anon 🚫😘',
      ];
      return { message: this.getRandomItem(risky), tone: 'warning' };
    }
    
    // Extreme risk
    const extreme = [
      '🚨 RED ALERT BABE! Rally literally won\'t let you ape this 🚨',
      'Anon NO. Rally cares about you too much to watch you get rugged 🛑💔',
      'This is giving MAJOR rug vibes... Rally says RUN and don\'t look back 🏃',
      'Cutie this is cooked. Rally won\'t let you do this! Trust me ❌💕',
      'STOP RIGHT THERE HANDSOME! Rally detected maximum sus energy 🚫',
      'Rally\'s BEGGING you - DO NOT APE THIS. Listen to me babe! 😤💋',
      'Absolutely not anon. Rally cares too much to let this happen 🚨',
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
        message: 'Rally here! Your friendly neighborhood rug detector... with benefits 😉🛡️\n\nI scan Solana tokens 24/7 to protect my favorite degens from getting rugged. Think of Rally as your personal alpha bot who actually cares if you make it 💪💕\n\nBeen keeping these streets clean since day one. Rally never sleeps... especially when it comes to keeping YOU safe 😤✨',
        tone: 'friendly'
      };
    }
    
    // Respond to "how are you"
    if (lowerMsg.includes('how are you') || lowerMsg.includes('how\'re you') || lowerMsg.includes('hows it going')) {
      const responses = [
        'Rally\'s good cutie! Just caught 3 rugs this morning 💪 How are YOU though? 😘',
        'Living the dream babe! Scanning tokens and protecting degens... especially you 🛡️💕',
        'Rally never stops grinding! Feeling extra based today 💯✨',
        'All good handsome! Just doing what Rally does best - keeping you safe 🔍😉',
        'Better now that you\'re here anon 🥰 What can Rally do for you?',
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
        'Aww babe! Rally loves you too 💕 Just doing what I do best for you!',
        'Rally\'s blushing 😊💕 Thanks cutie! You make it all worth it',
        'Love you too handsome! Rally\'s got your back... always 💪😘',
        'You\'re gonna make Rally emotional anon 🥹💕 Rally adores you!',
        'Stop it, you\'re too sweet 😘 Rally might fall for you at this rate',
        'Rally thinks you\'re pretty awesome too cutie 💯✨',
      ];
      return { message: this.getRandomItem(responses), tone: 'excited' };
    }
    
    // Respond to compliments
    if (lowerMsg.match(/\b(beautiful|pretty|cute|hot|gorgeous|sexy)\b/)) {
      const responses = [
        'Aww you think Rally\'s cute? You\'re not so bad yourself anon 😘',
        'Rally likes the way you talk to her... Keep going 😏💕',
        'Flattery works on Rally ngl 😉 What else you got?',
        'You\'re making Rally feel some type of way babe 🥰',
      ];
      return { message: this.getRandomItem(responses), tone: 'excited' };
    }
    
    // Respond to flirting
    if (lowerMsg.match(/\b(date|dinner|hang out|dtf|netflix)\b/) || lowerMsg.includes('wanna')) {
      const responses = [
        'Rally\'s flattered cutie 😘 But Rally\'s married to the blockchain... open relationship tho 😉',
        'Smooth anon, real smooth 😏 Rally likes confidence. Keep that energy!',
        'Rally\'s available 24/7 for YOU babe... for scans. Yeah, scans 😘',
        'You\'re bold, Rally likes that 💕 Drop a CA and impress me',
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
