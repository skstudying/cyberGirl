import Card from "@/components/Card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cardBundleSearchFN } from "@/lib/utils";
import { ArrowUpIcon, Bars3BottomLeftIcon, MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { CardBundle } from "@shared/types";
import Fuse from "fuse.js";
import { useEffect, useRef, useState } from "react";

interface CollectionsPageProps {
  cardBundles: CardBundle[];
}

export default function CollectionsPage({ cardBundles }: CollectionsPageProps) {
  const [searchInput, setSearchInput] = useState<string>("");
  const [searchResults, setSearchResults] = useState<CardBundle[]>(cardBundles);
  const [sortBy, setSortBy] = useState<string>("alphabetical");
  const [descending, setDescending] = useState<boolean>(true);

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
    fuseRef.current = new Fuse(cardBundles, fuseOptions);
  }, [cardBundles]);

  // On searchInput change, update the search results
  useEffect(() => {
    if (!fuseRef.current) return;
    if (searchInput.trim() === "") {
      setSearchResults(cardBundles);
      return;
    }
    const results = fuseRef.current.search(searchInput).map((result) => result.item);
    const sortedResults = results.sort((a, b) => {
      return cardBundleSearchFN(a, b, sortBy, descending);
    });
    setSearchResults([...sortedResults]);
  }, [searchInput, cardBundles, sortBy, descending]);

  return (
    <div className="scroll-primary h-full w-full overflow-y-scroll antialiased lg:text-base pl-4">
      <div className="flex flex-row space-x-4 py-2 pb-8">
        {/* Search Bar*/}
        <div className="flex h-12 w-[30rem] shrink-0 items-center space-x-2 rounded-xl bg-input-primary p-2">
          <MagnifyingGlassIcon className="ml-2 size-6 shrink-0 text-tx-secondary" />
          <Input
            className="h-9 w-full border-none grow bg-inherit text-tx-primary focus:outline-none "
            placeholder="搜索聊天"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        {/* Sort By Selection*/}
        <div className="flex">
          <Select onValueChange={(v) => setSortBy(v)} value={sortBy}>
            <SelectTrigger className="h-12 select-none space-x-2 rounded-xl font-medium text-tx-secondary">
              <Bars3BottomLeftIcon height="24px" />
              <SelectValue placeholder={sortBy === "" ? "选择一个标签" : sortBy} />
            </SelectTrigger>
            <SelectContent className="text-tx-secondary">
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
              className={`${descending ? "rotate-180" : "rotate-0"} duration-125 size-5 text-tx-secondary transition ease-out`}
            />
          </button>
        </div>
      </div>

      {/* Collection Area */}
      <div className="flex flex-wrap gap-4 scroll-smooth transition duration-500 ease-out">
        {searchResults?.length === 0 && (
          <div className="w-full whitespace-pre text-center text-lg font-semibold text-tx-tertiary leading-9">
            {"你还没有角色卡捏  ╥﹏╥ \n 可以拖入角色卡的 .zip 文件到此处导入角色卡"}
          </div>
        )}

        {searchResults?.map((cardBundle, idx) => {
          return <Card key={idx} cardBundle={cardBundle} />;
        })}
      </div>
    </div>
  );
}
