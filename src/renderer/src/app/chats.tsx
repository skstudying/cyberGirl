import { useApp } from "@/components/AppContext";
import ChatBar from "@/components/ChatBar";
import ChatsSidebar from "@/components/ChatsSidebar";
import Message from "@/components/Message";
import { Button } from "@/components/ui/button";
import { MessageHistory, queries } from "@/lib/queries";
import { CardBundle, PersonaBundle } from "@shared/types";
import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { ErrorBoundary, useErrorBoundary } from "react-error-boundary";
import { toast } from "sonner";
import "../styles/global.css";

interface ChatsPageProps {
  chatID: number;
}
export default function ChatsPage({ chatID }: ChatsPageProps): JSX.Element {
  const [personaBundle, setPersonaBundle] = useState<PersonaBundle>();
  const [messagesHistory, setMessagesHistory] = useState<MessageHistory>([]);
  const historyLimitRef = useRef(50);
  const [isGenerating, setIsGenerating] = useState(false);
  const { setActiveChatID } = useApp();

  const syncMessageHistory = useCallback(async () => {
    const res = await queries.getChatHistory(chatID, historyLimitRef.current);
    if (res.kind == "err") {
      toast.error("Error fetching chat history.");
      console.error(res.error);
      return;
    }
    setMessagesHistory(res.value);
  }, [chatID, historyLimitRef]);

  const setHistoryLimit = useCallback(
    (historyLimit: number) => {
      historyLimitRef.current = historyLimit;
    },
    [historyLimitRef]
  );

  const syncPersonaBundle = useCallback(async () => {
    const res = await queries.getPersonaBundle(chatID);
    if (res.kind == "err") {
      toast.error("Error fetching persona bundle.");
      console.error(res.error);
      return;
    }
    setPersonaBundle(res.value);
  }, [chatID]);

  useEffect(() => {
    (async () => {
      // If active chat does not exist, set the most recent chat to be the active chat
      const chatExistsRes = await queries.checkChatExists(chatID);
      if (chatExistsRes.kind === "ok" && !chatExistsRes.value) {
        console.error(`Chat with ID ${chatID} does not exist. Setting active chat to most recent.`);

        const recentChatRes = await queries.getMostRecentChat();
        if (recentChatRes.kind === "ok" && recentChatRes.value) {
          setActiveChatID(recentChatRes.value);
          return;
        }
      }
      await syncPersonaBundle();
      await syncMessageHistory();
    })();
  }, [chatID, syncMessageHistory, setActiveChatID, syncPersonaBundle]);

  useEffect(() => {
    syncMessageHistory();
  }, [historyLimitRef, syncMessageHistory]);

  // Loading screen
  if (!personaBundle) {
    return <div className="flex h-screen w-screen items-center justify-center "></div>;
  }

  return (
    <motion.div
      className="flex h-full w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.13, delay: 0.12 }}
    >
      <ChatsSidebar chatID={chatID} personaBundle={personaBundle} syncMessageHistory={syncMessageHistory} />
      <ErrorBoundary key={chatID} FallbackComponent={ChatAreaFallback}>
        <ChatArea
          chatID={chatID}
          messageHistory={messagesHistory}
          setMessageHistory={setMessagesHistory}
          historyLimit={historyLimitRef.current}
          setHistoryLimit={setHistoryLimit}
          syncMessageHistory={syncMessageHistory}
          personaBundle={personaBundle}
          isGenerating={isGenerating}
          setIsGenerating={setIsGenerating}
        />
      </ErrorBoundary>
    </motion.div>
  );
}

interface ScrollEvent {
  oldScrollHeight: number;
  kind: "user_message" | "character_message" | "user_scrolled_top";
}

interface ChatAreaProps {
  chatID: number;
  personaBundle: PersonaBundle;
  messageHistory: MessageHistory;
  setMessageHistory: React.Dispatch<React.SetStateAction<MessageHistory>>;
  historyLimit: number;
  setHistoryLimit: (historyLimit: number) => void;
  syncMessageHistory: () => Promise<void>;
  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;
}

