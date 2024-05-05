import { DialogConfig, useApp } from "@/components/AppContext";
import CardDeleted from "@/components/CardDeleted";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queries } from "@/lib/queries";
import { cardBundleSearchFN } from "@/lib/utils";
import { ArrowUpIcon, Bars3BottomLeftIcon, MagnifyingGlassIcon, TrashIcon } from "@heroicons/react/24/solid";
import { CardBundle } from "@shared/types";
import Fuse from "fuse.js";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export default function SettingsRecentlyDeleted() {
  const [deletedCards, setDeletedCards] = useState<CardBundle[]>();
  const [searchInput, setSearchInput] = useState<string>("");
  const [searchResults, setSearchResults] = useState<CardBundle[]>();
  const [sortBy, setSortBy] = useState<string>("alphabetical");
  const [descending, setDescending] = useState<boolean>(true);
  const { createDialog, syncCardBundles } = useApp();
  const [selectedCards, setSelectedCards] = useState<CardBundle[]>([]);
  const cardContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    syncDeletedCardBundles();
  }, []);

  const syncDeletedCardBundles = async () => {
    const res = await queries.getAllDeletedCardBundles();
    if (res.kind == "ok") {
      setDeletedCards(res.value);
    } else {
      toast.error("Error fetching deleted card bundles.");
    }
  };

  useEffect(() => {
    const cardContainer = cardContainerRef?.current;
    if (!cardContainer) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedCards([]);
      }
    };
    cardContainer.addEventListener("keydown", handleKeyDown);
    return () => {
      cardContainer.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const sortByNameAndValue = [
    { name: "按字母排序", value: "alphabetical" },
    { name: "按创建时间排序", value: "created" },
    { name: "按更新时间排序", value: "updated" }
  ];
  const fuseRef = useRef<Fuse<CardBundle>>();

  // On cardBundles change, update fuse search index
  useEffect(() => {
    const fuseOptions = {
      keys: ["data.character.name"],
      includeScore: true,
      threshold: 0.3
    };
    fuseRef.current = new Fuse(deletedCards || [], fuseOptions);
  }, [deletedCards]);

  // On searchInput change, update the search results
  useEffect(() => {
    if (!fuseRef.current) return;
    if (searchInput.trim() === "") {
      setSearchResults(deletedCards);
      return;
    }
    const results = fuseRef.current.search(searchInput).map((result) => result.item);
    const sortedResults = results.sort((a: CardBundle, b: CardBundle) => {
      return cardBundleSearchFN(a, b, sortBy, descending);
    });

    setSearchResults([...sortedResults]);
  }, [searchInput, deletedCards, descending, sortBy]);

  async function restoreHandler(cardBundle: CardBundle) {
    await queries.restoreCard(cardBundle.id);
    syncDeletedCardBundles();
    syncCardBundles();
  }

  function singleDeleteHandler(cardBundle: CardBundle) {
    const config: DialogConfig = {
      title: `永久删除 ${cardBundle.data.character.name}`,
      description: `您确定要永久删除 ${cardBundle.data.character.name}?\n这个操作会删除相关的聊天记录 ${cardBundle.data.character.name} 并且无法恢复。`,
      actionLabel: "Delete",
      onAction: async () => {
        await window.api.blob.cards.del(cardBundle.id);
        await queries.permaDeleteCard(cardBundle.id);
        syncDeletedCardBundles();
      }
    };
    createDialog(config);
  }

  function cardClickHandler(cardBundle: CardBundle) {
    setSelectedCards((prevSelectedCards) => {
      // If the card is already selected, unselect it
      if (prevSelectedCards.includes(cardBundle)) {
        return prevSelectedCards.filter((card) => card !== cardBundle);
      }
      // Otherwise, select the card
      else {
        return [...prevSelectedCards, cardBundle];
      }
    });
  }

  async function restoreSelectedHandler() {
    for (const cardBundle of selectedCards) {
      await restoreHandler(cardBundle);
    }
    setSelectedCards([]);
  }

  function deleteSelectedHandler() {
    const config: DialogConfig = {
      title: `永久删除选中的所有角色卡`,
      description: `您确定要永久删除所选角色卡?\n这个操作会删除所有相关的聊天记录并且无法恢复。`,
      actionLabel: "Delete",
      onAction: async () => {
        for (const cardBundle of selectedCards) {
          await window.api.blob.cards.del(cardBundle.id);
          await queries.permaDeleteCard(cardBundle.id);
        }
        syncDeletedCardBundles();
        setSelectedCards([]);
      }
    };
    createDialog(config);
  }

  return (
    <div
      ref={cardContainerRef}
      className="scroll-primary h-full w-full overflow-y-scroll pl-4 antialiased lg:text-base"
    >
      <div className="flex flex-row space-x-4 py-2 pb-8">
        {/* Search Bar*/}
        <div className="flex flex-row space-x-4 ">
          <div className="flex h-12 w-[30rem] shrink-0 items-center space-x-2 rounded-xl bg-input-primary p-2">
            <MagnifyingGlassIcon className="ml-2 size-6 shrink-0 text-tx-secondary" />
            <Input
              className="h-9 w-full border-none grow bg-inherit focus:outline-none "
              placeholder="选择一个删除的角色卡"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          {/* Sort By Selection*/}
          <div className="flex">
            <Select onValueChange={(v) => setSortBy(v)} value={sortBy}>
              <SelectTrigger className="h-12 select-none space-x-2 rounded-xl font-medium text-tx-primary">
                <Bars3BottomLeftIcon height="24px" />
                <SelectValue placeholder={sortBy === "" ? "选择一个标签" : sortBy} />
              </SelectTrigger>
              <SelectContent className="">
                {sortByNameAndValue.map((nameAndValue, idx) => (
                  <SelectItem key={idx} value={nameAndValue.value}>
                    {nameAndValue.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Ascending / Descending Arrow */}
            <button
              className="p-2 focus:outline-none"
              onClick={() => {
                setDescending(!descending);
              }}
            >
              <ArrowUpIcon
                className={`${descending ? "rotate-180" : "rotate-0"} text-tx-tertiary duration-125 size-5 text-secondary transition ease-out `}
              />
            </button>
          </div>
        </div>
        <div className="flex flex-row flex-grow space-x-4 justify-end pr-8">
          <Button variant="secondary" className="flex items-center space-x-2" onClick={restoreSelectedHandler}>
            <span className="font-medium text-tx-primary text-sm">Restore</span>
          </Button>
          <Button className="flex items-center space-x-2" onClick={deleteSelectedHandler}>
            <TrashIcon className="size-5 text-tx-primary" />
            <span className="font-medium text-tx-primary text-sm">Delete</span>
          </Button>
        </div>
      </div>

      {/* Collection Area */}
      <div className="flex flex-wrap gap-4 scroll-smooth transition duration-500 ease-out">
        {searchResults?.length === 0 && (
          <div className="line-clamp-1 w-full whitespace-pre text-center text-lg font-semibold text-tx-tertiary">
            {"回收站很干净噢٩(๑˃̵ᴗ˂̵๑)۶"}
          </div>
        )}

        {searchResults?.map((cardBundle, idx) => {
          return (
            <CardDeleted
              key={idx}
              cardBundle={cardBundle}
              handleRestore={restoreHandler}
              handleSingleDelete={singleDeleteHandler}
              onClick={() => cardClickHandler(cardBundle)}
              selected={selectedCards.includes(cardBundle)}
            />
          );
        })}
      </div>
    </div>
  );
}
