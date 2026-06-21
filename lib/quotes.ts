const QUOTES = [
  { text: "The miracle isn't that I finished. The miracle is that I had the courage to start.", author: "John Bingham" },
  { text: "Run when you can, walk if you have to, crawl if you must; just never give up.", author: "Dean Karnazes" },
  { text: "Running is the greatest metaphor for life, because you get out of it what you put into it.", author: "Oprah Winfrey" },
  { text: "The obsession with running is really an obsession with the potential for more and more life.", author: "George Sheehan" },
  { text: "Ask yourself: 'Can I give more?' The answer is usually: 'Yes.'", author: "Paul Tergat" },
  { text: "Your body will argue that there is no justifiable reason to continue. Your only recourse is to call on your spirit, which fortunately functions independently of logic.", author: "Tim Noakes" },
  { text: "The voice inside your head that says you can't do this is a liar.", author: "Unknown" },
  { text: "Pain is temporary. Quitting lasts forever.", author: "Lance Armstrong" },
  { text: "If you run, you are a runner. It doesn't matter how fast or how far.", author: "John Bingham" },
  { text: "We run, not because we think it is doing us good, but because we enjoy it and cannot help ourselves.", author: "Sir Roger Bannister" },
  { text: "The real purpose of running isn't to win a race, it's to test the limits of the human heart.", author: "Bill Bowerman" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Believe that you can run farther or faster. Believe that you're young enough, old enough, strong enough, and so on.", author: "John Bingham" },
  { text: "Don't dream of winning, train for it!", author: "Mo Farah" },
  { text: "No matter how slow you go, you're still lapping everybody on the couch.", author: "Unknown" },
  { text: "The best runs sometimes come on the days you didn't feel like running.", author: "Unknown" },
  { text: "Run often. Run long. But never outrun your joy of running.", author: "Julie Isphording" },
  { text: "To be a consistent winner means preparing not just one day, one month, or even one year—but for a lifetime.", author: "Bill Rodgers" },
  { text: "Hills are just speedwork in disguise.", author: "Frank Shorter" },
  { text: "You don't have to be fast. But you'd better be fearless.", author: "Unknown" },
  { text: "What seems hard now will one day be your warm-up.", author: "Unknown" },
  { text: "Champions are not born, they are made.", author: "Unknown" },
  { text: "Energy and persistence conquer all things.", author: "Benjamin Franklin" },
  { text: "Life is short. Running makes it feel longer.", author: "Baron Hansen" },
  { text: "First, inspire yourself. Then inspire others.", author: "Dean Karnazes" },
  { text: "Your biggest challenge isn't someone else. It's the ache in your lungs, the burning in your legs, and the voice inside you that yells 'Can't!' But you don't listen.", author: "Unknown" },
  { text: "Good things come slow — especially in distance running.", author: "Bill Dellinger" },
  { text: "Somewhere in the world someone is training when you are not. When you race them, they will win.", author: "Tom Fleming" },
  { text: "There will be days you don't think you can run a marathon. There will be a lifetime knowing you have.", author: "Unknown" },
  { text: "The road to the finish line is paved with training, determination, and a few blisters.", author: "Unknown" },
];

export function getDailyQuote(): { text: string; author: string } {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86_400_000);
  return QUOTES[dayOfYear % QUOTES.length];
}
