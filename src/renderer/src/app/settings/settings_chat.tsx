import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import Combobox from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ProviderE, getProvider, getProvidersNameAndValue } from "@/lib/provider/provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { config } from "@shared/config";
import { useEffect, useState } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

// Set the form's values to be the user's settings.json
const syncSettings = async (reset: any) => {
  const res = await window.api.setting.get();
  if (res.kind === "err") {
    console.error("获取设置失败:", res.error);
    return;
  }
  const chatSettings = res.value.chat;
  reset(chatSettings);
};

const schema = z.object({
  provider: z.string().default("OpenAI"),
  model: z.string().default("gpt-4"),
  url: z.string().max(65536).optional(),
  maxReplyTokens: z.number().min(32).default(4096),
  maxContextTokens: z.number().min(1024).default(20000),
  temperature: z.number().min(0).max(2).default(0.7),
  topP: z.number().min(0).max(1).default(1),
  topK: z.number().min(0).default(50),
  streaming: z.boolean().default(true),
  jailbreak: z.string().default("")
});
type Schema = z.infer<typeof schema>;

export default function SettingsChat() {
  const defaultSettings = config.defaultSettings.chat;
  const methods = useForm({ resolver: zodResolver(schema) });
  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    setValue,
    formState: { errors }
  } = methods;

  const [models, setModels] = useState<string[]>([]);
  const providerNameAndValue = getProvidersNameAndValue();
  const selectedProvider = watch("provider");

  useEffect(() => {
    syncSettings(reset);
  }, [reset]);

  // Shows the user an error message if there are any errors in the form
  useEffect(() => {
    Object.entries(errors).forEach(([key, value]) => {
      toast.error(`发生错误: ${key}: ${value!.message}`);
    });
  }, [errors]);

  //  Change models based on the selected provider
  useEffect(() => {
    (async () => {
      if (!selectedProvider) return;
      // Clear current model list
      setModels([]);
      // Fetch & set new model list based on the selected provider
      const res = await getProvider(selectedProvider).getModels();
      if (res.kind === "err") {
        toast.error(
          <span className="whitespace-pre-wrap">{`获取模型列表失败 ${selectedProvider}.\n请检查是否输入了正确的密钥?`}</span>
        );
        return;
      }
      setModels(res.value);
    })();
  }, [selectedProvider]);

  const onSubmit = async (data: any) => {
    const res = await window.api.setting.set({ chat: data });
    if (res.kind === "err") {
      toast.error("设置保存失败");
    } else {
      toast.success("设置已保存");
    }
    syncSettings(reset);
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center space-y-5">
      <h1 className="text-2xl text-tx-primary font-bold tracking-wide">Chat Settings</h1>
      {/* In the future, use the shadcn form wrapper, don't use */}
      <FormProvider {...methods}>
        <form className="flex flex-col items-center space-y-5">
          {/* Card Wrapper*/}
          <div className="h-[32rem] w-[32rem] rounded-2xl border-y border-l border-line bg-container-primary py-3">
            <div className="scroll-secondary flex h-full w-full flex-col space-y-8 overflow-auto px-8 py-6">
              {/* Provider & Model Section */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-tx-primary">Provider & Model</h3>
                {/* Provider & Model Contents */}
                <div className="ml-6 space-y-4">
                  <div className=" space-y-1">
                    <Label className="text-tx-primary " htmlFor="provider">
                      服务提供商
                    </Label>
                    <Controller
                      control={control}
                      name="provider"
                      render={({ field }) => {
                        return (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="h-12 text-tx-primary ">
                              <SelectValue placeholder={field.value} />
                            </SelectTrigger>
                            <SelectContent className="bg-input-primary rounded-xl">
                              {providerNameAndValue.map((nameAndValue, idx) => (
                                <SelectItem key={idx} value={nameAndValue.value}>
                                  {nameAndValue.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        );
                      }}
                    />
                  </div>
                  <div className="flex flex-col space-y-1">
                    <Label className="text-tx-primary" htmlFor="model">
                      模型
                    </Label>

                    {selectedProvider === ProviderE.OPENAI_COMPAT ? (
                      <Input className="h-10" {...register("model")}></Input>
                    ) : (
                      <Controller
                        control={control}
                        name="model"
                        render={({ field }) => (
                          <Combobox
                            items={models.map((model) => ({ name: model, value: model }))}
                            disabled={!selectedProvider}
                            value={field.value}
                            setValue={(value) => {
                              setValue("model", value);
                            }}
                          />
                        )}
                      />
                    )}
                  </div>
                  {selectedProvider === ProviderE.OPENAI_COMPAT && (
                    <div className=" space-y-1">
                      <Label className="text-tx-primary">OpenAI API Compatible Endpoint URL</Label>
                      <Input className="h-10" {...register("url")}></Input>
                    </div>
                  )}
                </div>
              </div>
              {/* Generation Section */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-tx-primary">Generation</h3>

                {/* Generation Content*/}
                <div className="ml-6 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-tx-primary" htmlFor="reply-max-tokens">
                      最大回复数
                    </Label>
                    <Input
                      {...register("maxReplyTokens", { valueAsNumber: true })}
                      type="number"
                      className="h-10 text-tx-primary"
                      placeholder={defaultSettings.maxReplyTokens.toString()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-tx-primary" htmlFor="reply-max-tokens">
                      最长上下文记忆数
                    </Label>
                    <Input
                      {...register("maxContextTokens", { valueAsNumber: true })}
                      type="number"
                      className="h-10 text-tx-primary"
                      placeholder={defaultSettings.maxContextTokens.toString()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-tx-primary" htmlFor="temperature">
                      温度
                    </Label>
                    <Input
                      {...register("temperature", { valueAsNumber: true })}
                      type="number"
                      className="h-10 text-tx-primary"
                      placeholder={defaultSettings.temperature.toString()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-tx-primary" htmlFor="top-p">
                      Top P
                    </Label>
                    <Input
                      {...register("topP", { valueAsNumber: true })}
                      type="number"
                      className="h-10 text-tx-primary"
                      placeholder={defaultSettings.topP.toString()}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-tx-primary" htmlFor="top-p">
                      Top K
                    </Label>
                    <Input
                      {...register("topK", { valueAsNumber: true })}
                      type="number"
                      className="h-10 text-tx-primary"
                      placeholder={defaultSettings.topK.toString()}
                    />
                  </div>
                  <div className="ml-1.5 flex items-center space-x-2 pt-5">
                    <Controller
                      control={control}
                      name="streaming"
                      render={({ field }) => (
                        <Checkbox
                          disabled
                          className="rounded-[4px] border-[1px]"
                          id="message-streaming"
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            setValue("streaming", checked);
                          }}
                        />
                      )}
                    />

                    <Label className="text-tx-primary" htmlFor="message-streaming">
                      打开流式传输
                    </Label>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-tx-primary">Extras</h3>
                <div className="ml-6 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-tx-primary" htmlFor="jailbreak">
                      破限词
                    </Label>
                    <Textarea
                      {...register("jailbreak")}
                      className="scroll-secondary h-36 resize-none text-tx-primary"
                      id="jailbreak"
                      placeholder="Enter your jailbreak prompt here"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Button className="" onClick={handleSubmit(onSubmit)}>
            保存
          </Button>
        </form>
      </FormProvider>
    </div>
  );
}
