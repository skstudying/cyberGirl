export interface Persona {
  id: number;
  name: string;
  description: string;
  inserted_at: string;
  updated_at?: string;
}

export interface Card {
  id: number;
  dirName: string;
  inserted_at: string;
  updated_at?: string;
}

export interface Chat {
  id: number;
  persona_id: number;
  card_id: number;
  inserted_at: string;
  updated_at?: string;
}

export interface Message {
  id: number;
  chat_id: number;
  text: string;
  sender: "user" | "character";
  is_embedded: boolean;
  inserted_at: string;
  updated_at?: string;
}