function ChatArea({
  chatID,
  personaBundle,
  messageHistory,
  setMessageHistory,
  historyLimit,
  setHistoryLimit,
  syncMessageHistory,
  isGenerating,
  setIsGenerating
}: ChatAreaProps) {
  const [cardBundle, setCardBundle] = useState<CardBundle>();
  const [editingMessageID, setEditingMessageID] = useState<number | null>(null);
  const { showBoundary } = useErrorBoundary();
  const scrollEventRef = useRef<ScrollEvent | null>(null);
  const messageHistoryEndRef = useRef<HTMLDivElement | null>(null);
  const messageHistoryRef = useRef<HTMLDivElement | null>(null);

  const syncCardBundle = useCallback(async () => {
    const res = await queries.getCardBundle(chatID);
    if (res.kind === "err") {
      showBoundary(res.error);
      return;
    }
    setCardBundle(res.value);
  }, [chatID, showBoundary]);

  useEffect(() => {
    (async () => {
      await syncCardBundle();
    })();
  }, [chatID, syncCardBundle]);

  const scrollToBottom = useCallback(() => {
    messageHistoryEndRef.current?.scrollIntoView({ behavior: "instant" });
  }, []);

  // On messageHistoryEndRef init, scroll to bottom
  const messageHistoryEndRefHandler = useCallback(
    (node: HTMLDivElement) => {
      messageHistoryEndRef.current = node;
      scrollToBottom();
    },
    [scrollToBottom]
  );

  useEffect(() => {
    if (!messageHistoryRef.current || !scrollEventRef.current) return;
    const kind = scrollEventRef.current.kind;
    if (kind === "user_message" || kind === "character_message") {
      scrollToBottom();
      scrollEventRef.current = null;
    }
  }, [messageHistory, scrollToBottom]);

  useEffect(() => {
    if (!messageHistoryRef.current || !scrollEventRef.current) return;
    const kind = scrollEventRef.current.kind;
    if (kind === "user_scrolled_top") {
      const delta = messageHistoryRef.current.scrollHeight - scrollEventRef.current.oldScrollHeight;
      messageHistoryRef.current.scrollTop = delta;
      scrollEventRef.current = null;
    }
  }, [messageHistory]);

  const scrollHandler = async (e: React.UIEvent<HTMLDivElement, UIEvent>) => {
    if (!e.currentTarget) return;
    if (e.currentTarget.scrollTop === 0) {
      scrollEventRef.current = {
        oldScrollHeight: e.currentTarget.scrollHeight,
        kind: "user_scrolled_top"
      };
      setHistoryLimit(historyLimit + 15);
      syncMessageHistory();
    }
  };
  // Listens to escape key to cancel editing message
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditingMessageID(null);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (!cardBundle) return <div className="flex h-screen w-screen items-center justify-center "></div>;
  return (
    <div className="flex h-full w-full grow flex-row overflow-hidden">
      <div className="relative flex h-full flex-auto flex-col pl-8 pt-8" key={chatID}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15, delay: 0.12 }}
          ref={messageHistoryRef}
          onScroll={scrollHandler}
          className="relative scroll-primary mr-2 flex grow scroll-py-0 flex-col space-y-4 overflow-auto px-5 overflow-x-clip transition duration-500 ease-out"
        >
          {messageHistory?.map((message) => {
            return (
              <Message
                key={message.id}
                message={message}
                messagesHistory={messageHistory}
                personaBundle={personaBundle}
                cardBundle={cardBundle}
                editingMessageID={editingMessageID}
                setEditingMessageID={setEditingMessageID}
                isGenerating={isGenerating}
                setIsGenerating={setIsGenerating}
                syncMessageHistory={syncMessageHistory}
              />
            );
          })}
          <div ref={messageHistoryEndRefHandler} className="h-0" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.15,
            delay: 0.05
          }}
        >
          <ChatBar
            chatID={chatID}
            personaBundle={personaBundle}
            cardBundle={cardBundle}
            isGenerating={isGenerating}
            setIsGenerating={setIsGenerating}
            onMessageSend={(message) => {
              setMessageHistory((prevMessages: MessageHistory) => [
                ...prevMessages,
                {
                  id: -1,
                  chat_id: chatID,
                  sender: "user",
                  text: message,
                  is_regenerated: 0,
                  candidates: [],
                  is_embedded: 0,
                  inserted_at: new Date().toISOString()
                }
              ]);
              scrollEventRef.current = {
                oldScrollHeight: messageHistoryRef.current!.scrollHeight,
                kind: "user_message"
              };
            }}
            onMessageResolve={(res) => {
              if (res.kind === "err") {
                toast.error(`${res.error.message}`);
              }
              scrollEventRef.current = {
                oldScrollHeight: messageHistoryRef.current!.scrollHeight,
                kind: "character_message"
              };
              syncMessageHistory();
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}

function ChatAreaFallback({ error, resetErrorBoundary }) {
  return (
    <div className="flex flex-col justify-center items-center w-full h-full space-y-4">
      <p className="text-lg text-tx-primary">显示聊天时发生错误: </p>
      <div className="bg-container-primary w-96 p-6 rounded-lg flex item-center justify-center">
        <p className="font-mono text-red-400">{error.message || ""}</p>
      </div>
      <Button
        onClick={() => {
          resetErrorBoundary();
          toast("重试...");
        }}
      >
        重试?
      </Button>
    </div>
  );
}
