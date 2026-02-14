/**
 * Comedy taxonomy for topic classification.
 * Broad topics (keys) with subtopics (values).
 * Used by AI and keyword fallback to classify joke segments.
 */
export const COMEDY_TAXONOMY = {
  Personal_Life_and_Identity: [
    "childhood",
    "family",
    "relationships",
    "insecurities",
    "habits",
    "immigrant experience",
    "body",
    "health"
  ],
  Relationships_and_Dating: [
    "partner differences",
    "jealousy",
    "dating rituals",
    "communication problems",
    "marriage",
    "gender expectations"
  ],
  Culture_and_Society: [
    "cultural differences",
    "traditions",
    "social norms",
    "etiquette",
    "generational behavior",
    "national quirks"
  ],
  Institutions_and_Systems: [
    "government",
    "democracy",
    "immigration systems",
    "education",
    "corporate life",
    "bureaucracy"
  ],
  Everyday_Life_Observations: [
    "commuting",
    "grocery stores",
    "gyms",
    "technology habits",
    "restaurants",
    "small inconveniences"
  ],
  Social_Psychology_and_Human_Behavior: [
    "fear",
    "jealousy",
    "ego",
    "groupthink",
    "expectations",
    "hypocrisy"
  ],
  Work_and_Career: [
    "office politics",
    "professional stress",
    "unemployment",
    "workplace absurdity",
    "gig economy"
  ],
  Politics_and_Current_Events: [
    "elections",
    "ideological conflicts",
    "public figures",
    "geopolitical absurdities"
  ],
  Technology_and_Modern_Life: [
    "phones",
    "social media behavior",
    "artificial intelligence",
    "dating apps",
    "attention span",
    "online identity"
  ],
  Philosophy_and_Existential_Humor: [
    "meaning of life",
    "death",
    "morality",
    "civilization design",
    "human evolution"
  ],
  Other: ["general", "observational", "uncategorized"]
};

/** Flatten for keyword matching: subtopic -> topic */
export function buildSubtopicToTopicMap() {
  const map = {};
  for (const [topic, subtopics] of Object.entries(COMEDY_TAXONOMY)) {
    for (const sub of subtopics) {
      map[sub.toLowerCase()] = topic;
    }
  }
  return map;
}
