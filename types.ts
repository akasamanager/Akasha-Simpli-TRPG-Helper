
export interface Skill {
  name: string;
  score: number;
}

export interface EnhancementAbility {
  name: string;
  description: string;
  condition: string;
  charge: string;
}

export interface Item {
  name: string;
  description: string;
  durability: string;
  volume: number;
}

export interface Character {
  profile: {
    name:string;
    info: string;
    backstory: string;
    bonds: string;
    memories: string;
  };
  abilities: {
    luck: number;
    skills: Skill[];
    enhancements: EnhancementAbility[];
    status: string;
    growthPoints: number;
  };
  inventory: {
    items: Item[];
    money: number;
  };
}

export interface TextRun {
  text: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  linkUrl?: string;
}

export interface GoogleDocElement {
  type: 'title' | 'heading_1' | 'heading_2' | 'heading_3' | 'heading_4' | 'heading_5' | 'heading_6' | 'quote' | 'list_item' | 'table' | 'paragraph' | 'footnote_marker' | 'footnote_content';
  text?: string;
  runs?: TextRun[];
  rows?: (string | GoogleDocElement)[][];
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  alignment?: 'START' | 'CENTER' | 'END' | 'JUSTIFY';
  fontSize?: number;
  id?: string;
  glyph?: string;
}

export interface RulebookPage {
    id: string;
    title: string;
    content: GoogleDocElement[];
    subsections: { id: string; title: string; level: number }[];
}
