import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuShortcut,
  ContextMenuTrigger
} from "@/components/ui/context-menu";
import { EllipsisHorizontalIcon, PencilIcon, TrashIcon, UserPlusIcon } from "@heroicons/react/24/solid";
import { useEffect, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

import { useApp } from "@/components/AppContext";
import { Button } from "@/components/ui/button";
import { queries } from "@/lib/queries";
import { PersonaBundle, PersonaFormData } from "@shared/types";
import { toast } from "sonner";
import { PersonaFormModal } from "../../components/PersonaFormModal";

export default function SettingsPersona() {
  const [personaBundles, setPersonaBundles] = useState<PersonaBundle[]>([]);
  const { createModal, closeModal } = useApp();

  useEffect(() => {
    syncPersonaBundles();
  }, []);

  const syncPersonaBundles = async () => {
    const res = await queries.getAllExtantPersonaBundles();
    if (res.kind == "err") {
      toast.error("Error fetching persona bundle.");
      console.error(res.error);
      return;
    }
    setPersonaBundles(res.value);
  };

  /* Handles user triggering the "new persona" action. */
  const handleNew = () => {
    createModal(
      <PersonaFormModal
        title="New Persona"
        submit={{
          label: "Create",
          handle: async (data: PersonaFormData) => {
            const res = await window.api.blob.personas.post(data);
            if (res.kind === "ok") {
              toast.success("自设创建成功");
              closeModal();
            } else {
              toast.error(`自设创建失败。 Error: ${res.error}`);
              console.error(res.error);
            }
            syncPersonaBundles();
          }
        }}
      />
    );
  };

  const handleEdit = (bundle: PersonaBundle) => {
    const name = bundle.data.name;
    const description = bundle.data.description;
    const isDefault = bundle.data.is_default === 1 ? true : false;
    const id = bundle.data.id;

    createModal(
      <PersonaFormModal
        title="编辑自设"
        name={name}
        description={description}
        isDefault={isDefault}
        submit={{
          label: "Save",
          handle: async (data: PersonaFormData) => {
            const res = await window.api.blob.personas.put(id, data);
            if (res.kind === "ok") {
              toast.success("自设更新成功");
              closeModal();
            } else {
              toast.error(`自设更新失败。 Error: ${res.error}`);
              console.error(res.error);
            }
            syncPersonaBundles();
          }
        }}
        remove={{
          label: "Remove",
          handle: () => {
            closeModal();
            handleDelete(bundle);
          }
        }}
      />
    );
  };

  const handleDelete = async (bundle: PersonaBundle) => {
    const res = await queries.deletePersona(bundle);
    if (res.kind === "ok") {
      toast.success("自设删除成功。");
    } else {
      toast.error("自设删除失败。");
    }
    syncPersonaBundles();
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center space-y-8">
      <h1 className="text-2xl font-bold tracking-wide text-tx-primary">自设</h1>
      {/* Personas List */}
      <div className=" flex max-h-[50%] min-h-24 w-[28rem] rounded-2xl border border-line bg-container-primary py-2">
        <div className="scroll-secondary flex h-full w-full flex-col space-y-2 overflow-y-auto px-3">
          {personaBundles.length === 0 && (
            <div className="flex h-full w-full items-center justify-center">
              <p className="select-none text-center text-sm font-[650] text-neutral-600">
                {"You don't have a persona yet..."}
              </p>
            </div>
          )}

          {personaBundles.map((bundle, idx) => {
            return (
              <ContextMenu key={idx}>
                <ContextMenuTrigger>
                  <button
                    className={`group flex h-fit w-full items-center justify-between rounded-lg p-3 font-[480] text-tx-primary transition duration-200
                      ease-out hover:brightness-90 focus:outline-none`}
                    onClick={() => handleEdit(bundle)}
                  >
                    <div className="mr-3 flex w-full items-center space-x-5 ">
                      <img
                        draggable="false"
                        className="size-12 rounded-full object-cover object-top"
                        src={bundle.avatarURI || "default_avatar.png"}
                        alt="Avatar"
                      />
                      <div className="flex w-full flex-col">
                        <h3 className="line-clamp-1 w-5/6 text-ellipsis text-left text-[1.07rem] font-[550]">
                          {bundle.data.name}
                        </h3>
                        {bundle.data.description && bundle.data.description.length != 0 && (
                          <p className="line-clamp-1 text-ellipsis text-left text-[0.88rem] font-[470] text-tx-secondary">
                            {bundle.data.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <EllipsisHorizontalIcon className="size-5 shrink-0 cursor-pointer opacity-0 transition duration-75 ease-out group-hover:opacity-100 text-tx-secondary" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-36">
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            onClick={(e) => {
                              // Prevent clicks on the dropdown menu items from triggering the parent button
                              e.stopPropagation();
                            }}
                            onSelect={() => handleEdit(bundle)}
                          >
                            编辑
                            <DropdownMenuShortcut>
                              <PencilIcon className="size-4" />
                            </DropdownMenuShortcut>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              // Prevent clicks on the dropdown menu items from triggering the parent button
                              e.stopPropagation();
                            }}
                            onSelect={() => handleDelete(bundle)}
                          >
                            删除
                            <DropdownMenuShortcut>
                              <TrashIcon className="size-4" />
                            </DropdownMenuShortcut>
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </button>
                </ContextMenuTrigger>

                <ContextMenuContent className="w-36">
                  <ContextMenuItem onSelect={() => handleEdit(bundle)}>
                    编辑
                    <ContextMenuShortcut>
                      <PencilIcon className="size-4" />
                    </ContextMenuShortcut>
                  </ContextMenuItem>

                  <ContextMenuItem
                    onSelect={() => {
                      handleDelete(bundle);
                    }}
                  >
                    删除
                    <ContextMenuShortcut>
                      <TrashIcon className="size-4" />
                    </ContextMenuShortcut>
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
        </div>
      </div>
      <Button className="flex items-center space-x-2" onClick={handleNew}>
        <UserPlusIcon className="size-5 text-tx-primary" />
        <span className="font-medium text-tx-primary">New</span>
      </Button>
    </div>
  );
}
