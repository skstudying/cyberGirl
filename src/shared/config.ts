import { deepFreeze } from "@shared/utils";

export const config = {
  requestTimeout: 20000,
  persona: {
    nameMinChars: 1,
    nameMaxChars: 128,

    descriptionMinChars: 0,
    descriptionMaxChars: 768
  },
  card: {
    nameMinChars: 1,
    nameMaxChars: 128,

    handleMinChars: 1,
    handleMaxChars: 15,

    descriptionMinChars: 0,
    descriptionMaxChars: 768,

    greetingMinChars: 1,
    greetingMaxChars: 256,

    msgExamplesMinChars: 0,
    msgExamplesMaxChars: 1024,

    titleMinChars: 1,
    titleMaxChars: 128,

    tagLineMinChars: 0,
    taglineMaxChars: 128,

    tagsMinCount: 0,
    tagsMaxCount: 8,

    tagsMinChars: 2,
    tagsMaxChars: 32,

    notesMinChars: 0,
    notesMaxChars: 2048
  },
  defaultSettings: {
    chat: {
      provider: "OpenAI",
      model: "claude-3-opus-20240229",
      maxReplyTokens: 4096,
      maxContextTokens: 24000,
      temperature: 0.7,
      topP: 1,
      topK: 50,
      streaming: true,
      jailbreak: ""
    }
  }
};
deepFreeze(config);
