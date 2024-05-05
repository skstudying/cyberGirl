import { DialogConfig, useApp } from "@/components/AppContext";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PencilSquareIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import { CardBundle, CardFormData, cardFormSchema } from "@shared/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { DeepPartial, useForm } from "react-hook-form";

type FormType = "create" | "edit";

interface CardFormProps {
  cardBundle?: CardBundle;
  onSuccessfulSubmit(data: CardFormData): void;
  formType: FormType;
}

export default function CardForm({ cardBundle, onSuccessfulSubmit, formType }: CardFormProps) {
  const [bannerDisplayImage, setBannerDisplayImage] = useState<string | undefined>();
  const [avatarDisplayImage, setAvatarDisplayImage] = useState<string | undefined>();
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<CardFormData>({ resolver: zodResolver(cardFormSchema) });

  const { createDialog } = useApp();

  const initialData: DeepPartial<CardFormData> = useMemo(() => {
    if (cardBundle) {
      return {
        character: cardBundle.data.character,
        world: cardBundle.data.world,
        meta: {
          title: cardBundle.data.meta.title,
          notes: cardBundle.data.meta.notes,
          tagline: cardBundle.data.meta.tagline,
          tags: cardBundle.data.meta.tags.join(",")
        }
      };
    } else {
      return {
        character: {
          name: "",
          description: "",
          greeting: "",
          msg_examples: "",
          bannerURI: "",
          avatarURI: ""
        },
        world: {
          description: ""
        },
        meta: {
          title: "",
          notes: "",
          tagline: "",
          tags: ""
        }
      };
    }
  }, [cardBundle]);

  useEffect(() => {
    setBannerDisplayImage(cardBundle?.bannerURI);
    setAvatarDisplayImage(cardBundle?.avatarURI);
    form.reset(initialData);
  }, [cardBundle]);

  const onSubmit = (data: CardFormData) => {
    onSuccessfulSubmit(data);
  };

  const bannerClickHandler = () => {
    if (bannerInputRef.current) {
      bannerInputRef.current.click();
    }
  };

  const profileClickHandler = () => {
    if (avatarInputRef.current) {
      avatarInputRef.current.click();
    }
  };

  const bannerChangeHandler = async (event) => {
    const file = event.target.files[0];
    form.setValue("character.bannerURI", file.path);

    const res = await window.api.blob.image.get(file.path);
    if (res.kind === "ok") {
      const dataUrl = res.value.toDataURL();
      setBannerDisplayImage(dataUrl);
    }
  };

  const avatarChangeHandler = async (event) => {
    const file = event.target.files[0];
    form.setValue("character.avatarURI", file.path);

    const res = await window.api.blob.image.get(file.path);
    if (res.kind === "ok") {
      const dataUrl = res.value.toDataURL();
      setAvatarDisplayImage(dataUrl);
    }
  };

  const resetHandler = () => {
    const reset = () => {
      form.reset(initialData);
      setBannerDisplayImage(initialData?.character?.bannerURI ?? "");
      setAvatarDisplayImage(initialData?.character?.avatarURI ?? "");
    };

    const config: DialogConfig = {
      title: "Reset Form?",
      actionLabel: "Reset",
      description:
        "确定要重置设置吗？所有未保存的信息都将丢失！",
      onAction: reset
    };
    createDialog(config);
  };

  return (
    <div className="scroll-secondary bg-float flex h-full w-full flex-col overflow-auto">
      {/* Banner and profile picture */}
      <div className="relative mb-12 shrink-0">
        <div
          className="bg-action-tertiary flex h-48 w-full cursor-pointer items-center justify-center overflow-hidden opacity-75"
          onClick={bannerClickHandler}
        >
          {bannerDisplayImage ? (
            <img src={bannerDisplayImage ?? ""} alt="Profile" className="" />
          ) : (
            <PencilSquareIcon className="absolute h-12 w-12 text-tx-primary" />
          )}
          <div className="absolute inset-0 bg-black opacity-0 transition-opacity duration-200 hover:opacity-10"></div>
          <input
            type="file"
            className="hidden"
            {...(form.register("character.bannerURI"),
            {
              ref: bannerInputRef
            })}
            onChange={bannerChangeHandler}
            accept=".png"
          />
        </div>
        <div
          className="bg-action-tertiary absolute -bottom-12 left-4 flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden
            rounded-full"
          onClick={profileClickHandler}
        >
          {avatarDisplayImage ? (
            <img src={avatarDisplayImage} alt="Profile" className="" />
          ) : (
            <PencilSquareIcon className="absolute h-8 w-8 text-tx-primary" />
          )}
          <div className="absolute inset-0 bg-black opacity-0 transition-opacity duration-200 hover:opacity-10"></div>
          <input
            type="file"
            {...(form.register("character.avatarURI"),
            {
              ref: avatarInputRef
            })}
            onChange={avatarChangeHandler}
            className="hidden"
            accept=".jpg,.jpeg,.png"
          />
        </div>
      </div>
      {/* Character details container */}
      <div className="px-6 pb-6 pt-12">
        <div className="flex flex-col pt-8">
          {/* Character details form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 ">
              <FormField
                control={form.control}
                name="character.name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-tx-primary">角色名称</FormLabel>
                    <FormControl>
                      <Input placeholder="这个角色叫什么呢？" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="character.handle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-tx-primary">角色卡作者</FormLabel>
                    <FormControl>
                      <Input placeholder="为你的角色署名 (非必须)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="character.description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-tx-primary">角色描述</FormLabel>
                    <FormControl>
                      <Textarea placeholder="为角色填写人设" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="character.greeting"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-tx-primary">角色开场白</FormLabel>
                    <FormControl>
                      <Textarea placeholder="角色会怎么跟你打招呼？" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="character.msg_examples"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-tx-primary">回复示例</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={`角色的回复示例，例如:\n用户: 带我走吧老婆求求你带我走吧 <3\n角色: 别在这里发电！\n用户: ...`}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="world.description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-tx-primary">世界观</FormLabel>
                    <FormControl>
                      <Textarea placeholder="描述你的角色身处一个怎么样的世界中" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="meta.title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-tx-primary">标题</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="这个卡片显示的标题"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="meta.tagline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-tx-primary">卡片简介</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="简单向别人介绍一下你的角色吧！"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="meta.tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-tx-primary">标签</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={`一串词汇来描述卡片的特点，例如:后宫、病娇、纯爱`}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="meta.notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-tx-primary">注释</FormLabel>
                    <FormControl>
                      <Textarea placeholder="作者想要分享给其他人的内容，可以是卡片的攻略或者是任何信息" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-3">
                <button
                  className="flex items-center space-x-2 rounded-xl bg-transparent px-4 py-2 transition-colors duration-200 hover:brightness-90"
                  type="button"
                  onClick={resetHandler}
                >
                  <span className="font-medium text-tx-primary">重置</span>
                </button>

                <button
                  className="flex items-center space-x-2 rounded-xl bg-action-primary px-4 py-2 transition ease-out duration-200 hover:brightness-90"
                  type="submit"
                >
                  <UserPlusIcon className="size-5 text-tx-primary" />
                  <span className="font-medium text-tx-primary">{formType === "create" ? "创建" : "保存"}</span>
                </button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
